# Project submission

## Project

- **Project name:** VocaPilot Shopping
- **Short description:** An OpenAI-powered shopping chatbot that understands natural-language requests, can speak and listen, matches a request against actual SauceDemo inventory, then adds and verifies one cart item without checking out.
- **Code repository URL:** TODO
- **Final submitted implementation commit SHA:** TODO
- **Working demo URL or local demo steps:** Local setup and run steps are in [README.md](README.md); demo not yet verified.
- **Demo access requirements:** Python 3.11, Node 20+, Chromium, and network access to SauceDemo.

## Participants

| Participant name | GitHub handle | Contribution |
| --- | --- | --- |
| TODO | TODO | TODO |

## Run and demonstrate

- **Prerequisites and versions:** Python 3.11; Node.js 20.19+ or 22.12+; Chromium via Playwright.
- **Install command:** `python -m pip install -r vocapilot/backend/requirements.txt`, `python -m playwright install chromium`, and `npm install` from `vocapilot/frontend`.
- **Required environment variable names:** `OPENAI_API_KEY` (or supported alias `OPEN_API_KEY`); optional model overrides `OPENAI_TEXT_MODEL`, `OPENAI_AUDIO_MODEL`, and `OPENAI_TTS_MODEL`. SauceDemo credentials and origin have safe public demo defaults; see backend `.env.example`.
- **Start command:** `python -m uvicorn app.main:app --reload --port 8000` from `vocapilot/backend`; `npm run dev` from `vocapilot/frontend`.
- **Demo walkthrough:** Add the OpenAI API key to the backend `.env`, start both services, then chat naturally (for example, ask for a lightweight commuter backpack under $50). VocaPilot can ask a follow-up, transcribe mic input for review, match actual inventory, verify the cart, and read replies aloud. Checkout is not opened.
- **Checks performed and results:** Backend pytest suite: 11 passed, 1 opt-in live-store test skipped; OpenAI endpoint tests use mocks. Frontend production build passed. Live OpenAI calls and the live SauceDemo workflow have not been run because the API key has not been configured.
- **Known limitations or incomplete features:** OpenAI Computer Use is not implemented; browser access uses the bounded SauceDemo Playwright workflow. Voice input is recorded, then transcribed (not a realtime voice stream), and generated speech is played from an explicit Listen control. Live store access and model behavior require the user's API key and have not yet been verified.
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
