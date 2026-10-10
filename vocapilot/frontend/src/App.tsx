import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, CircleHelp, Headphones, LoaderCircle, Mic, MicOff, PackageCheck, ShoppingBag, Square, Volume2 } from 'lucide-react'
import { cancelTask, createTask, getTask, subscribeToTask } from './services/api'
import type { Task } from './types'

const starter = 'Add one Sauce Labs Backpack to my cart and show me the verified cart contents. Do not check out.'
const terminal = new Set(['completed', 'failed', 'cancelled', 'inconclusive'])

export default function App() {
  const [request, setRequest] = useState(starter)
  const [task, setTask] = useState<Task | null>(null)
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  async function refresh(id: string) {
    try {
      const next = await getTask(id)
      setTask(next)
      if (terminal.has(next.status)) setBusy(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Task update failed.') }
  }

  useEffect(() => {
    if (!task || terminal.has(task.status)) return
    const source = subscribeToTask(task.task_id, () => void refresh(task.task_id))
    const poll = window.setInterval(() => void refresh(task.task_id), 1100)
    return () => { source.close(); window.clearInterval(poll) }
  }, [task?.task_id, task?.status])

  async function startTask() {
    setError('')
    if (request.trim().length < 4) { setError('Add a little more detail to your request.'); return }
    try {
      setBusy(true)
      const created = await createTask(request.trim())
      setTask(created)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start the task.'); setBusy(false) }
  }

  async function stopTask() {
    if (task) await cancelTask(task.task_id)
    if (recording) recorder.current?.stop()
  }

  async function toggleRecording() {
    setError('')
    if (recording) { recorder.current?.stop(); setRecording(false); return }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setError('Audio recording is not supported in this browser.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const media = new MediaRecorder(stream)
      recorder.current = media
      chunks.current = []
      media.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data) }
      media.onstop = () => { stream.getTracks().forEach(track => track.stop()); setRecording(false); setError('Voice transcription is not enabled yet. Please review the typed transcript in the request box.') }
      media.start()
      setRecording(true)
    } catch { setError('Microphone access was unavailable. You can type your request instead.') }
  }

  const result = task?.result
  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark"><ShoppingBag size={19} /></span><span>voca<span className="brand-accent">pilot</span></span></a><div className="topbar-right"><span className="store-pill"><i /> SAUCEDEMO STORE</span><span className="header-divider"/><span className="avatar">VP</span></div></header>
    <div className="content" id="top">
      <section className="intro"><div><div className="eyebrow"><span className="spark">✳</span> YOUR PERSONAL SHOPPING ASSISTANT</div><h1>What can I help you <em>find?</em></h1><p>Tell me what you’re looking for. I’ll compare what’s on the shelf and add your best match to the cart.</p></div><div className="intro-note"><Headphones size={16}/><span>Speak naturally, or type your request</span></div></section>
      <section className="workspace">
        <article className="panel request-panel"><div className="panel-heading"><div><span className="step-label">01 / YOUR REQUEST</span><h2>Let’s find your item</h2></div><span className="private-pill"><span/> Private session</span></div>
          <label className="request-label" htmlFor="request">What are you shopping for?</label>
          <textarea id="request" value={request} onChange={e => setRequest(e.target.value)} maxLength={1000} placeholder="e.g. Find me a lightweight backpack under $50..." disabled={busy}/>
          <div className="request-meta"><span>Try “backpack under $50” or name a Sauce Labs product</span><span>{request.length} / 1,000</span></div>
          <div className="request-actions"><button className={`mic-button ${recording ? 'recording' : ''}`} onClick={() => void toggleRecording()} title={recording ? 'Stop recording' : 'Record request'}><span className="mic-inner">{recording ? <MicOff size={17}/> : <Mic size={17}/>}</span>{recording ? <><span className="pulse"/> Listening…</> : 'Speak your request'}</button>
            {busy ? <button className="cancel-button" onClick={() => void stopTask()}><Square size={13} fill="currentColor"/> Cancel task</button> : <button className="primary-button" onClick={() => void startTask()}><span>Find my item</span><ArrowUpRight size={17}/></button>}</div>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <div className="trust-line"><Check size={13}/> Your cart is verified before I report back <span>·</span> No checkout without you</div>
        </article>
        <aside className="panel browser-panel"><div className="panel-heading browser-heading"><div><span className="step-label">02 / LIVE BROWSER</span><h2>Store preview</h2></div><span className={`live-pill ${task?.screenshot ? 'active' : ''}`}><i/>{task?.screenshot ? 'CONNECTED' : 'READY'}</span></div>
          <div className="browser-frame"><div className="browser-chrome"><div className="window-dots"><b/><b/><b/></div><span className="url-bar"><span className="lock">▣</span> saucedemo.com</span><span className="chrome-menu">···</span></div>
            {task?.screenshot ? <img className="browser-image" src={task.screenshot} alt={`Screenshot of ${task.page_title ?? 'the actual SauceDemo browser session'}`}/> : <div className="browser-empty"><div className="store-illustration"><div className="sun-disc"/><div className="shelf shelf-one"><i/><i/><i/></div><div className="shelf shelf-two"><i/><i/><i/></div><span className="plant">✳</span></div><strong>Your store, in view</strong><span>Once we start, I’ll show you exactly what I see.</span></div>}
          </div><div className="browser-caption"><span><i/>{task?.page_title || 'Waiting for your request'}</span><span>SCREENSHOT PREVIEW</span></div>
        </aside>
      </section>
      <section className="lower-grid"><article className="panel activity-panel"><div className="panel-heading lower-heading"><div><span className="step-label">03 / PROGRESS</span><h2>Shopping activity</h2></div><span className="activity-count">{task?.events?.length ?? 0} updates</span></div>
          <ol className="timeline">{(task?.events ?? []).length === 0 ? <li className="timeline-placeholder"><span className="timeline-dot idle-dot"/><div><strong>Ready when you are</strong><p>Your search steps will show up here, one by one.</p></div></li> : task!.events.map((event, i) => <li key={event.id} className="timeline-item"><span className={`timeline-dot ${i === task!.events.length - 1 && busy ? 'current-dot' : 'done-dot'}`}>{i < task!.events.length - 1 ? <Check size={10}/> : null}</span><div><strong>{event.message}</strong><time>{new Date(event.timestamp).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</time></div></li>)}</ol>
          {busy && <div className="working-label"><LoaderCircle size={13}/> Shopping in progress</div>}
        </article>
        <article className="panel results-panel"><div className="panel-heading lower-heading"><div><span className="step-label">04 / YOUR MATCH</span><h2>Product comparison</h2></div><span className="results-count">{task?.products?.length ?? 0} found</span></div>
          {!task?.products.length ? <div className="result-empty"><div className="result-empty-icon"><ShoppingBag size={17}/></div><div><strong>Your picks will appear here</strong><p>Real products and prices from the store page.</p></div></div> : <><div className="product-list">{task.products.map(p => <div className={`product-row ${result?.selected_product?.name === p.name ? 'selected' : ''}`} key={p.name}><div className="product-thumb">{p.image_url && <img src={new URL(p.image_url, 'https://www.saucedemo.com').href} alt=""/>}</div><div className="product-info"><strong>{p.name}</strong><p>{p.description || 'No additional details shown'}</p></div><b className="product-price">{p.displayed_price}</b>{result?.selected_product?.name === p.name && <span className="match-tag"><Check size={11}/> SELECTED</span>}</div>)}</div><p className="comparison-note">Selection uses the lowest matching displayed price. Fit and other unlisted details are unknown.</p></>}
        </article>
      </section>
      <section className={`cart-panel ${result ? 'has-result' : ''}`}><div className="cart-icon"><PackageCheck size={20}/></div><div className="cart-copy"><span className="step-label">05 / CART SUMMARY</span><h2>{result?.verification_status === 'verified' ? 'Cart verified' : 'Your cart, confirmed'}</h2><p>{result?.verification_status === 'verified' ? 'I checked the actual cart page before reporting this.' : 'Once an item is added, I’ll verify it in the store.'}</p></div>{result ? <div className="cart-details"><div><span>ITEM</span><strong>{result.selected_product?.name ?? 'Unknown'}</strong></div><div><span>QTY</span><strong>{result.quantity ?? '—'}</strong></div><div><span>PRICE / SUBTOTAL</span><strong>{result.displayed_price ?? '—'}{result.subtotal && result.subtotal !== result.displayed_price ? ` / ${result.subtotal}` : ''}</strong></div><span className="verified-badge"><Check size={12}/> {result.verification_status === 'verified' ? 'VERIFIED' : 'INCONCLUSIVE'}</span></div> : <div className="cart-waiting"><span><CircleHelp size={14}/> Waiting for your selection</span><Volume2 size={15}/></div>}</section>
      {task?.error && <div className="task-error">{task.error}</div>}
      <footer><span>VocaPilot <span className="footer-sep">/</span> Demo store: SauceDemo</span><span><i/> Checkout is always out of scope <span className="footer-sep">·</span> <a href="https://www.saucedemo.com" target="_blank" rel="noreferrer">About SauceDemo <ArrowUpRight size={10}/></a></span></footer>
    </div>
  </main>
}
