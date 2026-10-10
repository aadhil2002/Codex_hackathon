import asyncio

from app.services.playwright_shopping import run_shopping_task
from app.state.task_store import TaskRecord


async def execute_task(record: TaskRecord) -> None:
    try:
        await asyncio.wait_for(run_shopping_task(record), timeout=300)
    except asyncio.CancelledError:
        record.status = "cancelled"
        record.pending_action = None
        record.handoff_message = None
        record.emit("task_cancelled", "Task cancelled. Check the visible browser window before continuing there.")
        raise
    except asyncio.TimeoutError:
        record.status = "failed"
        record.error = "The browser task reached its five-minute limit. You can start a new task if needed."
        record.emit("task_failed", record.error)
    except (ValueError, RuntimeError) as exc:
        record.status = "failed"
        record.error = str(exc)
        record.emit("task_failed", record.error)
    except Exception as exc:
        record.status = "failed"
        record.error = f"Browser task failed ({type(exc).__name__}). Check API credentials, site availability, and the backend log."
        record.emit("task_failed", record.error)
