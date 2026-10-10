import httpx
from openai import AuthenticationError
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
    assert response.json() == {"message": "Hi! What are you shopping for?", "task": None, "shopping_intent": None}


def test_vite_nondefault_local_port_can_call_api():
    with TestClient(app) as client:
        response = client.options("/api/chat", headers={
            "Origin": "http://127.0.0.1:5174",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5174"


def test_chat_returns_shopping_intent_for_frontend_task_creation(monkeypatch):
    async def fake_route_chat(messages):
        return {"message": "I’ll list the available backpacks for you. Your cart will stay unchanged.", "action": "browse",
                "product_query": "waterproof backpack", "max_price": 50}

    monkeypatch.setattr("app.routes.tasks.route_chat", fake_route_chat)
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "Find a waterproof backpack under $50"}]})
    assert response.status_code == 200
    data = response.json()
    assert data["task"] is None
    assert data["shopping_intent"]["requested_product"] == "waterproof backpack"
    assert data["shopping_intent"]["mode"] == "browse"
    assert data["shopping_intent"]["max_price"] == 50
    assert data["shopping_intent"]["quantity"] == 1
    assert data["shopping_intent"]["checkout_allowed"] is False


def test_chat_accepts_single_character_shop_request(monkeypatch):
    async def fake_route_chat(messages):
        assert messages[-1]["content"] == "x"
        return {"message": "I’ll check that for you.", "action": "browse", "product_query": "backpack", "max_price": None}

    monkeypatch.setattr("app.routes.tasks.route_chat", fake_route_chat)
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "x"}]})
    assert response.status_code == 200
    assert response.json()["shopping_intent"]["request"] == "x"
    assert response.json()["shopping_intent"]["requested_product"] == "backpack"


def test_chat_marks_explicit_add_request_as_cart_action(monkeypatch):
    async def fake_route_chat(_messages):
        return {"message": "I’ll add one backpack to the cart.", "action": "add_to_cart",
                "product_query": "backpack", "max_price": None}

    monkeypatch.setattr("app.routes.tasks.route_chat", fake_route_chat)
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "Add a backpack to my cart"}]})
    assert response.status_code == 200
    assert response.json()["shopping_intent"]["mode"] == "add_to_cart"


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


def test_chat_sanitizes_rejected_api_key_error(monkeypatch):
    async def reject_key(messages):
        response = httpx.Response(
            401,
            request=httpx.Request("POST", "https://api.openai.com/v1/responses"),
            json={"error": {"message": "Incorrect API key provided: sk-private-test"}},
        )
        raise AuthenticationError("Incorrect API key provided: sk-private-test", response=response, body=response.json())

    monkeypatch.setattr("app.routes.tasks.route_chat", reject_key)
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "Hello"}]})
    assert response.status_code == 503
    assert "valid OPENAI_API_KEY" in response.json()["detail"]
    assert "sk-private-test" not in response.text
