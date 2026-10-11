# ShopPilot — live catalog shopping assistant

ShopPilot is a React storefront populated from a public product catalog API. The UI presents each live item in a product card with a category badge, contained image, brand, name, description, rating, stock, price, and add-to-bag action. It also includes category filtering, search, sorting, a shopping bag, and sample checkout. A chat assistant can find products from natural descriptions, add them to the bag, reduce item quantities, and remove items. Python Playwright tests automate the storefront UI and cover browsing, cart changes, and checkout.

The storefront is branded as **The Everyday Edit**, and the chat opens with a ShopPilot welcome and starter requests. On desktop, the app fits the viewport without page-level vertical scrolling; the conversation and product catalog scroll inside their panels as needed.

The assistant is voice-first: select **Tap to speak**, allow microphone access, and say what you need. It keeps listening through short pauses and submits after three seconds of silence; tap the microphone control to submit sooner. Assistant replies have a **Listen to reply** control that speaks the response, product suggestions, or comparison summary using the browser's available English voice at a slightly slower, conversational pace. A text input is also visible directly below the voice control. Voice input and output depend on browser support and microphone permission.

When you ask the assistant to list or browse products, it presents visual product cards with images, names, descriptions, and prices. If the model replies with a numbered catalog list, Flask converts that response to the same visual cards.

The product catalog is a public sample API. Orders are stored only in the local Flask process; checkout is a demo and takes no payment.

## Requirements

- Python 3.10 or newer and pip
- Node.js 20.19 or newer and npm
- Internet access to the product catalog API and its image CDN
- An OpenAI API key with API billing enabled for natural-language product matching (optional for browsing and exact-title matching)

## Install

From the project folder:

```powershell
python -m pip install -r requirements.txt
python -m playwright install chromium
Copy-Item .env.example .env
cd frontend
npm install
```

To enable natural-language chat, create an API key in the [OpenAI API platform](https://platform.openai.com/api-keys) and set `OPENAI_API_KEY` in the project-root `.env` file. Flask reads the key; it is not sent to React. `OPENAI_MODEL` can optionally select a model. API use is billed separately from ChatGPT; check [OpenAI API billing](https://help.openai.com/en/articles/9039756-managing-billing-settings-on-the-chatgpt-web-and-api-platform).

Without an OpenAI key, browsing and checkout still work. The chat fallback requires a full exact product title.

## Run the storefront

On Windows, double-click `run_shoppilot.bat` to start Flask and Vite. Keep both terminal windows open and visit **http://127.0.0.1:5173**.

Or start two terminals from the project folder.

Terminal 1:

```powershell
python backend/app.py
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

The Flask server fetches the public catalog's `/products` endpoint, then the React storefront displays the returned items. Search, filter by category, sort, add/remove products, change quantities, and check out using sample delivery details. Product images load from the URLs included in the API response.

## Run the Python Playwright tests

Start both servers as described above, then run this in a third terminal from the project folder:

```powershell
python -m pytest -v
```

The tests use headless Chromium and automate the running UI at `http://127.0.0.1:5173`. Set `SHOPPILOT_UI_URL` to use a different UI address. To adjust action pacing, pass `--slow-mo 300` (milliseconds):

```powershell
python -m pytest -v --slow-mo 300
```

Build the frontend production bundle with:

```powershell
cd frontend
npm run build
```

## OpenAI behavior

The model receives the current catalog's IDs, titles, descriptions, categories, brands, prices, stock, and tags, plus the current cart. It decides which items fit a natural-language request and supplies selectable choices when it finds ambiguity. Selecting one of those product cards applies its displayed add, remove, or decrement action directly to that exact product, then confirms the cart update in chat. You can ask the assistant to compare two or three products by name; it returns an API-backed side-by-side view with SKU, tags, price, discount, rating, availability, brand, category, shipping, returns, warranty, dimensions, weight, minimum order quantity, and available review snippets. The compare suggestion in the welcome panel starts that conversation. Product comparison uses extra fields from the live catalog response; it does not require another external API. Reviewer emails are omitted from the storefront response. You can also ask it to add a product, reduce its quantity by one, or remove it by name or description; quantity changes and removals are limited to items already in the bag. Browse requests return visual product cards; a numbered text catalog response is also normalized to those cards. Flask validates returned IDs against the current API catalog and cart before changing the bag. Without an API response, add/remove/decrement requests require an exact product title, and compare requests require exact product titles.

- **HTTP 401:** Check the API key in the project-root `.env` and restart Flask.
- **HTTP 403:** Check the OpenAI project permissions and model access.
- **HTTP 429:** Check API usage limits and billing.

## Project files and limitations

- `frontend/` — React storefront and chat assistant.
- `backend/app.py` — Flask API, live catalog loader, cart/checkout state, and OpenAI integration.
- `tests/` — Python Playwright end-to-end and matching tests.
- `run_shoppilot.bat` — Windows launcher.

The app supports one local shopping session at a time. Products require the external product catalog API; images require the linked CDN. AI matching requires a working OpenAI API key and model access. The checkout is a local demo and does not send orders to the external catalog service.

See [SUBMISSION.md](SUBMISSION.md), [AI_USAGE.md](AI_USAGE.md), and [CHANGELOG.md](CHANGELOG.md) for project and development records.
