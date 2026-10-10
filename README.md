# VocaPilot Shopping

A voice-friendly shopping assistant prototype that turns a typed request into a verified cart update on the SauceDemo test store. It reads product names and displayed prices from the real page and stops before checkout.

## Current baseline

Implemented: deterministic SauceDemo browser workflow, FastAPI task API with task state and SSE events, React request/results/timeline/cart interface, screenshot preview, and cancellation. Text requests are supported. Voice recording, transcription, OpenAI Computer Use, and expanded test coverage remain incomplete.

## Prerequisites

- Python 3.11
- Node.js 20.19+ or 22.12+ and npm
- Chromium installed by Playwright
- Network access to `https://www.saucedemo.com/` for the live demo

The configured SauceDemo demo account defaults to `standard_user` / `secret_sauce`; override with environment variables if the public test site changes. These are public test-site credentials, not user credentials.

## Setup

1. Create and activate a virtual environment in `vocapilot/backend`.
2. Install backend dependencies: `pip install -r requirements.txt`.
3. Install Chromium: `playwright install chromium`.
4. Copy `vocapilot/backend/.env.example` to `.env` if overrides are needed. Do not put real credentials in this file.
5. In `vocapilot/frontend`, run `npm install`.

## Run

Start the API from `vocapilot/backend` with `uvicorn app.main:app --reload --port 8000`.
Start the UI from `vocapilot/frontend` with `npm run dev` and open the Vite URL it prints.

Enter a request such as “Add one Sauce Labs Backpack to my cart and show me the verified cart contents. Do not check out.” The screenshot preview is an image of the actual browser session, not an interactive browser. The app verifies the cart item and quantity from the rendered cart page and never submits checkout.

## Checks

- Backend tests: `pytest` (pending; Python is not installed in this implementation environment).
- Frontend: `npm run build` (pending).
- Browser workflow: `pytest` live SauceDemo test (requires network and Chromium; pending).

## Sources

- Playwright: https://playwright.dev/python/
- FastAPI: https://fastapi.tiangolo.com/
- React + Vite: https://vite.dev/guide/
- Test store: https://www.saucedemo.com/
- OpenAI Computer Use guide (planned integration): https://developers.openai.com/api/docs/guides/tools-computer-use
- OpenAI CUA sample app (planned integration reference): https://github.com/openai/openai-cua-sample-app

See [RULES.md](RULES.md), [AI_USAGE.md](AI_USAGE.md), [CHANGELOG.md](CHANGELOG.md), and [SUBMISSION.md](SUBMISSION.md) for event requirements and project records.
