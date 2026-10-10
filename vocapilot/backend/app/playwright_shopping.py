import asyncio
import ipaddress
import os
import re
import socket
from urllib.parse import urlparse

from openai import AuthenticationError, OpenAIError
from playwright.async_api import async_playwright

from app.openai_service import choose_products
from app.schemas import Product, TaskResult
from app.task_store import store


MAX_ACTIONS = 18
def allowed_store_url(url: str) -> bool:
    parsed = urlparse(url)
    host = parsed.hostname
    if parsed.scheme != "https" or not host or parsed.username or parsed.password or parsed.port not in (None, 443):
        return False
    if host == "localhost" or host.endswith((".localhost", ".local", ".internal")):
        return False
    try:
        addresses = {ipaddress.ip_address(item[4][0]) for item in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)}
    except (OSError, ValueError):
        return False
    return bool(addresses) and all(address.is_global for address in addresses)


async def _read_products(page) -> list[dict]:
    return await page.evaluate(r"""() => {
      const visible = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const priceRe = /(?:[$€£]\s?\d[\d,.]*|\d[\d,.]*\s?(?:USD|EUR|GBP))/i;
      const addRe = /add.{0,15}(cart|bag|basket)|buy/i;
      const selectors = 'article,[role="listitem"],li,[class*="product"],[class*="Product"],[data-testid*="product"],[class*="inventory_item"]';
      const found = [], seen = new Set();
      for (const card of document.querySelectorAll(selectors)) {
        if (!visible(card)) continue;
        const text = (card.innerText || '').trim().replace(/\s+/g, ' ');
        if (!text || text.length > 700 || !priceRe.test(text)) continue;
        const controls = [...card.querySelectorAll('button,input[type="submit"],[role="button"],a')].filter(visible);
        const add = controls.find(el => addRe.test([el.innerText, el.value, el.getAttribute('aria-label'), el.title].filter(Boolean).join(' ')));
        if (!add) continue;
        const titleEl = card.querySelector('h1,h2,h3,h4,[class*="name"],[class*="title"],[data-testid*="name"]');
        const title = (titleEl?.innerText || card.querySelector('a')?.innerText || text.split(/[$€£]/)[0]).trim();
        const price = text.match(priceRe)?.[0];
        const key = `${title}|${price}`;
        if (!title || !price || seen.has(key)) continue;
        seen.add(key);
        const id = String(found.length);
        card.setAttribute('data-vocapilot-card', id);
        add.setAttribute('data-vocapilot-add', id);
        const image = card.querySelector('img');
        let amount = price.replace(/[^0-9.,]/g, '');
        if (amount.includes('.') && amount.includes(',')) amount = amount.replace(/,/g, '');
        else if (amount.includes(',')) amount = amount.replace(',', '.');
        found.push({ id, name: title.slice(0, 180), displayed_price: price, price_value: Number(amount), description: text.slice(0, 500), image_url: image?.src || null });
      }
      return found.slice(0, 60);
    }""")


async def _login_if_needed(page, email: str, password: str) -> None:
    password_field = page.locator('input[type="password"]').first
    if not await password_field.count() or not await password_field.is_visible():
        return
    if not password:
        raise ValueError("This store requires a password. Add its sign-in details from the profile menu.")
    email_field = page.locator('input[type="email"],input[autocomplete="username"],input[name*="user" i],input[name*="email" i]').first
    if email and await email_field.count() and await email_field.is_visible():
        await email_field.fill(email)
    await password_field.fill(password)
    submit = page.locator('button[type="submit"],input[type="submit"]').first
    if not await submit.count():
        submit = page.locator('button,[role="button"]').filter(
            has_text=re.compile(r"sign in|log in|login|continue|submit|next", re.I)
        ).first
    if await submit.count() and await submit.is_visible():
        await submit.click()
        await page.wait_for_timeout(700)


async def _find_cart_control(page):
    controls = page.locator('a[href*="cart" i],a[class*="cart" i],button[class*="cart" i],[data-testid*="cart" i],a[aria-label*="cart" i],button[aria-label*="cart" i],a[title*="cart" i],button[title*="cart" i],[role="link"][aria-label*="cart" i]')
    for index in range(min(await controls.count(), 30)):
        control = controls.nth(index)
        if not await control.is_visible():
            continue
        description = " ".join(filter(None, [
            await control.get_attribute("aria-label"), await control.get_attribute("title"),
            await control.get_attribute("href"), await control.get_attribute("class"), await control.inner_text(),
        ]))
        if re.search(r"\b(add|remove|buy|checkout)\b", description, re.I):
            continue
        if re.search(r"cart|bag|basket", description, re.I):
            return control
    links = page.locator('a,[role="link"]')
    for index in range(min(await links.count(), 30)):
        link = links.nth(index)
        label = " ".join(filter(None, [await link.get_attribute("aria-label"), await link.inner_text()]))
        if re.fullmatch(r"(?:shopping\s+)?(?:cart|bag|basket)(?:\s*\d+)?", label.strip(), re.I):
            return link
    return None


