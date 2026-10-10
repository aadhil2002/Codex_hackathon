import asyncio
from urllib.parse import urlparse

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from openai import AuthenticationError, OpenAIError

from app.openai_service import OpenAIConfigurationError, route_chat, synthesize_speech, transcribe_audio
from app.computer_use_shopping import run_shopping_task
from app.schemas import ChatRequest, ChatResponse, SpeechRequest, TaskCreate, TaskView, TranscriptionResponse
from app.store_security import allowed_store_url
from app.task_store import store

router = APIRouter()


def _openai_http_error(operation: str, exc: OpenAIError) -> HTTPException:
    if isinstance(exc, AuthenticationError):
        return HTTPException(
            status_code=503,
            detail="OpenAI rejected the configured API key. Set a valid OPENAI_API_KEY in vocapilot/backend/.env and restart the backend.",
        )
    return HTTPException(
        status_code=502,
        detail=f"OpenAI {operation} failed. Check backend connectivity, model access, and account limits.",
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    if request.messages[-1].role != "user":
        raise HTTPException(status_code=422, detail="The latest conversation message must be from you.")
    try:
        turn = await route_chat([message.model_dump() for message in request.messages[-12:]])
    except OpenAIConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OpenAIError as exc:
        raise _openai_http_error("chat request", exc) from exc

    if turn["action"] == "chat":
        return ChatResponse(message=turn["message"])
    product_query = (turn.get("product_query") or "").strip()
    if not product_query:
        return ChatResponse(message="What kind of product would you like me to look for?")

    user_text = request.messages[-1].content
    intent = {
        "request": user_text,
        "requested_product": product_query,
        "max_price": turn.get("max_price"),
        "mode": "add_to_cart" if turn["action"] == "add_to_cart" else "browse",
        "quantity": 1,
        "checkout_allowed": False,
    }
    return ChatResponse(message=turn["message"], shopping_intent=intent)


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(file: UploadFile = File(...)) -> TranscriptionResponse:
    audio = await file.read(20 * 1024 * 1024 + 1)
    if len(audio) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Keep voice recordings under 20 MB.")
    if not audio:
        raise HTTPException(status_code=422, detail="The voice recording was empty.")
    try:
        text = await transcribe_audio(file.filename or "recording.webm", file.content_type or "audio/webm", audio)
    except OpenAIConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except OpenAIError as exc:
        raise _openai_http_error("transcription", exc) from exc
    return TranscriptionResponse(text=text)


@router.post("/speech")
async def speech(request: SpeechRequest) -> Response:
    try:
        audio = await synthesize_speech(request.text)
    except OpenAIConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OpenAIError as exc:
        raise _openai_http_error("speech generation", exc) from exc
    return Response(content=audio, media_type="audio/mpeg")


@router.post("/tasks", response_model=TaskView, status_code=202)
async def create_task(request: TaskCreate) -> TaskView:
    if request.site is None:
        raise HTTPException(status_code=422, detail="Set the store name and website before starting a store task.")
    target = str(request.site.url).rstrip("/")
    parsed_target = urlparse(target)
    if not allowed_store_url(target) or parsed_target.query or parsed_target.fragment:
        raise HTTPException(status_code=422, detail="Use a public HTTPS store address. Local and private network addresses are blocked.")
    if request.intent is None:
        raise HTTPException(status_code=422, detail="A shopping intent is required.")
    task = store.create(request)
    store.credentials[task.task_id] = (request.site.email, request.site.password.get_secret_value())
    asyncio.create_task(run_shopping_task(task.task_id))
    return task


@router.get("/tasks/{task_id}", response_model=TaskView)
async def get_task(task_id: str) -> TaskView:
    task = store.tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task


@router.get("/tasks/{task_id}/events")
async def task_events(task_id: str) -> StreamingResponse:
    if task_id not in store.tasks:
        raise HTTPException(status_code=404, detail="Task not found.")

    async def stream():
        task = store.tasks[task_id]
        cursor = 0
        while True:
            while cursor < len(task.events):
                event = task.events[cursor]
                cursor += 1
                yield f"id: {event.id}\nevent: {event.type}\ndata: {event.model_dump_json()}\n\n"
            if task.status in {"completed", "failed", "cancelled", "inconclusive"}:
                break
            condition = store.changed[task_id]
            async with condition:
                try:
                    await asyncio.wait_for(condition.wait(), timeout=15)
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@router.post("/tasks/{task_id}/cancel", response_model=TaskView)
async def cancel_task(task_id: str) -> TaskView:
    task = store.tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.status in {"queued", "running"}:
        store.cancel_flags[task_id].set()
    return task
