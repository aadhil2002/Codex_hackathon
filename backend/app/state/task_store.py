import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.task import TaskEvent, TaskRequest, TaskResponse, TaskResult


@dataclass
class TaskRecord:
    task_id: str
    request: TaskRequest
    status: str = "queued"
    result: TaskResult | None = None
    pending_action: dict | None = None
    approval_decision: bool | None = None
    approval_event: asyncio.Event = field(default_factory=asyncio.Event)
    handoff_message: str | None = None
    resume_message: str | None = None
    handoff_event: asyncio.Event = field(default_factory=asyncio.Event)
    screenshot_data_url: str | None = None
    page_title: str | None = None
    page_url: str | None = None
    error: str | None = None
    events: list[TaskEvent] = field(default_factory=list)
    changed: asyncio.Event = field(default_factory=asyncio.Event)
    runner: asyncio.Task | None = None

    def emit(self, event_type: str, message: str, payload: dict | None = None) -> None:
        self.events.append(TaskEvent(
            id=len(self.events) + 1,
            type=event_type,
            message=message,
            created_at=datetime.now(timezone.utc).isoformat(),
            payload=payload or {},
        ))
        self.changed.set()

    def response(self) -> TaskResponse:
        return TaskResponse(
            task_id=self.task_id,
            status=self.status,
            input_text=self.request.input_text,
            source=self.request.source,
            site_url=self.request.site_url,
            result=self.result,
            pending_action=self.pending_action,
            handoff_message=self.handoff_message,
            screenshot_data_url=self.screenshot_data_url,
            page_title=self.page_title,
            page_url=self.page_url,
            error=self.error,
            events=self.events,
        )


class TaskStore:
    def __init__(self) -> None:
        self._tasks: dict[str, TaskRecord] = {}

    def create(self, request: TaskRequest) -> TaskRecord:
        task = TaskRecord(task_id=str(uuid4()), request=request)
        self._tasks[task.task_id] = task
        task.emit("task_created", "Request received; the browser agent will ask before submitting changes.")
        return task

    def get(self, task_id: str) -> TaskRecord | None:
        return self._tasks.get(task_id)


task_store = TaskStore()
