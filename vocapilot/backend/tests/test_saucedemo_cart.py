import os

import pytest
from playwright.async_api import async_playwright

from app.playwright_shopping import allowed_store_url


def test_store_allowlist_rejects_other_origins_and_schemes():
    assert allowed_store_url("https://www.saucedemo.com/inventory.html")
    assert not allowed_store_url("https://example.com/")
    assert not allowed_store_url("https://www.saucedemo.com.example.net/")
    assert not allowed_store_url("https://user@www.saucedemo.com/")
    assert not allowed_store_url("javascript:alert(1)")
    assert not allowed_store_url("http://www.saucedemo.com/")


@pytest.mark.asyncio
@pytest.mark.skipif(os.getenv("RUN_LIVE_SAUCEDEMO") != "1", reason="Set RUN_LIVE_SAUCEDEMO=1 to use the public test store")
async def test_live_saucedemo_cart_addition_and_page_verification():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        page = await browser.new_page()
        await page.goto("https://www.saucedemo.com")
        await page.get_by_placeholder("Username").fill(os.getenv("SAUCEDEMO_USERNAME", "standard_user"))
        await page.get_by_placeholder("Password").fill(os.getenv("SAUCEDEMO_PASSWORD", "secret_sauce"))
        await page.get_by_role("button", name="Login").click()
        await page.wait_for_url("**/inventory.html")
        backpack = page.locator(".inventory_item").filter(has=page.get_by_text("Sauce Labs Backpack", exact=True))
        price = (await backpack.locator(".inventory_item_price").inner_text()).strip()
        await backpack.get_by_role("button", name="Add to cart").click()
        await page.locator(".shopping_cart_link").click()
        line = page.locator(".cart_item").filter(has=page.get_by_text("Sauce Labs Backpack", exact=True))
        assert await line.count() == 1
        assert await line.locator(".cart_quantity").inner_text() == "1"
        assert (await line.locator(".inventory_item_price").inner_text()).strip() == price
        assert await page.locator(".shopping_cart_badge").inner_text() == "1"
        await browser.close()
