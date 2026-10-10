import asyncio

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.playwright_shopping import run_shopping_task
from app.schemas import TaskCreate, TaskView
from app.task_store import store

router = APIRouter()


@router.post("/tasks", response_model=TaskView, status_code=202)
async def create_task(request: TaskCreate) -> TaskView:
    if request.target != "saucedemo":
        raise HTTPException(status_code=422, detail="Only the configured SauceDemo target is available.")
    task = store.create(request)
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
