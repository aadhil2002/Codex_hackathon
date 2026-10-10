"""Python Playwright end-to-end tests for the DummyJSON storefront UI."""
import os

import pytest
from playwright.sync_api import Page, expect, sync_playwright


BASE_URL = os.getenv("SHOPPILOT_UI_URL", "http://127.0.0.1:5173")


@pytest.fixture
def page(request: pytest.FixtureRequest) -> Page:
    with sync_playwright() as playwright:
        slow_mo = request.config.getoption("--slow-mo")
        browser = playwright.chromium.launch(headless=True, slow_mo=slow_mo)
        test_page = browser.new_page(viewport={"width": 1440, "height": 1000})
        try:
            yield test_page
        finally:
            browser.close()


def open_store(page: Page) -> None:
    page.goto(BASE_URL, wait_until="domcontentloaded")
    expect(page.get_by_role("heading", name="Shop all products")).to_be_visible(timeout=30_000)
    expect(page.get_by_test_id("product-card-1")).to_be_visible()


def test_live_dummyjson_products_render_in_store(page: Page) -> None:
    open_store(page)

    expect(page.get_by_role("heading", name="Essence Mascara Lash Princess")).to_be_visible()
    expect(page.get_by_text("beauty", exact=True).first).to_be_visible()


def test_search_and_category_filter_products(page: Page) -> None:
    open_store(page)

    page.get_by_test_id("product-search").fill("Essence Mascara Lash Princess")
    expect(page.get_by_test_id("product-card-1")).to_be_visible()
    expect(page.get_by_test_id("product-grid").locator(".product-card")).to_have_count(1)

    page.get_by_test_id("product-search").fill("")
    page.get_by_label("Filter category").select_option("beauty")
    expect(page.get_by_test_id("product-grid").locator(".product-card").first).to_contain_text("beauty")


def test_add_product_update_quantity_and_remove_from_cart(page: Page) -> None:
    open_store(page)
    page.get_by_test_id("add-to-cart-1").click()
    expect(page.get_by_test_id("open-cart")).to_contain_text("(1)")
    page.get_by_test_id("open-cart").click()
    expect(page.get_by_test_id("cart-item-1")).to_be_visible()
    page.get_by_role("button", name="Increase Essence Mascara Lash Princess quantity").click()
    expect(page.get_by_test_id("cart-item-1")).to_contain_text("2")
    page.get_by_role("button", name="Remove").click()
    expect(page.get_by_text("Your bag is empty.")).to_be_visible()


def test_complete_checkout_and_confirm_order(page: Page) -> None:
    open_store(page)
    page.get_by_test_id("add-to-cart-1").click()
    page.get_by_test_id("open-cart").click()
    page.get_by_test_id("checkout-button").click()

    page.get_by_test_id("checkout-first-name").fill("Alex")
    page.get_by_test_id("checkout-last-name").fill("Morgan")
    page.get_by_test_id("checkout-postal-code").fill("682001")
    page.get_by_role("button", name="Review order").click()
    expect(page.get_by_test_id("order-review")).to_contain_text("Essence Mascara Lash Princess")
    expect(page.get_by_test_id("order-review")).to_contain_text("$9.99")

    page.get_by_test_id("place-order").click()
    expect(page.get_by_test_id("order-confirmation")).to_contain_text("Thanks for shopping.")
