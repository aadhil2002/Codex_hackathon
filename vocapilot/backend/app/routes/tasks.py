import asyncio
from urllib.parse import urlparse

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from openai import APIConnectionError, AuthenticationError, NotFoundError, OpenAIError, PermissionDeniedError, RateLimitError

from app.openai_service import OpenAIConfigurationError, route_chat, synthesize_speech, transcribe_audio
from app.playwright_shopping import allowed_store_url, cancel_shopping_task, choose_product_options, run_shopping_task, select_product, summarize_cart
from app.schemas import CartSummary, ChatRequest, ChatResponse, ProductOptions, ProductSelection, SpeechRequest, TaskCreate, TaskView, TranscriptionResponse
from app.task_store import store

router = APIRouter()


def _openai_http_error(operation: str, exc: OpenAIError) -> HTTPException:
    if isinstance(exc, AuthenticationError):
        return HTTPException(
            status_code=503,
            detail="OpenAI rejected the configured API key. Set a valid OPENAI_API_KEY in vocapilot/backend/.env and restart the backend.",
        )
    if isinstance(exc, APIConnectionError):
        return HTTPException(
            status_code=503,
            detail="The backend cannot connect to api.openai.com. Check outbound network or proxy access from the backend terminal; store sign-in details do not provide OpenAI access.",
        )
    if isinstance(exc, RateLimitError):
        return HTTPException(
            status_code=503,
            detail="OpenAI rejected this request due to rate limits or account quota. Check API billing and usage for the account that owns OPENAI_API_KEY.",
        )
    if isinstance(exc, PermissionDeniedError):
        return HTTPException(
            status_code=503,
            detail="The configured OpenAI API key cannot access this request or project. Check key permissions and project access.",
        )
    if isinstance(exc, NotFoundError):
        return HTTPException(
            status_code=503,
            detail="The configured OpenAI model is unavailable to this project. Check OPENAI_TEXT_MODEL and model access in the API project.",
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

    if turn["action"] == "cart":
        return ChatResponse(message="I’ll check the store cart for its current items.", store_query="cart")
    if turn["action"] not in {"shop", "browse"}:
        return ChatResponse(message=turn["message"])
    product_query = (turn.get("product_query") or "").strip()
    if turn["action"] == "shop" and not product_query:
        return ChatResponse(message="What kind of product would you like me to look for?")

    user_text = request.messages[-1].content
    intent = {
        "request": user_text,
        "requested_product": product_query or "all available products",
        "max_price": turn.get("max_price"),
        "browse_all": turn["action"] == "browse",
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
        raise HTTPException(status_code=422, detail="Open your profile and add the store URL and sign-in details before shopping.")
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


@router.get("/tasks/{task_id}/cart", response_model=CartSummary)
async def get_cart_summary(task_id: str) -> CartSummary:
    task = store.tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    try:
        return await summarize_cart(task_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/tasks/{task_id}/select", response_model=TaskView)
async def choose_task_product(task_id: str, request: ProductSelection) -> TaskView:
    if task_id not in store.tasks:
        raise HTTPException(status_code=404, detail="Task not found.")
    try:
        return await select_product(task_id, request.store_ref)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/tasks/{task_id}/options", response_model=TaskView)
async def choose_task_options(task_id: str, request: ProductOptions) -> TaskView:
    if task_id not in store.tasks:
        raise HTTPException(status_code=404, detail="Task not found.")
    try:
        return await choose_product_options(task_id, request.model_dump(exclude_none=True))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


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
    if task.status in {"queued", "running", "awaiting_selection", "awaiting_options"}:
        await cancel_shopping_task(task_id)
    return task
