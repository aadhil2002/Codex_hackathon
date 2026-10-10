import asyncio
import json
import sys
from types import SimpleNamespace
import pytest

from app.computer_use_shopping import _execute_action, _price_value
from app.schemas import TaskCreate
from app.store_security import allowed_store_url
from app.task_store import store


class FakePyAutoGUI:
    FAILSAFE = True

    def __init__(self):
        self.calls = []

    def size(self):
        return 1280, 800

    def __getattr__(self, name):
        return lambda *args, **kwargs: self.calls.append((name, args, kwargs))


def test_secret_markers_are_substituted_only_in_the_local_action_handler(monkeypatch):
    desktop = FakePyAutoGUI()
    monkeypatch.setitem(sys.modules, "pyautogui", desktop)

    _execute_action({"type": "type", "text": "{{EMAIL}}"}, "shopper@example.test", "private-password")
    _execute_action({"type": "type", "text": "{{PASSWORD}}"}, "shopper@example.test", "private-password")

    assert desktop.calls[0][0:2] == ("write", ("shopper@example.test",))
    assert desktop.calls[1][0:2] == ("write", ("private-password",))


def test_computer_actions_reject_out_of_bounds_coordinates_and_unsafe_shortcuts(monkeypatch):
    desktop = FakePyAutoGUI()
    monkeypatch.setitem(sys.modules, "pyautogui", desktop)

    with pytest.raises(ValueError, match="outside the current screen"):
        _execute_action({"type": "click", "x": 1280, "y": 10}, "", "")
    with pytest.raises(ValueError, match="outside the store panel"):
        _execute_action({"type": "click", "x": 100, "y": 200}, "", "", (200, 80, 1280, 800))
    with pytest.raises(ValueError, match="shortcut .* is not allowed"):
        _execute_action({"type": "keypress", "keys": ["CTRL", "W"]}, "", "")


@pytest.mark.parametrize("keys", [["CTRL", "F"], ["CMD", "F"], ["COMMAND", "F"]])
def test_computer_actions_allow_find_shortcuts(keys, monkeypatch):
    desktop = FakePyAutoGUI()
    monkeypatch.setitem(sys.modules, "pyautogui", desktop)

    _execute_action({"type": "keypress", "keys": keys}, "", "")

    assert desktop.calls == [("hotkey", tuple(key.lower() for key in keys), {})]


@pytest.mark.parametrize("modifier", ["META", "CMD", "COMMAND"])
def test_computer_actions_map_app_switch_shortcut_to_browser_tab_cycle(modifier, monkeypatch):
    desktop = FakePyAutoGUI()
    monkeypatch.setitem(sys.modules, "pyautogui", desktop)

    _execute_action({"type": "keypress", "keys": [modifier, "TAB"]}, "", "")

    assert desktop.calls == [("hotkey", ("ctrl", "tab"), {})]


def test_store_url_blocks_local_and_non_https_targets(monkeypatch):
    def fake_getaddrinfo(host, *args, **kwargs):
        if host == "8.8.8.8":
            return [(None, None, None, None, ("8.8.8.8", 443))]
        if host == "store.example":
            return [(None, None, None, None, ("93.184.216.34", 443))]
        raise OSError("unresolvable")

    monkeypatch.setattr("app.store_security.socket.getaddrinfo", fake_getaddrinfo)
    assert allowed_store_url("https://store.example/")
    assert allowed_store_url("https://8.8.8.8/")
    assert not allowed_store_url("https://127.0.0.1/")
    assert not allowed_store_url("https://10.0.0.2/")
    assert not allowed_store_url("https://user@store.example/")
    assert not allowed_store_url("javascript:alert(1)")
    assert not allowed_store_url("http://store.example/")


def test_price_parser_handles_common_decimal_and_thousands_formats():
    assert _price_value("$1,199.00") == 1199.0
    assert _price_value("€1.199,00") == 1199.0
    assert _price_value("$24.99") == 24.99
    assert _price_value("price unavailable") is None


