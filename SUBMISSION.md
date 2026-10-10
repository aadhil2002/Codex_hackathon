# Project submission

## Project

- **Project name:** VocaPilot Shopping
- **Short description:** An OpenAI-powered shopping chatbot that understands natural-language requests, can speak and listen, uses screenshot-based computer control to add and visually verify one cart item, and never checks out.
- **Code repository URL:** TODO
- **Final submitted implementation commit SHA:** TODO
- **Working demo URL or local demo steps:** Local setup and run steps are in [README.md](README.md); demo not yet verified.
- **Demo access requirements:** Python 3.11, Node 20+, an interactive desktop with a default browser and PyAutoGUI screen-control permission, an OpenAI API key with access to a computer-use-capable model, and network access to the selected public HTTPS store.

## Participants

| Participant name | GitHub handle | Contribution |
| --- | --- | --- |
| TODO | TODO | TODO |

## Run and demonstrate

- **Prerequisites and versions:** Python 3.11; Node.js 20.19+ or 22.12+; interactive desktop browser session with PyAutoGUI permissions.
- **Install command:** `python -m pip install -r vocapilot/backend/requirements.txt` and `npm install` from `vocapilot/frontend`.
- **Required environment variable names:** `OPENAI_API_KEY` (or supported alias `OPEN_API_KEY`); optional model overrides `OPENAI_TEXT_MODEL`, `OPENAI_AUDIO_MODEL`, `OPENAI_TTS_MODEL`, and `OPENAI_COMPUTER_MODEL`. Store URL and optional sign-in values are entered in the profile dialog.
- **Start command:** `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000` from `vocapilot/backend`; `npm run dev` from `vocapilot/frontend`.
- **Demo walkthrough:** Add the OpenAI API key to the backend `.env`, start both services, then chat naturally (for example, ask for a lightweight commuter backpack under $50). VocaPilot can ask a follow-up, transcribe mic input for review, match actual inventory, verify the cart, and read replies aloud. Checkout is not opened.
- **Checks performed and results:** Backend tests: 18 passed; the preserved optional Playwright test module was skipped because Playwright is not installed. Python bytecode compilation passed. `git diff --check` passed. Frontend build could not run because `tsc` is missing and frontend dependencies are absent. Live Computer Use requires an API key/model entitlement and an interactive desktop; that path has not yet been verified.
- **Known limitations or incomplete features:** Visual product matching and cart verification depend on the model interpreting screenshots correctly. The action loop is bounded and refuses success without a structured one-item cart result, but the browser is not yet network-isolated to the selected origin. Full-desktop screenshots are sent to the OpenAI API; keep private content out of view. Text entry currently supports ASCII only. Voice input is recorded, then transcribed (not a realtime voice stream), and generated speech is played from an explicit Listen control.
- **Libraries, APIs, and public datasets used:** React, Vite, FastAPI, PyAutoGUI, Pillow, OpenAI Python SDK / Responses API / Computer Use / audio transcription / text-to-speech, and the selected public HTTPS store. OpenAI docs: https://developers.openai.com/api/docs/guides/text, https://developers.openai.com/api/docs/guides/tools-computer-use, https://developers.openai.com/api/docs/guides/speech-to-text, https://developers.openai.com/api/docs/guides/text-to-speech
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
