"""Flask API for the DummyJSON storefront and its shopping assistant."""
import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from openai import APIStatusError, OpenAI, OpenAIError


DUMMYJSON_PRODUCTS_URL = "https://dummyjson.com/products"
load_dotenv()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")

app = Flask(__name__)
catalog = []
cart = {}
phase = "idle"
conversation = []
ai_status = "missing_key"
ai_error_detail = ""


def product_for_id(product_id):
    return next((product for product in catalog if product["id"] == product_id), None)


def cart_items():
    return [{"product": product_for_id(int(product_id)), "quantity": quantity}
            for product_id, quantity in cart.items() if product_for_id(int(product_id))]


def cart_count():
    return sum(cart.values())


def cart_total():
    return round(sum(item["product"]["price"] * item["quantity"] for item in cart_items()), 2)


def payload(message="", *, choices=None):
    data = {
        "message": message,
        "phase": phase,
        "products": catalog,
        "cart": cart_items(),
        "cartCount": cart_count(),
        "cartTotal": cart_total(),
        "aiStatus": ai_status,
    }
    if choices:
        data["choices"] = choices
    return data


def fetch_catalog():
    """Load products from the public DummyJSON endpoint and keep UI/LLM fields."""
    req = Request(DUMMYJSON_PRODUCTS_URL, headers={"User-Agent": "ShopPilot/1.0"})
    with urlopen(req, timeout=20) as response:
        result = json.loads(response.read().decode("utf-8"))
    products = result.get("products") if isinstance(result, dict) else None
    if not isinstance(products, list) or not products:
        raise ValueError("DummyJSON returned no products.")
    required = ("id", "title", "description", "category", "price", "stock", "thumbnail")
    normalized = []
    for item in products:
        if not isinstance(item, dict) or not all(key in item for key in required):
            continue
        normalized.append({key: item.get(key) for key in (
            "id", "title", "description", "category", "price", "discountPercentage",
            "rating", "stock", "brand", "thumbnail", "images", "availabilityStatus", "tags"
        )})
    if not normalized:
        raise ValueError("DummyJSON products did not contain the required product fields.")
    return normalized


def find_exact_title(message):
    """Exact-title-only fallback for use when OpenAI cannot be called."""
    matches = []
    lowered = message.casefold()
    for product in catalog:
        if product["title"].casefold() in lowered:
            match = re.search(rf"(?<!\w){re.escape(product['title'].casefold())}(?!\w)", lowered)
            before = lowered[:match.start()] if match else ""
            quantity_match = re.search(r"(\d+)\s*(?:x\s*)?$", before)
            quantity = min(5, max(1, int(quantity_match.group(1)))) if quantity_match else 1
            matches.append({"id": product["id"], "quantity": quantity})
    return matches


def interpret_with_gpt(message):
    """Use OpenAI to interpret intent only against the current DummyJSON catalog."""
    global ai_status
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        ai_status = "missing_key"
        return None

    model_catalog = [{key: product.get(key) for key in (
        "id", "title", "description", "category", "price", "stock", "brand", "tags"
    )} for product in catalog]
    instructions = (
        "You are ShopPilot, a shopping assistant for the store described by the live catalog. "
        "Interpret the user's latest message using the recent conversation and catalog. You decide which "
        "catalog products fit the request; do not use fixed keyword matching rules. Product selections must "
        "use catalog IDs exactly as provided. For an unambiguous add request, return one product ID and a "
        "quantity from 1 to 5. If a broad request could mean more than one item, return intent clarify, no "
        "products, and the plausible catalog IDs in options; the user will choose. Never add all possible "
        "matches for an ambiguous request. For requests that explicitly name multiple products, return those "
        "IDs only. Never invent products, IDs, prices, or stock. If a requested product is out of stock, say so. "
        "Recognize checkout intent. For unrelated requests, explain briefly that you can help shop this catalog. "
        "Respond as strict JSON with keys intent, products, options, and reply. Do not claim cart changes unless "
        "the application confirms them.\n\n"
        f"Live product catalog: {json.dumps(model_catalog)}\n"
        f"Current cart: {json.dumps([{ 'id': item['product']['id'], 'title': item['product']['title'], 'quantity': item['quantity']} for item in cart_items()])}"
    )
    schema = {
        "type": "object",
        "properties": {
            "intent": {"type": "string", "enum": ["add", "checkout", "chat", "clarify"]},
            "products": {"type": "array", "items": {
                "type": "object", "properties": {
                    "id": {"type": "integer", "minimum": 1},
                    "quantity": {"type": "integer", "minimum": 1, "maximum": 5},
                }, "required": ["id", "quantity"], "additionalProperties": False,
            }},
            "options": {"type": "array", "items": {"type": "integer", "minimum": 1}},
            "reply": {"type": "string"},
        },
        "required": ["intent", "products", "options", "reply"],
        "additionalProperties": False,
    }
    response = OpenAI(api_key=api_key, timeout=30.0, max_retries=1).responses.create(
        model=OPENAI_MODEL,
        instructions=instructions,
        input=[*conversation[-8:], {"role": "user", "content": message}],
        text={"format": {"type": "json_schema", "name": "shopping_intent", "strict": True, "schema": schema}},
        max_output_tokens=500,
        store=False,
    )
    if not response.output_text:
        raise ValueError("OpenAI returned no structured shopping response.")
    result = json.loads(response.output_text)
    if result.get("intent") not in {"add", "checkout", "chat", "clarify"}:
        raise ValueError("OpenAI returned an invalid shopping response.")
    ai_status = "ready"
    return result


