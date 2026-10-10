import { useEffect, useRef, useState } from 'react'
import { Check, Globe2, Headphones, LoaderCircle, LockKeyhole, Mic, MicOff, PackageCheck, Send, ShoppingBag, Square, UserRound, Volume2, X } from 'lucide-react'
import { cancelTask, createShoppingTask, getCartSummary, getTask, selectProduct, selectProductOptions, sendChat, subscribeToTask, synthesizeSpeech, transcribeAudio } from './services/api'
import type { Task } from './types'

const terminal = new Set(['completed', 'failed', 'cancelled', 'inconclusive'])
const demoStores = [
  { name: 'SauceDemo', url: 'https://www.saucedemo.com', note: 'Simple sign-in and cart practice' },
  { name: 'Automation Exercise', url: 'https://automationexercise.com', note: 'Clothing catalog and cart' },
  { name: 'nopCommerce', url: 'https://demo.nopcommerce.com', note: 'Apparel and product options' },
  { name: 'Demoblaze', url: 'https://demoblaze.com', note: 'Electronics catalog and cart' },
]
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
  const [profileOpen, setProfileOpen] = useState(false)
  const [siteUrl, setSiteUrl] = useState('')
  const [siteEmail, setSiteEmail] = useState('')
  const [sitePassword, setSitePassword] = useState('')
  const [choiceBusy, setChoiceBusy] = useState(false)
  const [variantChoices, setVariantChoices] = useState<Record<string, string>>({})
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const conversationRef = useRef<HTMLDivElement>(null)
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
          ? `Successfully added to your shopping cart: ${next.result.quantity ?? 1} ${next.result.selected_product?.name ?? 'item'} at ${next.result.displayed_price ?? 'the displayed price'}. The cart contents were verified. Continue to checkout manually in the store window when you are ready.`
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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const pane = conversationRef.current
      pane?.scrollTo({ top: pane.scrollHeight, behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [messages, task?.events?.length, task?.products?.length, task?.result])

  useEffect(() => {
    const last = timelineRef.current?.lastElementChild
    last?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [task?.events?.length])

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
      if (reply.store_query === 'cart') {
        let responseText = 'I do not have a shopping session for this store yet. Start a product search here, then ask me to check the cart.'
        if (!siteUrl.trim()) {
          setProfileOpen(true)
          throw new Error('Choose a store in your profile before I inspect its cart.')
        }
        const sameStore = task?.site_url && (() => {
          try { return new URL(task.site_url).host.toLowerCase() === new URL(siteUrl).host.toLowerCase() }
          catch { return false }
        })()
        if (task && sameStore) {
          const summary = await getCartSummary(task.task_id)
          const lines = summary.items.map(item => `• ${item.quantity > 1 ? `${item.quantity} × ` : ''}${item.name}`)
          responseText = lines.length ? `${summary.message}\n\n${lines.join('\n')}` : summary.message
        }
        setMessages(current => [...current, { id: Date.now() + 1, role: 'assistant', content: responseText }])
        setBusy(false)
        setSending(false)
        return
      }
      if (reply.shopping_intent && !siteUrl.trim()) {
        setProfileOpen(true)
        throw new Error('Add the store website in your profile before starting this shopping request.')
      }
      const startedTask = reply.shopping_intent
        ? await createShoppingTask(content, reply.shopping_intent, { url: siteUrl, email: siteEmail, password: sitePassword })
        : reply.task
      const assistant: ChatBubble = { id: Date.now() + 1, role: 'assistant', content: reply.message, taskId: startedTask?.task_id }
      setMessages(current => [...current, assistant])
      if (startedTask) {
        setTask(startedTask)
        setTaskHistory(previous => ({ ...previous, [startedTask.task_id]: startedTask }))
        setBusy(!terminal.has(startedTask.status))
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

  async function chooseProduct(productName: string, storeRef: string | null | undefined) {
    if (!task || !storeRef || task.status !== 'awaiting_selection' || choiceBusy) return
    setChoiceBusy(true)
    setError('')
    setVariantChoices({})
    const now = Date.now()
    setMessages(current => [...current,
      { id: now, role: 'user', content: `I choose ${productName}.` },
      { id: now + 1, role: 'assistant', content: 'I’ll check the available size and color choices for that item.' },
    ])
    try {
      const next = await selectProduct(task.task_id, storeRef)
      setTask(next)
      setTaskHistory(previous => ({ ...previous, [next.task_id]: next }))
      if (next.status === 'awaiting_options') {
        const labels = Object.entries(next.available_options ?? {}).map(([kind, values]) => `${kind}: ${values.join(', ')}`)
        setMessages(current => [...current, { id: now + 2, role: 'assistant', content: `Here are the choices listed by the store. ${labels.join(' · ')}` }])
      } else if (next.status === 'completed') {
        setMessages(current => [...current, { id: now + 2, role: 'assistant', content: 'I added your item and verified the cart. The store window is on your cart; continue to checkout manually whenever you are ready.' }])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open that product.')
    } finally {
      setChoiceBusy(false)
    }
  }

  async function confirmProductOptions() {
    if (!task || task.status !== 'awaiting_options' || choiceBusy) return
    const available = task.available_options ?? {}
    const missing = Object.keys(available).filter(kind => !variantChoices[kind])
    if (missing.length) {
      setError(`Choose an available ${missing.join(' and ')} to continue.`)
      return
    }
    setChoiceBusy(true)
    setError('')
    const selectedSummary = Object.entries(variantChoices).map(([kind, value]) => `${kind}: ${value}`).join(', ')
    const now = Date.now()
    setMessages(current => [...current,
      { id: now, role: 'user', content: selectedSummary },
      { id: now + 1, role: 'assistant', content: 'Perfect. I’ll add that exact option and verify it in your cart.' },
    ])
    try {
      const next = await selectProductOptions(task.task_id, variantChoices)
      setTask(next)
      setTaskHistory(previous => ({ ...previous, [next.task_id]: next }))
      if (next.status === 'completed') {
        const outcome = 'I added your item and verified the cart. The store window is on your cart; continue to checkout manually whenever you are ready.'
        setMessages(current => [...current, { id: now + 2, role: 'assistant', content: outcome }])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not apply those product options.')
    } finally {
      setChoiceBusy(false)
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
  const working = busy && task?.status !== 'awaiting_selection' && task?.status !== 'awaiting_options'
  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark"><ShoppingBag size={19} /></span><span>voca<span className="brand-accent">pilot</span></span></a><div className="topbar-right"><span className="store-pill"><i /> {siteUrl ? (() => { try { return new URL(siteUrl).hostname.toUpperCase() } catch { return 'STORE NOT SET' } })() : 'STORE NOT SET'}</span><span className="header-divider"/><button className={`avatar profile-trigger ${profileOpen ? 'active' : ''}`} aria-label="Store and sign-in profile" title="Store and sign-in settings" onClick={() => setProfileOpen(open => !open)}><UserRound size={17}/></button></div></header>
    {profileOpen && <div className="profile-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setProfileOpen(false) }}>
      <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <div className="profile-title-row"><span className="profile-symbol"><Globe2 size={18}/></span><button className="profile-close" onClick={() => setProfileOpen(false)} aria-label="Close profile"><X size={18}/></button></div>
        <h2 id="profile-title">Choose your store</h2>
        <p>Pick a demo shop or enter a public HTTPS store. Sign-in details stay in this tab and are sent to the backend only when shopping starts.</p>
        <div className="demo-sites"><span className="step-label">DEMO STORES</span><div className="demo-site-grid">{demoStores.map(site => <button type="button" key={site.url} className={`demo-site ${siteUrl === site.url ? 'active' : ''}`} onClick={() => { if (siteUrl !== site.url) { setSiteEmail(''); setSitePassword('') }; setSiteUrl(site.url) }}><strong>{site.name}</strong><span>{site.note}</span></button>)}</div></div>
        <label>Store website<input type="url" value={siteUrl} onChange={event => setSiteUrl(event.target.value)} placeholder="https://shop.example.com" autoComplete="url"/></label>
        <label>Email or username<input type="text" value={siteEmail} onChange={event => setSiteEmail(event.target.value)} placeholder="Your store account" autoComplete="username"/></label>
        <label>Password<span className="password-input"><LockKeyhole size={15}/><input type="password" value={sitePassword} onChange={event => setSitePassword(event.target.value)} placeholder="Store password" autoComplete="current-password"/></span></label>
        <div className="profile-private"><LockKeyhole size={14}/><span>Store URL and sign-in values are sent from this frontend to the backend for the shopping session. They are not added to the AI chat prompt.</span></div>
        <button className="profile-save" onClick={() => setProfileOpen(false)}>Use this store</button>
      </section>
    </div>}
    <div className="content" id="top">
      <section className="intro"><div><div className="eyebrow"><span className="spark">✳</span> YOUR PERSONAL SHOPPING ASSISTANT</div><h1>Shopping, <em>in conversation.</em></h1><p>Tell me what you need. I’ll compare what’s in the store and verify your cart.</p></div><div className="intro-note"><Headphones size={16}/><span>Speak naturally, or type your request</span></div></section>
      <section className="chat-layout">
        <aside className="progress-sidebar panel"><div className="side-heading"><span className="step-label">YOUR SESSION</span><span className="private-pill"><span/> Private</span></div><h2>Shopping progress</h2><p className="side-subtitle">A live view of each step.</p>
          <ol className="timeline" ref={timelineRef}>{events.length === 0 ? <li className="timeline-placeholder"><span className="timeline-dot idle-dot"/><div><strong>Ready when you are</strong><p>Your shopping steps will appear here.</p></div></li> : events.map((event, i) => <li key={event.id} className="timeline-item"><span className={`timeline-dot ${i === events.length - 1 && busy ? 'current-dot' : 'done-dot'}`}>{i < events.length - 1 || !busy ? <Check size={10}/> : null}</span><div><strong>{event.message}</strong><time>{new Date(event.timestamp).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</time></div></li>)}</ol>
          <div className={`status-card ${working ? 'is-busy' : ''}`}>{working ? <LoaderCircle size={14}/> : <Check size={14}/>}<span>{task?.status === 'awaiting_selection' ? 'Choose a product below to continue' : task?.status === 'awaiting_options' ? 'Choose product options to continue' : working ? 'Working on your request' : result?.verification_status === 'verified' ? 'Cart verified · checkout is manual' : 'Checkout stays in your control'}</span></div>
        </aside>
        <section className="conversation" aria-label="Shopping conversation">
          <div className="conversation-scroll" ref={conversationRef}>
            <div className="chat-welcome"><span className="assistant-avatar"><ShoppingBag size={16}/></span><div><strong>VocaPilot</strong><p>Hi! Tell me what you’re shopping for and I’ll find a match, then confirm the cart contents with you.</p></div></div>
            <div className="date-divider"><span>YOUR SHOPPING SESSION</span></div>
            {messages.map(message => <div key={message.id} className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
              {message.role === 'user' ? <><span className="message-meta">YOU <time>JUST NOW</time></span><p>{message.content}</p></> : <><span className="assistant-avatar small"><ShoppingBag size={13}/></span><div className="assistant-content"><div className="assistant-message-head"><span className="message-meta">VOCAPILOT</span><button className={`voice-reply ${speakingId === message.id ? 'speaking' : ''}`} onClick={() => void playReply(message.id, message.content)} aria-label="Play voice reply" title="Listen to reply"><Volume2 size={13}/>{speakingId === message.id ? 'Speaking' : 'Listen'}</button></div><p>{message.content}</p>
                {message.taskId && (() => { const turnTask = taskHistory[message.taskId] ?? (task?.task_id === message.taskId ? task : undefined); const turnResult = turnTask?.result; return <>
                  {turnTask?.status === 'awaiting_options' && turnTask.selected_product && <section className="variant-picker" aria-label="Product options">
                    <div className="selected-product-summary"><div className="product-thumb">{turnTask.selected_product.image_url && <img src={new URL(turnTask.selected_product.image_url, turnTask.site_url || window.location.href).href} alt=""/>}</div><div className="product-info"><strong>{turnTask.selected_product.name}</strong><p>{turnTask.selected_product.displayed_price}</p></div></div>
                    <p>Choose from the size and color options the store lists for this product.</p>
                    {Object.entries(turnTask.available_options ?? {}).map(([kind, values]) => <fieldset className="variant-group" key={kind}><legend>{kind === 'color' ? 'Color' : 'Size'}</legend><div className="variant-options">{values.map(value => <button type="button" key={value} aria-pressed={variantChoices[kind] === value} className={`variant-option ${variantChoices[kind] === value ? 'active' : ''}`} onClick={() => { setVariantChoices(current => ({ ...current, [kind]: value })); setError('') }}>{value}</button>)}</div></fieldset>)}
                    <button className="variant-confirm-button" disabled={choiceBusy || Object.keys(turnTask.available_options ?? {}).some(kind => !variantChoices[kind])} onClick={() => void confirmProductOptions()}>{choiceBusy ? 'Adding and verifying...' : 'Add selected option to cart'}{choiceBusy && <LoaderCircle size={14}/>}</button>
                  </section>}
                  {turnResult && <div className="chat-cart"><div className="cart-icon"><PackageCheck size={18}/></div><div className="cart-copy"><span className="step-label">CART SUMMARY</span><strong>{turnResult.selected_product?.name ?? 'Cart result'}</strong><p>Quantity {turnResult.quantity ?? '—'} <span>·</span> {turnResult.displayed_price ?? 'Price unavailable'}{turnResult.subtotal && turnResult.subtotal !== turnResult.displayed_price ? ` · ${turnResult.subtotal} subtotal` : ''}</p></div><span className={`verified-badge ${turnResult.verification_status === 'verified' ? '' : 'unverified'}`}><Check size={12}/>{turnResult.verification_status === 'verified' ? 'VERIFIED' : 'REVIEW'}</span></div>}
                  {turnTask?.error && !turnResult && <div className="error-banner" role="alert">{turnTask.error}</div>}
                  {!turnResult && ['queued', 'running'].includes(turnTask?.status ?? 'queued') && <div className="task-progress-update" key={turnTask?.events?.at(-1)?.id ?? 'starting'} role="status" aria-live="polite"><LoaderCircle size={13}/><span>{turnTask?.events?.at(-1)?.message ?? 'Preparing the live store…'}</span></div>}
                </> })()}
              </div></>}
            </div>)}
            {task?.status === 'awaiting_selection' && task.products.length > 0 && <section className="agent-choice-panel active-product-picker" aria-label="Choose a product">
              <div className="agent-choice-heading"><span className="step-label">CHOOSE YOUR PRODUCT</span><strong>{task.products.length} {task.products.length === 1 ? 'match' : 'matches'}</strong></div>
              <p>Review the matching store listings and choose the exact item you want. I will not add anything until you choose.</p>
              <div className="chat-products">{task.products.map(product => <article className="chat-product" key={product.store_ref ?? product.name}>
                <div className="product-thumb">{product.image_url && <img src={new URL(product.image_url, task.site_url || window.location.href).href} alt=""/>}</div>
                <div className="product-info"><strong>{product.name}</strong><p>{product.description || 'Details from the store listing'}</p></div>
                <b>{product.displayed_price}</b>
                <button type="button" className="product-choose-button" disabled={choiceBusy} onClick={() => void chooseProduct(product.name, product.store_ref)}>{choiceBusy ? 'Opening…' : 'Choose this item'}</button>
              </article>)}</div>
            </section>}
            {error && <div className="error-banner" role="alert">{error}</div>}
          </div>
          <div className="composer-dock"><div className="composer"><textarea aria-label="Your message" value={request} onChange={e => { setRequest(e.target.value); setNotice('') }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendMessage() } }} maxLength={2000} placeholder="Ask me anything about what you’re shopping for…" disabled={busy || sending || transcribing}/><div className="composer-toolbar"><div className="composer-tools"><span className="composer-hint">{recording ? 'Listening… click to finish' : transcribing ? 'Transcribing…' : notice || 'Enter sends'} <span>·</span> {request.length}/2,000</span></div><div className="composer-actions"><button className={`composer-icon voice-button ${recording ? 'recording' : ''}`} onClick={() => void toggleRecording()} title={recording ? 'Stop recording' : 'Record a voice message'} aria-label={recording ? 'Stop recording' : 'Record a voice message'} disabled={busy || sending || transcribing}>{recording ? <MicOff size={16}/> : <Mic size={16}/>}<span>{recording ? 'Stop' : 'Speak'}</span></button>{busy ? <button className="send-button stop-button" onClick={() => void stopTask()}><Square size={13} fill="currentColor"/><span>Stop</span></button> : <button className="send-button" onClick={() => void sendMessage()} aria-label="Send message" disabled={transcribing || sending}><span>{sending ? 'Thinking…' : 'Send'}</span>{sending ? <LoaderCircle size={14}/> : <Send size={15}/>}</button>}</div></div></div><p className="composer-footnote"><Check size={12}/> I verify your cart and leave checkout for you <span>·</span> You decide when to continue</p></div>
        </section>
      </section>
      <footer><span>VocaPilot <span className="footer-sep">/</span> Store assistant</span><span><i/> Cart verified · Checkout is manual</span></footer>
    </div>
  </main>
}
