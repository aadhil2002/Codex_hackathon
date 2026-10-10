# VocaPilot Shopping

A voice-friendly shopping assistant prototype that turns a typed request into a verified cart update on the SauceDemo test store. It reads product names and displayed prices from the real page and stops before checkout.

## Current baseline

Implemented: deterministic SauceDemo browser workflow, FastAPI task API with task state and SSE events, React conversation interface with a floating text/voice composer, progress sidebar, fixed live browser preview, screenshot preview, cancellation, and focused pytest coverage. Text requests are supported. Voice transcription and OpenAI Computer Use remain incomplete. The live SauceDemo browser test is opt-in.

## Prerequisites

- Python 3.11 or newer
- Node.js 20.19+ or 22.12+ and npm
- Chromium installed by Playwright
- Network access to `https://www.saucedemo.com/` for the live demo

The configured SauceDemo demo account defaults to `standard_user` / `secret_sauce`; override with environment variables if the public test site changes. These are public test-site credentials, not user credentials.

## Setup

1. Create and activate a virtual environment in `vocapilot/backend`.
2. Install backend dependencies: `python -m pip install -r requirements.txt`.
3. Install Chromium: `python -m playwright install chromium`.
4. Copy `vocapilot/backend/.env.example` to `.env` if overrides are needed. Do not put real credentials in this file.
5. In `vocapilot/frontend`, run `npm install`.

## Run

Start the API from `vocapilot/backend` with `python -m uvicorn app.main:app --reload --port 8000`.
Start the UI from `vocapilot/frontend` with `npm run dev` and open the Vite URL it prints.

Enter a request such as “Add one Sauce Labs Backpack to my cart and show me the verified cart contents. Do not check out.” The interface presents the request and assistant response as a conversation, streams task progress in a scrollable left sidebar, and keeps an enlarged browser screenshot panel fixed alongside it. The workspace fits the viewport; the conversation and progress feed scroll independently, and the composer remains at the bottom of the conversation pane. The screenshot preview updates after store login, item addition, and cart rendering. It shows images of the actual browser session, not an interactive browser. The app verifies the cart item and quantity from the rendered cart page and never submits checkout.

## Checks

- Backend tests: `python -m pytest -q` from `vocapilot/backend` (9 passed, 1 opt-in live test skipped).
- Frontend: `npm run build` from `vocapilot/frontend` (passed).
- Live browser test: set `RUN_LIVE_SAUCEDEMO=1` and run `python -m pytest -q tests/test_saucedemo_cart.py`; it has not been run yet.

## Sources

- Playwright: https://playwright.dev/python/
- FastAPI: https://fastapi.tiangolo.com/
- React + Vite: https://vite.dev/guide/
- Test store: https://www.saucedemo.com/
- OpenAI Computer Use guide (planned integration): https://developers.openai.com/api/docs/guides/tools-computer-use
- OpenAI CUA sample app (planned integration reference): https://github.com/openai/openai-cua-sample-app

See [RULES.md](RULES.md), [AI_USAGE.md](AI_USAGE.md), [CHANGELOG.md](CHANGELOG.md), and [SUBMISSION.md](SUBMISSION.md) for event requirements and project records.