def valid_model_products(result):
    valid = []
    for choice in result.get("products", []):
        if not isinstance(choice, dict):
            continue
        product = product_for_id(choice.get("id"))
        quantity = choice.get("quantity", 1)
        if product and isinstance(quantity, int) and not isinstance(quantity, bool) and product["stock"] > 0:
            valid.append((product, min(5, max(1, quantity))))
    return valid


def valid_model_options(result):
    return [product_for_id(product_id) for product_id in result.get("options", [])
            if isinstance(product_id, int) and product_for_id(product_id)
            and product_for_id(product_id)["stock"] > 0]


def add_product(product, quantity=1):
    product_id = str(product["id"])
    current = cart.get(product_id, 0)
    cart[product_id] = min(product["stock"], current + quantity)


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    app.logger.exception("ShopPilot request failed")
    return jsonify({"error": f"Shopping request failed: {error}"}), 500


@app.post("/api/start")
def start():
    global catalog, cart, phase, conversation, ai_status, ai_error_detail
    try:
        catalog = fetch_catalog()
    except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
        return jsonify({"error": f"Could not load products from DummyJSON: {error}"}), 502
    cart = {}
    phase = "shop"
    conversation = []
    ai_status = "configured" if os.getenv("OPENAI_API_KEY") else "missing_key"
    ai_error_detail = ""
    return jsonify(payload("Welcome! Browse the DummyJSON catalog, add items directly, or tell me what you are looking for."))


