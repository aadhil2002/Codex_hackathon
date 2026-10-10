from app.schemas import Product, TaskResult


def verify_cart_contents(selected: Product, cart_lines: list[dict], badge_count: int | None) -> TaskResult:
    evidence = [f"Rendered cart contained {len(cart_lines)} line item(s)."]
    matching = [line for line in cart_lines if line.get("name") == selected.name]
    quantity = None
    price = None
    verified = len(matching) == 1 and len(cart_lines) == 1
    if len(matching) == 1:
        line = matching[0]
        quantity = line.get("quantity")
        price = line.get("price")
        evidence.extend([f"Cart line shows {selected.name}.", f"Rendered quantity is {quantity}.",
                         f"Cart line displayed price is {price}."])
        verified = verified and quantity == 1 and price == selected.displayed_price
    evidence.append(f"Cart badge showed {badge_count if badge_count is not None else 'no readable count'} item(s).")
    verified = verified and badge_count == 1
    return TaskResult(selected_product=selected, quantity=quantity, displayed_price=price,
                      subtotal=price if verified else None, cart_count=badge_count,
                      verification_status="verified" if verified else "inconclusive", evidence=evidence)
