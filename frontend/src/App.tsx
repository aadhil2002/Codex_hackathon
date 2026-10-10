import { useEffect, useState, type FormEvent } from "react";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { ApprovalPanel } from "./components/ApprovalPanel";
import { BrowserPreview } from "./components/BrowserPreview";
import { HandoffPanel } from "./components/HandoffPanel";
import { VoiceRecorder } from "./components/VoiceRecorder";
import { useTaskEvents } from "./hooks/useTaskEvents";
import { approveAction, cancelTask, createTask, resumeTask, transcribeAudio, type Task } from "./services/api";
import VoiceLab from "./VoiceLab";
import "./shopping.css";

const languages = [
  ["unknown", "Auto-detect language"], ["en-IN", "English"], ["as-IN", "Assamese"], ["bn-IN", "Bengali"],
  ["brx-IN", "Bodo"], ["doi-IN", "Dogri"], ["gu-IN", "Gujarati"], ["hi-IN", "Hindi"], ["kn-IN", "Kannada"],
  ["ks-IN", "Kashmiri"], ["kok-IN", "Konkani"], ["mai-IN", "Maithili"], ["ml-IN", "Malayalam"],
  ["mni-IN", "Manipuri (Meitei)"], ["mr-IN", "Marathi"], ["ne-IN", "Nepali"], ["od-IN", "Odia"],
  ["pa-IN", "Punjabi"], ["sa-IN", "Sanskrit"], ["sat-IN", "Santali"], ["sd-IN", "Sindhi"], ["ta-IN", "Tamil"], ["te-IN", "Telugu"], ["ur-IN", "Urdu"],
];

