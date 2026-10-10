import { useState, type FormEvent } from "react";

type Props = { instruction: string; busy: boolean; onResume: (message: string) => void };

export function HandoffPanel({ instruction, busy, onResume }: Props) {
  const [message, setMessage] = useState("I completed that step. Please continue.");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim()) onResume(message.trim());
  }
  return <section className="card human-gate handoff-gate" aria-live="polite">
    <span className="section-index">YOUR TURN</span>
    <h2>The browser needs your help</h2>
    <p>{instruction}</p>
    <p className="handoff-note">Use the separate browser window opened for this task. Complete the step there, then tell VocaPilot what you did. Don’t paste passwords, one-time codes, or payment details here.</p>
    <form onSubmit={submit}><label className="field-caption" htmlFor="handoff-reply">Your update</label><textarea id="handoff-reply" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={2} /><button className="approve-action" disabled={busy || !message.trim()} type="submit">Resume task</button></form>
  </section>;
}
