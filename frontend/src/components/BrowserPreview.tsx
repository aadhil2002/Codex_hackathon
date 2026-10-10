type Props = { screenshot: string | null; title: string | null; url: string | null };

export function BrowserPreview({ screenshot, title, url }: Props) {
  return <section className="card browser-card">
    <div className="section-title"><div><span className="section-index">02</span><h2>Browser preview</h2></div><span className="preview-tag">SCREENSHOT</span></div>
    <div className="browser-frame">
      <div className="browser-chrome"><span /><span /><span /><small>{url ?? "Your site will open when a task starts"}</small></div>
      {screenshot ? <img src={screenshot} alt={`Screenshot of ${title ?? "the browser session"}`} /> : <div className="preview-placeholder"><b>↗</b><strong>Your browser session will appear here</strong><span>This is a screenshot preview. The separate browser window is where you handle sign-ins and challenges.</span></div>}
    </div>
    <div className="preview-caption"><strong>{title ?? "Waiting for a task"}</strong><span>Only the site you entered is used to begin the task.</span></div>
  </section>;
}
