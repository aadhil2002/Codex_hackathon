# Change log

## 2026-10-11T05:41:00+05:30 - Adjust spoken reply modulation

- Changed: Slowed speech synthesis slightly and raised its pitch for a more conversational delivery.
- Why: Make spoken recommendations and product comparisons easier to follow.
- Validation: Frontend production build and `git diff --check` run for this change.
- Limitations: Voice timbre still depends on the voice available in the user's browser or operating system.

## 2026-10-11T05:38:00+05:30 - Add spoken assistant replies

- Changed: Added a per-reply listen/stop control using browser speech synthesis. Playback reads the assistant text and includes product suggestions or key comparison facts; it stops when a new voice or text request begins.
- Why: Let shoppers hear product recommendations and comparisons while using the voice-first chat.
- Validation: Frontend production build and `git diff --check` run for this change.
- Limitations: Spoken output depends on browser speech synthesis support and installed voices.

## 2026-10-11T05:31:00+05:30 - Remove catalog provider wording from Markdown

- Changed: Replaced provider names and URLs in Markdown documentation with neutral public-catalog descriptions across the README, submission notes, AI usage record, and changelog.
- Why: Keep the requested provider keyword out of all Markdown files while retaining the setup, data-source, and limitation details.
- Validation: Searched all Markdown files for the provider name and ran `git diff --check`.
- Limitations: The application still fetches its live catalog from the configured API endpoint.

## 2026-10-11T05:21:00+05:30 - Extend voice input pause interval

- Changed: Keep speech recognition open across short pauses and wait three seconds after the latest speech before submitting; users can tap the microphone to submit earlier. Updated the voice guidance and README.
- Why: Give users more time to finish longer spoken shopping requests before the chatbot receives them.
- Validation: Frontend production build and `git diff --check` run for this change.
- Limitations: Recognition duration and accuracy still depend on browser speech recognition support.

## 2026-10-11T05:19:00+05:30 - Include pasted product attributes in comparisons

- Changed: Added SKU and tags to the comparison table and show the available review ratings and comments for each compared product. Product normalization now omits reviewer email addresses.
- Why: Use the extra details in the provided grocery product records when shoppers compare items, while keeping unnecessary reviewer contact data out of the app response.
- Validation: Frontend production build and `git diff --check` run for this change.
- Limitations: The attachment includes complete records through product ID 29 and an unfinished trailing record; catalog products continue to load from the configured public catalog API.

## 2026-10-11T05:11:00+05:30 - Add chatbot product comparison

- Changed: Preserve additional comparison fields returned by the live catalog, add a model-driven compare intent with exact-title fallback, and render selected products in a side-by-side chatbot table. Added a welcome prompt to start comparing products and documented the behavior.
- Why: Help shoppers compare catalog items without leaving the conversation or relying only on product names and prices.
- Validation: Frontend production build and `git diff --check` run for this change.
- Limitations: Comparison quality depends on the product fields supplied by the catalog API and product matching depends on OpenAI; fallback requires exact product titles.

## 2026-10-11T05:02:00+05:30 - Apply chatbot product choices directly to cart

- Changed: Product cards shown for an add, remove, or decrement clarification now call the cart API for that exact product and action, then display a direct confirmation. The cart API now supports decrement and reports when removing or decrementing a product that is no longer present.
- Why: Clicking a product from a chatbot clarification previously sent another natural-language request to the model, which could ask for clarification repeatedly instead of applying the selected action.
- Validation: Frontend production build and `git diff --check` run for this change.
- Limitations: Flask runtime was not exercised in this environment.

## 2026-10-11T05:29:00+05:30 - Normalize legacy welcome text in chat

- Changed: Convert any older backend greeting that names a provider catalog into a ShopPilot-branded welcome in the frontend.
- Why: The chat intro should remain on-brand while a previously started Flask process is still running.
- Validation: `git diff --check` and `npm run build` passed.
- Limitations: Refresh the storefront so the updated frontend applies to the existing conversation.

## 2026-10-11T05:27:00+05:30 - Brand the assistant welcome as ShopPilot

- Changed: Updated the initial assistant greeting to welcome users to ShopPilot and replaced the provider name in the product-load error with a store-facing message.
- Why: Keep user-facing copy consistent with the ShopPilot brand.
- Validation: `git diff --check` passed. Flask runtime not run.
- Limitations: Restart Flask to show the new welcome copy.

## 2026-10-11T05:25:00+05:30 - Decrement cart quantities through chat

- Changed: Added a model `decrement` intent that lowers selected cart item quantities by one, removes the line only when the quantity reaches zero, and supports exact-title fallback when OpenAI is unavailable. Clarification cards preserve the decrement action.
- Why: Let users adjust item counts through the main chat input, not only remove entire products.
- Validation: `git diff --check` and `npm run build` passed.
- Limitations: Natural-language product matching requires an available OpenAI API; without it, include the exact product title.

## 2026-10-11T04:52:00+05:30 - Replace decorative star with shopping cart icon

- Changed: Replaced the starburst graphic in the store banner and the letter mark in the header with a consistent shopping cart SVG.
- Why: Make the store identity immediately read as a shopping experience.
- Validation: `git diff --check` and `npm run build` passed.
- Limitations: None known.

## 2026-10-11T04:51:00+05:30 - Keep product cards at full height in the catalog

- Changed: Prevented catalog grid rows and product images from shrinking to fit the available panel height; the catalog now scrolls through full-height cards.
- Why: The viewport-constrained layout was compressing each product card into a narrow horizontal strip.
- Validation: `git diff --check` and `npm run build` passed.
- Limitations: Product catalog scrolling is contained within the storefront panel on desktop.

