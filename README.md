# VocaPilot Shopping

A voice-first shopping chatbot that uses OpenAI models to understand natural conversation, ask follow-up questions, match a request against live SauceDemo inventory, and verify a cart update. Checkout remains disabled.

## Current baseline

Implemented: OpenAI Responses API chat and intent routing, model-based product matching against observed inventory, OpenAI speech-to-text and text-to-speech, deterministic SauceDemo cart verification, FastAPI task state and SSE events, and the React chat workspace. OpenAI Computer Use remains unimplemented. The live SauceDemo browser test is opt-in.

## Prerequisites

- Python 3.11 or newer
- Node.js 20.19+ or 22.12+ and npm
- Chromium installed by Playwright
- An OpenAI API key with API access, plus network access to the OpenAI API and `https://www.saucedemo.com/`

The configured SauceDemo demo account defaults to `standard_user` / `secret_sauce`; override with environment variables if the public test site changes. These are public test-site credentials, not user credentials.

## Setup

1. Create and activate a virtual environment in `vocapilot/backend`.
2. Install backend dependencies: `python -m pip install -r requirements.txt`.
3. Install Chromium: `python -m playwright install chromium`.
4. Copy `vocapilot/backend/.env.example` to `vocapilot/backend/.env` and set `OPENAI_API_KEY` (or `OPEN_API_KEY`, which is also accepted). Keep the key in this ignored local `.env`; never commit it. Restart the API after changing the key. Optional model overrides are `OPENAI_TEXT_MODEL`, `OPENAI_AUDIO_MODEL`, and `OPENAI_TTS_MODEL`.
5. In `vocapilot/frontend`, run `npm install`.

## Run

Start the API from `vocapilot/backend` with `python -m uvicorn app.main:app --reload --port 8000`.
Start the UI from `vocapilot/frontend` with `npm run dev` and open the Vite URL it prints.

Chat naturally, for example “I need a lightweight backpack for commuting under $50.” VocaPilot can ask a follow-up or start a shopping task; when it has a match, it checks the real inventory, adds one item, and verifies the rendered cart. Use the mic to record a request; the transcript appears in the composer for review before sending. Use Listen on an assistant reply for generated voice playback. The interface streams task progress in the scrollable sidebar and displays browser screenshots from the actual session. The browser panel is a screenshot preview rather than an interactive browser. Checkout is never opened.

## Checks

- Backend tests: `python -m pytest -q` from `vocapilot/backend` (11 passed, 1 opt-in live test skipped; OpenAI calls mocked).
- Frontend: `npm run build` from `vocapilot/frontend` (passed).
- Live browser test: set `RUN_LIVE_SAUCEDEMO=1` and run `python -m pytest -q tests/test_saucedemo_cart.py`; it has not been run yet.

## Sources

- Playwright: https://playwright.dev/python/
- FastAPI: https://fastapi.tiangolo.com/
- React + Vite: https://vite.dev/guide/
- Test store: https://www.saucedemo.com/
- OpenAI Python SDK and Responses API: https://developers.openai.com/api/docs/guides/text
- OpenAI speech transcription: https://developers.openai.com/api/docs/guides/speech-to-text
- OpenAI text-to-speech: https://developers.openai.com/api/docs/guides/text-to-speech
- OpenAI Computer Use guide (planned integration): https://developers.openai.com/api/docs/guides/tools-computer-use
- OpenAI CUA sample app (planned integration reference): https://github.com/openai/openai-cua-sample-app

See [RULES.md](RULES.md), [AI_USAGE.md](AI_USAGE.md), [CHANGELOG.md](CHANGELOG.md), and [SUBMISSION.md](SUBMISSION.md) for event requirements and project records.