@pytest.mark.asyncio
async def test_computer_use_loop_keeps_credentials_local_and_requires_cart_evidence(monkeypatch):
    import app.computer_use_shopping as computer

    calls = []
    actions = []
    responses = [
        SimpleNamespace(id="response-1", output=[SimpleNamespace(
            type="computer_call", status="completed", call_id="computer-call-1",
            actions=[{"type": "click", "x": 300, "y": 200}],
        )]),
        SimpleNamespace(id="response-2", output=[], output_text=json.dumps({
            "status": "verified", "product_name": "Canvas Backpack", "displayed_price": "$24.99",
            "cart_count": 1, "evidence": "Canvas Backpack and quantity 1 are visible in the cart.",
        })),
    ]

    async def fake_create(**kwargs):
        calls.append(kwargs)
        return responses.pop(0)

    def fake_client():
        return SimpleNamespace(responses=SimpleNamespace(create=fake_create))

    async def fast_sleep(_seconds):
        return None

    monkeypatch.setattr(computer, "_client", fake_client)
    monkeypatch.setitem(sys.modules, "pyautogui", FakePyAutoGUI())
    monkeypatch.setattr(computer, "allowed_store_url", lambda _url: True)
    monkeypatch.setattr(computer, "_screenshot_base64", lambda: "screen-image")
    monkeypatch.setattr(computer, "_execute_action", lambda action, _email, _password, _bounds: actions.append(action))
    monkeypatch.setattr(computer.asyncio, "sleep", fast_sleep)

    request = TaskCreate(input_text="find a backpack under $30", intent={
        "requested_product": "backpack", "max_price": 30, "mode": "add_to_cart",
    }, site={"site_name": "Example Store", "url": "https://store.example", "email": "private-email@example.test", "password": "private-password"})
    task = store.create(request)
    store.credentials[task.task_id] = ("private-email@example.test", "private-password")
    await computer._run_computer_task(task.task_id)

    initial_input = json.dumps(calls[0]["input"])
    assert "private-email@example.test" not in initial_input
    assert "private-password" not in initial_input
    assert "{{EMAIL}}" in initial_input
    assert "{{PASSWORD}}" in initial_input
    assert calls[1]["previous_response_id"] == "response-1"
    assert calls[1]["input"][0]["call_id"] == "computer-call-1"
    assert actions == [{"type": "click", "x": 300, "y": 200}]
    assert task.status == "completed"
    assert task.result.verification_status == "verified"
    assert task.result.cart_count == 1
    store.tasks.pop(task.task_id, None)
    store.cancel_flags.pop(task.task_id, None)
    store.changed.pop(task.task_id, None)
    store.credentials.pop(task.task_id, None)


@pytest.mark.asyncio
async def test_browse_mode_lists_products_without_cart_result_or_external_browser(monkeypatch):
    import app.computer_use_shopping as computer

    calls = []
    response = SimpleNamespace(id="browse-response", output=[], output_text=json.dumps({
        "status": "listed",
        "products": [
            {"name": "Samsung Galaxy S21", "displayed_price": "$699.00", "description": "Android phone"},
            {"name": "Nokia lumia 1520", "displayed_price": "$549.00", "description": "Windows phone"},
        ],
        "evidence": "Two phone cards and their prices were visible in the Phones category.",
    }))

    async def fake_create(**kwargs):
        calls.append(kwargs)
        return response

    class FakeDesktop(FakePyAutoGUI):
        def moveTo(self, *args, **kwargs):
            self.calls.append(("moveTo", args, kwargs))

    monkeypatch.setitem(sys.modules, "pyautogui", FakeDesktop())
    monkeypatch.setattr(computer, "_client", lambda: SimpleNamespace(responses=SimpleNamespace(create=fake_create)))
    monkeypatch.setattr(computer, "allowed_store_url", lambda _url: True)
    monkeypatch.setattr(computer, "_screenshot_base64", lambda: "screen-image")
    real_sleep = asyncio.sleep
    async def fast_sleep(_seconds):
        await real_sleep(0)
    monkeypatch.setattr(computer.asyncio, "sleep", fast_sleep)

    request = TaskCreate(input_text="List all phones", intent={"requested_product": "phones", "mode": "browse"},
                         site={"site_name": "DemoBlaze", "url": "https://www.demoblaze.com/"})
    task = store.create(request)
    await computer._run_computer_task(task.task_id)

    prompt = json.dumps(calls[0]["input"])
    assert "Do not click Add to cart" in prompt
    assert task.status == "completed"
    assert [product.name for product in task.products] == ["Samsung Galaxy S21", "Nokia lumia 1520"]
    assert task.result is None
    assert task.products[0].price_value == 699
    assert task.events[-1].type == "products_listed"
    store.tasks.pop(task.task_id, None)
    store.cancel_flags.pop(task.task_id, None)
    store.changed.pop(task.task_id, None)