@app.post("/api/chat")
def chat():
    global phase, conversation, ai_status, ai_error_detail
    if phase != "shop":
        return jsonify({"error": "Start or reset the shopping session before chatting."}), 409
    message = str((request.get_json(silent=True) or {}).get("message", "")).strip()
    if not message:
        return jsonify({"error": "Write or say what you are looking for first."}), 400
    try:
        result = interpret_with_gpt(message)
    except APIStatusError as error:
        ai_status = "unauthorized" if error.status_code == 401 else "forbidden" if error.status_code == 403 else "rate_limited" if error.status_code == 429 else "unavailable"
        ai_error_detail = re.sub(r"sk-[A-Za-z0-9_-]+", "[redacted]", str(error.message))[:300]
        app.logger.warning("OpenAI request failed with HTTP %s: %s", error.status_code, ai_error_detail)
        result = None
    except (OpenAIError, OSError, ValueError, KeyError, TypeError) as error:
        ai_status = "unavailable"
        ai_error_detail = str(error)[:300]
        app.logger.warning("OpenAI request failed: %s", ai_error_detail)
        result = None

    if result is None:
        matches = find_exact_title(message)
        result = {"intent": "add" if len(matches) == 1 else "clarify", "products": matches[:1],
                  "options": [item["id"] for item in matches] if len(matches) > 1 else [], "reply": ""}
    conversation.append({"role": "user", "content": message})

    if result["intent"] == "checkout":
        if not cart:
            answer = "Your cart is empty. Add a product before checking out."
        else:
            phase = "checkout"
            answer = "Your cart is ready. Enter your sample delivery details to review the order."
        conversation.append({"role": "assistant", "content": answer})
        return jsonify(payload(answer))

    if result["intent"] == "clarify":
        options = valid_model_options(result)
        if options:
            answer = result.get("reply") or "Which one would you like? Select a product to add it to your cart."
            conversation.append({"role": "assistant", "content": answer})
            return jsonify(payload(answer, choices=[product["id"] for product in options]))

    if result["intent"] != "add":
        answer = result.get("reply") or "Tell me what you would like from the product catalog."
        if ai_status == "missing_key":
            answer += " AI matching needs OPENAI_API_KEY; without it, enter an exact product title."
        elif ai_status in {"unauthorized", "forbidden", "rate_limited", "unavailable"}:
            answer += f" OpenAI status: {ai_status}. Without an API response, enter an exact product title."
        conversation.append({"role": "assistant", "content": answer})
        return jsonify(payload(answer))

    matches = valid_model_products(result)
    if len(matches) > 1:
        answer = "I found a few possible matches. Choose one to add it to your cart."
        conversation.append({"role": "assistant", "content": answer})
        return jsonify(payload(answer, choices=[product["id"] for product, _ in matches]))
    if not matches:
        answer = result.get("reply") or "I couldn't match that to an available product. Try another description or select an item from the catalog."
        conversation.append({"role": "assistant", "content": answer})
        return jsonify(payload(answer))

    product, quantity = matches[0]
    add_product(product, quantity)
    answer = f"Added {quantity} × {product['title']}. Your cart has {cart_count()} item(s)."
    if ai_status != "ready":
        answer += " I used the exact product title because OpenAI was unavailable."
    conversation.append({"role": "assistant", "content": answer})
    return jsonify(payload(answer))


@app.post("/api/cart")
def update_cart():
    if phase != "shop":
        return jsonify({"error": "Cart changes are available while browsing."}), 409
    body = request.get_json(silent=True) or {}
    product = product_for_id(body.get("productId"))
    action = body.get("action")
    if not product:
        return jsonify({"error": "That product is not in the current catalog."}), 404
    product_id = str(product["id"])
    if action == "add":
        if product["stock"] < 1:
            return jsonify({"error": "This item is out of stock."}), 409
        cart[product_id] = min(product["stock"], cart.get(product_id, 0) + 1)
    elif action == "remove":
        cart.pop(product_id, None)
    elif action == "quantity":
        try:
            quantity = int(body.get("quantity", 0))
        except (ValueError, TypeError):
            quantity = 0
        if quantity <= 0:
            cart.pop(product_id, None)
        else:
            cart[product_id] = min(product["stock"], quantity)
    else:
        return jsonify({"error": "Choose add, remove, or quantity."}), 400
    return jsonify(payload())


@app.post("/api/begin-checkout")
def begin_checkout():
    global phase
    if not cart:
        return jsonify({"error": "Add a product before checking out."}), 409
    phase = "checkout"
    return jsonify(payload("Your cart is ready. Enter your sample delivery details."))


@app.post("/api/checkout")
def checkout():
    global phase
    if phase != "checkout" or not cart:
        return jsonify({"error": "Add products and open checkout before continuing."}), 409
    details = request.get_json(silent=True) or {}
    first_name = str(details.get("firstName", "")).strip()
    last_name = str(details.get("lastName", "")).strip()
    postal_code = str(details.get("postalCode", "")).strip()
    if not all((first_name, last_name, postal_code)):
        return jsonify({"error": "Please provide first name, last name, and postal code."}), 400
    phase = "review"
    return jsonify(payload(f"Order review for {first_name} {last_name}. Total: ${cart_total():.2f}."))


@app.post("/api/order")
def place_order():
    global phase
    if phase != "review":
        return jsonify({"error": "Complete the delivery details before placing the order."}), 409
    phase = "complete"
    return jsonify(payload("Order confirmed! This is a demo store; no payment was taken."))


@app.post("/api/reset")
def reset():
    return start()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, threaded=False)
