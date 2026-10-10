import asyncio
import ipaddress
import os
import re
import socket
from contextlib import suppress
from pathlib import Path
from urllib.parse import urlparse

from openai import AuthenticationError, OpenAIError

# Prefer the ignored workspace cache when present, while honoring explicit user overrides.
workspace_browser_cache = Path(__file__).resolve().parents[3] / ".tools" / "playwright-browsers"
if workspace_browser_cache.is_dir():
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", str(workspace_browser_cache))

from playwright.async_api import async_playwright

from app.openai_service import choose_products
from app.schemas import CartItem, CartSummary, Product, TaskResult, TaskView
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
        const detailsLink = titleEl?.closest('a[href]') || card.querySelector('a[href]');
        let amount = price.replace(/[^0-9.,]/g, '');
        if (amount.includes('.') && amount.includes(',')) amount = amount.replace(/,/g, '');
        else if (amount.includes(',')) amount = amount.replace(',', '.');
        found.push({ id, store_ref: id, name: title.slice(0, 180), displayed_price: price, price_value: Number(amount), description: text.slice(0, 500), image_url: image?.src || null, details_url: detailsLink?.href || null });
      }
      return found.slice(0, 60);
    }""")


async def summarize_cart(task_id: str) -> CartSummary:
    task = store.tasks[task_id]
    session = store.sessions.get(task_id)
    if session:
        page = session["page"]
        try:
            result = await page.evaluate(r"""() => {
              const visible = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
              const selectors = 'tbody tr,[class*="cart-item" i],[class*="cart_item" i],[data-testid*="cart-item" i],[data-testid*="cart_item" i]';
              const rows = [...document.querySelectorAll(selectors)].filter(visible);
              const entries = [], seen = new Set();
              for (const row of rows) {
                const nameNode = row.querySelector('.inventory_item_name,.cart_description a,[class*="product-name" i],[class*="product_name" i],[class*="product-title" i],[class*="product_title" i],td:nth-child(2) a,h2,h3,h4,a[href*="product"]');
                const name = (nameNode?.innerText || nameNode?.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
                if (!name || name.length > 180 || seen.has(name.toLowerCase())) continue;
                seen.add(name.toLowerCase());
                const quantityNode = row.querySelector('input[type="number"],input[name*="qty" i],input[name*="quantity" i],select[name*="qty" i],select[name*="quantity" i],[class*="cart_quantity" i],[class*="quantity" i],[class*="qty" i]');
                const quantityText = quantityNode?.value || quantityNode?.innerText || row.querySelector('td:nth-child(3)')?.innerText || '';
                const parsedQuantity = Number(String(quantityText).match(/\d+/)?.[0]);
                entries.push({ name, quantity: Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1 });
              }
              const body = (document.body?.innerText || '').toLowerCase();
              return { entries, empty: /(?:your\s+)?cart\s+(?:is\s+)?empty|no\s+items\s+in\s+(?:your\s+)?cart/.test(body) };
            }""")
            if result["entries"]:
                items = [CartItem(**item) for item in result["entries"]]
                total = sum(item.quantity for item in items)
                return CartSummary(item_count=total, items=items, is_current=True,
                                   message=f"The live cart has {total} item{'s' if total != 1 else ''} across {len(items)} product{'s' if len(items) != 1 else ''}.")
            if result["empty"]:
                return CartSummary(item_count=0, items=[], is_current=True, message="The live cart is empty.")
        except Exception:
            pass

    verified = task.result and task.result.verification_status == "verified" and task.result.selected_product
    if verified:
        count = task.result.quantity or 1
        item = CartItem(name=task.result.selected_product.name, quantity=count)
        return CartSummary(item_count=count, items=[item], is_current=False,
                           message=f"I can’t inspect the live cart right now. The last VocaPilot-verified cart had {count} {item.name}; that may not reflect its current contents.")
    return CartSummary(item_count=None, items=[], is_current=False,
                       message="I can’t inspect a current cart yet. Add a product through VocaPilot first, then ask me to check the cart.")


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


async def _hold_review_window(task_id: str) -> None:
    session = store.sessions.get(task_id)
    if not session:
        return
    store.credentials.pop(task_id, None)
    with suppress(Exception):
        await session["page"].wait_for_event("close", timeout=600_000)
    await _close_session(task_id)


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


async def _read_variant_options(page) -> dict[str, list[str]]:
    return await page.evaluate(r"""() => {
      const options = { size: [], color: [] };
      const visible = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const kindFor = text => /\b(size|sizing)\b/i.test(text) ? 'size' : /\b(colou?r|shade)\b/i.test(text) ? 'color' : null;
      const add = (kind, value) => { const clean = (value || '').trim(); if (clean && !/^(select|choose|please select|add to cart)$/i.test(clean) && !options[kind].includes(clean)) options[kind].push(clean); };
      for (const select of document.querySelectorAll('select')) {
        if (!visible(select)) continue;
        const label = [...document.querySelectorAll('label')].find(item => item.htmlFor === select.id)?.innerText || '';
        const wrapper = select.closest('fieldset,[role="group"],[class*="variant" i],[class*="option" i],[class*="form-group" i]') || select.parentElement;
        const kind = kindFor(`${label} ${select.name} ${select.id} ${select.getAttribute('aria-label') || ''} ${wrapper?.innerText || ''}`);
        if (!kind) continue;
        select.setAttribute('data-vocapilot-variant-kind', kind);
        for (const option of select.options) if (!option.disabled && option.value) add(kind, option.label || option.textContent);
      }
      const roots = document.querySelectorAll('fieldset,[role="radiogroup"],[class*="variant" i],[class*="option-group" i],[data-option-name]');
      for (const root of roots) {
        if (!visible(root)) continue;
        const clue = `${root.getAttribute('aria-label') || ''} ${root.getAttribute('data-option-name') || ''} ${root.querySelector('legend,label,[class*="label" i]')?.innerText || ''}`;
        const kind = kindFor(clue);
        if (!kind) continue;
        const controls = root.querySelectorAll('input[type="radio"],[role="radio"],button:not([type="submit"]),[role="button"],[class*="swatch" i]');
        for (const control of controls) {
          if (!visible(control) || /add to|cart|buy now/i.test(control.innerText || '')) continue;
          const label = control.closest('label')?.innerText || [...document.querySelectorAll('label')].find(item => item.htmlFor === control.id)?.innerText || '';
          const value = label || control.getAttribute('aria-label') || control.title || control.value || control.innerText;
          add(kind, value);
          if (value) {
            control.setAttribute('data-vocapilot-variant-kind', kind);
            control.setAttribute('data-vocapilot-variant-value', value.trim());
          }
        }
      }
      return Object.fromEntries(Object.entries(options).filter(([, values]) => values.length));
    }""")


async def _apply_variants(page, choices: dict[str, str]) -> list[str]:
    return await page.evaluate(r"""choices => {
      const norm = value => (value || '').trim().toLocaleLowerCase();
      const missed = [];
      for (const [kind, wanted] of Object.entries(choices)) {
        const controls = [...document.querySelectorAll(`[data-vocapilot-variant-kind="${kind}"]`)];
        let applied = false;
        for (const control of controls) {
          if (control.tagName === 'SELECT') {
            const option = [...control.options].find(item => norm(item.label || item.textContent) === norm(wanted));
            if (option) { control.value = option.value; control.dispatchEvent(new Event('input', { bubbles: true })); control.dispatchEvent(new Event('change', { bubbles: true })); applied = true; break; }
          } else if (norm(control.getAttribute('data-vocapilot-variant-value')) === norm(wanted)) {
            control.click(); applied = true; break;
          }
        }
        if (!applied) missed.push(kind);
      }
      return missed;
    }""", choices)


async def _close_session(task_id: str, playwright=None, browser=None) -> None:
    session = store.sessions.pop(task_id, None)
    browser = session["browser"] if session else browser
    playwright = session["playwright"] if session else playwright
    if browser:
        with suppress(Exception):
            await browser.close()
    if playwright:
        with suppress(Exception):
            await playwright.stop()
    store.credentials.pop(task_id, None)


def _task_error(task_id: str, exc: Exception, stage: str) -> str:
    if isinstance(exc, AuthenticationError):
        return "OpenAI rejected its API key during product matching. Check OPENAI_API_KEY or OPEN_API_KEY and restart the backend."
    if isinstance(exc, OpenAIError):
        return "OpenAI product matching failed. Check backend connectivity, model access, and account limits."
    detail = str(exc).strip()
    for secret in store.credentials.get(task_id, ()):
        if secret:
            detail = detail.replace(secret, "[redacted]")
    if re.search(r"(?i)api[_ -]?key|bearer|token|sk-[a-z0-9_-]{8,}", detail):
        return f"The shopping workflow failed while {stage} ({type(exc).__name__})."
    return detail or f"The shopping workflow failed while {stage} ({type(exc).__name__})."


async def _find_add_control(page, store_ref: str | None):
    if store_ref:
        marked = page.locator(f'[data-vocapilot-add="{store_ref}"]')
        if await marked.count() and await marked.first.is_visible():
            return marked.first
    controls = page.locator('button,input[type="submit"],[role="button"],a')
    add_re = re.compile(r"add.{0,20}(cart|bag|basket)|buy", re.I)
    for index in range(min(await controls.count(), 60)):
        control = controls.nth(index)
        if not await control.is_visible():
            continue
        label = " ".join(filter(None, [await control.get_attribute("aria-label"), await control.get_attribute("title"), await control.inner_text()]))
        if add_re.search(label):
            return control
    return None


async def _complete_cart(task_id: str, choices: dict[str, str]) -> None:
    task = store.tasks[task_id]
    session = store.sessions[task_id]
    page = session["page"]
    selected = task.selected_product
    if not selected:
        raise ValueError("Choose a product before continuing.")
    task.status = "running"
    task.chosen_options = choices
    store.emit(task_id, "product_selected", f"Selected {selected.name} at {selected.displayed_price}.", {"product": selected.model_dump(), "options": choices})
    if choices:
        missed = await _apply_variants(page, choices)
        if missed:
            raise ValueError(f"The store could not apply the selected {', '.join(missed)} option. Please choose again.")
    store.emit(task_id, "cart_updated", "Adding your selected item to the store cart.", {"product": selected.name, "options": choices})
    add_control = await _find_add_control(page, selected.store_ref)
    if add_control is None:
        raise ValueError("The selected product page did not expose a recognizable add-to-cart control.")
    await add_control.click()
    await page.wait_for_timeout(500)
    await _capture(task_id, page)
    cart_control = await _find_cart_control(page)
    if cart_control is None:
        task.status = "inconclusive"
        task.error = "The product was selected, but the store did not expose a recognizable cart control to verify it."
        store.emit(task_id, "error", task.error)
        return
    store.emit(task_id, "verification_started", "Opening the cart to verify its actual contents.")
    await cart_control.click()
    await page.wait_for_timeout(700)
    if not allowed_store_url(page.url) or urlparse(page.url).netloc != session["origin"]:
        raise ValueError("The cart control navigated to another website; stopped for your safety.")
    await _capture(task_id, page)
    cart_text = (await page.locator("body").inner_text()).casefold()
    verified = selected.name.casefold() in cart_text
    price = selected.displayed_price if verified else None
    task.result = TaskResult(
        selected_product=selected, quantity=1 if verified else None,
        displayed_price=price, subtotal=price, cart_count=None,
        verification_status="verified" if verified else "inconclusive",
        evidence=["The selected product name appeared in the rendered cart view." if verified else "The selected product name was not found in the rendered cart view."],
    )
    if verified:
        store.emit(task_id, "verification_completed", "The selected product appeared in the rendered cart view.", {"evidence": task.result.evidence})
        store.emit(task_id, "checkout_manual", "Your cart is verified. The store window is on the cart; continue to checkout there when you are ready.")
        task.status = "completed"
        summary = f"Added {selected.name} to your cart and verified it. The cart is open in the store window. Continue to checkout manually when you are ready."
        store.emit(task_id, "task_completed", summary, {"product": selected.name, "quantity": 1, "price": price, "checkout_opened": False})
        asyncio.create_task(_hold_review_window(task_id))
    else:
        task.status = "inconclusive"
        task.error = "The selected product could not be confirmed in the rendered cart view."
        store.emit(task_id, "verification_completed", task.error, {"evidence": task.result.evidence})


async def select_product(task_id: str, store_ref: str) -> TaskView:
    task = store.tasks[task_id]
    if task.status != "awaiting_selection" or task_id not in store.sessions:
        raise ValueError("This shopping session is no longer waiting for a product selection.")
    selected = next((product for product in task.products if product.store_ref == store_ref), None)
    if not selected:
        raise ValueError("Choose one of the products currently shown by the store.")
    session = store.sessions[task_id]
    page = session["page"]
    try:
        _check_cancel(task_id)
        if selected.details_url:
            details = urlparse(selected.details_url)
            current_page = urlparse(page.url)
            if details.scheme != "https" or details.netloc != session["origin"]:
                raise ValueError("The product details link points outside the selected store.")
            same_document = (details.path, details.query) == (current_page.path, current_page.query)
            if not same_document:
                await page.goto(selected.details_url, wait_until="domcontentloaded", timeout=25000)
                if urlparse(page.url).netloc != session["origin"]:
                    raise ValueError("The product page redirected to a different website; stopped for your safety.")
                await _capture(task_id, page)
        task.selected_product = selected
        task.available_options = await _read_variant_options(page)
        if task.available_options:
            task.status = "awaiting_options"
            option_names = " and ".join(task.available_options)
            store.emit(task_id, "awaiting_options", f"Choose an available {option_names} for {selected.name}.", {"options": task.available_options})
        else:
            store.emit(task_id, "options_checked", "The store does not list size or color choices for this item; adding the selected product.")
            await _complete_cart(task_id, {})
            if task.status != "completed":
                await _close_session(task_id)
    except Exception as exc:
        task.status = "failed"
        task.error = _task_error(task_id, exc, "opening product options")
        store.emit(task_id, "task_failed", task.error)
        await _close_session(task_id)
    return task


async def choose_product_options(task_id: str, choices: dict[str, str]) -> TaskView:
    task = store.tasks[task_id]
    if task.status != "awaiting_options" or task_id not in store.sessions:
        raise ValueError("This shopping session is no longer waiting for product options.")
    for kind, options in task.available_options.items():
        selected = choices.get(kind)
        if not selected or selected not in options:
            raise ValueError(f"Choose one of the available {kind} options: {', '.join(options)}.")
    try:
        await _complete_cart(task_id, choices)
    except Exception as exc:
        task.status = "failed"
        task.error = _task_error(task_id, exc, "adding the selected variant")
        store.emit(task_id, "task_failed", task.error)
    finally:
        if task.status != "completed":
            await _close_session(task_id)
    return task


async def _expire_session(task_id: str) -> None:
    await asyncio.sleep(300)
    task = store.tasks.get(task_id)
    if task and task.status in {"awaiting_selection", "awaiting_options"}:
        task.status = "cancelled"
        task.error = "This shopping session expired while waiting for your selection. Start a new request to continue."
        store.emit(task_id, "task_cancelled", task.error)
        await _close_session(task_id)


async def _run_shopping_task(task_id: str) -> None:
    task = store.tasks[task_id]
    browser = None
    playwright = None
    keep_session = False
    workflow_stage = "starting the browser workflow"
    try:
        task.status = "running"
        store.emit(task_id, "task_started", "Opening the store and looking for matching products.")
        intent = task.intent
        if not intent:
            raise ValueError("A model-derived shopping intent is required before opening the store.")
        store.emit(task_id, "intent_parsed", "Looking for all visible products in your requested category.", intent)
        _check_cancel(task_id)

        target = (task.site_url or "").rstrip("/")
        if not allowed_store_url(target):
            raise ValueError("The store address is unavailable or no longer resolves to a public HTTPS host.")
        email, password = store.credentials.get(task_id, ("", ""))
        workflow_stage = "launching Chromium"
        slow_mo = int(os.getenv("PLAYWRIGHT_SLOW_MO_MS", "700"))
        if not 0 <= slow_mo <= 3000:
            raise ValueError("PLAYWRIGHT_SLOW_MO_MS must be between 0 and 3000.")
        playwright = await async_playwright().start()
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
        if not allowed_store_url(page.url) or urlparse(page.url).netloc != origin:
            raise ValueError("The store redirected to a different or unsupported website; stopped for your safety.")
        store.emit(task_id, "browser_navigated", "Opened the selected store.", {"url": page.url})
        await _capture(task_id, page)
        _check_cancel(task_id)

        workflow_stage = "signing in when the store requests it"
        await _login_if_needed(page, email, password)
        if not allowed_store_url(page.url) or urlparse(page.url).netloc != origin:
            raise ValueError("The sign-in flow redirected to another website; stopped for your safety.")
        workflow_stage = "reading the product listings"
        await _capture(task_id, page)
        observed_data = await _read_products(page)
        observed = [Product(**item) for item in observed_data]
        if not observed:
            raise ValueError("No visible product listings with prices and an add or buy control were found on this page.")
        store.emit(task_id, "products_observed", f"Read {len(observed)} visible product listings from the store page.", {"products": [product.model_dump() for product in observed]})

        max_price = intent.get("max_price")
        candidates = [product for product in observed if max_price is None or product.price_value <= max_price]
        if not candidates:
            raise ValueError("No displayed product is within the requested budget.")
        if intent.get("browse_all"):
            matches = candidates
        else:
            workflow_stage = "matching the requested category"
            matching = await choose_products(
                f"{task.input_text}\nProduct intent: {intent['requested_product']}",
                [{"name": product.name, "description": product.description, "displayed_price": product.displayed_price, "price_value": product.price_value} for product in candidates],
            )
            indices = matching.get("matching_indices", [])
            matches = [candidates[index] for index in indices if isinstance(index, int) and 0 <= index < len(candidates)]
        if not matches:
            raise ValueError("I couldn't find products in this store that match the requested category and budget.")
        task.products = matches
        task.suggested_products = matches
        store.sessions[task_id] = {"playwright": playwright, "browser": browser, "context": context, "page": page, "origin": origin}
        keep_session = True
        task.status = "awaiting_selection"
        description = "visible products" if intent.get("browse_all") else "products in your requested category"
        store.emit(task_id, "products_compared", f"Found {len(matches)} {description} within budget.", {"matching_names": [product.name for product in matches]})
        store.emit(task_id, "awaiting_selection", f"I found {len(matches)} options. Choose one to see its available size and color choices.", {"products": [product.model_dump() for product in matches]})
        asyncio.create_task(_expire_session(task_id))
    except asyncio.CancelledError:
        task.status = "cancelled"
        task.error = "Task cancelled by user."
        store.emit(task_id, "task_cancelled", task.error)
    except Exception as exc:
        task.status = "failed"
        task.error = _task_error(task_id, exc, workflow_stage)
        store.emit(task_id, "task_failed", task.error)
    finally:
        if not keep_session:
            await _close_session(task_id, playwright, browser)


async def run_shopping_task(task_id: str) -> None:
    try:
        await asyncio.wait_for(_run_shopping_task(task_id), timeout=120)
    except asyncio.TimeoutError:
        task = store.tasks[task_id]
        task.status = "failed"
        task.error = "The store search exceeded its two-minute time limit."
        store.emit(task_id, "task_failed", task.error)
        await _close_session(task_id)


async def cancel_shopping_task(task_id: str) -> None:
    store.cancel_flags[task_id].set()
    task = store.tasks[task_id]
    if task.status in {"awaiting_selection", "awaiting_options"}:
        task.status = "cancelled"
        task.error = "Task cancelled by user."
        store.emit(task_id, "task_cancelled", task.error)
        await _close_session(task_id)
