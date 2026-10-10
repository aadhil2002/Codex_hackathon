import type { TaskEvent } from "../services/api";

export function ActivityTimeline({ events }: { events: TaskEvent[] }) {
  return <section className="card activity-card">
    <div className="section-title"><div><span className="section-index">04</span><h2>Activity</h2></div><span className="subtle-count">LIVE UPDATES</span></div>
    {events.length ? <ol className="timeline">{events.map((event) => <li key={event.id} className={`timeline-${event.type}`}>
      <span className="timeline-dot" /><div><p>{event.message}</p><time>{new Date(event.created_at).toLocaleTimeString()}</time></div>
    </li>)}</ol> : <div className="subtle-empty">Task progress will appear here as the browser works.</div>}
  </section>;
}