def _check_cancel(task_id: str) -> None:
    if store.cancel_flags[task_id].is_set():
        raise asyncio.CancelledError


async def _capture(task_id: str, page) -> None:
    task = store.tasks[task_id]
    task.page_title = await page.title()
    task.page_url = urlparse(page.url)._replace(query="", fragment="").geturl()
    store.emit(task_id, "page_updated", "Store page updated.", {"title": task.page_title, "url": task.page_url})


async def _run_shopping_task(task_id: str) -> None:
    task = store.tasks[task_id]
    action_count = 0
    browser = None
    workflow_stage = "starting the browser workflow"
    try:
        task.status = "running"
        store.emit(task_id, "task_started", "Starting the store shopping workflow.")
        intent = task.intent
        if not intent:
            raise ValueError("A model-derived shopping intent is required before opening the store.")
        task.intent = intent
        store.emit(task_id, "intent_parsed", "Parsed a one-item cart request; checkout is disabled.", intent)
        _check_cancel(task_id)

        target = (task.site_url or "").rstrip("/")
        if not allowed_store_url(target):
            raise ValueError("The store address is unavailable or no longer resolves to a public HTTPS host.")
        email, password = store.credentials.get(task_id, ("", ""))
        async with async_playwright() as playwright:
            workflow_stage = "launching Chromium"
            slow_mo = int(os.getenv("PLAYWRIGHT_SLOW_MO_MS", "700"))
            if not 0 <= slow_mo <= 3000:
                raise ValueError("PLAYWRIGHT_SLOW_MO_MS must be between 0 and 3000.")
            browser = await playwright.chromium.launch(headless=False, slow_mo=slow_mo)
            context = await browser.new_context(viewport={"width": 1365, "height": 900})
            page = await context.new_page()
            page.set_default_timeout(8000)
            origin = urlparse(target).netloc

            async def guard_navigation(route):
                request_url = urlparse(route.request.url)
                if route.request.is_navigation_request() and (request_url.scheme != "https" or request_url.netloc != origin):
                    await route.abort()
                else:
                    await route.continue_()

            await page.route("**/*", guard_navigation)
            workflow_stage = "opening the selected store"
            await page.goto(target, wait_until="domcontentloaded", timeout=25000)
            action_count += 1
            if not allowed_store_url(page.url):
                raise ValueError("The store redirected to a non-public or unsupported address; stopped.")
            if urlparse(page.url).netloc != origin:
                raise ValueError("The store redirected to a different website; stopped for your safety.")
            store.emit(task_id, "browser_navigated", "Opened the selected store.", {"url": page.url})
            workflow_stage = "reading the store page"
            await _capture(task_id, page)
            _check_cancel(task_id)

            workflow_stage = "signing in when the store requests it"
            await _login_if_needed(page, email, password)
            action_count += 1
            if not allowed_store_url(page.url) or urlparse(page.url).netloc != origin:
                raise ValueError("The sign-in flow redirected to another website; stopped for your safety.")
            workflow_stage = "reading the product listings"
            await _capture(task_id, page)
            _check_cancel(task_id)

            observed_data = await _read_products(page)
            observed = [Product(**item) for item in observed_data]
            if not observed:
                task.status = "inconclusive"
                task.error = "No visible product listings with prices and an add or buy control were found on this page."
                store.emit(task_id, "error", task.error)
                return
            task.products = observed
            store.emit(task_id, "products_observed", f"Read {len(observed)} visible product listings from the store page.",
                       {"products": [p.model_dump() for p in observed]})

            if intent["max_price"] is not None:
                candidates = [p for p in observed if p.price_value <= intent["max_price"]]
            else:
                candidates = observed
            if not candidates:
                task.status = "inconclusive"
                task.error = "No displayed product is within the requested budget."
                store.emit(task_id, "error", task.error)
                return
            requested_product = intent["requested_product"]
            match_candidates = candidates
            workflow_stage = "matching a product"
            matching = await choose_products(
                f"{task.input_text}\nProduct intent: {requested_product}",
                [{"name": p.name, "description": p.description, "displayed_price": p.displayed_price,
                  "price_value": p.price_value} for p in match_candidates],
            )
            selected_index = matching["product_index"]
            if selected_index is None or not 0 <= selected_index < len(match_candidates):
                task.status = "inconclusive"
                task.error = "I couldn’t find a confident match in the products currently shown by the store."
                store.emit(task_id, "error", task.error)
                return
            selected = match_candidates[selected_index]
            related = matching.get("related_indices", [])
            task.suggested_products = [match_candidates[index] for index in related[:4]
                                       if isinstance(index, int) and 0 <= index < len(match_candidates)]
            if selected not in task.suggested_products:
                task.suggested_products.insert(0, selected)
            store.emit(task_id, "products_compared", f"Matched the request against {len(match_candidates)} suitable visible products and their displayed prices.",
                       {"matching_names": [p.name for p in match_candidates], "selected_name": selected.name})
            store.emit(task_id, "product_selected", f"Matched {selected.name} at the displayed price {selected.displayed_price}.",
                       {"product": selected.model_dump(), "reason": "Best model match among the visible products within budget."})
            _check_cancel(task_id)

            workflow_stage = "adding the selected product to the cart"
            product_record = next(item for item in observed_data if item["name"] == selected.name)
            add_control = page.locator(f'[data-vocapilot-add="{product_record["id"]}"]')
            await add_control.click()
            action_count += 1
            if action_count > MAX_ACTIONS:
                raise RuntimeError("Browser action limit exceeded.")
            await _capture(task_id, page)
            cart_control = await _find_cart_control(page)
            if cart_control is None:
                task.status = "inconclusive"
                task.error = "The product was selected, but the store did not expose a recognizable cart control to verify it."
                store.emit(task_id, "error", task.error)
                return
            cart_label = " ".join(filter(None, [await cart_control.get_attribute("aria-label"), await cart_control.inner_text()]))
            store.emit(task_id, "cart_updated", "Added one item; opening the store cart to verify it.", {"cart_label": cart_label[:100]})
            _check_cancel(task_id)
            store.emit(task_id, "verification_started", "Opening the cart to verify its actual contents.")
            workflow_stage = "opening and verifying the cart"
            await cart_control.click()
            action_count += 1
            await page.wait_for_timeout(700)
            if not allowed_store_url(page.url) or urlparse(page.url).netloc != origin:
                raise ValueError("The cart control navigated to another website; stopped for your safety.")
            await _capture(task_id, page)
            cart_text = (await page.locator("body").inner_text()).casefold()
            verified = selected.name.casefold() in cart_text
            task.result = TaskResult(
                selected_product=selected, quantity=1 if verified else None,
                displayed_price=selected.displayed_price if verified else None,
                subtotal=selected.displayed_price if verified else None,
                cart_count=None,
                verification_status="verified" if verified else "inconclusive",
                evidence=["The selected product name appeared in the rendered cart view." if verified else "The selected product name was not found in the rendered cart view."],
            )
            if task.result.verification_status == "verified":
                task.status = "completed"
                store.emit(task_id, "verification_completed", "The selected product appeared in the rendered cart view.", {"evidence": task.result.evidence})
                store.emit(task_id, "task_completed", f"Successfully added {selected.name} to the shopping cart and verified it. Checkout was not opened.",
                           {"product": selected.name, "quantity": 1, "price": task.result.displayed_price})
            else:
                task.status = "inconclusive"
                task.error = "The selected product could not be confirmed in the rendered cart view."
                store.emit(task_id, "verification_completed", task.error, {"evidence": task.result.evidence})
            if task.status == "completed":
                # Leave the verified cart visible briefly so the user can inspect it.
                await page.wait_for_timeout(3500)
        await browser.close()
    except asyncio.CancelledError:
        if not store.cancel_flags[task_id].is_set():
            if browser:
                await browser.close()
            raise
        task.status = "cancelled"
        task.error = "Task cancelled by user."
        store.emit(task_id, "task_cancelled", task.error)
        if browser:
            await browser.close()
    except Exception as exc:
        task.status = "failed"
        if isinstance(exc, AuthenticationError):
            task.error = "OpenAI rejected the configured API key during product matching. Check OPENAI_API_KEY or OPEN_API_KEY and restart the backend."
        elif isinstance(exc, OpenAIError):
            task.error = "OpenAI product matching failed. Check backend connectivity, model access, and account limits."
        else:
            detail = str(exc).strip()
            for secret in store.credentials.get(task_id, ()):
                if secret:
                    detail = detail.replace(secret, "[redacted]")
            if re.search(r"(?i)api[_ -]?key|bearer|token|sk-[a-z0-9_-]{8,}", detail):
                task.error = f"The shopping workflow failed while {workflow_stage} ({type(exc).__name__})."
            else:
                task.error = detail or f"The shopping workflow failed while {workflow_stage} ({type(exc).__name__})."
        store.emit(task_id, "task_failed", task.error)
        if browser:
            await browser.close()


async def run_shopping_task(task_id: str) -> None:
    try:
        await asyncio.wait_for(_run_shopping_task(task_id), timeout=90)
    except asyncio.TimeoutError:
        task = store.tasks[task_id]
        task.status = "failed"
        task.error = "The shopping task exceeded its 90-second time limit."
        store.emit(task_id, "task_failed", task.error)
    except Exception as exc:
        task.status = "failed"
        task.error = str(exc)
        store.emit(task_id, "task_failed", task.error)
    finally:
        store.credentials.pop(task_id, None)
