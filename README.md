# VocaPilot Shopping

A voice-first shopping assistant that uses OpenAI models to understand natural conversation, ask follow-up questions, match a request against live store listings, and check the rendered cart. Checkout remains disabled.

## Current baseline

Implemented: OpenAI Responses API chat and intent routing, OpenAI Computer Use API with local PyAutoGUI desktop actions, OpenAI speech-to-text and text-to-speech, FastAPI task state and SSE events, and a React workspace with a live embedded store beside chat. The user enters the store name and URL before chatting. Browse requests return visible product listings and leave the cart alone; cart changes run only for an explicit add-to-cart request. Optional sign-in details remain in tab memory and task memory; the model receives only `{{EMAIL}}` / `{{PASSWORD}}` markers, which the local action handler substitutes before typing. Credentials are cleared when a task ends.

## Prerequisites

- Python 3.11 or newer
- Node.js 20.19+ or 22.12+ and npm
- An interactive desktop session, default browser, and screen-control permission for PyAutoGUI
- An OpenAI API key with API access, plus network access to the OpenAI API and the public HTTPS store you select in the profile menu.

## Setup

1. Create and activate a virtual environment in `vocapilot/backend`.
2. Install backend dependencies: `python -m pip install -r requirements.txt`.
3. Copy `vocapilot/backend/.env.example` to `vocapilot/backend/.env` and set `OPENAI_API_KEY` (or `OPEN_API_KEY`, which is also accepted). Keep the key in this ignored local `.env`; never commit it. Restart the API after changing the key. Optional model overrides are `OPENAI_TEXT_MODEL`, `OPENAI_AUDIO_MODEL`, `OPENAI_TTS_MODEL`, and `OPENAI_COMPUTER_MODEL` (defaults to `gpt-6.1-sol`; the API project must have access to a computer-use-capable model).
4. In `vocapilot/frontend`, run `npm install`.

## Run

Run the API and UI in separate terminals. Start the API from `vocapilot/backend` with `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`. Keep the API in the logged-in desktop session because PyAutoGUI needs screen access. Start the UI from `vocapilot/frontend` with `npm run dev -- --host 127.0.0.1` and open the Vite URL it prints. Maximize that VocaPilot browser window and leave it visible while a task runs; pointer actions are constrained to the right-side store panel. Local Vite ports are accepted when 5173 is already in use.

The backend needs outbound access to `api.openai.com` and the public HTTPS store selected from the profile. A restricted IDE or agent terminal may block that traffic even when the app starts; run the API from a normal network-enabled desktop terminal. The backend accepts `OPENAI_API_KEY` or `OPEN_API_KEY`. If chat reports that the key was rejected, set a valid key in `vocapilot/backend/.env` and restart the API. Existing shell environment variables take precedence over `.env`; clear a stale `OPENAI_API_KEY` from the backend shell if it shadows the local value. OpenAI error details are sanitized so provider responses cannot expose key text to the browser. Computer actions are limited to 36 and the full task to 90 seconds. Scroll distances are converted to local wheel steps and capped at 1,000 distance units per action. The browser stays visible so the user can supervise it. On macOS, grant the terminal accessibility and screen-recording permissions requested by the OS.

Enter a store name and a public HTTPS store URL in the initial setup panel. The name and URL are saved in this browser; optional sign-in details are kept only in tab memory and sent to the task endpoint only when a store task starts. During computer interaction, full-desktop screenshots are sent to OpenAI; keep private windows and content out of view. The store must allow embedding by another website; DemoBlaze was checked in the workspace preview. Ask “list all phones” or “show me black T-shirts” to browse without changing the cart. Ask “add the Samsung phone to my cart” to request a cart change. Checkout and payment are never automated. Press Enter to send, or Shift+Enter for a new line. Voice transcription and playback remain available. The browser shows live store changes in the right five-sixths of the workspace.

Computer Use is visual and may misread small text, unusual layouts, or product variants. Product listings and cart verification are based on model-interpreted screenshots. Text entry currently supports ASCII only. Some stores block embedded previews, and the app does not yet enforce a network-level same-origin boundary after store navigation. Use a test store and supervise the visible browser. Do not use this demo for purchases, payments, or sensitive accounts.

## Checks

- Backend test suite: `python -m pytest -q` from `vocapilot/backend`.
- Frontend production build: `npm run build` from `vocapilot/frontend`.
- Automated browser actions are unit tested with a fake desktop adapter. DemoBlaze loaded in the embedded workspace preview; a live model-driven Computer Use task was not exercised during this code change.

## Sources

- OpenAI Computer Use: https://developers.openai.com/api/docs/guides/tools-computer-use
- PyAutoGUI: https://pyautogui.readthedocs.io/
- FastAPI: https://fastapi.tiangolo.com/
- React + Vite: https://vite.dev/guide/
- Test store used during initial development: https://www.saucedemo.com/
- OpenAI Python SDK and Responses API: https://developers.openai.com/api/docs/guides/text
- OpenAI speech transcription: https://developers.openai.com/api/docs/guides/speech-to-text
- OpenAI text-to-speech: https://developers.openai.com/api/docs/guides/text-to-speech
- OpenAI CUA sample app: https://github.com/openai/openai-cua-sample-app

See [RULES.md](RULES.md), [AI_USAGE.md](AI_USAGE.md), [CHANGELOG.md](CHANGELOG.md), and [SUBMISSION.md](SUBMISSION.md) for event requirements and project records.