## 2026-10-11T04:46:00+05:30 - Clean up storefront labels and fit desktop viewport

- Changed: Replaced visible provider/debug labels with The Everyday Edit store branding, removed OpenAI configuration status from the chat footer, and sized the desktop app to the viewport with scrolling contained inside the chat/catalog panels. Updated README.
- Why: Keep the presentation focused on shopping and prevent the desktop page from scrolling vertically.
- Validation: `git diff --check` and `npm run build` passed.
- Limitations: Narrow/mobile layouts keep page scrolling so both stacked panels remain accessible.

## 2026-10-11T04:43:00+05:30 - Focus the interface on shopping chat

- Changed: Gave the assistant more layout space, added first-use prompt suggestions, emphasized voice input, and made the text composer continuously visible below the microphone action.
- Why: Make conversation the clearest starting point while keeping keyboard input easy to find.
- Validation: `git diff --check` and `npm run build` passed.
- Limitations: Voice input still depends on browser speech recognition support and microphone permission.

## 2026-10-11T04:31:00+05:30 - Remove cart items through chat

- Changed: Added a model remove intent, restricted chat removals to products in the current cart, and made ambiguous removal choices trigger remove actions from their visual cards. Exact-title removal also works in the no-API fallback.
- Why: Let shoppers manage their bag naturally through the assistant.
- Validation: `git diff --check` and `npm run build` passed.
- Limitations: Natural-language product matching requires an available OpenAI API; without it, removal requires the full exact product title.

## 2026-10-11T04:27:00+05:30 - Restyle storefront product cards

- Changed: Matched the product cards to the supplied reference with a larger contained image area, category pill, more readable brand/title/description, rating and stock row, and separated price/action footer.
- Why: Make the product listing easier to scan and closer to the requested visual design.
- Validation: `git diff --check` and `npm run build` passed.
- Limitations: The catalog's product text and images still come from the external catalog service.

## 2026-10-11T04:25:00+05:30 - Normalize numbered catalog replies to product cards

- Changed: Detect model replies that present a numbered catalog list and return live catalog choices for the existing image, name, description, and price cards. Documented the normalization.
- Why: Keep a model response to “list the products” visual even when it ignores the browse response format.
- Validation: `git diff --check` passed. Python/API runtime was not run.
- Limitations: Visual browse still requires a live catalog and an available OpenAI response; restart Flask to load this backend change.

## 2026-10-11T04:12:00+05:30 - Render catalog browsing as product cards

- Changed: Added a model `browse` intent that returns catalog IDs as visual choices when the user asks to list or browse products. The chat now reuses image/title/description/price cards instead of displaying a numbered text list. Updated README behavior notes.
- Why: Make catalog discovery visual and consistent with product disambiguation.
- Validation: `npm run build` and `git diff --check` passed.
- Limitations: Natural-language browse intent depends on a configured, available OpenAI API.

## 2026-10-11T04:10:00+05:30 - Make voice the primary shopping input

- Changed: Promoted the microphone to the main assistant action, added an animated listening state and live transcript, and made typing an explicit secondary option. Updated setup guidance.
- Why: Make spoken shopping requests the central interaction for the demo.
- Validation: `npm run build` and `git diff --check` passed.
- Limitations: Speech recognition requires browser support and microphone permission.

## 2026-10-11T04:04:00+05:30 - Show visual product cards in chat choices

- Changed: Replaced text-only clarification buttons with selectable cards showing each product thumbnail, title, short description, and price.
- Why: Make it easier to distinguish similar products before selecting one from the assistant's suggestions.
- Validation: `npm run build` and `git diff --check` passed.
- Limitations: Product images and details depend on the live catalog response and image CDN.

## 2026-10-11T04:01:00+05:30 - Contain product images within cards

- Changed: Constrained catalog thumbnails to the card image pane with max dimensions, flex centering, and overflow clipping; adjusted image pane height at desktop and mobile breakpoints.
- Why: Prevent tall or unusually sized product images from overlapping product titles, descriptions, and prices.
- Validation: Frontend production build and `git diff --check` passed.
- Limitations: Visual browser verification was not available in this workspace.

## 2026-10-11T03:37:00+05:30 - Guard the transcript scroll effect on selected checkpoint

- Changed: Converted the transcript-scroll effect to a block body with a `scrollIntoView` feature check; deduplicated selectable model options before rendering.
- Why: Fix the React effect return warning/runtime error and avoid duplicate React keys when running from commit `6d5296a`.
- Validation: `npm run build` passed. Python tests and browser console inspection were unavailable in this workspace.
- Limitations: This checkout is based on the selected `6d5296a` commit; the fix is recorded on a separate branch.

## 2026-10-11T03:34:00+05:30 - Build live-catalog shopping storefront

- Changed: Replaced the SauceDemo browser session with a React storefront populated by the public products endpoint, a Flask catalog/cart/checkout API, a product chat, category/search/sort controls, and product images. Replaced SauceDemo tests with Python Playwright storefront tests for rendering, filtering, cart edits, and checkout. Updated README and submission details; cleared the API key value from `.env.example`.
- Why: Use the requested sample product data to create a local shopping UI and automate its end-to-end flow.
- Validation: `npm run build` and `git diff --check` passed. Python/Playwright tests could not run because Python is not installed in this workspace.
- Limitations: The app and E2E tests need internet access to the product catalog API; natural-language chat also needs a valid OpenAI API key.

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
