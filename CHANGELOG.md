# Change log

## 2026-10-11T03:34:00+05:30 - Build DummyJSON-backed shopping storefront

- Changed: Replaced the SauceDemo browser session with a React storefront populated by `https://dummyjson.com/products`, a Flask catalog/cart/checkout API, a product chat, category/search/sort controls, and product images. Replaced SauceDemo tests with Python Playwright storefront tests for rendering, filtering, cart edits, and checkout. Updated README and submission details; cleared the API key value from `.env.example`.
- Why: Use the requested sample product data to create a local shopping UI and automate its end-to-end flow.
- Validation: `npm run build` and `git diff --check` passed. Python/Playwright tests could not run because Python is not installed in this workspace.
- Limitations: The app and E2E tests need internet access to DummyJSON; natural-language chat also needs a valid OpenAI API key.

## 2026-10-11T03:14:00+05:30 - Let the LLM select catalog matches

- Changed: Removed backend keyword-overlap candidate generation. OpenAI now supplies clarification choices from the live catalog; the backend validates its choices against exact live names and only adds one product after user selection. Without an API response, fallback requires an exact title and asks the user to choose if multiple titles were supplied. Updated README setup and behavior notes.
- Why: Make the LLM responsible for interpreting product intent and selecting plausible catalog choices, while retaining catalog validation before browser actions.
- Validation: `npm run build` and `git diff --check` passed. Python/API behavior was not run in this workspace.
- Limitations: Natural-language product matching and disambiguation require a working OpenAI API key and model access.

## 2026-10-11T03:06:00+05:30 - Ask before adding ambiguous products

- Changed: Added live-catalog options to chat responses and selectable product buttons in React. Shirt or other broad requests now ask the user to choose; the backend also converts multi-product model results into a clarification instead of adding all matches. Updated the model schema and README behavior notes.
- Why: Prevent a broad keyword from silently adding several products and let the user decide which item they intended.
- Validation: `npm run build` and `git diff --check` passed. Python tests were not run in this workspace.
- Limitations: Candidate suggestions use catalog title words; natural-language descriptions still rely on configured OpenAI access.

## 2026-10-11T02:57:35+05:30 - Switch chat integration to OpenAI API

- Changed: Replaced Groq REST calls with the OpenAI Python SDK and Responses API, using strict structured JSON output and configurable `OPENAI_MODEL` (default `gpt-5.4-mini`). Updated status handling, `.env.example`, requirements, README, and submission setup. Removed the old Groq key entry from the ignored local `.env` without exposing or reusing it.
- Why: Connect the shopping assistant to the user's OpenAI API key directly and keep product selections validated against the live catalog.
- Validation: npm run build passed and git diff --check passed. Python runtime/API calls could not be checked in this workspace.
- Limitations: A valid `OPENAI_API_KEY` must be added to project-root `.env`; API usage is billed separately and subject to model access and account limits.

## 2026-10-11T02:32:34+05:30 - Show Groq 403 detail on fallback

- Changed: Include Groq's redacted 403 response detail in the Flask warning and chatbot reply, including exact-title fallback turns.
- Why: Make the permission error source visible even when the fallback successfully adds an exact catalog item.
- Validation: npm run build passed and git diff --check passed; Python runtime is unavailable in this workspace.
- Limitations: Groq model permissions still need to be changed in the selected organization/project when its response identifies a restriction.

## 2026-10-11T02:20:57+05:30 - Diagnose Groq permission errors

- Changed: Distinguished HTTP 403 model permission failures from rejected credentials and rate limits. The chat now shows Groq's safe error message, redacts key-like strings, and points to organization/project model permissions; added README troubleshooting steps.
- Why: The reported request reached Groq and received 403, which indicates a permission restriction rather than a missing local key.
- Validation: npm run build passed and git diff --check passed. Python API behavior cannot be exercised in this workspace.
- Limitations: A Groq organization/project admin may need to allow openai/gpt-oss-20b.

## 2026-10-11T02:18:43+05:30 - Keep API keys out of example config

