from fastapi.testclient import TestClient

from app.main import app
from app.schemas import TaskCreate


def test_rejects_unknown_target():
    with TestClient(app) as client:
        response = client.post("/api/tasks", json={"input_text": "Find a backpack", "target": "untrusted.example"})
    assert response.status_code == 422


def test_task_request_accepts_single_character():
    request = TaskCreate(input_text="x", intent={"requested_product": "x"})
    assert request.input_text == "x"
