# Demo runbook

1. Set `OPENAI_API_KEY` in `backend/.env`. Set `SARVAM_API_KEY` only if demonstrating voice transcription. Never put personal credentials in the environment file.
2. Start FastAPI and Vite using the commands in the README.
3. Enter a public HTTPS website and a task, such as opening a public product page and comparing visible options. Voice can be recorded and edited before launch.
4. Start the task. Point out the visible local Chromium window, screenshot preview, and activity stream.
5. If the agent asks for a write or new-site navigation, inspect the displayed URL and approve or deny. Demonstrate handoff by having the agent pause for a user-only step, perform the step in the browser window, and resume with a non-secret note.
6. Review the final model-observed summary and screenshot. Independently check the site before claiming an order, booking, or form submission succeeded.

If the site or OpenAI API is unavailable, the app can still show the interface and API validation, but do not claim a live task succeeded. Tests are offline and do not call OpenAI or Sarvam:

```sh
cd backend
.venv/bin/python -m pytest tests -q
```
