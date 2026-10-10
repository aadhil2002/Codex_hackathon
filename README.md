# VocaPilot Shopping

A voice-first shopping assistant that uses OpenAI models to understand natural conversation, find relevant live store listings, let the shopper choose an exact product, and verify it in the rendered cart. The browser remains on the cart so the shopper can proceed to checkout manually.

## Current baseline

Implemented: OpenAI chat and voice, live store product discovery, interactive product choice, store-listed size/color selection, and cart verification through Playwright. Store URLs and sign-in details are set in the frontend profile and sent to the backend only when a shopping request starts. They remain in memory during the interactive session and are cleared after completion or session expiry; they are never included in the model prompt or task response. After verifying the cart, the browser stays on the cart and the shopper proceeds to checkout manually.

## Prerequisites

- Python 3.11 or newer
- Node.js 20.19+ or 22.12+ and npm
- Chromium installed by Playwright
- An OpenAI API key with API access, plus network access to the OpenAI API and the public HTTPS store you select in the profile menu.

## Setup

1. Create and activate a virtual environment in `vocapilot/backend`.
2. Install backend dependencies: `python -m pip install -r requirements.txt`.
3. Install Chromium into the workspace cache from `vocapilot/backend` in Windows PowerShell: `$env:PLAYWRIGHT_BROWSERS_PATH = [IO.Path]::GetFullPath('..\..\.tools\playwright-browsers'); python -m playwright install chromium`. The app automatically uses this cache when it exists; the headed browser stays open while you review products and variants, then keeps the verified cart open for up to 10 minutes or until you close it.
4. Copy `vocapilot/backend/.env.example` to `vocapilot/backend/.env` and set `OPENAI_API_KEY` (or `OPEN_API_KEY`, which is also accepted). This OpenAI API key is required for chat, transcription, speech, and model-based product matching. The store email/password entered in the profile only sign in to the selected store; they do not provide OpenAI API access. Keep the key in this ignored local `.env`; never commit it. Restart the API after changing the key. Optional model overrides are `OPENAI_TEXT_MODEL`, `OPENAI_AUDIO_MODEL`, and `OPENAI_TTS_MODEL`.
5. In `vocapilot/frontend`, run `npm install`.

## Run

Run the API and UI in separate Windows PowerShell terminals. Start the API from `vocapilot/backend` with `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`. On Windows, do not use Uvicorn `--reload` or multiple workers: Playwright needs a Proactor event loop to launch Chromium, and Uvicorn switches to a selector loop when subprocess mode is enabled. Restart the API manually after backend code changes. Start the UI from `vocapilot/frontend` with `npm run dev -- --host 127.0.0.1` and open the Vite URL it prints.

The backend needs outbound access to `api.openai.com` and the public HTTPS store selected from the profile. A restricted IDE or agent terminal may block that traffic even when the app starts; run the API from a normal network-enabled Windows terminal. Connection, rejected-key, rate-limit/account-quota, permission, and unavailable-model errors are reported separately. The backend accepts `OPENAI_API_KEY` or `OPEN_API_KEY`. If chat reports that the key was rejected, set a valid key in `vocapilot/backend/.env` and restart the API. Existing shell environment variables take precedence over `.env`; if the `.env` key should be used, clear inherited values in the backend PowerShell terminal before starting Uvicorn:

```powershell
Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:OPEN_API_KEY -ErrorAction SilentlyContinue
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

OpenAI error details are sanitized so provider responses cannot expose key text to the browser. Playwright opens a separate Chromium window and slows browser actions by 700 ms by default; set `PLAYWRIGHT_SLOW_MO_MS` (0–3000) in the backend environment to adjust the pace. After cart verification, Playwright leaves the verified cart open in the headed browser for up to 10 minutes or until you close its window. Continue to checkout manually in that store window.

Open the profile menu from the top-right account icon and select a demo store or enter another public HTTPS store URL. The profile also accepts that store's email or username and password. The frontend sends these values in the shopping-task request to the backend; they are not loaded from `.env`, sent in the AI chat prompt, or returned in task data. They stay in this browser tab and backend memory for the active shopping session, then are cleared when the session finishes, is cancelled, or expires. The OpenAI API key remains a separate backend setting in `vocapilot/backend/.env`.

For an interactive search, type or say a request such as "I need a T-shirt." VocaPilot reads listings on the selected store's current page and displays matching items in a dedicated **Choose your product** panel. Select the exact listing you want; when its page lists sizes or colors, choose from those store-listed values. VocaPilot adds the selected item and verifies it in the cart. The browser remains on the cart so you can continue to checkout yourself. It does not click checkout or submit an order. Enter sends a message; Shift+Enter inserts a line break. Voice transcription and playback are also available. The progress sidebar shows each step, and the separate Chromium window shows the store. There is no embedded browser preview.

Store automation uses common page semantics (visible product containers, prices, form fields, add/buy controls, and cart links). Stores with custom or inaccessible controls, multi-step identity flows, bot checks, or unusual cart layouts may stop without verification. Only public HTTPS origins are accepted; cross-site navigation is blocked. Product price formats must be recognizable. This is a generic best-effort workflow, not a guarantee of compatibility with every storefront.

## Checks

- Backend syntax: `python -m compileall -q app` from `vocapilot/backend`.
- Frontend: `npm run build` from `vocapilot/frontend`.
- Product matching and cart verification are best-effort and vary by store. The verified cart is left open; you proceed through checkout manually.
- Product discovery is limited to listings visible on the current store page (up to 60); pagination is not automated. The generic variant and cart workflow has not been live-verified against every demo store.

## Sources

- Playwright: https://playwright.dev/python/
- FastAPI: https://fastapi.tiangolo.com/
- React + Vite: https://vite.dev/guide/
- SauceDemo: https://www.saucedemo.com/
- Automation Exercise practice shop: https://automationexercise.com/
- nopCommerce apparel demo: https://demo.nopcommerce.com/apparel
- Demoblaze product store: https://demoblaze.com/
- OpenAI Python SDK and Responses API: https://developers.openai.com/api/docs/guides/text
- OpenAI speech transcription: https://developers.openai.com/api/docs/guides/speech-to-text
- OpenAI text-to-speech: https://developers.openai.com/api/docs/guides/text-to-speech
- OpenAI Computer Use guide (planned integration): https://developers.openai.com/api/docs/guides/tools-computer-use
- OpenAI CUA sample app (planned integration reference): https://github.com/openai/openai-cua-sample-app

See [RULES.md](RULES.md), [AI_USAGE.md](AI_USAGE.md), [CHANGELOG.md](CHANGELOG.md), and [SUBMISSION.md](SUBMISSION.md) for event requirements and project records.
