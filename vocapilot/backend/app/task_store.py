import asyncio
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas import ActivityEvent, TaskCreate, TaskView


class TaskStore:
    def __init__(self) -> None:
        self.tasks: dict[str, TaskView] = {}
        self.cancel_flags: dict[str, asyncio.Event] = {}
        self.changed: dict[str, asyncio.Condition] = {}
        # Credentials live only while a task is active and are never part of TaskView.
        self.credentials: dict[str, tuple[str, str]] = {}

    def create(self, request: TaskCreate) -> TaskView:
        task_id = str(uuid4())
        task = TaskView(task_id=task_id, status="queued", input_text=request.input_text,
                        site_url=str(request.site.url) if request.site else None, intent=request.intent)
        self.tasks[task_id] = task
        self.cancel_flags[task_id] = asyncio.Event()
        self.changed[task_id] = asyncio.Condition()
        self.emit(task_id, "task_created", "Shopping request received.")
        return task

    def emit(self, task_id: str, event_type: str, message: str, data: dict | None = None) -> None:
        task = self.tasks[task_id]
        task.events.append(ActivityEvent(
            id=len(task.events) + 1,
            type=event_type,
            message=message,
            timestamp=datetime.now(timezone.utc).isoformat(),
            data=data or {},
        ))
        condition = self.changed[task_id]
        async def wake() -> None:
            async with condition:
                condition.notify_all()
        asyncio.create_task(wake())


store = TaskStore()
