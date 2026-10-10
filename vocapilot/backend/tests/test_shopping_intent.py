import pytest

from app.shopping_intent import parse_intent


def test_named_backpack_request_is_one_item_without_checkout():
    intent = parse_intent("Add one Sauce Labs Backpack to my cart. Do not check out.")
    assert intent["requested_product"].casefold() == "sauce labs backpack"
    assert intent["quantity"] == 1
    assert intent["checkout_allowed"] is False


def test_everyday_backpack_request_and_budget_are_parsed():
    intent = parse_intent("Find a backpack for everyday use under $40 and add the cheapest one.")
    assert intent["category"] == "backpack"
    assert intent["max_price"] == 40


def test_checkout_is_rejected():
    with pytest.raises(ValueError, match="cannot check out"):
        parse_intent("Buy the Sauce Labs Backpack and place an order")
