# VocaPilot Shopping

A voice-first shopping assistant that uses OpenAI models to understand natural conversation, ask follow-up questions, match a request against live store listings, and check the rendered cart. Checkout remains disabled.

## Current baseline

Implemented: OpenAI Responses API chat and intent routing, model-based product matching against observed listings, OpenAI speech-to-text and text-to-speech, Playwright store interaction, FastAPI task state and SSE events, and the React chat workspace. Store URL and sign-in details are entered from the profile menu in the frontend. Credentials are held in tab memory, sent only for shopping requests, excluded from model prompts and task output, and cleared when a task ends. OpenAI Computer Use remains unimplemented.

## Prerequisites

- Python 3.11 or newer
- Node.js 20.19+ or 22.12+ and npm
- Chromium installed by Playwright
- An OpenAI API key with API access, plus network access to the OpenAI API and the public HTTPS store you select in the profile menu.

## Setup

1. Create and activate a virtual environment in `vocapilot/backend`.
2. Install backend dependencies: `python -m pip install -r requirements.txt`.
3. Install Chromium: `python -m playwright install chromium` (the headed browser opens as a separate window during a shopping task).
4. Copy `vocapilot/backend/.env.example` to `vocapilot/backend/.env` and set `OPENAI_API_KEY` (or `OPEN_API_KEY`, which is also accepted). Keep the key in this ignored local `.env`; never commit it. Restart the API after changing the key. Optional model overrides are `OPENAI_TEXT_MODEL`, `OPENAI_AUDIO_MODEL`, and `OPENAI_TTS_MODEL`.
5. In `vocapilot/frontend`, run `npm install`.

## Run

Run the API and UI in separate Windows PowerShell terminals. Start the API from `vocapilot/backend` with `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`. On Windows, do not use Uvicorn `--reload` or multiple workers: Playwright needs a Proactor event loop to launch Chromium, and Uvicorn switches to a selector loop when subprocess mode is enabled. Restart the API manually after backend code changes. Start the UI from `vocapilot/frontend` with `npm run dev -- --host 127.0.0.1` and open the Vite URL it prints.

The backend needs outbound access to `api.openai.com` and the public HTTPS store selected from the profile. A restricted IDE or agent terminal may block that traffic even when the app starts; run the API from a normal network-enabled Windows terminal. The backend accepts `OPENAI_API_KEY` or `OPEN_API_KEY`. If chat reports that the key was rejected, set a valid key in `vocapilot/backend/.env` and restart the API. Existing shell environment variables take precedence over `.env`; clear a stale `OPENAI_API_KEY` from the backend shell if it shadows the local value. OpenAI error details are sanitized so provider responses cannot expose key text to the browser. Playwright opens a separate Chromium window and slows browser actions by 700 ms by default; set `PLAYWRIGHT_SLOW_MO_MS` (0–3000) in the backend environment to adjust the pace. A verified cart stays visible for 3.5 seconds before the window closes.

Open the profile menu from the top-right account icon and enter a public HTTPS store URL plus optional account credentials. Credentials remain in this tab's memory and are cleared if the page is refreshed or closed. The first chat request contains no credentials. Only after chat routing identifies a shopping request does the frontend send the profile to the task endpoint; values are not included in the OpenAI prompt or task response. Chat naturally, for example “I need a lightweight backpack for commuting under $50” or “show me a black T-shirt.” The assistant matches product language against listings it can read on the selected store, then uses visible add/buy and cart controls. Press Enter to send, or Shift+Enter for a new line. Voice transcription and playback remain available. Progress appears in the chat and sidebar; the separate Chromium window shows the store being controlled. There is no embedded browser preview. Checkout is never opened.

Store automation uses common page semantics (visible product containers, prices, form fields, add/buy controls, and cart links). Stores with custom or inaccessible controls, multi-step identity flows, bot checks, or unusual cart layouts may stop without verification. Only public HTTPS origins are accepted; cross-site navigation is blocked. Product price formats must be recognizable. This is a generic best-effort workflow, not a guarantee of compatibility with every storefront.

## Checks

- Backend test suite: `python -m pytest -q` from `vocapilot/backend`. It was not rerun for the generic-store and profile changes in this revision.
- Frontend: `npm run build` from `vocapilot/frontend` (passed for this revision).
- The opt-in live browser check remains a separate SauceDemo-specific fixture; it was not run for the generic store workflow revision.

## Sources

- Playwright: https://playwright.dev/python/
- FastAPI: https://fastapi.tiangolo.com/
- React + Vite: https://vite.dev/guide/
- Test store used during initial development: https://www.saucedemo.com/
- OpenAI Python SDK and Responses API: https://developers.openai.com/api/docs/guides/text
- OpenAI speech transcription: https://developers.openai.com/api/docs/guides/speech-to-text
- OpenAI text-to-speech: https://developers.openai.com/api/docs/guides/text-to-speech
- OpenAI Computer Use guide (planned integration): https://developers.openai.com/api/docs/guides/tools-computer-use
- OpenAI CUA sample app (planned integration reference): https://github.com/openai/openai-cua-sample-app

See [RULES.md](RULES.md), [AI_USAGE.md](AI_USAGE.md), [CHANGELOG.md](CHANGELOG.md), and [SUBMISSION.md](SUBMISSION.md) for event requirements and project records.
