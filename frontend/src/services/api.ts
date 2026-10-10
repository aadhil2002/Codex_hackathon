export type TaskState = "queued" | "running" | "waiting_approval" | "waiting_for_user" | "completed" | "failed" | "cancelled" | "inconclusive";
export type TaskEvent = { id: number; type: string; message: string; created_at: string; payload: Record<string, unknown> };
export type TaskResult = {
  summary: string;
  verification_status: "model_observed" | "inconclusive";
  evidence: string[];
};
export type PendingAction = { method: string; url: string; reason: string };
export type Task = {
  task_id: string; status: TaskState; input_text: string; source: "text" | "voice"; site_url: string;
  result: TaskResult | null; pending_action: PendingAction | null; handoff_message: string | null; screenshot_data_url: string | null;
  page_title: string | null; page_url: string | null; error: string | null; events: TaskEvent[];
};

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.detail ?? "The request failed.");
  return body as T;
}

export async function createTask(inputText: string, source: "text" | "voice", siteUrl: string) {
  return parseResponse<Task>(await fetch("/api/tasks", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input_text: inputText, source, site_url: siteUrl }),
  }));
}

export async function approveAction(taskId: string, approved: boolean) {
  return parseResponse<Task>(await fetch(`/api/tasks/${taskId}/approval`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved }),
  }));
}

export async function resumeTask(taskId: string, message: string) {
  return parseResponse<Task>(await fetch(`/api/tasks/${taskId}/resume`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }),
  }));
}

export async function cancelTask(taskId: string) {
  return parseResponse<Task>(await fetch(`/api/tasks/${taskId}/cancel`, { method: "POST" }));
}

export async function transcribeAudio(file: File, languageCode: string) {
  const form = new FormData();
  form.append("audio", file, file.name);
  form.append("language_code", languageCode);
  form.append("translate_to_english", String(languageCode !== "en-IN"));
  return parseResponse<{ model: string; transcript: string }>(await fetch("/api/voice/transcribe", { method: "POST", body: form }));
}

export function subscribeToTask(taskId: string, onEvent: (event: TaskEvent) => void, onError: () => void) {
  const stream = new EventSource(`/api/tasks/${taskId}/events`);
  stream.addEventListener("task_update", (message) => {
    try { onEvent(JSON.parse((message as MessageEvent<string>).data) as TaskEvent); } catch { /* Ignore malformed event data. */ }
  });
  stream.onerror = onError;
  return stream;
}
