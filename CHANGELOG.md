# Change log

Record each meaningful project change newest first, with an actual timestamp and timezone.

## Event build log

## 2026-10-11T00:55:32+05:30 - Open a paced live browser window and clarify chat progress

- Changed: Launch Playwright Chromium visibly in its own window, slow actions by 700 ms by default (configurable with `PLAYWRIGHT_SLOW_MO_MS`), and leave a verified cart on screen for 3.5 seconds. Show each latest workflow event in an animated, readable chat status card. Clarified the separate live browser and screenshot preview behavior in README.
- Why: Make automation observable at a comfortable pace and keep task progress understandable in the conversation.
- Validation: Frontend production build passed; backend tests passed (14 passed, 1 opt-in live test skipped); `git diff --check` passed. A live API task opened SauceDemo, added the Sauce Labs Backpack, verified the cart, and returned the cart screenshot. The checkout was not opened.
- Limitations: The embedded preview still updates as screenshots rather than video; the standalone Chromium window closes shortly after verified completion.

## 2026-10-11T00:36:51+05:30 - Accept short chat turns and restore browser preview

- Changed: Allowed one-character shopping turns through task creation; report cart success only after rendered-cart verification; added workflow-stage failure messages; documented running Uvicorn without reload/workers on Windows so Playwright can launch Chromium.
- Why: The pasted traceback showed `TaskCreate` rejecting a valid one-character chat turn and crashing with an uncaught Pydantic error. On Windows, Uvicorn reload mode selected a selector loop that caused Playwright browser startup to fail before the first screenshot.
- Validation: Backend suite: 14 passed, 1 opt-in test skipped. Frontend production build passed. A live SauceDemo task completed with the Sauce Labs Backpack verified in the cart and returned a 46,615-character screenshot data URI for the preview.
- Limitations: The preview is a sequence of browser screenshots at workflow steps, not continuous video. Checkout was not opened.

## 2026-10-11T00:24:00+05:30 - Diagnose OpenAI chat failures and expose local servers

- Changed: Mapped rejected OpenAI credentials to a clear 503 response and sanitized other provider failures so raw upstream text cannot reach the browser. Added the documented `OPEN_API_KEY` fallback. Clarified that the backend needs outbound network access and should run in a normal Windows terminal when the IDE terminal is network-restricted. Opened visible backend and frontend PowerShell terminals.
- Why: The active backend returned 502 because a stale inherited `OPENAI_API_KEY` took precedence over the available `OPEN_API_KEY`; raw upstream error text could also reach the browser. The project documented the alias but the client did not read it.
- Validation: Backend suite passed (13 passed, 1 opt-in live test skipped); frontend production build passed. After clearing the stale inherited variable and adding alias support, a harmless live chat probe returned HTTP 200. API health and frontend returned HTTP 200.
- Limitations: Live SauceDemo shopping remains unverified. The visible backend terminal needs a restart if its key configuration changes.

## 2026-10-11T00:08:44+05:30 — Connect conversational text and voice models

- Changed: Replaced regex product intent parsing with OpenAI Responses API chat routing, short conversation history, natural-language follow-ups, and model-based matching against live observed store products. Added transcription, voice playback, configurable model names, and support for both `OPENAI_API_KEY` and the user's `OPEN_API_KEY` spelling. Replaced the UI's single fixed request with persistent conversation bubbles. Updated setup and submission notes.
- Why: Make VocaPilot respond conversationally and understand requests beyond fixed product keywords, with voice input and output.
- Validation: Frontend production build passed. Backend tests: 11 passed, 1 opt-in live test skipped; chat, product routing, transcription, and speech endpoints were exercised with mocks. OpenAI SDK 2.54.0 installed locally. `git diff --check` passed.
- Limitations: No API key has been configured in this workspace, so live model calls and SauceDemo shopping through the model path remain unverified. Voice capture is uploaded for transcription; voice responses play after the user selects Listen. No realtime audio conversation.

