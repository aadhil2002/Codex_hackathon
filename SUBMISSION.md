# Project submission

## Project

- **Project name:** VocaPilot Shopping
- **Short description:** An OpenAI-powered shopping chatbot that understands natural-language requests, can speak and listen, finds relevant live store inventory, lets the shopper choose a product, and verifies the addition to cart. The shopper proceeds to checkout manually.
- **Code repository URL:** TODO
- **Final submitted implementation commit SHA:** TODO
- **Working demo URL or local demo steps:** Local setup and run steps are in [README.md](README.md); live SauceDemo cart and checkout-step flow verified on 2026-10-11.
- **Demo access requirements:** Python 3.11+, Node 20+, Chromium, an OpenAI API key, and network access to OpenAI and the selected public HTTPS store.

## Participants

| Participant name | GitHub handle | Contribution |
| --- | --- | --- |
| TODO | TODO | TODO |

## Run and demonstrate

- **Prerequisites and versions:** Python 3.11; Node.js 20.19+ or 22.12+; Chromium via Playwright.
- **Install command:** `python -m pip install -r vocapilot/backend/requirements.txt`, `python -m playwright install chromium`, and `npm install` from `vocapilot/frontend`.
- **Required environment variable names:** `OPENAI_API_KEY` (or supported alias `OPEN_API_KEY`); optional model overrides `OPENAI_TEXT_MODEL`, `OPENAI_AUDIO_MODEL`, and `OPENAI_TTS_MODEL`. Store URL and optional shopper sign-in values are provided in the frontend profile.
- **Start command:** `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000` from `vocapilot/backend`; `npm run dev -- --host 127.0.0.1` from `vocapilot/frontend`.
- **Demo walkthrough:** Add the OpenAI API key to the backend `.env`, start both services, choose a demo store in the profile, and ask for a product such as a T-shirt. VocaPilot shows relevant matches in a product-choice panel, lets the user select a listing and available options, and verifies it in the cart. The store window stays on the cart for the user to continue to checkout manually.
- **Checks performed and results:** Frontend production build and backend Python bytecode compilation passed for the checkout change. A live SauceDemo run found shirt matches, selected Sauce Labs Bolt T-Shirt, verified it in the cart, and reached checkout step one. No order was submitted. `git diff --check` passed. This live run is a workflow check, not coverage of other stores.
- **Known limitations or incomplete features:** OpenAI Computer Use is not implemented; browser access uses a generic best-effort Playwright workflow, which can fail on store-specific or inaccessible controls. Product discovery only covers listings on the current page, and model-based relevance can still need shopper judgment; the shopper chooses the exact result before anything is added. Voice input is recorded and transcribed (not a realtime voice stream), and generated speech plays from an explicit Listen control. Compatibility has only been live-checked on SauceDemo for this revision.
- **Libraries, APIs, and public datasets used:** React, Vite, FastAPI, Playwright, Chromium, OpenAI Python SDK / Responses API / audio transcription / text-to-speech, and the SauceDemo public testing website. OpenAI docs: https://developers.openai.com/api/docs/guides/text, https://developers.openai.com/api/docs/guides/speech-to-text, https://developers.openai.com/api/docs/guides/text-to-speech
- **AI usage record:** [AI_USAGE.md](AI_USAGE.md)
- **Development change log:** [CHANGELOG.md](CHANGELOG.md)

## Submission checklist

- [ ] The project implementation started from scratch at the event.
- [ ] I participated solo or with no more than 4 team members in total.
- [ ] Codex was used during development and its usage is documented.
- [ ] The code repository URL, short description, and working demo are provided.
- [ ] README setup and demo instructions match the submitted code.
- [ ] Actual checks and known limitations are documented.
- [ ] Meaningful changes are documented and committed throughout development.
- [ ] The final implementation is committed and pushed, and its SHA is recorded above.
- [ ] No credentials or private data are included in the repository or demo instructions.
- [ ] The organizers' announced submission method and timing have been followed.

Event reference: [DevDay Exchange Community: Kochi on Luma](https://luma.com/z10nz8gp). The event wraps up by 10:00 AM IST on 11 October 2026.
