import asyncio
import base64
import os
from urllib.parse import urlparse

from playwright.async_api import async_playwright

from app.schemas import Product
from app.shopping_intent import parse_intent
from app.task_store import store
from app.verification import verify_cart_contents


DEFAULT_STORE = "https://www.saucedemo.com"
MAX_ACTIONS = 18


def allowed_store_url(url: str) -> bool:
    parsed = urlparse(url)
    return (
        parsed.scheme == "https"
        and parsed.hostname == "www.saucedemo.com"
        and parsed.port is None
        and parsed.username is None
        and parsed.password is None
    )


def _check_cancel(task_id: str) -> None:
    if store.cancel_flags[task_id].is_set():
        raise asyncio.CancelledError


async def _capture(task_id: str, page) -> None:
    task = store.tasks[task_id]
    shot = await page.screenshot(type="jpeg", quality=65)
    task.screenshot = "data:image/jpeg;base64," + base64.b64encode(shot).decode("ascii")
    task.page_title = await page.title()
    task.page_url = page.url
    store.emit(task_id, "screenshot_updated", "Browser screenshot updated.", {"title": task.page_title, "url": task.page_url})


async def _run_shopping_task(task_id: str) -> None:
    task = store.tasks[task_id]
    action_count = 0
    browser = None
    try:
        task.status = "running"
        store.emit(task_id, "task_started", "Starting the SauceDemo shopping workflow.")
        intent = parse_intent(task.input_text)
        task.intent = intent
        store.emit(task_id, "intent_parsed", "Parsed a one-item cart request; checkout is disabled.", intent)
        _check_cancel(task_id)

        target = os.getenv("SAUCEDEMO_BASE_URL", DEFAULT_STORE).rstrip("/")
        if not allowed_store_url(target):
            raise ValueError("SAUCEDEMO_BASE_URL must use https://www.saucedemo.com.")
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            context = await browser.new_context(viewport={"width": 1365, "height": 900})
            page = await context.new_page()
            page.set_default_timeout(8000)
            await page.goto(target, wait_until="domcontentloaded", timeout=25000)
            action_count += 1
            if not allowed_store_url(page.url):
                raise ValueError("SauceDemo redirected outside the approved origin; stopped.")
            store.emit(task_id, "browser_navigated", "Opened the approved SauceDemo store.", {"url": page.url})
            await _capture(task_id, page)
            _check_cancel(task_id)

            username = os.getenv("SAUCEDEMO_USERNAME", "standard_user")
            password = os.getenv("SAUCEDEMO_PASSWORD", "secret_sauce")
            await page.get_by_placeholder("Username").fill(username)
            await page.get_by_placeholder("Password").fill(password)
            await page.get_by_role("button", name="Login").click()
            action_count += 1
            await page.wait_for_url("**/inventory.html", timeout=15000)
            if not allowed_store_url(page.url):
                raise ValueError("The store redirected outside the approved origin; stopped.")
            await _capture(task_id, page)
            _check_cancel(task_id)

            product_cards = page.locator(".inventory_item")
            observed = []
            for index in range(await product_cards.count()):
                card = product_cards.nth(index)
                name = (await card.locator(".inventory_item_name").inner_text()).strip()
                raw_price = (await card.locator(".inventory_item_price").inner_text()).strip()
                description = (await card.locator(".inventory_item_desc").inner_text()).strip()
                price_value = float(raw_price.replace("$", "").replace(",", ""))
                image = card.locator("img.inventory_item_img")
                image_url = await image.get_attribute("src")
                observed.append(Product(name=name, displayed_price=raw_price, price_value=price_value,
                                        description=description, image_url=image_url))
            if not observed:
                task.status = "inconclusive"
                task.error = "The inventory page did not show any product cards."
                store.emit(task_id, "error", task.error)
                return
            task.products = observed
            store.emit(task_id, "products_observed", f"Read {len(observed)} products and prices from the inventory page.",
                       {"products": [p.model_dump() for p in observed]})

            if intent["requested_product"]:
                needle = intent["requested_product"].casefold()
                candidates = [p for p in observed if needle in p.name.casefold() or p.name.casefold() in needle]
            else:
                candidates = [p for p in observed if "backpack" in p.name.casefold()]
            if intent["max_price"] is not None:
                candidates = [p for p in candidates if p.price_value <= intent["max_price"]]
            store.emit(task_id, "products_compared", f"Compared {len(candidates)} matching products using displayed prices.",
                       {"matching_names": [p.name for p in candidates]})
            if not candidates:
                task.status = "inconclusive"
                task.error = "No visible inventory product matched the request and any stated budget."
                store.emit(task_id, "error", task.error)
                return
            selected = min(candidates, key=lambda p: p.price_value)
            store.emit(task_id, "product_selected", f"Selected {selected.name} at the lowest matching displayed price {selected.displayed_price}.",
                       {"product": selected.model_dump(), "reason": "Lowest displayed price among matching products."})
            _check_cancel(task_id)

            card = product_cards.filter(has=page.get_by_text(selected.name, exact=True)).first
            await card.get_by_role("button", name="Add to cart").click()
            action_count += 1
            if action_count > MAX_ACTIONS:
                raise RuntimeError("Browser action limit exceeded.")
            await _capture(task_id, page)
            cart_link = page.locator(".shopping_cart_link")
            cart_count_text = (await cart_link.inner_text()).strip()
            store.emit(task_id, "cart_updated", "Added one item; checking the rendered cart.", {"badge": cart_count_text})
            _check_cancel(task_id)
            store.emit(task_id, "verification_started", "Opening the cart to verify its actual contents.")
            await cart_link.click()
            action_count += 1
            await page.wait_for_url("**/cart.html", timeout=10000)
            if not allowed_store_url(page.url):
                raise ValueError("The cart navigated outside the approved origin; stopped.")
            await page.locator(".cart_item").first.wait_for(state="visible", timeout=8000)
            await _capture(task_id, page)
            cart_items = page.locator(".cart_item")
            cart_lines = []
            for index in range(await cart_items.count()):
                line = cart_items.nth(index)
                cart_lines.append({
                    "name": (await line.locator(".inventory_item_name").inner_text()).strip(),
                    "quantity": int((await line.locator(".cart_quantity").inner_text()).strip()),
                    "price": (await line.locator(".inventory_item_price").inner_text()).strip(),
                })
            badge_count = int(cart_count_text) if cart_count_text.isdigit() else None
            task.result = verify_cart_contents(selected, cart_lines, badge_count)
            if task.result.verification_status == "verified":
                task.status = "completed"
                store.emit(task_id, "verification_completed", "Cart item, quantity, price, and badge match.", {"evidence": task.result.evidence})
                store.emit(task_id, "task_completed", "Shopping task completed. Checkout was not opened.",
                           {"product": selected.name, "quantity": 1, "price": task.result.displayed_price})
            else:
                task.status = "inconclusive"
                task.error = "The rendered cart did not fully match the selected product, price, quantity and badge."
                store.emit(task_id, "verification_completed", task.error, {"evidence": task.result.evidence})
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
        task.error = str(exc)
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
