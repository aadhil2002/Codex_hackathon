from app.schemas import Product
from app.verification import verify_cart_contents

BACKPACK = Product(name="Sauce Labs Backpack", displayed_price="$29.99", price_value=29.99)


def test_verifies_product_quantity_price_and_badge():
    result = verify_cart_contents(BACKPACK, [{"name": "Sauce Labs Backpack", "quantity": 1, "price": "$29.99"}], 1)
    assert result.verification_status == "verified"
    assert result.subtotal == "$29.99"
    assert result.evidence


def test_wrong_product_or_quantity_is_inconclusive():
    result = verify_cart_contents(BACKPACK, [{"name": "Sauce Labs Backpack", "quantity": 2, "price": "$29.99"}], 2)
    assert result.verification_status == "inconclusive"
    assert result.subtotal is None


def test_empty_cart_is_inconclusive():
    result = verify_cart_contents(BACKPACK, [], None)
    assert result.verification_status == "inconclusive"
