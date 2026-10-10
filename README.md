# VocaPilot Agent

VocaPilot accepts a plain-language task and a public HTTPS website, then uses OpenAI Computer Use to operate a visible local browser from screenshots and mouse/keyboard actions. It can assist with shopping, website forms, and other browser tasks. The agent pauses before form submissions, write requests, purchase/booking paths, or navigation to a new site so the user can review the action.

When a sign-in, CAPTCHA, anti-bot check, unclear choice, or similar user-only step appears, the agent pauses and explains what to do. The user handles that step in the visible browser window and resumes the task from the app. The system does not solve or bypass CAPTCHA or anti-bot controls and asks users not to paste passwords, one-time codes, or payment details into task messages.

Voice requests use Sarvam Saaras v4. Supported Indian-language speech is translated into English and shown for review before starting the browser task.

## Requirements

- Python 3.12+
- Node.js 20+
- `OPENAI_API_KEY` with access to the configured Computer Use model
- `SARVAM_API_KEY` for voice input (typed input works without it)
- A local desktop session to display the browser window for user handoff

## Setup

From the repository root, install backend dependencies and Chromium:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env
```

Set `OPENAI_API_KEY` in `backend/.env`; set `SARVAM_API_KEY` to enable voice. Never commit live keys.

In a second terminal, install and run the frontend:

```sh
cd frontend
npm install
npm run dev
```

Start the backend from its directory:

```sh
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:5173`.

## Demo

1. Enter a public HTTPS site and describe the task. Do not put credentials in the URL or task description.
2. Optionally record a request in one of the supported Indian languages; review the translated English transcript.
3. Start the task. A Chromium window opens on your computer while screenshots and activity appear in the app.
4. Review and approve each submission, purchase/booking step, or external-site navigation. Approval is one action at a time.
5. If the agent pauses for sign-in, CAPTCHA, anti-bot verification, or clarification, complete the step yourself in the visible browser window and resume in the app. Do not share passwords, OTPs, or payment data in the resume message.
6. Review the final summary and screenshot. The app reports model-observed results; it does not independently verify arbitrary site outcomes.

## API

- `POST /api/tasks` starts a task with `input_text`, `source`, and `site_url`.
- `GET /api/tasks/{task_id}` returns task state, screenshot, pending approval or handoff, and summary.
- `GET /api/tasks/{task_id}/events` streams progress over Server-Sent Events.
- `POST /api/tasks/{task_id}/approval` receives `{"approved": true|false}` for a pending action.
- `POST /api/tasks/{task_id}/resume` receives the user's non-secret handoff update.
- `POST /api/tasks/{task_id}/cancel` cancels an active task.
- `POST /api/voice/transcribe` transcribes/translates uploaded audio using Saaras v4.
- `GET /api/voice/models`, `POST /api/voice/compare`, and `POST /api/voice/speak` retain the optional Voice Lab.

## Safety boundaries and limits

- Only public HTTPS URLs are accepted; local/private-network targets are blocked. Requests that resolve to non-public addresses are blocked in the browser route guard.
- Requests using write methods and URL paths that look like checkout, payment, booking, order, purchase, confirmation, or submission are paused for user approval. A site's behavior may not be identifiable from its URL, so review each prompt carefully.
- The browser is visible and local. The user, not the model, handles passwords, CAPTCHAs, anti-bot checks, and other access challenges.
- A general-purpose visual agent cannot guarantee every site or workflow. Sites can change their interface, require unavailable integrations, block automation, or need user judgment.
- Browser task state is in memory and is lost when the backend restarts. Do not use the demo for sensitive or high-impact transactions.
- Final status is based on the model's observations and is not independently verified for arbitrary websites. Do not assume a submission succeeded without checking the site.
- The app does not persist task messages to a database, but site screenshots are sent to OpenAI as part of Computer Use requests. Do not use private or sensitive site data in this prototype.
- Voice clips are sent to Sarvam. Saaras REST audio is limited to 30 seconds. See [Saaras model docs](https://docs.sarvam.ai/api/getting-started/models/saaras) and the [speech-to-text REST reference](https://docs.sarvam.ai/api-reference/speech-to-text/transcribe).

## Checks

Run backend tests from `backend/` and build the frontend from `frontend/`:

```sh
.venv/bin/python -m pytest tests -q
npm run build
```

Tests do not call OpenAI or Sarvam and do not validate success on third-party websites.

## Sources

- OpenAI [Computer Use guide](https://developers.openai.com/api/docs/guides/tools-computer-use) and [sample app](https://github.com/openai/openai-cua-sample-app).
- [Playwright Python](https://playwright.dev/python/), [FastAPI](https://fastapi.tiangolo.com/), [React](https://react.dev/), [Vite](https://vite.dev/), [TypeScript](https://www.typescriptlang.org/).
- See [implementation_plan.md](implementation_plan.md), [docs/architecture.md](docs/architecture.md), [docs/demo-runbook.md](docs/demo-runbook.md), [AI_USAGE.md](AI_USAGE.md), and [CHANGELOG.md](CHANGELOG.md).
