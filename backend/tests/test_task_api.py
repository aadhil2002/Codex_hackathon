import asyncio

import httpx
import pytest

from app.main import app


@pytest.mark.asyncio
async def test_create_task_and_stream_events(monkeypatch) -> None:
    async def finish_without_browser(record):
        record.status = "completed"
        record.emit("task_completed", "Test task completed.")

    monkeypatch.setattr("app.shopping_routes.execute_task", finish_without_browser)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post("/api/tasks", json={
            "input_text": "Add one Sauce Labs Backpack to my cart. Do not check out.",
            "source": "text",
            "site_url": "https://www.saucedemo.com/",
        })
        assert created.status_code == 202
        task_id = created.json()["task_id"]
        await asyncio.sleep(0)
        state = await client.get(f"/api/tasks/{task_id}")
        assert state.status_code == 200
        assert state.json()["status"] == "completed"
        events = await client.get(f"/api/tasks/{task_id}/events")
        assert "task_created" in events.text
        assert "task_completed" in events.text


@pytest.mark.asyncio
async def test_task_target_is_restricted() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/tasks", json={
            "input_text": "Find a backpack and add it to the cart.",
            "site_url": "http://127.0.0.1:8000/admin",
        })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_handoff_can_be_resumed_without_sending_secrets() -> None:
    async def wait_for_user(record):
        record.status = "waiting_for_user"
        record.handoff_message = "Please sign in using the visible browser window."
        record.emit("user_handoff_required", record.handoff_message)
        await record.handoff_event.wait()
        record.status = "completed"
        record.handoff_message = None
        record.emit("task_completed", "Resumed after user action.")

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr("app.shopping_routes.execute_task", wait_for_user)
    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            created = await client.post("/api/tasks", json={"input_text": "Find an item", "site_url": "https://example.com"})
            task_id = created.json()["task_id"]
            await asyncio.sleep(0)
            state = await client.get(f"/api/tasks/{task_id}")
            assert state.json()["status"] == "waiting_for_user"
            resumed = await client.post(f"/api/tasks/{task_id}/resume", json={"message": "I completed sign in."})
            assert resumed.status_code == 200
            await asyncio.sleep(0)
            state = await client.get(f"/api/tasks/{task_id}")
            assert state.json()["status"] == "completed"
    finally:
        monkeypatch.undo()


@pytest.mark.asyncio
async def test_voice_transcribe_route_uses_saaras_adapter(monkeypatch) -> None:
    monkeypatch.setattr("app.routes.SARVAM_API_KEY", "test-key")
    monkeypatch.setattr("app.routes._sarvam_transcribe", lambda *args: "I need a backpack for everyday use.")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/voice/transcribe", data={
            "language_code": "ml-IN", "translate_to_english": "true",
        }, files={"audio": ("request.wav", b"test-audio", "audio/wav")})
    assert response.status_code == 200
    assert response.json() == {
        "model": "sarvam-saaras-v4",
        "transcript": "I need a backpack for everyday use.",
    }
