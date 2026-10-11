# Change log

Record each meaningful project change newest first, with an actual timestamp and timezone.

## Event build log

## 2026-10-11T05:15:13+05:30 - Cap large Computer Use scroll requests

- Changed: Convert API scroll distances into PyAutoGUI wheel steps, cap large finite requests to the safe per-action maximum, and reject malformed or non-finite values. Added regression tests for conversion, capping, and invalid values.
- Why: A follow-up DemoBlaze attempt showed that rejecting requests above 1,000 distance units still stopped product listing. Capping lets the task continue with bounded movement.
- Validation: Backend suite: 34 passed, 1 legacy Playwright module skipped; `git diff --check` passed.
- Limitations: The scroll distance conversion is approximate because local wheel behavior varies by operating system and browser; live DemoBlaze automation has not yet been rerun.

## 2026-10-11T04:58:12+05:30 - Restructure workspace for live store browsing

- Changed: Added a first-run store name and URL setup, a one-sixth chat pane with a five-sixths embedded live store pane, browse-only product results that explicitly leave the cart unchanged, and add-to-cart routing only for explicit requests. Computer Use now acts in the visible store panel, returns structured product listings for browse tasks, and limits pointer coordinates to that panel. Added local Vite-port CORS support and updated setup documentation. Kept the old `App.tsx`, `style.css`, and Playwright implementation files in place.
- Why: Make store selection the first step, keep browsing separate from cart changes, and let shoppers see the live store beside chat.
- Validation: Backend suite: 27 passed, 1 legacy Playwright module skipped; frontend production build passed; `git diff --check` passed. The local workspace visually loaded DemoBlaze in the embedded panel, with the requested chat/store split.
- Limitations: Live model-driven computer actions were not run. Stores that block iframe embedding cannot be shown in the workspace; actions still require a visible, maximized desktop browser and macOS screen and accessibility permissions.

## 2026-10-11T04:28:02+05:30 - Keep Computer Use tab switching in the browser

- Changed: Translated Meta/Cmd/Command+Tab into Ctrl+Tab for browser tab cycling, and added tests for the mapping. Updated `vocapilot/backend/app/computer_use_shopping.py`, `vocapilot/backend/tests/test_computer_use.py`, `README.md`, and `AI_USAGE.md`.
- Why: A live DemoBlaze task requested Meta+Tab, which would switch macOS apps if passed through directly and was rejected by the keyboard safety allowlist.
- Validation: Backend suite: 24 passed, 1 legacy Playwright module skipped; `git diff --check` passed. The live DemoBlaze task was not rerun.
- Limitations: The model's intent for the shortcut is inferred as browser tab cycling; the app keeps control within browser tabs by translating it to Ctrl+Tab.

## 2026-10-11T04:08:58+05:30 - Allow browser find shortcuts during Computer Use

- Changed: Allowed Ctrl/Command+F for browser find and included the rejected key names in unsafe keyboard shortcut errors. Added coverage for Ctrl/Command find shortcuts and documented the shortcut boundary. Updated `vocapilot/backend/app/computer_use_shopping.py`, `vocapilot/backend/tests/test_computer_use.py`, `README.md`, and `AI_USAGE.md`.
- Why: A live Demoblaze session stopped when the model requested a find shortcut that the desktop action allowlist rejected without naming the key.
- Validation: Backend suite: 21 passed, 1 legacy Playwright module skipped; `git diff --check` passed. Live site behavior was not re-run.
- Limitations: The actual rejected key from the earlier task was not logged, so this change supports the common browser find shortcut and improves diagnostics for any other unsupported shortcut.

## 2026-10-11T02:39:02+05:30 - Replace Playwright shopping with OpenAI Computer Use

- Changed: Replaced the active Playwright shopping route with a Responses API `computer` tool loop backed by local PyAutoGUI screenshots and input; added bounded action/turn/time handling, screenshot coordinate scaling, non-blocking local input execution, local credential marker substitution, model-reported cart verification requiring quantity one and an actual input action, budget validation, and action validation. Moved public HTTPS URL checks to `store_security.py`. Preserved the old Playwright workflow and SauceDemo test files; the legacy test module skips when Playwright is not installed. Added mocked Computer Use/action-handler tests, updated README and submission details, and added the Computer Use model setting to `.env.example`. Updated chat route tests to match the existing frontend contract that receives `shopping_intent` before it creates a task.
- Why: Use screenshot-based Computer Use for store navigation instead of DOM-selected Playwright actions.
- Validation: Backend tests: 18 passed, 1 legacy Playwright module skipped, with one Starlette/httpx deprecation warning; `compileall` passed; `git diff --check` passed. Frontend build was attempted but could not run because `tsc` is missing and dependencies are not installed. The installed OpenAI SDK signature supports Responses API `tools`, `input`, `previous_response_id`, `max_output_tokens`, and structured `text` parameters.
- Limitations: No live API key/model entitlement or interactive browser session was available, so the end-to-end API/browser path was not run. Screenshots cover the desktop and are sent to OpenAI; the initial destination is checked as public HTTPS, but same-origin navigation is not technically enforced after launch. Visual verification is model-interpreted, and the PyAutoGUI text adapter currently accepts ASCII only.

## 2026-10-11T01:23:55+05:30 - Remove browser preview and generalize store setup

- Changed: Removed the embedded live-browser preview, enlarged chat and progress text, and made the conversation follow new messages and task updates. Added an account-icon profile dialog for a store URL and optional email/username and password, held in frontend memory. Chat routing happens first without credentials; only a shopping task request sends profile values to the backend. The API keeps sign-in fields separate from model prompts and public task data, and clears them when a task finishes. Replaced the SauceDemo-only navigation, login, inventory, and cart selectors with public HTTPS validation and semantic page discovery. Model matching now returns relevant category alternatives. Removed screenshots from task output and updated the public-HTTPS URL validation fixture. Updated README and AI usage notes.
- Why: Let the user choose a store without environment-based website credentials, improve chat readability, and avoid tying shopping behavior to one storefront's markup.
- Validation: Frontend `npm run build` passed. Backend `python -m compileall -q app` passed. `git diff --check` passed. Backend tests and live store interactions were not run for this revision.
- Limitations: Store compatibility is best-effort and depends on readable product names/prices, password fields, add/buy controls, and recognizable cart links. Public HTTPS destinations only; cross-site navigation is blocked. Unusual or inaccessible storefront flows may stop without verification.

## 2026-10-11T01:11:04+05:30 - Improve chat input, voice control, and shirt matching

- Changed: Enter sends chat messages while Shift+Enter inserts a line break; moved the mic to a prominent labeled Speak button beside Send. Expanded natural-language product matching, start searches when the product type is clear instead of asking optional fit questions, surface all live shirt options for shirt requests, and avoid color variants explicitly named in a conflicting product title. Automatically use a sole non-conflicting shirt option when available, and disclose when the requested color is unlisted. Updated README setup/demo guidance.
- Why: Make chat and voice controls easier to discover, and show relevant inventory options even when they appear later in the store catalog or use different wording.
- Validation: Frontend production build passed; backend suite passed (14 passed, 1 opt-in live test skipped); `git diff --check` passed. A live chat request for a black T-shirt started without a follow-up, showed both SauceDemo shirt listings, selected Sauce Labs Bolt T-Shirt, and verified the rendered cart. Checkout was not opened.
- Limitations: SauceDemo does not label every product color; the assistant cannot verify a shade the store does not list.

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
