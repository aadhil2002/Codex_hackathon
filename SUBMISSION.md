# Project submission

## Project

- **Project name:** VocaPilot Shopping
- **Short description:** A voice-friendly shopping assistant prototype that reads actual SauceDemo inventory and prices, compares matching products, adds one item, and verifies the rendered cart without checking out.
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
- **Install command:** `pip install -r vocapilot/backend/requirements.txt`, `playwright install chromium`, and `npm install` from `vocapilot/frontend`.
- **Required environment variable names:** `SAUCEDEMO_USERNAME`, `SAUCEDEMO_PASSWORD`, `SAUCEDEMO_BASE_URL` (optional overrides; see backend `.env.example`).
- **Start command:** `uvicorn app.main:app --reload --port 8000` from `vocapilot/backend`; `npm run dev` from `vocapilot/frontend`.
- **Demo walkthrough:** Enter the prepared backpack request, start the task, observe the actual SauceDemo screenshot and product observations, and review the verified cart summary. The flow does not check out.
- **Checks performed and results:** Not yet run; this environment has Node.js/npm but no Python runtime. Frontend build also remains unchecked.
- **Known limitations or incomplete features:** Optional OpenAI Computer Use and speech transcription are not implemented. Voice recording currently reports that transcription is unavailable. Live store access and cart automation have not yet been verified in this environment.
- **Libraries, APIs, and public datasets used:** React, Vite, FastAPI, Playwright, Chromium, and the SauceDemo public testing website. Optional OpenAI Computer Use guide: https://developers.openai.com/api/docs/guides/tools-computer-use
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
