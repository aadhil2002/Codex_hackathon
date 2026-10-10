# Change log

Record each meaningful project change newest first, with an actual timestamp and timezone.

## Event build log

## 2026-10-10T23:20:55+05:30 — Install workspace runtime and run app

- Changed: Installed portable CPython 3.12.10, pip packages, and Playwright headless Chromium under ignored `.tools/`. Fixed intent parsing so negative checkout wording is allowed and product names stop before cart instructions. Updated setup/check commands and actual validation results in README and submission details.
- Why: The machine had no registered Python; the app needed an isolated local runtime to start its API and exercise the backend tests without a system-wide installation.
- Validation: Backend tests: 9 passed, 1 opt-in live-site test skipped. Playwright Chromium launched successfully. Frontend production build passed. Frontend and API health returned HTTP 200. Live SauceDemo shopping workflow was not run.
- Limitations: Voice transcription and OpenAI Computer Use remain incomplete. Live site automation was not verified; pytest emits a Starlette/httpx deprecation warning.

## 2026-10-10T22:51:54+05:30 — Ignore TypeScript build metadata

- Changed: Added a `.gitignore` rule for `*.tsbuildinfo`.
- Why: The TypeScript project build writes incremental metadata into the frontend folder; keep that generated state out of source control.
- Validation: Confirmed the production build had generated the untracked file and verified the ignore rule with Git.
- Limitations: None identified for this ignore rule.

## 2026-10-10T22:48:04+05:30 — Add VocaPilot deterministic shopping baseline

- Changed: Added a React + TypeScript + Vite shopping interface; FastAPI task endpoints, in-memory task state and SSE; fixed SauceDemo origin allowlist; actual inventory and cart DOM extraction; explicit cart verification; screenshots; cancellation and a 90-second task limit; starter unit and opt-in live-site tests. Updated README, ignore rules, and submission description.
- Why: Establish an end-to-end deterministic implementation path that does not require a model API key and never proceeds to checkout.
- Validation: Inspected clean git status before editing; confirmed Node 24.14.0 and npm 11.9.0. `npm install` completed with 0 reported vulnerabilities and `npm run build` passed. The first frontend build exposed three TypeScript issues; fixed them and rebuilt successfully. `git diff --check` reported no whitespace errors. Python and the `py` launcher are unavailable, so pytest and backend execution could not run. Inspected the current official OpenAI Computer Use guide and sample app for the later integration phase.
- Limitations: Live SauceDemo login and browser flow are not verified. Voice recording has no upload/transcription endpoint yet. OpenAI Computer Use, persistent storage, and an executed browser test remain incomplete. The app needs Python 3.11 and Chromium.
