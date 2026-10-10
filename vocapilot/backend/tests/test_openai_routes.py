from fastapi.testclient import TestClient

from app.main import app


def test_chat_uses_model_response(monkeypatch):
    async def fake_route_chat(messages):
        assert messages[-1]["content"] == "Hello there"
        return {"message": "Hi! What are you shopping for?", "action": "chat", "product_query": None, "max_price": None}

    monkeypatch.setattr("app.routes.tasks.route_chat", fake_route_chat)
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "Hello there"}]})
    assert response.status_code == 200
    assert response.json() == {"message": "Hi! What are you shopping for?", "task": None}


def test_chat_routes_a_shopping_request_to_saucedemo(monkeypatch):
    async def fake_route_chat(messages):
        return {"message": "I’ll check the available backpacks for you.", "action": "shop",
                "product_query": "waterproof backpack", "max_price": 50}

    async def fake_run_task(task_id):
        return None

    monkeypatch.setattr("app.routes.tasks.route_chat", fake_route_chat)
    monkeypatch.setattr("app.routes.tasks.run_shopping_task", fake_run_task)
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "Find a waterproof backpack under $50"}]})
    assert response.status_code == 200
    data = response.json()
    assert data["task"]["intent"]["requested_product"] == "waterproof backpack"
    assert data["task"]["intent"]["max_price"] == 50


def test_voice_transcription_returns_text(monkeypatch):
    async def fake_transcribe(filename, content_type, audio):
        assert audio == b"voice sample"
        return "Find a small backpack"

    monkeypatch.setattr("app.routes.tasks.transcribe_audio", fake_transcribe)
    with TestClient(app) as client:
        response = client.post("/api/transcribe", files={"file": ("voice.webm", b"voice sample", "audio/webm")})
    assert response.status_code == 200
    assert response.json() == {"text": "Find a small backpack"}


def test_speech_endpoint_returns_audio(monkeypatch):
    async def fake_speech(text):
        assert text == "Hello from VocaPilot"
        return b"mp3 audio"

    monkeypatch.setattr("app.routes.tasks.synthesize_speech", fake_speech)
    with TestClient(app) as client:
        response = client.post("/api/speech", json={"text": "Hello from VocaPilot"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert response.content == b"mp3 audio"


def test_chat_explains_missing_api_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPEN_API_KEY", raising=False)
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "Hello"}]})
    assert response.status_code == 503
    assert "OPENAI_API_KEY" in response.json()["detail"]