- Changed: Cleared the key-like value from `.env.example`; it now contains only a blank placeholder. Confirmed `.env` is ignored by Git.
- Why: Ensure API credentials are stored only in the local ignored environment file.
- Validation: Confirmed the sample key field is blank and `.env` matches a Git ignore rule; git diff --check pending.
- Limitations: The Groq key currently in `.env` is rejected according to the reported HTTP 401/403 response and must be replaced.

## 2026-10-11T02:15:08+05:30 - Clarify GPT API connection status

- Changed: The backend now reports separate missing-key, configured, connected, rejected-key, rate-limit, and unavailable states. Chat fallback messages distinguish setup problems from API failures without exposing the key; the UI displays the current state.
- Why: Make it clear why the assistant switched to exact-title fallback.
- Validation: npm run build passed and git diff --check passed. The root .env file and Python runtime are absent in this workspace, so the API key cannot be checked here.
- Limitations: Groq API authentication and service status still need verification in the user's local environment.

## 2026-10-11T02:08:37+05:30 - Add GPT-OSS catalog assistant

- Changed: Integrated OpenAI GPT-OSS 20B through Groq chat completions. The model receives live catalog names, descriptions, prices, and recent conversation; the backend validates every selected exact product title before Playwright adds it. Added `.env.example`, dotenv loading, API status in the chat, fallback behavior, and setup documentation.
- Why: Let the assistant understand natural shopping requests and respond conversationally while limiting cart actions to real catalog items.
- Validation: npm run build passed and git diff --check passed. Python API calls could not be verified because this workspace has no Python runtime or Groq key.
- Limitations: A Groq API key is needed for GPT-powered interpretation; free-plan rate limits apply. Exact-title matching remains available without the API.

## 2026-10-11T01:59:57+05:30 - Make product input conversational

- Changed: Replaced preset product and checkout chips with a standard chat composer for typing and speech. The assistant responds with live catalog titles when it cannot match a full title. Updated run and submission guidance.
- Why: Make the shopping flow feel conversational while selecting only products that exist in the current website catalog.
- Validation: npm run build passed; git diff --check passed. Python and live Playwright checks were not run because no Python runtime is installed here.
- Limitations: Product selection still requires the full exact title present in the live catalog; free-form paraphrases without the title cannot safely identify an item.

## 2026-10-11T01:50:04+05:30 — Require exact live catalog names for voice requests

- Changed: Added browser speech-to-text input with a live transcript, microphone permission/error messages, and exact-name product choices as a fallback. Playwright loads product titles from the live catalog and only adds a product when the request includes its full title; added unit cases for exact matching, partial-name rejection, and quantities. Updated README and submission guidance.
- Why: Let users speak shopping requests and ensure the request keyword matches the actual website product title.
- Validation: `npm run build` passed. `git diff --check` reported a trailing blank line in this log. Python tests and the live Playwright session were not run because this workspace has no installed Python runtime.
- Limitations: Speech recognition depends on browser support and microphone permission; some browsers may use a remote speech service.

## 2026-10-11T01:48:38+05:30 — Add voice product requests with exact catalog matching

- Changed: Added live browser speech-to-text in the React chat, loaded product names from SauceDemo at session start, and changed Playwright product selection to require an exact catalog-name match; added clickable exact-name fallback choices.
- Why: Let users speak product requests and ensure the request matches an item actually listed by the live store.
- Validation: `npm run build` passed and `git diff --check` passed; Python/Playwright runtime checks were not available in this workspace.
- Limitations: Web Speech API availability and microphone permission depend on the browser; partial/incorrect transcription will not match unless the exact product name is present.

## 2026-10-11T01:38:02+05:30 — Ignore generated project files

- Changed: Added ignore patterns for Python bytecode/caches, local environment files, test coverage and reports, logs, and frontend dependencies/build output in `.gitignore`.
- Why: Keep generated artifacts and local configuration out of version control.
- Validation: Reviewed ignore patterns and ran `git diff --check`.
- Limitations: Git does not stop tracking files that were already committed; none of the generated paths are intentionally included by this update.

## 2026-10-11T01:27:06+05:30 — Add React chat and Playwright preview dashboard

