"""Exact-title fallback when the OpenAI API cannot interpret a request."""
from backend import app as shop_app


def setup_function() -> None:
    shop_app.catalog = [{"id": 1, "title": "Essence Mascara Lash Princess", "stock": 99}]


def test_matches_full_catalog_title_case_insensitively() -> None:
    assert shop_app.find_exact_title("Add Essence Mascara Lash Princess") == [{"id": 1, "quantity": 1}]


def test_does_not_match_partial_product_keyword() -> None:
    assert shop_app.find_exact_title("Add mascara") == []


def test_reads_quantity_before_exact_title() -> None:
    assert shop_app.find_exact_title("Add 2 Essence Mascara Lash Princess") == [{"id": 1, "quantity": 2}]
