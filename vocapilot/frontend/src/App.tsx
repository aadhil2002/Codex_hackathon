import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, CircleHelp, Headphones, LoaderCircle, Mic, MicOff, PackageCheck, Send, ShoppingBag, Square } from 'lucide-react'
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
  const [displayScreenshot, setDisplayScreenshot] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const chatEnd = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLOListElement>(null)

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

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [task?.events?.length, task?.products?.length, task?.result])

  useEffect(() => {
    const last = timelineRef.current?.lastElementChild
    last?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [task?.events?.length])

  useEffect(() => {
    const screenshot = task?.screenshot ?? null
    const timer = window.setTimeout(() => setDisplayScreenshot(screenshot), screenshot ? 450 : 0)
    return () => window.clearTimeout(timer)
  }, [task?.screenshot])

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
      media.onstop = () => { stream.getTracks().forEach(track => track.stop()); setRecording(false); setError('Voice transcription is not enabled yet. Please review the typed request.') }
      media.start()
      setRecording(true)
    } catch { setError('Microphone access was unavailable. You can type your request instead.') }
  }

  const result = task?.result
  const events = task?.events ?? []
  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark"><ShoppingBag size={19} /></span><span>voca<span className="brand-accent">pilot</span></span></a><div className="topbar-right"><span className="store-pill"><i /> SAUCEDEMO STORE</span><span className="header-divider"/><span className="avatar">VP</span></div></header>
    <div className="content" id="top">
      <section className="intro"><div><div className="eyebrow"><span className="spark">✳</span> YOUR PERSONAL SHOPPING ASSISTANT</div><h1>Shopping, <em>in conversation.</em></h1><p>Tell me what you need. I’ll compare what’s in the store and verify your cart.</p></div><div className="intro-note"><Headphones size={16}/><span>Speak naturally, or type your request</span></div></section>
      <section className="chat-layout">
        <aside className="progress-sidebar panel"><div className="side-heading"><span className="step-label">YOUR SESSION</span><span className="private-pill"><span/> Private</span></div><h2>Shopping progress</h2><p className="side-subtitle">A live view of each step.</p>
          <ol className="timeline" ref={timelineRef}>{events.length === 0 ? <li className="timeline-placeholder"><span className="timeline-dot idle-dot"/><div><strong>Ready when you are</strong><p>Your shopping steps will appear here.</p></div></li> : events.map((event, i) => <li key={event.id} className="timeline-item"><span className={`timeline-dot ${i === events.length - 1 && busy ? 'current-dot' : 'done-dot'}`}>{i < events.length - 1 || !busy ? <Check size={10}/> : null}</span><div><strong>{event.message}</strong><time>{new Date(event.timestamp).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</time></div></li>)}</ol>
          <div className={`status-card ${busy ? 'is-busy' : ''}`}>{busy ? <LoaderCircle size={14}/> : <Check size={14}/>}<span>{busy ? 'Working on your request' : result?.verification_status === 'verified' ? 'Cart verified' : 'Checkout stays in your control'}</span></div>
        </aside>
        <section className="conversation" aria-label="Shopping conversation">
          <div className="conversation-scroll">
            <div className="chat-welcome"><span className="assistant-avatar"><ShoppingBag size={16}/></span><div><strong>VocaPilot</strong><p>Hi! Tell me what you’re shopping for and I’ll find a match, then confirm the cart contents with you.</p></div></div>
            <div className="date-divider"><span>YOUR SHOPPING SESSION</span></div>
            {task && <>
              <div className="chat-message user-message"><span className="message-meta">YOU <time>{events[0] ? new Date(events[0].timestamp).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) : 'JUST NOW'}</time></span><p>{task.input_text}</p></div>
              {events.length > 0 && <div className="chat-message assistant-message"><span className="assistant-avatar small"><ShoppingBag size={13}/></span><div className="assistant-content"><span className="message-meta">VOCAPILOT</span><p>{busy ? events[events.length - 1].message : result?.verification_status === 'verified' ? 'I’ve finished and checked the rendered cart page. Here’s what I found.' : task.error || 'I’ve finished checking the request. Review the details below.'}</p>
                {task.products?.length > 0 && <div className="chat-products">{task.products.slice(0, 3).map(product => <div className={`chat-product ${result?.selected_product?.name === product.name ? 'selected' : ''}`} key={product.name}><div className="product-thumb">{product.image_url && <img src={new URL(product.image_url, 'https://www.saucedemo.com').href} alt=""/>}</div><div className="product-info"><strong>{product.name}</strong><p>{product.description || 'Available in the store'}</p></div><b>{product.displayed_price}</b>{result?.selected_product?.name === product.name && <span className="match-tag"><Check size={11}/> MATCH</span>}</div>)}</div>}
                {result && <div className="chat-cart"><div className="cart-icon"><PackageCheck size={18}/></div><div className="cart-copy"><span className="step-label">CART SUMMARY</span><strong>{result.selected_product?.name ?? 'Cart result'}</strong><p>Quantity {result.quantity ?? '—'} <span>·</span> {result.displayed_price ?? 'Price unavailable'}{result.subtotal && result.subtotal !== result.displayed_price ? ` · ${result.subtotal} subtotal` : ''}</p></div><span className={`verified-badge ${result.verification_status === 'verified' ? '' : 'unverified'}`}><Check size={12}/>{result.verification_status === 'verified' ? 'VERIFIED' : 'REVIEW'}</span></div>}
              </div></div>}
            </>}
            {task?.error && <div className="error-banner" role="alert">{task.error}</div>}
            {error && <div className="error-banner" role="alert">{error}</div>}
            <div ref={chatEnd}/>
          </div>
          <div className="composer-dock"><div className="composer"><textarea aria-label="Your shopping request" value={request} onChange={e => setRequest(e.target.value)} maxLength={1000} placeholder="Ask for an item, a budget, or a product…" disabled={busy}/><div className="composer-toolbar"><div className="composer-tools"><button className={`composer-icon mic-control ${recording ? 'recording' : ''}`} onClick={() => void toggleRecording()} title={recording ? 'Stop recording' : 'Record request'} aria-label={recording ? 'Stop recording' : 'Record request'}>{recording ? <MicOff size={17}/> : <Mic size={17}/>}</button><span className="composer-hint">{recording ? 'Listening…' : 'Voice or text'} <span>·</span> {request.length}/1,000</span></div>{busy ? <button className="send-button stop-button" onClick={() => void stopTask()}><Square size={13} fill="currentColor"/><span>Stop</span></button> : <button className="send-button" onClick={() => void startTask()} aria-label="Send request"><span>Find my item</span><Send size={15}/></button>}</div></div><p className="composer-footnote"><Check size={12}/> Your cart is verified before I report back <span>·</span> No checkout without you</p></div>
        </section>
        <aside className="browser-sidebar"><div className="browser-sticky panel"><div className="panel-heading browser-heading"><div><span className="step-label">LIVE BROWSER</span><h2>Store preview</h2></div><span className={`live-pill ${displayScreenshot ? 'active' : ''}`}><i/>{displayScreenshot ? 'LIVE' : 'READY'}</span></div><div className="browser-frame"><div className="browser-chrome"><div className="window-dots"><b/><b/><b/></div><span className="url-bar"><span className="lock">▣</span> {task?.page_url ? new URL(task.page_url).hostname : 'saucedemo.com'}</span><span className="chrome-menu">···</span></div>{displayScreenshot ? <img key={displayScreenshot.slice(-80)} className="browser-image" src={displayScreenshot} alt={`Screenshot of ${task?.page_title ?? 'the actual SauceDemo browser session'}`}/> : <div className="browser-empty"><div className="store-illustration"><div className="sun-disc"/><div className="shelf shelf-one"><i/><i/><i/></div><div className="shelf shelf-two"><i/><i/><i/></div><span className="plant">✳</span></div><strong>Your store, in view</strong><span>Store activity appears here as I shop.</span></div>}</div><div className="browser-caption"><span><i/>{task?.page_title || 'Waiting for your request'}</span><span>LIVE SCREEN</span></div><div className="browser-note"><CircleHelp size={13}/><span>Actual browser screenshots update after each verified navigation step.</span></div></div></aside>
      </section>
      <footer><span>VocaPilot <span className="footer-sep">/</span> Demo store: SauceDemo</span><span><i/> Checkout is always in your control <span className="footer-sep">·</span> <a href="https://www.saucedemo.com" target="_blank" rel="noreferrer">About SauceDemo <ArrowUpRight size={10}/></a></span></footer>
    </div>
  </main>
}