- Changed: Added a Vite/React dashboard with product chat, checkout form, and Playwright screenshot preview; added a Flask API controlling SauceDemo; updated dependencies, tests, setup docs, and Windows launcher.
- Why: Let users request products from a chat-like UI and watch Playwright operate the live practice store alongside it.
- Validation: `npm install` completed and `npm run build` passed; `git diff --check` passed. Python/Playwright runtime checks were not run because Python is unavailable in this workspace shell.
- Limitations: Runs locally, supports one session, uses keyword matching for the listed catalog products, and depends on the external practice site.

## 2026-10-11T00:39:54+05:30 — Use the website form for checkout data

- Changed: Removed terminal input; the checkout test now displays instructions in the browser, validates the required-field error, and waits for the user to fill the live website form and click Continue. Added a Windows double-click launcher and updated instructions.
- Why: Let the user provide the checkout details through the website UI without pytest stdin capture errors.
- Validation: Reviewed the interaction and documentation; tests were not run in this session.
- Limitations: The user must complete the checkout form within five minutes; the live site and visible desktop browser must be available.

## 2026-10-11T00:35:00+05:30 — Ask user for checkout details

- Changed: Added chatbot-style terminal prompts for the checkout test to collect first name, last name, and postal code, then enter those values into SauceDemo; updated interactive run instructions.
- Why: Let the user provide the checkout data instead of filling fixed sample values.
- Validation: Reviewed prompt handling and test wiring; tests were not run in this session.
- Limitations: Pytest must run with `-s` to accept terminal input; use sample details because checkout is on a third-party practice site.

## 2026-10-11T00:24:00+05:30 — Slow down visible browser tests

- Changed: Configure visible Chromium with an 800 ms Playwright action delay by default; add a `--slow-mo` option to adjust the delay and update run instructions.
- Why: Make the test steps easier to watch during execution.
- Validation: Reviewed the browser launch configuration and documentation; tests were not run in this session.
- Limitations: Browser visibility requires a desktop session; the delay applies to Playwright actions, not network response time.

## 2026-10-11T00:17:27+05:30 — Test live SauceDemo storefront

- Changed: Replaced the local sample shop and single flow script with pytest cases in `tests/test_saucedemo.py`; updated dependencies, README, and submission notes.
- Why: Run complete browser test cases against a publicly hosted shopping practice site, as requested.
- Validation: Reviewed the test selectors and documentation; did not run tests in this session.
- Limitations: Execution requires internet access and the external demo site to be available; its behavior can change.

## 2026-10-10T23:44:38+05:30 — Add local shopping cart demo

- Changed: Added the Northstar Market storefront (`index.html`), local server (`server.py`), Playwright browser flow (`automate_cart.py`), dependency declaration, and setup/submission notes.
- Why: Provide a complete website flow that can be automated end to end without relying on an unavailable sample shopping site.
- Validation: Reviewed source and documented commands; did not install dependencies or run the browser automation in this session.
- Limitations: Checkout is simulated in the browser; no server-side order persistence or payment provider is included. Human review and an actual browser run remain outstanding.

## Template setup — 10 October 2026

- Changed: Added the event README, rules, agent guide, change log, AI usage record, submission checklist, Git ignore rules, and pull request checklist.
- Why: Give participants a consistent starting point for event rules, basic coding patterns, documented changes, and regular commits.
- Validation: Checked local Markdown links, event detail consistency, required documents, and diff whitespace before publishing.
- Limitations: This records the initial documentation scaffold; the project demo was added later as documented above.
## 2026-10-11T01:50:04+05:30 — Require exact live catalog names for voice requests

- Changed: Added browser speech-to-text input with a live transcript, microphone permission/error messages, and exact-name product choices as a fallback. Playwright now loads product titles from the live catalog and only adds a product when the request includes its full title; added unit cases for exact matching, partial-name rejection, and quantities. Updated README and submission guidance.
- Why: Let users speak shopping requests and ensure the requested keyword matches the actual website product title.
- Validation: `git diff --check` passed. A final React build and Python tests are pending; this workspace shell does not have Python installed.
- Limitations: Speech recognition depends on browser support and microphone permission; some browsers may use a remote speech service. Python runtime tests and the live Playwright session were not run here.
