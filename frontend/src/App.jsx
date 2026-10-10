import { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';

async function api(path, body = {}) {
  const response = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function App() {
  const [phase, setPhase] = useState('connecting');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [choices, setChoices] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('featured');
  const [cartOpen, setCartOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState('missing_key');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState({ firstName: '', lastName: '', postalCode: '' });
  const transcriptEnd = useRef(null);
  const voiceRef = useRef(null);

  useEffect(() => {
    let active = true;
    api('start').then((data) => { if (active) applyResult(data); }).catch((reason) => {
      if (active) { setPhase('error'); setError(reason.message); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => transcriptEnd.current?.scrollIntoView({ behavior: 'smooth' }), [messages, busy]);

  function applyResult(data) {
    if (data.phase) setPhase(data.phase);
    if (Array.isArray(data.products)) setProducts(data.products);
    if (Array.isArray(data.cart)) setCart(data.cart);
    if (typeof data.cartCount === 'number') setCartCount(data.cartCount);
    if (typeof data.cartTotal === 'number') setCartTotal(data.cartTotal);
    if (typeof data.aiStatus === 'string') setAiStatus(data.aiStatus);
    setChoices(data.choices || []);
    if (data.message) setMessages((current) => [...current, { role: 'assistant', text: data.message, choices: data.choices || [] }]);
  }

  async function runRequest(request) {
    setBusy(true);
    setError('');
    try { applyResult(await request()); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  function sendMessage(value = draft) {
    const message = value.trim();
    if (!message || busy || phase !== 'shop') return;
    setMessages((current) => [...current, { role: 'user', text: message }]);
    setDraft('');
    runRequest(() => api('chat', { message }));
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError('Voice input is not available in this browser. Try Chrome or Edge.'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => { const text = event.results[0][0].transcript; setDraft(text); sendMessage(text); };
    recognition.onerror = (event) => setError(event.error === 'not-allowed' ? 'Allow microphone access and try again.' : `Voice input stopped (${event.error}).`);
    recognition.onend = () => setListening(false);
    voiceRef.current = recognition;
    try { recognition.start(); setListening(true); setError(''); }
    catch (reason) { setError(reason.message); setListening(false); }
  }

  function updateCart(productId, action, quantity) {
    runRequest(() => api('cart', { productId, action, quantity }));
  }

  function restart() {
    setMessages([]);
    setCartOpen(false);
    setError('');
    setDetails({ firstName: '', lastName: '', postalCode: '' });
    runRequest(() => api('reset'));
  }

  function submitCheckout(event) {
    event.preventDefault();
    runRequest(() => api('checkout', details));
  }

  function beginCheckout() {
    runRequest(async () => {
      const data = await api('begin-checkout');
      setCartOpen(false);
      return data;
    });
  }

  const categories = useMemo(() => [...new Set(products.map((item) => item.category).filter(Boolean))].sort(), [products]);
  const shownProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesCategory = category === 'all' || product.category === category;
      const searchText = `${product.title} ${product.description} ${product.brand || ''} ${(product.tags || []).join(' ')}`.toLowerCase();
      return matchesCategory && searchText.includes(query.trim().toLowerCase());
    });
    if (sort === 'price-low') filtered.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') filtered.sort((a, b) => b.price - a.price);
    if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);
    return filtered;
  }, [products, category, query, sort]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark">S</span><span>shoppilot<span className="brand-period">.</span></span></a>
        <div className="topbar-right"><span className="environment"><span className="green-dot" /> DUMMYJSON STOREFRONT</span><button className="reset-button" onClick={restart} disabled={busy}>New session <span>↻</span></button></div>
      </header>

      <main className="workspace" id="top">
        <section className="chat-panel" aria-label="Shopping assistant">
          <div className="panel-heading chat-heading"><div className="assistant-avatar">✳</div><div><h1>Shopping assistant</h1><p>Ask for an item in your own words</p></div><span className="live-label"><span className="green-dot" /> LIVE</span></div>
          <div className="chat-transcript" aria-live="polite">
            <div className="date-divider"><span>PRODUCT ASSISTANT</span></div>
            {messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${index}-${message.role}`}>
              {message.role === 'assistant' && <div className="message-avatar">✳</div>}
              <div className="message-content"><div className="message-bubble">{message.text}</div>
                {message.choices?.length > 0 && <div className="product-choices">{message.choices.map((id) => {
                  const product = products.find((item) => item.id === id);
                  return product ? <button key={id} type="button" disabled={busy} onClick={() => sendMessage(`Add ${product.title}`)}>{product.title} · {money(product.price)}</button> : null;
                })}</div>}
              </div>
            </div>)}
            {busy && <div className="typing"><span /><span /><span /> Updating your store</div>}
            {phase === 'checkout' && <form className="checkout-card" onSubmit={submitCheckout}>
              <div className="details-title"><span>▤</span><div><strong>Delivery details</strong><small>Use sample information for this demo.</small></div></div>
              <label>First name<input data-testid="checkout-first-name" autoComplete="given-name" value={details.firstName} onChange={(event) => setDetails({ ...details, firstName: event.target.value })} required /></label>
              <label>Last name<input data-testid="checkout-last-name" autoComplete="family-name" value={details.lastName} onChange={(event) => setDetails({ ...details, lastName: event.target.value })} required /></label>
              <label>ZIP / postal code<input data-testid="checkout-postal-code" autoComplete="postal-code" value={details.postalCode} onChange={(event) => setDetails({ ...details, postalCode: event.target.value })} required /></label>
              <button className="primary-button full-button" type="submit" disabled={busy}>Review order <span>→</span></button>
            </form>}
            {phase === 'review' && <button data-testid="place-order" className="primary-button place-order" onClick={() => runRequest(() => api('order'))} disabled={busy}>Place demo order <span>→</span></button>}
            <div ref={transcriptEnd} />
          </div>
          <div className="composer-area"><form className="composer" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={listening ? 'Listening...' : 'Try “something for dry skin”...'} aria-label="Message the shopping assistant" disabled={busy || phase !== 'shop'} />
            <button className={`mic-button ${listening ? 'recording' : ''}`} type="button" onClick={() => listening ? voiceRef.current?.stop() : startVoiceInput()} disabled={busy || phase !== 'shop'} aria-label={listening ? 'Stop voice input' : 'Speak your message'} title={listening ? 'Stop listening' : 'Speak your message'}>{listening ? 'Stop' : '🎙'}</button>
            <button className="send-button" type="submit" disabled={busy || phase !== 'shop' || !draft.trim()} aria-label="Send message">Send</button>
          </form><div className="composer-foot"><span>{aiStatus === 'ready' ? 'OpenAI assistant connected' : aiStatus === 'configured' ? 'OpenAI key loaded' : aiStatus === 'forbidden' ? 'OpenAI access denied (403)' : aiStatus === 'rate_limited' ? 'OpenAI quota/limit reached' : aiStatus === 'unavailable' ? 'OpenAI unavailable · exact titles work' : 'OPENAI_API_KEY missing · exact titles work'}</span><span>{products.length} products</span></div></div>
        </section>

        <section className="store-panel" aria-label="DummyJSON product storefront">
          <div className="store-banner"><div><span className="eyebrow">THE EVERYDAY EDIT</span><h2>Find your next favorite.</h2><p>Thoughtful picks across beauty, tech, fashion, and more.</p></div><div className="banner-orb">✳</div></div>
          {phase === 'connecting' && <div className="store-state"><div className="loader" /><h2>Loading the live product catalog</h2><p>Connecting to dummyjson.com/products</p></div>}
          {phase === 'error' && <div className="store-state"><h2>Store unavailable</h2><p>{error}</p><button className="primary-button" onClick={restart}>Try again</button></div>}
          {phase === 'shop' && <>
            <div className="store-toolbar"><div><h2>Shop all products</h2><p>{shownProducts.length} items from DummyJSON</p></div><button className="cart-button" data-testid="open-cart" onClick={() => setCartOpen(true)}>Bag <span>({cartCount})</span></button></div>
            <div className="filters"><label className="search-box"><span>⌕</span><input data-testid="product-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" aria-label="Search products" /></label>
              <select aria-label="Filter category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select>
              <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Top rated</option></select>
            </div>
            <div className="product-grid" data-testid="product-grid">{shownProducts.map((product) => <article className="product-card" data-testid={`product-card-${product.id}`} key={product.id}>
              <div className="product-image-wrap"><img className="product-image" src={product.thumbnail} alt={product.title} loading="lazy" /><span className="category-tag">{product.category}</span></div>
              <div className="product-info"><div className="product-brand">{product.brand || product.category}</div><h3>{product.title}</h3><p className="product-description">{product.description}</p><div className="product-meta"><span>★ {Number(product.rating).toFixed(1)}</span><span>{product.stock > 0 ? `${product.stock} in stock` : 'Sold out'}</span></div>
                <div className="product-buy"><strong>{money(product.price)}</strong><button data-testid={`add-to-cart-${product.id}`} aria-label={`Add ${product.title} to cart`} onClick={() => updateCart(product.id, 'add')} disabled={busy || product.stock < 1}>Add to bag <span>＋</span></button></div></div>
            </article>)}</div>
            {shownProducts.length === 0 && <div className="empty-state">No products match that search.</div>}
          </>}
          {(phase === 'review' || phase === 'complete') && <div className="order-state" data-testid={phase === 'complete' ? 'order-confirmation' : 'order-review'}>
            <div className="success-mark">{phase === 'complete' ? '✓' : '▤'}</div><span className="eyebrow">{phase === 'complete' ? 'ORDER COMPLETE' : 'CHECK YOUR ORDER'}</span><h2>{phase === 'complete' ? 'Thanks for shopping.' : 'Your order is ready.'}</h2><p>{phase === 'complete' ? 'Your demo order has been placed. No payment was taken.' : 'Review the items in your bag, then place your demo order.'}</p>
            <div className="review-items">{cart.map((item) => <div className="review-item" key={item.product.id}><img src={item.product.thumbnail} alt=""/><span>{item.product.title} <small>Qty {item.quantity}</small></span><strong>{money(item.product.price * item.quantity)}</strong></div>)}<div className="review-total"><span>Total</span><strong>{money(cartTotal)}</strong></div></div>
            {phase === 'complete' && <button className="primary-button" onClick={restart}>Continue shopping</button>}
          </div>}
          {error && <div className="error-banner" role="alert">{error}</div>}
          <div className="store-footnote"><span><span className="green-dot" /> LIVE DATA</span><span>Powered by DummyJSON · Demo checkout only</span></div>
        </section>
      </main>

      {cartOpen && <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}><aside className="cart-drawer" aria-label="Shopping bag">
        <div className="drawer-heading"><div><span className="eyebrow">YOUR SELECTION</span><h2>Shopping bag <small>({cartCount})</small></h2></div><button className="close-button" onClick={() => setCartOpen(false)} aria-label="Close cart">×</button></div>
        <div className="drawer-items">{cart.map((item) => <div className="drawer-item" key={item.product.id} data-testid={`cart-item-${item.product.id}`}><img src={item.product.thumbnail} alt=""/><div className="drawer-item-info"><strong>{item.product.title}</strong><span>{money(item.product.price)}</span><div className="quantity-control"><button aria-label={`Decrease ${item.product.title} quantity`} onClick={() => updateCart(item.product.id, 'quantity', item.quantity - 1)}>−</button><span>{item.quantity}</span><button aria-label={`Increase ${item.product.title} quantity`} onClick={() => updateCart(item.product.id, 'quantity', item.quantity + 1)}>＋</button><button className="remove-button" onClick={() => updateCart(item.product.id, 'remove')}>Remove</button></div></div></div>)}
          {cart.length === 0 && <div className="empty-state">Your bag is empty. Add something you like.</div>}</div>
        <div className="drawer-bottom"><div className="subtotal"><span>Subtotal</span><strong>{money(cartTotal)}</strong></div><button data-testid="checkout-button" className="primary-button full-button" onClick={beginCheckout} disabled={busy || cart.length === 0}>Continue to checkout <span>→</span></button><p>Shipping and taxes are calculated for this demo.</p></div>
      </aside></div>}
    </div>
  );
}
