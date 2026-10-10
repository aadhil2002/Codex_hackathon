import type { PendingAction } from "../services/api";

type Props = { action: PendingAction; busy: boolean; onDecision: (approved: boolean) => void };

export function ApprovalPanel({ action, busy, onDecision }: Props) {
  return <section className="card human-gate" aria-live="polite">
    <span className="section-index">USER APPROVAL</span>
    <h2>Review this browser action</h2>
    <p>The site is asking the agent to {action.reason}. Review the destination before allowing it.</p>
    <dl><dt>Action</dt><dd>{action.method}</dd><dt>Destination</dt><dd className="break-word">{action.url}</dd></dl>
    <p className="handoff-note">Form contents are not shown here to avoid exposing secrets. Inspect the visible browser page before approving.</p>
    <div className="gate-actions"><button type="button" disabled={busy} onClick={() => onDecision(false)}>Deny</button><button type="button" className="approve-action" disabled={busy} onClick={() => onDecision(true)}>Allow once</button></div>
  </section>;
}
