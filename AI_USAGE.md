# AI usage record

Use Codex during the hackathon and briefly document its actual contribution here. Add a row after each meaningful task or milestone. Keep summaries concise and omit secrets, private data, and full chat transcripts.

## Event build log

Participant project assistance is recorded below. Mark human review as pending until someone has reviewed the contribution.

| Date and time with timezone | Tool / model, if known | Task | Assistance and affected files | Human review / corrections | Validation and result |
| --- | --- | --- | --- | --- | --- |
| 2026-10-10T22:38:46+05:30 | Codex | Add the VocaPilot Shopping implementation plan | Copied the user-provided specification into `implementation_plan.md`; documented this change in `CHANGELOG.md`. | Pending | Confirmed the file is present and checked `git diff --check`; no application behavior was tested. |
| 2026-10-10T23:01:20+05:30 | Codex | Add an OpenAI voice model playground | Added FastAPI endpoints and a React/Vite UI for comparing transcription models and listening to speech model/voice samples; updated `README.md`. | Pending | Python syntax and JSON parsing plus `git diff --check` passed. Runtime/API behavior was not exercised; dependencies and an API key are not configured. No commit was created, per user instruction. |
| 2026-10-10T23:26:11+05:30 | Codex | Add Indian-language transcription and translation providers | Added Sarvam Saaras v4, an optional local AI4Bharat IndicSeamless model, language selection for all scheduled Indian languages and English, and updated setup/provider/license notes. | Pending | Backend source compilation, frontend TypeScript/Vite production build, and `git diff --check` passed. Provider requests were not exercised; credentials and gated Hugging Face model access are required. |
| 2026-10-11T00:08:01+05:30 | Codex | Diagnose Hugging Face inference `OSError` | Updated the comparison response to include a short, credential-scrubbed local model exception detail so access, load, and audio decoding failures can be distinguished. | Pending | Backend source compilation and `git diff --check` passed. No audio sample was available to repeat inference. |
| 2026-10-11T00:34:02+05:30 | Codex | Build a visual browser agent with human handoff | Replaced the fixed SauceDemo task path with OpenAI Computer Use for a user-supplied site; added public HTTPS checks, approval endpoints/UI, pause/resume handoff, generic outcome reporting, and updated project/demo documentation. Removed unused shopping-specific UI and automation files. | Pending; user review needed, especially around consequential-action approval policy. | Backend tests passed (4 passed), frontend production build passed, and `git diff --check` passed. No live OpenAI task was run because credentials/session access were not confirmed. No commit was created per user instruction. |

## Template preparation

On 10 October 2026, Codex prepared this documentation template from the organizer's supplied rules and checked the linked Luma page for the event name and dates. This covered `README.md`, `RULES.md`, `AGENTS.md`, `CHANGELOG.md`, `AI_USAGE.md`, `SUBMISSION.md`, `.gitignore`, and the pull request checklist. Agent validation covered local links, event consistency, required documents, and diff whitespace; organizer review is pending.

This preparation is separate from participant project implementation and participant AI usage during the event.
