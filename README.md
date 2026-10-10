# ShopPilot — DummyJSON shopping assistant

ShopPilot is a React storefront populated from the public [DummyJSON products API](https://dummyjson.com/products). The UI shows live products, images, prices, ratings, stock, category filtering, search, sorting, a shopping bag, and sample checkout. A chat assistant can find products from natural descriptions using OpenAI. Python Playwright tests automate the storefront UI and cover browsing, cart changes, and checkout.

DummyJSON is a public sample API. Orders are stored only in the local Flask process; checkout is a demo and takes no payment.

## Requirements

- Python 3.10 or newer and pip
- Node.js 20.19 or newer and npm
- Internet access to DummyJSON and its product image CDN
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

The Flask server fetches `https://dummyjson.com/products`, then the React storefront displays the returned catalog. Search, filter by category, sort, add/remove products, change quantities, and check out using sample delivery details. Product images load from the URLs included in the API response.

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

The model receives the current catalog's IDs, titles, descriptions, categories, brands, prices, stock, and tags. It decides which items fit a natural-language request and supplies selectable choices when it finds ambiguity. Flask validates every returned ID against the current API catalog and stock before adding anything to the bag. Without an API response, only an exact product title can be added.

- **HTTP 401:** Check the API key in the project-root `.env` and restart Flask.
- **HTTP 403:** Check the OpenAI project permissions and model access.
- **HTTP 429:** Check API usage limits and billing.

## Project files and limitations

- `frontend/` — React storefront and chat assistant.
- `backend/app.py` — Flask API, DummyJSON loader, cart/checkout state, and OpenAI integration.
- `tests/` — Python Playwright end-to-end and matching tests.
- `run_shoppilot.bat` — Windows launcher.

The app supports one local shopping session at a time. Products require the external DummyJSON API; images require the linked CDN. AI matching requires a working OpenAI API key and model access. The checkout is a local demo and does not submit an order to DummyJSON.

See [SUBMISSION.md](SUBMISSION.md), [AI_USAGE.md](AI_USAGE.md), and [CHANGELOG.md](CHANGELOG.md) for project and development records.
