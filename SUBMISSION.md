# Project submission

Complete this file during the hackathon and use it to prepare your submission through the method announced by the organizers. Do not submit your project to the template repository.

## Project

- **Project name:** VocaPilot Agent
- **Short description:** A voice-enabled visual browser agent that uses OpenAI Computer Use to work from a user-supplied public site and task, requests approval before submissions and other consequential actions, and hands logins or CAPTCHAs back to the user.
- **Code repository URL:** TODO
- **Final submitted implementation commit SHA:** TODO
- **Working demo URL or local demo steps:** Run FastAPI and Vite as described in `README.md`; enter a public HTTPS site and task, review the visible browser and screenshot, approve or deny a guarded action, and resume after handling a user-only step.
- **Demo access requirements:** TODO — explain any prerequisites without including private credentials.

## Participants

Participate solo or in a team of up to 4. Remove unused rows.

| Participant name | GitHub handle | Contribution |
| --- | --- | --- |
| TODO | TODO | TODO |

## Run and demonstrate

- **Prerequisites and versions:** Python 3.12, Node.js 20, desktop session for visible Playwright Chromium, OpenAI API key with Computer Use access; Sarvam API key for voice.
- **Install command:** `python -m pip install -r backend/requirements.txt`, `python -m playwright install chromium`, and `npm install` in `frontend/`.
- **Required environment variable names:** `OPENAI_API_KEY` and `OPENAI_COMPUTER_MODEL`; `SARVAM_API_KEY` for voice; optional `HF_TOKEN` for the gated local model experiment.
- **Start command:** `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000` from `backend/`; `npm run dev` from `frontend/`.
- **Demo walkthrough:** Enter a public HTTPS URL and browser task, optionally review an English voice transcript, monitor screenshots, approve guarded actions, handle a login/CAPTCHA or clarification in the visible browser, resume, and inspect the model-observed outcome.
- **Checks performed and results:** Backend tests passed (4 passed); frontend Vite/TypeScript production build passed; `git diff --check` passed. No live OpenAI browser session was run.
- **Known limitations or incomplete features:** Task state is in memory; arbitrary-site completion is not guaranteed; user handoff requires a desktop browser window; the agent cannot independently verify arbitrary site outcomes; page screenshots go to OpenAI; provider calls require credentials.
- **Libraries, APIs, and public datasets used:** [FastAPI](https://fastapi.tiangolo.com/), [React/Vite](https://vite.dev/), [Playwright](https://playwright.dev/python/), [Sarvam Saaras](https://docs.sarvam.ai/api/getting-started/models/saaras), and the [OpenAI Computer Use API guide](https://developers.openai.com/api/docs/guides/tools-computer-use). No public datasets used.
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

Event reference: [DevDay Exchange Community: Kochi on Luma](https://luma.com/z10nz8gp). The event wraps up by **10:00 AM IST on 11 October 2026**.
