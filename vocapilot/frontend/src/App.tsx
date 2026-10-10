import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, CircleHelp, Headphones, LoaderCircle, Mic, MicOff, PackageCheck, Send, ShoppingBag, Square, Volume2 } from 'lucide-react'
import { cancelTask, getTask, sendChat, subscribeToTask, synthesizeSpeech, transcribeAudio } from './services/api'
import type { Task } from './types'

const terminal = new Set(['completed', 'failed', 'cancelled', 'inconclusive'])
type ChatBubble = { id: number; role: 'user' | 'assistant'; content: string; taskId?: string }

export default function App() {
  const [request, setRequest] = useState('')
  const [messages, setMessages] = useState<ChatBubble[]>([])
  const [task, setTask] = useState<Task | null>(null)
  const [taskHistory, setTaskHistory] = useState<Record<string, Task>>({})
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [speakingId, setSpeakingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [displayScreenshot, setDisplayScreenshot] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const chatEnd = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLOListElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function refresh(id: string) {
    try {
      const next = await getTask(id)
      setTask(next)
      setTaskHistory(previous => ({ ...previous, [id]: next }))
      if (terminal.has(next.status)) {
        setBusy(false)
        const resultSummary = next.result?.verification_status === 'verified'
          ? `Successfully added to your shopping cart: ${next.result.quantity ?? 1} ${next.result.selected_product?.name ?? 'item'} at ${next.result.displayed_price ?? 'the displayed price'}. The cart contents were verified.`
          : next.error ? `The store check ended without verification: ${next.error}` : ''
        if (resultSummary) setMessages(previous => previous.map(message => message.taskId === id && !message.content.includes(resultSummary) ? { ...message, content: `${message.content}\n\n${resultSummary}` } : message))
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Task update failed.') }
  }

  useEffect(() => {
    if (!task || terminal.has(task.status)) return
    const source = subscribeToTask(task.task_id, () => void refresh(task.task_id))
    const poll = window.setInterval(() => void refresh(task.task_id), 1100)
    return () => { source.close(); window.clearInterval(poll) }
  }, [task?.task_id, task?.status])

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages.length, task?.events?.length, task?.products?.length, task?.result])

  useEffect(() => {
    const last = timelineRef.current?.lastElementChild
    last?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [task?.events?.length])

  useEffect(() => {
    const screenshot = task?.screenshot ?? null
    const timer = window.setTimeout(() => setDisplayScreenshot(screenshot), screenshot ? 450 : 0)
    return () => window.clearTimeout(timer)
  }, [task?.screenshot])

  async function sendMessage() {
    setError('')
    setNotice('')
    const content = request.trim()
    if (content.length < 1) { setError('Type or speak a message first.'); return }
    if (busy || sending || transcribing) return
    const nextMessages: ChatBubble[] = [...messages, { id: Date.now(), role: 'user', content }]
    setMessages(nextMessages)
    setRequest('')
    try {
      setSending(true)
      const reply = await sendChat(nextMessages.slice(-12).map(({ role, content: text }) => ({ role, content: text })))
      const assistant: ChatBubble = { id: Date.now() + 1, role: 'assistant', content: reply.message, taskId: reply.task?.task_id }
      setMessages(current => [...current, assistant])
      if (reply.task) {
        setTask(reply.task)
        setTaskHistory(previous => ({ ...previous, [reply.task!.task_id]: reply.task! }))
        setBusy(!terminal.has(reply.task.status))
      } else {
        setBusy(false)
      }
      setSending(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the shopping assistant.')
      setMessages(current => current.filter(message => message.id !== nextMessages[nextMessages.length - 1].id))
      setRequest(content)
      setBusy(false)
      setSending(false)
    }
  }

  async function stopTask() {
    if (task) await cancelTask(task.task_id)
    if (recording) recorder.current?.stop()
  }

  async function playReply(id: number, text: string) {
    audioRef.current?.pause()
    setSpeakingId(id)
    try {
      const blob = await synthesizeSpeech(text)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { URL.revokeObjectURL(url); setSpeakingId(null) }
      audio.onerror = () => { URL.revokeObjectURL(url); setSpeakingId(null); setError('Voice playback failed. You can still read the reply.') }
      await audio.play()
    } catch (e) {
      setSpeakingId(null)
      setError(e instanceof Error ? e.message : 'Could not play the voice reply.')
    }
  }

  async function toggleRecording() {
    setError('')
    if (recording) { recorder.current?.stop(); return }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setError('Audio recording is not supported in this browser.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const media = new MediaRecorder(stream)
      recorder.current = media
      chunks.current = []
      media.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data) }
      media.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        setRecording(false)
        if (!chunks.current.length) return
        setTranscribing(true)
        void transcribeAudio(new Blob(chunks.current, { type: media.mimeType || 'audio/webm' }))
          .then(transcript => { setRequest(transcript); setNotice('Transcript ready. Review it, then send your message.') })
          .catch(e => setError(e instanceof Error ? e.message : 'Voice transcription failed.'))
          .finally(() => setTranscribing(false))
      }
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
            {messages.map(message => <div key={message.id} className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
              {message.role === 'user' ? <><span className="message-meta">YOU <time>JUST NOW</time></span><p>{message.content}</p></> : <><span className="assistant-avatar small"><ShoppingBag size={13}/></span><div className="assistant-content"><div className="assistant-message-head"><span className="message-meta">VOCAPILOT</span><button className={`voice-reply ${speakingId === message.id ? 'speaking' : ''}`} onClick={() => void playReply(message.id, message.content)} aria-label="Play voice reply" title="Listen to reply"><Volume2 size={13}/>{speakingId === message.id ? 'Speaking' : 'Listen'}</button></div><p>{message.content}</p>
                {message.taskId && (() => { const turnTask = taskHistory[message.taskId]; const turnResult = turnTask?.result; const requestedProduct = [turnTask?.input_text, typeof turnTask?.intent?.requested_product === 'string' ? turnTask.intent.requested_product : ''].filter(Boolean).join(' '); const requestedColor = requestedProduct.match(/\b(black|blue|brown|gray|green|orange|pink|purple|red|white|yellow)\b/i)?.[0]; const colorNeedsReview = Boolean(requestedColor && turnTask?.suggested_products?.length && !turnTask.suggested_products.some(product => new RegExp(`\\b${requestedColor}\\b`, 'i').test(`${product.name} ${product.description}`))); return <>
                  {turnTask?.products?.length > 0 && <><div className="chat-products">{turnTask.suggested_products?.length ? <span className="product-options-label">SHIRT OPTIONS FROM THIS STORE</span> : null}{(turnTask.suggested_products?.length ? turnTask.suggested_products : turnTask.products.slice(0, 4)).map(product => <div className={`chat-product ${turnResult?.selected_product?.name === product.name ? 'selected' : ''}`} key={product.name}><div className="product-thumb">{product.image_url && <img src={new URL(product.image_url, 'https://www.saucedemo.com').href} alt=""/>}</div><div className="product-info"><strong>{product.name}</strong><p>{product.description || 'Available in the store'}</p></div><b>{product.displayed_price}</b>{turnResult?.selected_product?.name === product.name && <span className="match-tag"><Check size={11}/> MATCH</span>}</div>)}</div>{colorNeedsReview && <p className="product-match-note">The store does not list the requested color; treat this as the closest available shirt, not a confirmed color match.</p>}</>}
                  {turnResult && <div className="chat-cart"><div className="cart-icon"><PackageCheck size={18}/></div><div className="cart-copy"><span className="step-label">CART SUMMARY</span><strong>{turnResult.selected_product?.name ?? 'Cart result'}</strong><p>Quantity {turnResult.quantity ?? '—'} <span>·</span> {turnResult.displayed_price ?? 'Price unavailable'}{turnResult.subtotal && turnResult.subtotal !== turnResult.displayed_price ? ` · ${turnResult.subtotal} subtotal` : ''}</p></div><span className={`verified-badge ${turnResult.verification_status === 'verified' ? '' : 'unverified'}`}><Check size={12}/>{turnResult.verification_status === 'verified' ? 'VERIFIED' : 'REVIEW'}</span></div>}
                  {turnTask?.error && !turnResult && <div className="error-banner" role="alert">{turnTask.error}</div>}
                  {!turnResult && !terminal.has(turnTask?.status ?? 'queued') && <div className="task-progress-update" key={turnTask?.events?.at(-1)?.id ?? 'starting'} role="status" aria-live="polite"><LoaderCircle size={13}/><span>{turnTask?.events?.at(-1)?.message ?? 'Preparing the live store…'}</span></div>}
                </> })()}
              </div></>}
            </div>)}
            {error && <div className="error-banner" role="alert">{error}</div>}
            <div ref={chatEnd}/>
          </div>
          <div className="composer-dock"><div className="composer"><textarea aria-label="Your message" value={request} onChange={e => { setRequest(e.target.value); setNotice('') }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendMessage() } }} maxLength={2000} placeholder="Ask me anything about what you’re shopping for…" disabled={busy || sending || transcribing}/><div className="composer-toolbar"><div className="composer-tools"><span className="composer-hint">{recording ? 'Listening… click to finish' : transcribing ? 'Transcribing…' : notice || 'Enter sends · Shift+Enter for a new line'} <span>·</span> {request.length}/2,000</span></div><div className="composer-actions"><button className={`composer-icon voice-button ${recording ? 'recording' : ''}`} onClick={() => void toggleRecording()} title={recording ? 'Stop recording' : 'Record a voice message'} aria-label={recording ? 'Stop recording' : 'Record a voice message'} disabled={busy || sending || transcribing}>{recording ? <MicOff size={16}/> : <Mic size={16}/>}<span>{recording ? 'Stop' : 'Speak'}</span></button>{busy ? <button className="send-button stop-button" onClick={() => void stopTask()}><Square size={13} fill="currentColor"/><span>Stop</span></button> : <button className="send-button" onClick={() => void sendMessage()} aria-label="Send message" disabled={transcribing || sending}><span>{sending ? 'Thinking…' : 'Send'}</span>{sending ? <LoaderCircle size={14}/> : <Send size={15}/>}</button>}</div></div></div><p className="composer-footnote"><Check size={12}/> Your cart is verified before I report back <span>·</span> No checkout without you</p></div>
        </section>
        <aside className="browser-sidebar"><div className="browser-sticky panel"><div className="panel-heading browser-heading"><div><span className="step-label">LIVE BROWSER</span><h2>Store preview</h2></div><span className={`live-pill ${displayScreenshot ? 'active' : ''}`}><i/>{displayScreenshot ? 'LIVE' : 'READY'}</span></div><div className="browser-frame"><div className="browser-chrome"><div className="window-dots"><b/><b/><b/></div><span className="url-bar"><span className="lock">▣</span> {task?.page_url ? new URL(task.page_url).hostname : 'saucedemo.com'}</span><span className="chrome-menu">···</span></div>{displayScreenshot ? <img key={displayScreenshot.slice(-80)} className="browser-image" src={displayScreenshot} alt={`Screenshot of ${task?.page_title ?? 'the actual SauceDemo browser session'}`}/> : <div className="browser-empty"><div className="store-illustration"><div className="sun-disc"/><div className="shelf shelf-one"><i/><i/><i/></div><div className="shelf shelf-two"><i/><i/><i/></div><span className="plant">✳</span></div><strong>Your store, in view</strong><span>Store activity appears here as I shop.</span></div>}</div><div className="browser-caption"><span><i/>{task?.page_title || 'Waiting for your request'}</span><span>LIVE SCREEN</span></div><div className="browser-note"><CircleHelp size={13}/><span>Actual browser screenshots update after each verified navigation step.</span></div></div></aside>
      </section>
      <footer><span>VocaPilot <span className="footer-sep">/</span> Demo store: SauceDemo</span><span><i/> Checkout is always in your control <span className="footer-sep">·</span> <a href="https://www.saucedemo.com" target="_blank" rel="noreferrer">About SauceDemo <ArrowUpRight size={10}/></a></span></footer>
    </div>
  </main>
}
