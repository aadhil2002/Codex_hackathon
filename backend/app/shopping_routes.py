import asyncio

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.task import ApprovalDecision, TaskRequest, TaskResponse, UserHandoffResponse
from app.services.task_runner import execute_task
from app.state.task_store import TaskRecord, task_store


router = APIRouter(prefix="/api/tasks", tags=["tasks"])
TERMINAL_STATES = {"completed", "failed", "cancelled", "inconclusive"}


@router.post("", response_model=TaskResponse, status_code=202)
async def create_task(request: TaskRequest) -> TaskResponse:
    task = task_store.create(request)
    task.runner = asyncio.create_task(execute_task(task))
    return task.response()


def _get_task(task_id: str) -> TaskRecord:
    task = task_store.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str) -> TaskResponse:
    return _get_task(task_id).response()


@router.get("/{task_id}/events")
async def task_events(task_id: str) -> StreamingResponse:
    task = _get_task(task_id)

    async def stream_events():
        cursor = 0
        while True:
            task.changed.clear()
            pending = task.events[cursor:]
            for event in pending:
                yield f"id: {event.id}\nevent: task_update\ndata: {event.model_dump_json()}\n\n"
            cursor += len(pending)
            if task.status in TERMINAL_STATES and cursor >= len(task.events):
                break
            try:
                await asyncio.wait_for(task.changed.wait(), timeout=15)
            except asyncio.TimeoutError:
                yield ": keep-alive\n\n"

    return StreamingResponse(stream_events(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache", "X-Accel-Buffering": "no",
    })


@router.post("/{task_id}/cancel", response_model=TaskResponse)
async def cancel_task(task_id: str) -> TaskResponse:
    task = _get_task(task_id)
    if task.status in TERMINAL_STATES:
        return task.response()
    if task.runner and not task.runner.done():
        task.runner.cancel()
    else:
        task.status = "cancelled"
        task.emit("task_cancelled", "Task cancelled before the browser started.")
    return task.response()


@router.post("/{task_id}/approval", response_model=TaskResponse)
async def approve_action(task_id: str, decision: ApprovalDecision) -> TaskResponse:
    task = _get_task(task_id)
    if task.status != "waiting_approval" or task.pending_action is None:
        raise HTTPException(status_code=409, detail="This task has no pending approval request")
    task.approval_decision = decision.approved
    task.approval_event.set()
    return task.response()


@router.post("/{task_id}/resume", response_model=TaskResponse)
async def resume_after_handoff(task_id: str, response: UserHandoffResponse) -> TaskResponse:
    task = _get_task(task_id)
    if task.status != "waiting_for_user":
        raise HTTPException(status_code=409, detail="This task is not waiting for user input")
    task.resume_message = response.message
    task.handoff_event.set()
    return task.response()
