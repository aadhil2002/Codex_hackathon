# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

Participant implementation entries appear here, newest first.

## 2026-10-11T00:34:02+05:30 — Add browser-agent handoff and approvals

- Changed: Replaced the SauceDemo selector-driven task path with an OpenAI Computer Use session for a user-supplied public HTTPS site. Added visible local Chromium, approval pauses for writes and likely commit paths, and a pause/resume handoff for logins, CAPTCHA, anti-bot checks, and ambiguity. Updated the interface, API, setup/demo docs, and implementation plan; removed unused SauceDemo shopping components.
- Why: Let the user request work across sites while keeping consequential actions reviewable and leaving access challenges to the user.
- Validation: Backend pytest suite passed (4 passed); frontend production build passed; `git diff --check` passed. No live OpenAI browser session was run.
- Limitations: OpenAI API credentials are required for tasks; arbitrary-site support and outcome verification are not guaranteed; user handoff requires a desktop browser window. No commit was created, per the user's instruction.

## 2026-10-11T00:08:01+05:30 — Show Hugging Face model failure details

- Changed: Expose a short, credential-scrubbed exception detail for local Hugging Face inference failures instead of hiding the cause behind a generic provider message.
- Why: The model comparison returned an `OSError` without indicating whether access, model loading, or audio decoding failed.
- Validation: Backend Python source compilation and `git diff --check` passed. A provider request was not repeated because no audio sample was provided in this turn.
- Limitations: Hugging Face inference remains gated and requires the model access conditions to be accepted for the configured token; this change improves diagnosis rather than guaranteeing model setup succeeds. No commit was created, per the user's instruction.

## 2026-10-10T23:26:11+05:30 — Add Indian-language transcription and translation providers

- Changed: Added Sarvam Saaras v4 transcription/English translation, an optional local AI4Bharat IndicSeamless translation path, provider credentials, and selection for all 22 scheduled Indian languages plus English and auto-detection. Updated setup and license/provider notes.
- Why: Let the team compare Indian-language audio recognition and English translations across providers.
- Validation: Backend Python sources compiled, frontend TypeScript/Vite production build passed, and `git diff --check` passed. Live provider calls were not made because they require credentials and the Hugging Face model has gated access.
- Limitations: IndicSeamless is a 2B-parameter gated model with a CC BY-NC 4.0 license and requires optional local dependencies; language quality is not benchmarked. Sarvam model access and quotas depend on its API account. No commit was created, per the user's instruction.

## 2026-10-10T23:01:20+05:30 — Add OpenAI voice model playground

- Changed: Added FastAPI voice catalog, transcription model comparison and speech generation endpoints, plus a React/Vite interface for recording/uploading audio, comparing transcripts, selecting TTS models and voices, and playing generated samples. Updated setup and model documentation.
- Why: Let the team try OpenAI speech models on the same real audio and text samples before choosing models for VocaPilot.
- Validation: Python source compilation, JSON parsing for frontend package/config files, and `git diff --check` were run. Runtime requests were not made because dependencies and an API key are not configured.
- Limitations: Model access depends on the configured OpenAI API project. The playground covers file transcription and speech generation, not Realtime API sessions. No changes have been committed, per the user's instruction.

## 2026-10-10T22:38:46+05:30 — Add VocaPilot implementation plan

- Changed: Added `implementation_plan.md` with the supplied VocaPilot Shopping baseline specification and implementation sequence; updated `AI_USAGE.md`.
- Why: Keep the requested project brief and its staged build requirements in the repository for implementation.
- Validation: Confirmed the copied plan is present and checked repository diff whitespace with `git diff --check`.
- Limitations: The plan documents intended work; no application implementation or behavior has been verified.

## Template setup — 10 October 2026

- Changed: Added the event README, rules, agent guide, change log, AI usage record, submission checklist, Git ignore rules, and pull request checklist.
- Why: Give participants a consistent starting point for event rules, basic coding patterns, documented changes, and regular commits.
- Validation: Checked local Markdown links, event detail consistency, required documents, and diff whitespace before publishing.
- Limitations: Documentation scaffolding only; no participant project, application, or working demo is included. GitHub publication and template status are verified separately after creation.
