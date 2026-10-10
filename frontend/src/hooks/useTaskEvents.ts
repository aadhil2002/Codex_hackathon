import { useEffect, useState } from "react";
import { subscribeToTask, type TaskEvent } from "../services/api";

const terminalEvents = new Set(["task_completed", "task_failed", "task_cancelled", "task_inconclusive"]);

export function useTaskEvents(taskId: string | null) {
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [streamError, setStreamError] = useState("");
  useEffect(() => {
    if (!taskId) return;
    setEvents([]);
    setStreamError("");
    const stream = subscribeToTask(taskId, (event) => {
      setEvents((current) => current.some((item) => item.id === event.id) ? current : [...current, event]);
      if (terminalEvents.has(event.type)) stream.close();
    }, () => setStreamError("Live updates disconnected. The task state can still be refreshed."));
    return () => stream.close();
  }, [taskId]);
  return { events, streamError };
}
