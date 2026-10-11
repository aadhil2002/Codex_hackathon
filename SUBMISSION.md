# Project submission

Complete repository and participant details before submission. Follow the organizers' announced submission method.

## Project

- **Project name:** ShopPilot — chat shopping with a Playwright preview
- **Short description:** A React shopping assistant powered by OpenAI's API that accepts typed or spoken requests, maps them to validated live catalog products, and shows Playwright controlling the practice store alongside the conversation.
- **Code repository URL:** TODO
- **Final submitted implementation commit SHA:** TODO
- **Working demo URL:** Run locally; follow README setup, then open `http://127.0.0.1:5173`.
- **Run the demo:** Double-click `run_shoppilot.bat` after installing prerequisites, or start the Flask API and Vite UI in separate terminals.
- **Demo access requirements:** An OpenAI API key in the local `.env` file enables GPT chat; microphone permission is optional for voice input. Exact-title matching remains available without an API key.

## Participants

| Participant name | GitHub handle | Contribution |
| --- | --- | --- |
| TODO | TODO | TODO |

## Run and demonstrate

- **Prerequisites:** Python 3.10+, Node.js 20.19+, npm, and internet access.
- **Install command:** `python -m pip install -r requirements.txt`, `python -m playwright install chromium`, copy `.env.example` to `.env`, add `OPENAI_API_KEY`, and run `cd frontend; npm install`.
- **Required environment variables:** `OPENAI_API_KEY` enables OpenAI Responses API chat (default model `gpt-5.4-mini`); it is optional for exact-title fallback. `OPENAI_MODEL` may override the model.
- **Test command:** `python -m pytest -v` (standalone Playwright checks).
- **Demo walkthrough:** Browse the React storefront populated from a public product catalog API, search/filter the catalog, add or remove products and adjust quantities, then enter sample delivery details and place a demo order. The chat assistant can match natural product requests when OpenAI is configured. Python Playwright automates the same UI end to end.
- **Checks performed and results:** React production build passed with `npm run build`; Python/Playwright runtime checks were not run in this workspace.
- **Known limitations:** The app supports one local shopping session. Product catalog and images depend on the public product API and image CDN. GPT matching depends on OpenAI model access and API billing; without a key, chat matching requires an exact product title. Checkout is simulated locally; no order or payment is sent to the catalog service.
- **Libraries and data sources:** [React](https://react.dev/), [Vite](https://vite.dev/), [Flask](https://flask.palletsprojects.com/), [Playwright for Python](https://playwright.dev/python/), [pytest](https://pytest.org/), [OpenAI Python SDK](https://github.com/openai/openai-python), and the public product catalog API (`/products` endpoint). No private data used.
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
