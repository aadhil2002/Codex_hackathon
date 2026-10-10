import asyncio
import base64
import ipaddress
import socket
from urllib.parse import urlsplit

from app.schemas.task import TaskResult
from app.services.openai_computer_use import run_computer_use
from app.state.task_store import TaskRecord

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
COMMIT_PATH_WORDS = {"checkout", "payment", "pay", "booking", "reserve", "confirm", "order", "purchase", "submit"}


async def _public_url(url: str) -> bool:
    parts = urlsplit(url)
    if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
        return False
    try:
        addresses = await asyncio.to_thread(socket.getaddrinfo, parts.hostname, parts.port or 443, type=socket.SOCK_STREAM)
    except (OSError, UnicodeError):
        return False
    return bool(addresses) and all(ipaddress.ip_address(item[4][0]).is_global for item in addresses)


async def _ask_for_approval(task: TaskRecord, method: str, url: str, reason: str) -> bool:
    parts = urlsplit(url)
    task.pending_action = {"method": method, "url": f"{parts.scheme}://{parts.netloc}{parts.path}", "reason": reason}
    task.approval_decision = None
    task.approval_event.clear()
    task.status = "waiting_approval"
    task.emit("approval_required", f"Approval required before {reason.lower()}.", task.pending_action)
    await task.approval_event.wait()
    approved = task.approval_decision is True
    task.pending_action = None
    task.approval_decision = None
    task.status = "running"
    task.emit("approval_granted" if approved else "approval_denied", "User approved the action." if approved else "User denied the action.")
    return approved


async def run_shopping_task(task: TaskRecord) -> None:
    from playwright.async_api import async_playwright

    if not await _public_url(task.request.site_url):
        raise ValueError("The site must resolve to a public HTTPS address. Local and private network sites are blocked.")
    parts = urlsplit(task.request.site_url)
    starting_origin = (parts.scheme, parts.hostname, parts.port)
    task.status = "running"
    task.emit("task_started", "Launching a visible browser for the requested site.", {"url": task.request.site_url})

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=False)
        context = await browser.new_context(viewport={"width": 1280, "height": 900}, device_scale_factor=1)
        page = await context.new_page()

        async def guard(route):
            request = route.request
            url = request.url
            target = urlsplit(url)
            if target.scheme not in {"https", "data", "blob"}:
                await route.abort()
                return
            if target.scheme == "https" and not await _public_url(url):
                await route.abort()
                return
            if request.is_navigation_request() and request.frame == page.main_frame:
                actual_origin = (target.scheme, target.hostname, target.port)
                if actual_origin != starting_origin:
                    approved = await _ask_for_approval(task, "GET", url, "navigate to another website")
                    if not approved:
                        await route.abort()
                        return
            path_words = set(filter(None, target.path.casefold().split("/")))
            if request.method.upper() in WRITE_METHODS or path_words.intersection(COMMIT_PATH_WORDS):
                method = request.method.upper()
                reason = "submit a form or change site data" if method in WRITE_METHODS else "continue to a purchase, booking, or confirmation step"
                if not await _ask_for_approval(task, method, url, reason):
                    await route.abort()
                    return
            await route.continue_()

        await page.route("**/*", guard)
        page.set_default_timeout(12000)
        try:
            await page.goto(task.request.site_url, wait_until="domcontentloaded", timeout=30000)
            task.page_url = page.url
            task.page_title = await page.title()
            screenshot = await page.screenshot(type="png")
            task.screenshot_data_url = "data:image/png;base64," + base64.b64encode(screenshot).decode("ascii")
            task.emit("browser_navigated", "Opened the site you supplied.", {"url": task.page_url})
            task.emit("screenshot_updated", "Initial browser screenshot captured.", {"page_title": task.page_title, "page_url": task.page_url})
            summary = await run_computer_use(page, task)
            task.page_url = page.url
            task.page_title = await page.title()
            screenshot = await page.screenshot(type="png")
            task.screenshot_data_url = "data:image/png;base64," + base64.b64encode(screenshot).decode("ascii")
            if task.status == "waiting_for_user":
                return
            normalized = summary.strip()
            marked_done = normalized.startswith("RESULT: DONE")
            marked_inconclusive = normalized.startswith("RESULT: INCONCLUSIVE")
            display_summary = normalized.split("\n", 1)[-1].strip() if (marked_done or marked_inconclusive) else normalized
            task.result = TaskResult(
                summary=display_summary or "The agent stopped without a clear completion summary.",
                verification_status="model_observed" if marked_done else "inconclusive",
                evidence=["A final screenshot was captured from the browser session.", "The result is based on visible page content and is not independently verified by the app."],
            )
            if marked_done:
                task.status = "completed"
                task.emit("task_completed", "The browser agent finished. Review its summary and screenshot.")
            else:
                task.status = "inconclusive"
                task.emit("task_inconclusive", "The browser agent did not report a clear result.")
        finally:
            await context.close()
            await browser.close()
