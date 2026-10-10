# AI usage record

Use this file to record actual Codex assistance. Summaries are sufficient; omit secrets and private data.

## Event build log

| Date and time with timezone | Tool / model, if known | Task | Assistance and affected files | Human review / corrections | Validation and result |
| --- | --- | --- | --- | --- | --- |
| 2026-10-11T00:08:44+05:30 | Codex | Connect VocaPilot to OpenAI text and voice models | Replaced regex intent parsing with Responses API conversation routing and inventory matching; added audio transcription and generated speech endpoints, client-side conversation history and Listen control, API-key/model configuration, route tests, and setup/submission documentation across `vocapilot/backend` and `vocapilot/frontend`. | Pending human review; user will provide API key. | Frontend build passed; backend suite: 11 passed, 1 opt-in live test skipped. Model endpoints were tested with mocks; no live OpenAI key was configured. |
| 2026-10-10T23:52:06+05:30 | Codex | Fit VocaPilot workspace and improve browser preview | Updated `vocapilot/frontend/src/App.tsx` and `style.css` for viewport-height layout, auto-scrolling progress, larger delayed screenshot swaps, and softer motion. Updated `vocapilot/backend/app/playwright_shopping.py` to capture inventory after login and wait for cart rendering before capture. Updated README and changelog. | Pending human review | Frontend production build passed; backend suite: 9 passed, 1 opt-in live test skipped; `git diff --check` passed. Live SauceDemo flow not run. |
| 2026-10-10T23:40:03+05:30 | Codex | Rework VocaPilot UI into chat workspace | Replaced the dashboard in `vocapilot/frontend/src/App.tsx` and `style.css` with a conversation stream, bottom text/mic composer, progress sidebar, and fixed live browser preview; updated README and changelog. | Pending human review | `npm run build` passed after correcting the UI to use the API's `input_text` field. |
| 2026-10-10T23:20:55+05:30 | Codex | Install local runtime and run VocaPilot | Set up ignored workspace-local Python 3.12.10, pip dependencies, Chromium headless shell, fixed intent parsing, and updated README/submission run steps. | Pending human review | 9 backend tests passed; 1 opt-in live test skipped. Chromium launched, frontend build passed, and frontend/API health returned HTTP 200. Live shopping task not executed. |
| 2026-10-10T22:51:54+05:30 | Codex | Ignore generated build metadata | Added a `.gitignore` pattern for TypeScript's incremental build file. | Pending human review | Git now ignores the build output; status will be checked after commit. |
| 2026-10-10T22:48:04+05:30 | Codex | Build VocaPilot deterministic baseline | Created React/Vite UI, FastAPI task API/SSE, Playwright SauceDemo workflow, cart verification, tests, and updated README, changelog, ignore rules, and submission details. Reviewed official Computer Use documentation for the later integration phase. | Pending human review | npm install completed with no reported vulnerabilities; npm production build passed after TypeScript fixes. Python runtime unavailable, so tests and backend execution were not run. |

## Template preparation

On 10 October 2026, Codex prepared the repository's documentation template from the organizer's supplied rules. That initial preparation is separate from the VocaPilot project implementation recorded above.
