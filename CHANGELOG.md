# Change log

Record each meaningful project change newest first, with an actual timestamp and timezone.

## Event build log

## 2026-10-11T03:11:24+05:30 - Run backend outside sandbox with the intended API key

- Changed: Restarted the backend in a visible, network-enabled PowerShell window after clearing inherited `OPENAI_API_KEY` and `OPEN_API_KEY` variables so `python-dotenv` loads the workspace backend `.env`. Left the frontend running in its visible PowerShell window. Documented the environment cleanup commands in README.
- Why: The sandboxed backend could not reach OpenAI. Once launched outside the sandbox, its inherited environment still overrode the user's `.env` key, causing an authentication rejection.
- Validation: Backend health returned `ok`; a harmless chat request returned HTTP 200; frontend returned HTTP 200. No key text was printed or logged.
- Limitations: The key still needs to be valid and enabled for API use; environment variables set by a future launcher will take precedence again unless cleared.

## 2026-10-11T03:06:07+05:30 - Keep checkout manual and make product choice explicit

- Changed: Stopped Playwright at the verified cart instead of clicking checkout. Added an explicit product choice panel driven by the active task state so matching products and “Choose this item” remain available even if chat-history task state is briefly stale. Tightened the product matcher instruction to return only direct category matches and respect stated constraints. Updated checkout wording and records in `vocapilot/backend/app/{openai_service.py,playwright_shopping.py}`, `vocapilot/frontend/src/{App.tsx,services/api.ts}`, `README.md`, and `SUBMISSION.md`.
- Why: The shopper reported weak product relevance and missing product selection, and asked to proceed to checkout manually after the cart is complete.
- Validation: `npm run build` passed; backend `python -m compileall -q app` passed; `git diff --check` passed. Backend restarted visibly at `http://127.0.0.1:8000`. No new live storefront run was performed for this revision.
- Limitations: Product relevance remains model-based and best-effort; the user must choose the exact listing. Discovery covers only products visible on the current store page.

## 2026-10-11T02:56:38+05:30 - Verify selected cart item and open checkout for review

- Changed: Prevented same-page fragment links from reloading SauceDemo inventory and losing the selected-product marker, so Playwright adds the chosen shirt instead of the first visible item. After cart verification, detect and open the store checkout step, report checkout status to the chat, and keep the headed review window open for up to 10 minutes. The workflow stops before entering checkout details or submitting an order. Updated checkout copy and corrected prior descriptions in README and submission notes. Files: `vocapilot/backend/app/{schemas.py,playwright_shopping.py}`, `vocapilot/frontend/src/{App.tsx,services/api.ts,types.ts}`, `README.md`, `SUBMISSION.md`.
- Why: The user asked for an explicit cart-added confirmation followed by checkout, and reported that browser automation did not show the agent actions. The SauceDemo fragment navigation caused the selected product state to be lost, while the previous workflow never opened checkout.
- Validation: Backend `compileall` and frontend production build passed; `git diff --check` passed. A live headed SauceDemo workflow found shirt choices, selected Sauce Labs Bolt T-Shirt, verified the cart, and reached `checkout-step-one.html`. No order was submitted.
- Limitations: Checkout controls and confirmation are detected best-effort and vary by storefront. Live completion was confirmed on SauceDemo only; browser window visibility depends on the desktop environment.

## 2026-10-11T02:21:35+05:30 - Add conversational product and variant selection

- Changed: Added a multi-step shopping interaction that shows all relevant products from the current store page, lets the shopper choose a listing, reads available size/color options from its product page, then adds the selected item and verifies the cart. Added `/select` and `/options` task endpoints, held headed browser sessions while awaiting shopper input, cancellation and a five-minute expiry. Added four store presets (SauceDemo, Automation Exercise, nopCommerce, and Demoblaze) and documented frontend-to-backend store profile flow. Updated `vocapilot/backend/app/{schemas.py,task_store.py,playwright_shopping.py,openai_service.py,routes/tasks.py}`, `vocapilot/frontend/src/{App.tsx,services/api.ts,types.ts,style.css}`, `.env.example`, and README.
- Why: Let shoppers browse live choices and select store-listed product variants conversationally, while keeping store credentials in the frontend profile instead of backend environment variables.
- Validation: `python -m compileall -q app` and `npm run build` passed; `git diff --check` passed. No live-store interaction was run for this change.
- Limitations: Discovery reads at most 60 products on the current page and does not paginate. Store selectors, login, variants, and cart confirmation are generic best-effort and may not work for every site. The OpenAI API key is still required in backend environment configuration.


## 2026-10-11T01:58:55+05:30 - Repair Chromium launch and start clear shopping requests

- Changed: Downloaded Playwright Chromium into ignored `.tools/playwright-browsers`; made the app automatically use that cache when present and documented setup. Strengthened chat routing instructions so explicit product requests with constraints start a search without optional follow-up questions. Updated `vocapilot/backend/app/playwright_shopping.py`, `vocapilot/backend/app/openai_service.py`, and `README.md`.
- Why: The prior cached Chromium was missing `chrome.dll`, and a clear product request could be answered with an optional-preferences question instead of a shopping action.
- Validation: After restarting the visible backend, the exact black T-shirt under $100 request returned HTTP 200 with a shopping intent. Workspace Chromium launched successfully and navigated to `about:blank`; backend health and frontend returned HTTP 200. `compileall` and `git diff --check` passed.
- Limitations: The live selected-store login and cart flow was not rerun because store credentials are held in the frontend profile and the selected site was not available to the backend probe.
## 2026-10-11T01:50:13+05:30 - Clarify OpenAI connection failures

- Changed: Mapped OpenAI connection, rate-limit/quota, permission, and unavailable-model errors to separate sanitized API messages. Clarified that store profile credentials are separate from the OpenAI API key and documented outbound API access requirements. Updated `vocapilot/backend/app/routes/tasks.py` and `README.md`.
- Why: A live chat probe reached the local API but failed with an OpenAI SDK `APIConnectionError`; store credentials cannot authenticate OpenAI requests.
- Validation: Backend bytecode compilation and `git diff --check` passed. API health returned HTTP 200. Chat first reproduced an OpenAI connection failure in the restricted terminal; after restarting the backend in a network-enabled visible terminal, the same harmless chat probe returned HTTP 200 with an assistant response. Error messages do not include provider response text or credentials.
- Limitations: Shopping sign-in credentials and the OpenAI API key serve different services; the key must have API access and the backend must reach `api.openai.com`.


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
