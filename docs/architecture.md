# Architecture

## Request and browser flow

1. React collects a public HTTPS URL and the user's plain-language instruction, typed or transcribed from audio.
2. `POST /api/tasks` validates input and creates an in-memory task. The voice endpoint uses Sarvam Saaras v4 and returns an editable English transcript.
3. The background task starts a visible Playwright Chromium window at the supplied site. Playwright is the browser runtime only; OpenAI Computer Use decides screenshot-based mouse and keyboard actions.
4. A route guard blocks non-HTTPS or non-public targets. It pauses write-method requests, paths that appear to commit purchases/bookings/submissions, and top-level navigation to another origin. A user can approve or deny each request through `POST /api/tasks/{id}/approval`.
5. OpenAI receives screenshots and returns computer actions. Page content is treated as untrusted; the agent is told not to follow page instructions that conflict with the user's request or bypass access controls.
6. If the model detects a login, CAPTCHA, anti-bot wall, unclear choice, or another human-only step, it emits a handoff instruction and waits. The user handles that step in the visible browser and calls `POST /api/tasks/{id}/resume` with a non-secret update. The same browser session and model response chain continue.
7. The task returns the model's final summary and a browser screenshot. Arbitrary-site results are marked model-observed, not independently verified. Task status and screenshots stay in memory and are lost when the backend restarts.

## Safety boundaries

- Only public HTTPS URLs are accepted. DNS results must resolve exclusively to public IP addresses, including when browser requests are routed.
- New-site top-level navigation, non-read requests, and common commit-path actions require explicit user approval. The user should inspect each requested URL and action. Site-specific state changes may use less obvious endpoints; this prototype cannot identify every consequential request.
- The model is instructed not to solve/bypass CAPTCHA, anti-bot checks, access controls, or rate limits. It pauses for a person. The visible browser is a local desktop requirement for manual handling.
- Credentials, OTPs, and payment details should not be placed in task text or resume messages. The app does not persist task state, but page screenshots are sent to OpenAI to operate Computer Use.
- Run is bounded to five minutes, 16 model responses and 60 computer actions. Cancel closes the task's isolated browser context.
- This is a prototype, not an unattended agent for sensitive, financial, legal, or other high-impact transactions. Site interfaces, automation policies, and requirements vary.

## External services

- OpenAI [Computer Use guide](https://developers.openai.com/api/docs/guides/tools-computer-use) and [sample app](https://github.com/openai/openai-cua-sample-app).
- Sarvam [Saaras v4 model documentation](https://docs.sarvam.ai/api/getting-started/models/saaras) and [speech-to-text REST reference](https://docs.sarvam.ai/api-reference/speech-to-text/transcribe).
- Browser runtime: [Playwright Python](https://playwright.dev/python/).
