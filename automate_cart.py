"""Run a complete shopping cart and checkout flow with Python Playwright."""
import argparse
from playwright.sync_api import Page, expect, sync_playwright


def complete_purchase(page: Page, base_url: str) -> None:
    page.goto(base_url, wait_until="domcontentloaded")
    expect(page.get_by_role("heading", name="Everyday essentials")).to_be_visible()

    page.get_by_role("button", name="Add Ceramic Mug to cart").click()
    page.get_by_role("button", name="Add Canvas Tote to cart").click()
    expect(page.locator("#cart-count")).to_have_text("2")

    page.get_by_role("button", name="View cart").click()
    expect(page.get_by_text("$30.50", exact=True)).to_be_visible()
    page.get_by_label("Canvas Tote quantity").fill("2")
    expect(page.get_by_text("$48.50", exact=True)).to_be_visible()

    page.get_by_label("Full name").fill("Taylor Sample")
    page.get_by_label("Email").fill("taylor@example.com")
    page.get_by_label("Delivery address").fill("42 Demo Street, Kochi")
    page.get_by_role("button", name="Place order").click()

    expect(page.get_by_role("heading", name="Order confirmed")).to_be_visible()
    expect(page.get_by_text("Thanks, Taylor Sample!")).to_be_visible()
    expect(page.get_by_text("Order total: $48.50")).to_be_visible()
    expect(page.locator("#cart-count")).to_have_text("0")
    print("PASS: catalog -> add items -> edit quantity -> checkout -> confirmation")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--headed", action="store_true", help="Show the browser window")
    args = parser.parse_args()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=not args.headed)
        page = browser.new_page()
        try:
            complete_purchase(page, args.base_url)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
