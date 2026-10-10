import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, Globe2, LoaderCircle, Mic, MicOff, RefreshCw, Send, ShoppingBag, Square, Volume2 } from 'lucide-react'
import { cancelTask, createShoppingTask, getTask, sendChat, subscribeToTask, synthesizeSpeech, transcribeAudio } from './services/api'
import type { Task } from './types'
import './workspace.css'

const terminal = new Set(['completed', 'failed', 'cancelled', 'inconclusive'])
const STORE_KEY = 'vocapilot.store-profile'
type StoreProfile = { name: string; url: string }
type ChatMessage = { id: number; role: 'user' | 'assistant'; content: string; taskId?: string }

function readStore(): StoreProfile {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Partial<StoreProfile>
    return { name: saved.name ?? '', url: saved.url ?? '' }
  } catch { return { name: '', url: '' } }
}

export default function Workspace() {
  const [site, setSite] = useState(readStore)
  const [siteName, setSiteName] = useState(site.name)
  const [siteUrl, setSiteUrl] = useState(site.url)
  const [siteEmail, setSiteEmail] = useState('')
  const [sitePassword, setSitePassword] = useState('')
  const [editingSite, setEditingSite] = useState(!site.name || !site.url)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [request, setRequest] = useState('')
  const [task, setTask] = useState<Task | null>(null)
  const [taskHistory, setTaskHistory] = useState<Record<string, Task>>({})
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [speakingId, setSpeakingId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [frameKey, setFrameKey] = useState(0)
  const [frameLoaded, setFrameLoaded] = useState(false)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const conversationRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function saveStore() {
    setError('')
    const name = siteName.trim()
    const url = siteUrl.trim()
    if (!name) { setError('Enter the store name first.'); return }
    let parsed: URL
    try { parsed = new URL(url) } catch { setError('Enter a complete store website address, such as https://www.demoblaze.com/'); return }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) { setError('Use a public HTTPS store website address.'); return }
    const next = { name, url: parsed.toString() }
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
    if (site.url && site.url !== next.url) { setSiteEmail(''); setSitePassword('') }
    setSite(next)
    setSiteName(next.name)
    setSiteUrl(next.url)
    setEditingSite(false)
    setFrameLoaded(false)
    setFrameKey(value => value + 1)
  }

  async function refresh(id: string) {
    try {
      const next = await getTask(id)
      setTask(next)
      setTaskHistory(previous => ({ ...previous, [id]: next }))
      if (!terminal.has(next.status)) return
      setBusy(false)
      const mode = next.intent?.mode
      const completion = next.status === 'completed' && mode === 'browse'
        ? `Found ${next.products.length} product${next.products.length === 1 ? '' : 's'} at ${next.site_name || 'the store'}. Your cart was not changed.`
        : next.result?.verification_status === 'verified'
          ? `Added ${next.result.selected_product?.name ?? 'the requested item'} to the cart and verified quantity ${next.result.quantity ?? 1}. Checkout was not opened.`
          : next.error ? `The store task stopped: ${next.error}` : ''
      if (completion) setMessages(previous => previous.map(message => message.taskId === id && !message.content.includes(completion)
        ? { ...message, content: `${message.content}\n\n${completion}` } : message))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Task update failed.') }
  }

  useEffect(() => {
    if (!task || terminal.has(task.status)) return
    const source = subscribeToTask(task.task_id, () => void refresh(task.task_id))
    const poll = window.setInterval(() => void refresh(task.task_id), 1000)
    return () => { source.close(); window.clearInterval(poll) }
  }, [task?.task_id, task?.status])

  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, task?.events?.length, task?.products?.length])

  async function sendMessage() {
    const content = request.trim()
    if (!content || busy || sending || transcribing || editingSite) return
    setError('')
    setNotice('')
    const userMessage: ChatMessage = { id: Date.now(), role: 'user', content }
    setMessages(previous => [...previous, userMessage])
    setRequest('')
    setSending(true)
    try {
      const lines = [...messages, userMessage].slice(-12).map(({ role, content: text }) => ({ role, content: text }))
      const reply = await sendChat(lines)
      const startedTask = reply.shopping_intent
        ? await createShoppingTask(content, reply.shopping_intent, { site_name: site.name, url: site.url, email: siteEmail, password: sitePassword })
        : reply.task
      setMessages(previous => [...previous, { id: Date.now() + 1, role: 'assistant', content: reply.message, taskId: startedTask?.task_id }])
      if (startedTask) {
        setTask(startedTask)
        setTaskHistory(previous => ({ ...previous, [startedTask.task_id]: startedTask }))
        setBusy(!terminal.has(startedTask.status))
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reach the shopping assistant.')
      setMessages(previous => previous.filter(message => message.id !== userMessage.id))
      setRequest(content)
    } finally { setSending(false) }
  }

  async function stopTask() {
    if (task) await cancelTask(task.task_id)
    if (recording) recorder.current?.stop()
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
      media.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data) }
      media.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        setRecording(false)
        if (!chunks.current.length) return
        setTranscribing(true)
        void transcribeAudio(new Blob(chunks.current, { type: media.mimeType || 'audio/webm' }))
          .then(text => { setRequest(text); setNotice('Transcript ready. Review and send it.') })
          .catch(cause => setError(cause instanceof Error ? cause.message : 'Voice transcription failed.'))
          .finally(() => setTranscribing(false))
      }
      media.start()
      setRecording(true)
    } catch { setError('Microphone access was unavailable. You can type your request instead.') }
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
      audio.onerror = () => { URL.revokeObjectURL(url); setSpeakingId(null); setError('Voice playback failed.') }
      await audio.play()
    } catch (cause) { setSpeakingId(null); setError(cause instanceof Error ? cause.message : 'Could not play the voice reply.') }
  }

  return <main className="workspace-shell">
    <header className="workspace-topbar">
      <a className="workspace-brand" href="#workspace"><span><ShoppingBag size={18}/></span>Voca<span>Pilot</span></a>
      <div className="workspace-store-label"><Globe2 size={15}/><strong>{site.name || 'Store not set'}</strong>{site.url && <small>{new URL(site.url).hostname}</small>}</div>
      <button className="change-store" onClick={() => { setError(''); setSiteName(site.name); setSiteUrl(site.url); setEditingSite(true) }} disabled={busy}>Change store</button>
    </header>
    <section className="workspace-columns" id="workspace">
      <aside className="chat-pane" aria-label="Shopping chat">
        <div className="chat-pane-heading"><div className="assistant-mark"><ShoppingBag size={15}/></div><div><strong>VocaPilot</strong><span>{busy ? task?.events.at(-1)?.message ?? 'Working in the store…' : site.name ? 'Ready to help' : 'Set up a store to begin'}</span></div><i className={busy ? 'is-working' : ''}/></div>
        {!site.url || editingSite ? <div className="chat-setup-message"><strong>Set up your store first</strong><p>Enter its name and website in the larger panel. Then ask me to list products or add one to your cart.</p></div> : null}
        <div className="chat-scroll" ref={conversationRef}>
          {messages.length === 0 && site.url && !editingSite && <div className="chat-start"><span>YOUR SHOPPING ASSISTANT</span><p>Ask me to list products, compare options, or add a specific item to your cart.</p><small>Browsing never changes your cart.</small></div>}
          {messages.map(message => {
            const turn = message.taskId ? taskHistory[message.taskId] : undefined
            return <article key={message.id} className={`chat-turn ${message.role}`}>
              <span className="turn-label">{message.role === 'user' ? 'YOU' : 'VOCAPILOT'}</span>
              <p>{message.content}</p>
              {turn?.products.length ? <div className="listing-results"><span className="listing-title">PRODUCTS FOUND · {turn.products.length}</span>{turn.products.map((product, index) => <div className="listing-card" key={`${product.name}-${index}`}><strong>{product.name}</strong><span>{product.displayed_price}</span>{product.description && <small>{product.description}</small>}</div>)}</div> : null}
              {turn?.result && <div className="cart-result"><Check size={14}/><div><strong>{turn.result.selected_product?.name}</strong><span>Cart quantity {turn.result.quantity}; {turn.result.displayed_price}</span></div></div>}
              {turn?.error && terminal.has(turn.status) && <div className="task-error">{turn.error}</div>}
              {turn && !terminal.has(turn.status) && <div className="task-live"><LoaderCircle size={13}/>{turn.events.at(-1)?.message ?? 'Preparing the store task…'}</div>}
              {message.role === 'assistant' && <button className="listen-button" onClick={() => void playReply(message.id, message.content)} aria-label="Listen to reply"><Volume2 size={12}/>{speakingId === message.id ? 'Playing' : 'Listen'}</button>}
            </article>
          })}
          {error && <div className="workspace-error" role="alert">{error}</div>}
        </div>
        <div className="chat-composer">
          <textarea aria-label="Ask about this store" value={request} onChange={event => { setRequest(event.target.value); setNotice('') }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendMessage() } }} maxLength={2000} placeholder="Ask about products…" disabled={!site.url || editingSite || busy || sending || transcribing}/>
          <div className="composer-row"><small>{recording ? 'Listening…' : transcribing ? 'Transcribing…' : notice || 'Enter to send · Shift+Enter for a new line'}</small><div><button onClick={() => void toggleRecording()} aria-label={recording ? 'Stop voice recording' : 'Record voice request'} disabled={!site.url || busy || sending || transcribing}>{recording ? <MicOff size={15}/> : <Mic size={15}/>}</button>{busy ? <button className="send-control stop-control" onClick={() => void stopTask()} aria-label="Stop task"><Square size={12} fill="currentColor"/></button> : <button className="send-control" onClick={() => void sendMessage()} disabled={!request.trim() || sending || transcribing} aria-label="Send request">{sending ? <LoaderCircle size={15}/> : <Send size={15}/>}</button>}</div></div>
        </div>
      </aside>
      <section className="store-pane" aria-label="Live store website">
        <div className="store-toolbar"><div><span className="site-live-dot"/><strong>{site.name || 'Configure your store'}</strong><small>{site.url || 'Store website preview'}</small></div><div className="store-tools">{site.url && <a href={site.url} target="_blank" rel="noreferrer" title="Open store in a separate tab"><ArrowUpRight size={15}/></a>}<button onClick={() => { setFrameLoaded(false); setFrameKey(value => value + 1) }} disabled={!site.url} title="Reload store"><RefreshCw size={14}/></button></div></div>
        {editingSite ? <div className="store-setup">
          <div className="setup-icon"><Globe2 size={24}/></div><span className="setup-kicker">FIRST · CHOOSE A STORE</span><h1>Where would you like to shop?</h1><p>Start with the store name, then its public HTTPS website. The store will appear here beside your chat.</p>
          <form onSubmit={event => { event.preventDefault(); saveStore() }}>
            <label>Store name<input autoFocus value={siteName} onChange={event => setSiteName(event.target.value)} placeholder="DemoBlaze" maxLength={100}/></label>
            <label>Store website<input type="url" value={siteUrl} onChange={event => setSiteUrl(event.target.value)} placeholder={siteName.trim() ? 'https://www.demoblaze.com/' : 'Enter the store name first'} autoComplete="url" disabled={!siteName.trim()}/></label>
            <details className="optional-login"><summary>Optional store sign-in</summary><label>Email or username<input value={siteEmail} onChange={event => setSiteEmail(event.target.value)} autoComplete="username" placeholder="Your store account"/></label><label>Password<input type="password" value={sitePassword} onChange={event => setSitePassword(event.target.value)} autoComplete="current-password" placeholder="Your store password"/></label><small>Kept in this tab's memory and sent only with a store task.</small></details>
            {error && <div className="workspace-error" role="alert">{error}</div>}
            <button type="submit" className="setup-submit">Show store <ArrowUpRight size={15}/></button>
          </form>
          <small className="embed-note">The store must allow display inside another website. Some stores block embedded previews.</small>
        </div> : <div className="store-frame-wrap">
          {!frameLoaded && <div className="frame-loading"><LoaderCircle size={20}/><span>Loading {site.name}…</span></div>}
          <iframe key={frameKey} title={`${site.name} store`} src={site.url} onLoad={() => setFrameLoaded(true)} referrerPolicy="strict-origin-when-cross-origin"/>
          <div className="frame-hint">Computer Use works inside this visible store panel. If it stays blank, this store blocks embedded display.</div>
        </div>}
      </section>
    </section>
  </main>
}