## 2026-10-10T23:52:06+05:30 — Fit workspace to viewport and smooth browser updates

- Changed: Made the desktop workspace fill the viewport without main-page scrolling; the session timeline now has its own scrollbar and smoothly follows new events. Enlarged the fixed browser panel, delayed screenshot display slightly and added subtle transitions. The browser now captures the post-login inventory and waits for the rendered cart item before its final screenshot. Updated demo instructions.
- Why: Keep chat, session progress, and the current store screen visible together while making updates easier to follow.
- Validation: Frontend `npm run build` passed; backend `python -m pytest -q` passed (9 passed, 1 opt-in live test skipped); `git diff --check` passed.
- Limitations: The preview remains a sequence of browser screenshots, not a live interactive video. Live SauceDemo access was not used for this change; the live browser test remains opt-in.

## 2026-10-10T23:40:03+05:30 — Rework shopping interface as a conversation

- Changed: Replaced the multi-card dashboard with a chat-centered layout: task messages and product/cart results appear above a pinned horizontal text/mic composer, progress events live in a left sidebar, and the live browser preview stays in a sticky right panel. Updated responsive layouts and README UI/demo description.
- Why: Make the request feel conversational while keeping task progress and the browser visible during shopping.
- Validation: `npm run build` from `vocapilot/frontend` passed (TypeScript and Vite production build).
- Limitations: The backend still exposes one active task per screen; previous independent shopping sessions are not persisted as chat history. Voice recording remains available but transcription is not enabled. The browser panel shows screenshots, not an interactive browser.

## 2026-10-10T23:20:55+05:30 — Install workspace runtime and run app

- Changed: Installed portable CPython 3.12.10, pip packages, and Playwright headless Chromium under ignored `.tools/`. Fixed intent parsing so negative checkout wording is allowed and product names stop before cart instructions. Updated setup/check commands and actual validation results in README and submission details.
- Why: The machine had no registered Python; the app needed an isolated local runtime to start its API and exercise the backend tests without a system-wide installation.
- Validation: Backend tests: 9 passed, 1 opt-in live-site test skipped. Playwright Chromium launched successfully. Frontend production build passed. Frontend and API health returned HTTP 200. Live SauceDemo shopping workflow was not run.
- Limitations: Voice transcription and OpenAI Computer Use remain incomplete. Live site automation was not verified; pytest emits a Starlette/httpx deprecation warning.

## 2026-10-10T22:51:54+05:30 — Ignore TypeScript build metadata

- Changed: Added a `.gitignore` rule for `*.tsbuildinfo`.
- Why: The TypeScript project build writes incremental metadata into the frontend folder; keep that generated state out of source control.
- Validation: Confirmed the production build had generated the untracked file and verified the ignore rule with Git.
- Limitations: None identified for this ignore rule.

## 2026-10-10T22:48:04+05:30 — Add VocaPilot deterministic shopping baseline

- Changed: Added a React + TypeScript + Vite shopping interface; FastAPI task endpoints, in-memory task state and SSE; fixed SauceDemo origin allowlist; actual inventory and cart DOM extraction; explicit cart verification; screenshots; cancellation and a 90-second task limit; starter unit and opt-in live-site tests. Updated README, ignore rules, and submission description.
- Why: Establish an end-to-end deterministic implementation path that does not require a model API key and never proceeds to checkout.
- Validation: Inspected clean git status before editing; confirmed Node 24.14.0 and npm 11.9.0. `npm install` completed with 0 reported vulnerabilities and `npm run build` passed. The first frontend build exposed three TypeScript issues; fixed them and rebuilt successfully. `git diff --check` reported no whitespace errors. Python and the `py` launcher are unavailable, so pytest and backend execution could not run. Inspected the current official OpenAI Computer Use guide and sample app for the later integration phase.
- Limitations: Live SauceDemo login and browser flow are not verified. Voice recording has no upload/transcription endpoint yet. OpenAI Computer Use, persistent storage, and an executed browser test remain incomplete. The app needs Python 3.11 and Chromium.
