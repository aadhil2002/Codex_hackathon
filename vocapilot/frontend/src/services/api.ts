import type { Task } from '../types'

const API = 'http://127.0.0.1:8000/api'

export type ChatLine = { role: 'user' | 'assistant'; content: string }
export type SiteProfile = { url: string; email: string; password: string }
export type ChatReply = { message: string; task?: Task | null; shopping_intent?: Record<string, unknown> | null; store_query?: 'cart' | null }
export type CartSummary = { item_count: number | null; items: Array<{ name: string; quantity: number }>; is_current: boolean; message: string }

export async function sendChat(messages: ChatLine[]): Promise<ChatReply> {
  const response = await fetch(`${API}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail ?? 'Could not reach the shopping assistant.')
  return data
}

export async function createShoppingTask(inputText: string, intent: Record<string, unknown>, site: SiteProfile): Promise<Task> {
  const response = await fetch(`${API}/tasks`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input_text: inputText, intent, site }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail ?? 'Could not start the shopping task.')
  return data
}

export async function selectProduct(taskId: string, storeRef: string): Promise<Task> {
  const response = await fetch(`${API}/tasks/${taskId}/select`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ store_ref: storeRef }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail ?? 'Could not open this product. Please choose another one.')
  return data
}

export async function selectProductOptions(taskId: string, options: Record<string, string>): Promise<Task> {
  const response = await fetch(`${API}/tasks/${taskId}/options`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail ?? 'Could not apply those product options.')
  return data
}

export async function transcribeAudio(audio: Blob): Promise<string> {
  const form = new FormData()
  form.append('file', audio, 'voice-request.webm')
  const response = await fetch(`${API}/transcribe`, { method: 'POST', body: form })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail ?? 'Could not transcribe this recording.')
  return data.text
}

export async function synthesizeSpeech(text: string): Promise<Blob> {
  const response = await fetch(`${API}/speech`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.detail ?? 'Could not create the voice response.')
  }
  return response.blob()
}

export async function getTask(id: string): Promise<Task> {
  const response = await fetch(`${API}/tasks/${id}`)
  if (!response.ok) throw new Error('Could not read task status.')
  return response.json()
}

export async function getCartSummary(taskId: string): Promise<CartSummary> {
  const response = await fetch(`${API}/tasks/${taskId}/cart`)
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail ?? 'Could not inspect the store cart.')
  return data
}

export async function cancelTask(id: string): Promise<void> {
  const response = await fetch(`${API}/tasks/${id}/cancel`, { method: 'POST' })
  if (!response.ok) throw new Error('Could not cancel this task.')
}

export function subscribeToTask(id: string, onEvent: () => void): EventSource {
  const source = new EventSource(`${API}/tasks/${id}/events`)
  source.onmessage = onEvent
  for (const type of ['task_created', 'task_started', 'intent_parsed', 'browser_navigated', 'page_updated', 'products_observed', 'products_compared', 'awaiting_selection', 'awaiting_options', 'options_checked', 'product_selected', 'cart_updated', 'verification_started', 'verification_completed', 'checkout_manual', 'checkout_opened', 'checkout_unavailable', 'task_completed', 'task_failed', 'task_cancelled', 'error']) {
    source.addEventListener(type, onEvent)
  }
  return source
}
