import re


def parse_intent(text: str) -> dict:
    normalized = " ".join(text.split())
    if not normalized:
        raise ValueError("Enter a shopping request first.")
    checkout_action = re.compile(r"\b(check ?out|place (an? )?order|buy it now|pay now)\b", re.I)
    for match in checkout_action.finditer(normalized):
        preceding = normalized[max(0, match.start() - 20):match.start()]
        if not re.search(r"(?:\bdo not|\bdon['’]t|\bnever|\bnot)\s*$", preceding, re.I):
            raise ValueError("This baseline can add an item to the cart, but it cannot check out or place an order.")
    exact = re.search(
        r"(sauce labs? [a-z][a-z -]{1,45}?)(?=\s+(?:to|for|under|below|less than|and|in my|into my|please|do not|don['’]t|never)\b|[,.!?]|$)",
        normalized,
        re.I,
    )
    category = "backpack" if re.search(r"\b(backpack|rucksack)\b", normalized, re.I) else None
    if not exact and not category:
        raise ValueError("For this baseline, ask for a Sauce Labs product or a backpack.")
    budget_match = re.search(r"(?:under|below|less than|budget of)\s*\$?\s*(\d+(?:\.\d{1,2})?)", normalized, re.I)
    return {
        "request": normalized,
        "requested_product": exact.group(1).strip() if exact else None,
        "category": category,
        "max_price": float(budget_match.group(1)) if budget_match else None,
        "quantity": 1,
        "checkout_allowed": False,
    }