export default function App() {
  const [view, setView] = useState<"agent" | "voice">("agent");
  const [inputText, setInputText] = useState("");
  const [siteUrl, setSiteUrl] = useState("https://www.saucedemo.com/");
  const [languageCode, setLanguageCode] = useState("unknown");
  const [transcribing, setTranscribing] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskBusy, setTaskBusy] = useState(false);
  const [source, setSource] = useState<"text" | "voice">("text");
  const [error, setError] = useState("");
  const { events, streamError } = useTaskEvents(taskId);

  useEffect(() => {
    if (!taskId || !events.length) return;
    fetch(`/api/tasks/${taskId}`).then((response) => response.ok ? response.json() as Promise<Task> : null)
      .then((nextTask) => { if (nextTask) setTask(nextTask); })
      .catch(() => setError("Could not refresh task details. The event stream may still contain progress."));
  }, [events.length, taskId]);

  async function handleAudio(file: File) {
    setError(""); setTranscribing(true); setSource("voice");
    try { const result = await transcribeAudio(file, languageCode); setInputText(result.transcript); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Saaras v4 could not transcribe this recording."); }
    finally { setTranscribing(false); }
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!inputText.trim()) return setError("Tell the agent what you want it to do.");
    setTaskBusy(true); setTask(null); setTaskId(null);
    try { const created = await createTask(inputText.trim(), source, siteUrl.trim()); setTask(created); setTaskId(created.task_id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start the browser task."); }
    finally { setTaskBusy(false); }
  }

  async function stopTask() {
    if (!taskId) return;
    try { setTask(await cancelTask(taskId)); } catch { setError("Could not cancel the task. Check the backend connection."); }
  }

  async function decide(approved: boolean) {
    if (!taskId) return;
    setTaskBusy(true);
    try { setTask(await approveAction(taskId, approved)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not record your decision."); }
    finally { setTaskBusy(false); }
  }

  async function continueTask(message: string) {
    if (!taskId) return;
    setTaskBusy(true);
    try { setTask(await resumeTask(taskId, message)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not resume the browser task."); }
    finally { setTaskBusy(false); }
  }

  if (view === "voice") return <><div className="app-topbar"><button onClick={() => setView("agent")}>← Back to VocaPilot Agent</button></div><VoiceLab /></>;

  const busy = taskBusy || transcribing || task?.status === "queued" || task?.status === "running" || task?.status === "waiting_approval" || task?.status === "waiting_for_user";
  return <main className="shopping-app">
    <header className="shopping-header">
      <a className="shopping-brand" href="#home"><span className="shopping-mark">v</span><span>VocaPilot <i>Agent</i></span></a>
      <nav><button className="nav-active" onClick={() => setView("agent")}>Browser agent</button><button onClick={() => setView("voice")}>Voice Lab</button></nav>
      <span className="local-badge"><i /> HUMAN-IN-THE-LOOP</span>
    </header>

    <section className="shopping-hero" id="home">
      <div className="hero-copy"><span className="hero-eyebrow">TELL IT WHAT TO DO</span><h1>One request.<br /><em>Any website.</em></h1>
        <p>Give VocaPilot a public HTTPS site and describe the task. OpenAI Computer Use operates a visible browser from screenshots and clicks.</p>
        <div className="hero-promise"><span>✓</span> You approve submissions. You handle sign-ins and challenges.</div>
      </div>
      <div className="hero-art" aria-label="Browser agent illustration"><div className="art-sun" /><div className="art-bag"><div className="bag-handle" /><div className="bag-v" /></div><span className="art-spark spark-one">✳</span><span className="art-spark spark-two">✦</span><span className="art-caption">A human stays<br />in the loop</span></div>
    </section>

    {error && <div className="shopping-alert" role="alert">{error}</div>}
    {task?.error && <div className="shopping-alert" role="status">{task.error}</div>}
    {streamError && task?.status === "running" && <div className="shopping-alert muted-alert">{streamError}</div>}

    <section className="shopping-layout">
      <form className="card request-card" onSubmit={submitRequest}>
        <div className="section-title"><div><span className="section-index">01</span><h2>Your request</h2></div><span className="subtle-count">TEXT OR VOICE</span></div>
        <p className="request-intro">Describe the service and any choices that matter. The agent asks before submitting changes.</p>
        <label className="field-caption" htmlFor="site-url">Website URL</label>
        <input id="site-url" type="url" value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} placeholder="https://example.com" required />
        <label className="field-caption" htmlFor="request-text">What should VocaPilot do?</label>
        <textarea id="request-text" value={inputText} onChange={(event) => setInputText(event.target.value)} maxLength={1000} rows={4} placeholder="For example: Find the black travel backpack under $80 and add it to my cart. Stop before checkout." />
        <div className="input-meta"><span>{inputText.length} / 1,000</span><span>Each site submission needs your approval</span></div>
        <div className="voice-row"><label className="language-picker"><span className="field-caption">Spoken language</span><select value={languageCode} onChange={(event) => setLanguageCode(event.target.value)}>{languages.map(([code, name]) => <option value={code} key={code}>{name}</option>)}</select></label><VoiceRecorder disabled={busy} onRecordingReady={handleAudio} onError={setError} /></div>
        <p className="voice-note">Speech uses Sarvam Saaras v4 (up to 30 seconds). Review and edit the English transcript before starting.</p>
        {transcribing && <div className="transcribe-status"><span className="tiny-spinner" /> Transcribing with Saaras v4…</div>}
        <button className="start-task-button" type="submit" disabled={busy}>{busy ? <><span className="tiny-spinner light-spinner" /> {transcribing ? "Preparing transcript…" : "Agent is working…"}</> : <>Start browser task <span>→</span></>}</button>
        {task && !["completed", "failed", "cancelled", "inconclusive"].includes(task.status) && <button className="cancel-task-button" type="button" onClick={stopTask}>Cancel task</button>}
      </form>

      <div className="right-stack">
        <BrowserPreview screenshot={task?.screenshot_data_url ?? null} title={task?.page_title ?? null} url={task?.page_url ?? null} />
        {task?.pending_action && <ApprovalPanel action={task.pending_action} busy={taskBusy} onDecision={decide} />}
        {task?.handoff_message && <HandoffPanel instruction={task.handoff_message} busy={taskBusy} onResume={continueTask} />}
        {task?.result && <section className="card task-outcome"><div className="section-title"><div><span className="section-index">RESULT</span><h2>Agent summary</h2></div><span className="preview-tag">{task.result.verification_status === "model_observed" ? "OBSERVED" : "INCONCLUSIVE"}</span></div><p>{task.result.summary}</p><ul>{task.result.evidence.map((item) => <li key={item}>{item}</li>)}</ul></section>}
      </div>
      <div className="left-stack"><ActivityTimeline events={events.length ? events : task?.events ?? []} /></div>
    </section>
    <footer className="shopping-footer"><span>VOCAPILOT AGENT</span><span>OpenAI Computer Use drives a local visible browser. Sign-ins and CAPTCHAs require you; submissions pause for approval.</span></footer>
  </main>;
}
