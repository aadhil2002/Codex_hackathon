# Northstar Market — Playwright shopping flow

Northstar Market is a self-contained sample storefront and Python Playwright automation for a complete shopping cart journey. The demo includes a product catalog, cart quantity updates/removal, required checkout fields, and an order confirmation. Orders are simulated locally; there is no payment processing or backend.

## Setup

Requirements: Python 3.9 or newer and pip. No API keys or environment variables are required.

```powershell
python -m pip install -r requirements.txt
python -m playwright install chromium
```

## Start the demo

Start the website in one terminal:

```powershell
python server.py
```

Open `http://127.0.0.1:8000` to use the storefront manually. Keep the server running and run the browser automation in a second terminal:

```powershell
python automate_cart.py
```

Use `python automate_cart.py --headed` to watch Chromium, or `--base-url http://127.0.0.1:8000` to target a different local instance.

## Demo walkthrough

The script opens the catalog, adds a mug and tote, opens the cart, changes the tote quantity, checks the total, fills the delivery form, submits the order, then checks the confirmation and emptied cart. The store uses browser local storage and a static product list. It is a local learning demo and does not save orders on a server or charge payments.

## Implementation notes

- **Stack:** Python standard library HTTP server, HTML/CSS/JavaScript, Python Playwright.
- **External APIs or datasets:** None.
- **Browser:** Chromium (installed with Playwright).
- **Checks:** The automation is provided as the end-to-end check; it has not been run in this session.

See [SUBMISSION.md](SUBMISSION.md) for the demo description and [AI_USAGE.md](AI_USAGE.md) and [CHANGELOG.md](CHANGELOG.md) for development records. Event requirements are in [RULES.md](RULES.md).
