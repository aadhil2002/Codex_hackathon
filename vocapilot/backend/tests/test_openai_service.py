from app.openai_service import _client


def test_client_accepts_open_api_key_alias(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("OPEN_API_KEY", "test-key")
    _client.cache_clear()
    try:
        assert _client().api_key == "test-key"
    finally:
        _client.cache_clear()
