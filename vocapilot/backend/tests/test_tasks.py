from fastapi.testclient import TestClient

from app.main import app


def test_rejects_unknown_target():
    with TestClient(app) as client:
        response = client.post("/api/tasks", json={"input_text": "Find a backpack", "target": "untrusted.example"})
    assert response.status_code == 422


def test_rejects_too_short_request():
    with TestClient(app) as client:
        response = client.post("/api/tasks", json={"input_text": "no"})
    assert response.status_code == 422
