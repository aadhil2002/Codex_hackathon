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
const VOICE_PAUSE_BEFORE_SEND_MS = 3000;
const compareFields = [
  ['Category', (product) => product.category],
  ['Brand', (product) => product.brand],
  ['SKU', (product) => product.sku],
  ['Tags', (product) => Array.isArray(product.tags) ? product.tags.join(', ') : null],
  ['Price', (product) => money(product.price)],
  ['Discount', (product) => `${Number(product.discountPercentage || 0).toFixed(1)}%`],
  ['Rating', (product) => `${Number(product.rating || 0).toFixed(1)} / 5`],
  ['Review count', (product) => product.reviews?.length ?? null],
  ['Availability', (product) => `${product.availabilityStatus || (product.stock > 0 ? 'In stock' : 'Sold out')} (${product.stock} units)`],
  ['Minimum order', (product) => product.minimumOrderQuantity],
  ['Weight', (product) => product.weight == null ? null : `${product.weight} g`],
  ['Dimensions', (product) => product.dimensions && `${product.dimensions.width} x ${product.dimensions.height} x ${product.dimensions.depth} cm`],
  ['Warranty', (product) => product.warrantyInformation],
  ['Shipping', (product) => product.shippingInformation],
  ['Returns', (product) => product.returnPolicy],
];

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
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingMessage, setSpeakingMessage] = useState(null);
  const [voiceText, setVoiceText] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState({ firstName: '', lastName: '', postalCode: '' });
  const transcriptEnd = useRef(null);
  const voiceRef = useRef(null);
  const speechRef = useRef(null);

  useEffect(() => {
    let active = true;
    api('start').then((data) => { if (active) applyResult(data); }).catch((reason) => {
      if (active) { setPhase('error'); setError(reason.message); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const element = transcriptEnd.current;
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, busy]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function applyResult(data) {
    if (data.phase) setPhase(data.phase);
    if (Array.isArray(data.products)) setProducts(data.products);
    if (Array.isArray(data.cart)) setCart(data.cart);
    if (typeof data.cartCount === 'number') setCartCount(data.cartCount);
    if (typeof data.cartTotal === 'number') setCartTotal(data.cartTotal);
    setChoices(data.choices || []);
    const displayMessage = typeof data.message === 'string'
      ? data.message.replace(/^Welcome!\s+Browse the .*? catalog,/i, 'Welcome to ShopPilot! Browse products,')
      : '';
    if (displayMessage) setMessages((current) => [...current, { role: 'assistant', text: displayMessage, choices: data.choices || [], choiceAction: data.choiceAction || 'add', comparison: data.comparison || null }]);
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
    stopSpeechPlayback();
    setMessages((current) => [...current, { role: 'user', text: message }]);
    setDraft('');
    runRequest(() => api('chat', { message }));
  }

  function selectProductChoice(message, product) {
    if (busy || phase !== 'shop') return;
    stopSpeechPlayback();
    const action = message.choiceAction || 'add';
    const actionLabel = action === 'remove' ? 'Remove' : action === 'decrement' ? 'Reduce quantity of' : 'Add';
    setMessages((current) => [...current, { role: 'user', text: `${actionLabel} ${product.title}` }]);
    runRequest(async () => {
      const data = await api('cart', { productId: product.id, action });
      const cartItem = data.cart?.find((item) => item.product.id === product.id);
      data.message = action === 'remove'
        ? `Removed ${product.title} from your cart.`
        : action === 'decrement'
          ? cartItem ? `Reduced ${product.title} to ${cartItem.quantity} in your cart.` : `Removed the last ${product.title} from your cart.`
          : `Added ${product.title} to your cart.`;
      return data;
    });
  }

  function stopSpeechPlayback() {
    window.speechSynthesis?.cancel();
    speechRef.current = null;
    setSpeakingMessage(null);
  }

  function speakAssistantMessage(message, index) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setError('Spoken replies are not available in this browser. Try Chrome or Edge.');
      return;
    }
    if (speakingMessage === index && window.speechSynthesis.speaking) {
      stopSpeechPlayback();
      return;
    }

    const choiceProducts = (message.choices || []).map((id) => products.find((product) => product.id === id)).filter(Boolean);
    const spokenChoices = choiceProducts.length
      ? `Suggested products: ${choiceProducts.slice(0, 6).map((product) => `${product.title}. ${product.description || ''} Price ${money(product.price)}.`).join(' ')}${choiceProducts.length > 6 ? ` And ${choiceProducts.length - 6} more options are shown.` : ''}`
      : '';
    const spokenComparison = (message.comparison || []).map((product) =>
      `${product.title}: price ${money(product.price)}, rating ${Number(product.rating || 0).toFixed(1)} out of 5, discount ${Number(product.discountPercentage || 0).toFixed(1)} percent, ${product.availabilityStatus || `${product.stock} in stock`}.`
    ).join(' ');
    const utterance = new window.SpeechSynthesisUtterance([message.text, spokenChoices, spokenComparison].filter(Boolean).join(' '));
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    utterance.pitch = 1.08;
    utterance.volume = 1;
    stopSpeechPlayback();
    speechRef.current = utterance;
    setSpeakingMessage(index);
    utterance.onend = () => {
      if (speechRef.current === utterance) stopSpeechPlayback();
    };
    utterance.onerror = () => {
      if (speechRef.current === utterance) {
        speechRef.current = null;
        setSpeakingMessage(null);
        setError('The spoken reply could not be played.');
      }
    };
    window.speechSynthesis.speak(utterance);
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError('Voice input is not available in this browser. Try Chrome or Edge, or type your request below.'); return; }
    stopSpeechPlayback();
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    let finalTranscript = '';
    let currentTranscript = '';
    let sendTimer;
    let submitted = false;
    const finishVoiceInput = () => {
      window.clearTimeout(sendTimer);
      setListening(false);
      setVoiceText('');
      const message = currentTranscript.trim() || finalTranscript.trim();
      if (message && !submitted) {
        submitted = true;
        sendMessage(message);
      }
    };
    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }
      currentTranscript = `${finalTranscript} ${interimTranscript}`.trim();
      setVoiceText(currentTranscript);
      window.clearTimeout(sendTimer);
      if (currentTranscript) {
        sendTimer = window.setTimeout(() => {
          recognition.stop();
          finishVoiceInput();
        }, VOICE_PAUSE_BEFORE_SEND_MS);
      }
    };
    recognition.onerror = (event) => {
      window.clearTimeout(sendTimer);
      setListening(false);
      setError(event.error === 'not-allowed' ? 'Allow microphone access and try again.' : `Voice input stopped (${event.error}).`);
    };
    recognition.onend = finishVoiceInput;
    voiceRef.current = recognition;
    try { recognition.start(); setListening(true); setVoiceText(''); setError(''); }
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
        <a className="brand" href="#top"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M7 10h5l5 22h20l5-16H15"/><circle cx="20" cy="39" r="2.5"/><circle cx="35" cy="39" r="2.5"/></svg></span><span>shoppilot<span className="brand-period">.</span></span></a>
        <div className="topbar-right"><span className="environment"><span className="green-dot" /> THE EVERYDAY EDIT</span><button className="reset-button" onClick={restart} disabled={busy}>New session <span>↻</span></button></div>
      </header>

      <main className="workspace" id="top">
        <section className="chat-panel" aria-label="Shopping assistant">
          <div className="panel-heading chat-heading"><div className="assistant-avatar">✳</div><div><h1>Shopping assistant</h1><p>Ask for an item in your own words</p></div><span className="live-label"><span className="green-dot" /> LIVE</span></div>
          <div className="chat-transcript" aria-live="polite">
            <div className="date-divider"><span>PRODUCT ASSISTANT</span></div>
            {!messages.some((message) => message.role === 'user') && phase === 'shop' && <div className="chat-welcome">
              <span className="welcome-kicker">A BETTER WAY TO SHOP</span>
              <h2>What are you looking for?</h2>
              <p>Tell me what you need. I can find products, compare options, and help manage your bag.</p>
              <div className="prompt-suggestions">
                <button type="button" onClick={() => sendMessage('Find me a skincare product under $20')}>Skincare under $20 <span>↗</span></button>
                <button type="button" onClick={() => sendMessage('Show me highly rated beauty products')}>Top-rated beauty picks <span>↗</span></button>
                <button type="button" onClick={() => sendMessage('Find a useful gift under $25')}>A useful gift under $25 <span>↗</span></button>
                <button type="button" onClick={() => sendMessage('I want to compare two products')}>Compare products <span>↗</span></button>
              </div>
            </div>}
            {messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${index}-${message.role}`}>
              {message.role === 'assistant' && <div className="message-avatar">✳</div>}
              <div className="message-content"><div className="message-bubble">{message.text}</div>
                  {message.role === 'assistant' && <button className="listen-reply-button" type="button" aria-pressed={speakingMessage === index} onClick={() => speakAssistantMessage(message, index)}>{speakingMessage === index ? 'Stop audio' : 'Listen to reply'}</button>}
                  {message.choices?.length > 0 && <div className="product-choices">{[...new Set(message.choices)].map((id) => {
                  const product = products.find((item) => item.id === id);
                  const action = message.choiceAction === 'remove' ? 'Remove' : message.choiceAction === 'decrement' ? 'Reduce quantity of' : 'Add';
                  return product ? <button className="product-choice-card" key={id} type="button" aria-label={`${action} ${product.title}`} disabled={busy} onClick={() => selectProductChoice(message, product)}>
                    <img src={product.thumbnail} alt="" loading="lazy" />
                    <span className="choice-copy"><strong>{product.title}</strong><small>{product.description}</small><b>{money(product.price)}</b></span>
                  </button> : null;
                })}</div>}
                  {message.comparison?.length >= 2 && <div className="comparison-card" aria-label="Product comparison">
                    <div className="comparison-table-wrap"><table><thead><tr><th scope="col">Product details</th>{message.comparison.map((product) => <th scope="col" key={product.id}><div className="comparison-product"><img src={product.thumbnail} alt="" loading="lazy"/><strong>{product.title}</strong></div></th>)}</tr></thead>
                      <tbody>{compareFields.map(([label, getValue]) => <tr key={label}><th scope="row">{label}</th>{message.comparison.map((product) => <td key={product.id}>{getValue(product) ?? 'Not provided'}</td>)}</tr>)}</tbody>
                    </table></div>
                    {message.comparison.some((product) => product.description) && <div className="comparison-descriptions">{message.comparison.map((product) => <p key={product.id}><strong>{product.title}</strong>{product.description ? `: ${product.description}` : ''}</p>)}</div>}
                    {message.comparison.some((product) => product.reviews?.length) && <div className="comparison-reviews">{message.comparison.map((product) => product.reviews?.length > 0 && <section key={product.id}><strong>{product.title} reviews</strong><ul>{product.reviews.map((review, index) => <li key={`${product.id}-${index}`}><span>{review.rating}/5{review.reviewerName ? ` - ${review.reviewerName}` : ''}</span><p>{review.comment}</p></li>)}</ul></section>)}</div>}
                  </div>}
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
          <div className="composer-area">
            <div className={`voice-first ${listening ? 'is-listening' : ''}`}>
              <button className={`voice-primary ${listening ? 'recording' : ''}`} type="button" onClick={() => listening ? voiceRef.current?.stop() : startVoiceInput()} disabled={busy || phase !== 'shop'} aria-label={listening ? 'Finish voice request' : 'Start voice request'}>
                <span className="voice-mic-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg></span>
                <span>{listening ? 'Listening… tap to send' : 'Tap to speak'}</span>
              </button>
              <div className="voice-guidance"><strong>{voiceText || (listening ? 'I’m listening for your request' : 'Tell me what you’re shopping for')}</strong><small>{listening ? 'Pause for 3 seconds or tap to send' : 'Try: “Find me a highly rated gift under $25”'}</small></div>
            </div>
            <div className="text-entry-label"><span>Or type your request</span><small>Product, budget, or what you need</small></div>
            <form className="composer text-composer" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type your product request…" aria-label="Message the shopping assistant" disabled={busy || phase !== 'shop'} />
              <button className="send-button" type="submit" disabled={busy || phase !== 'shop' || !draft.trim()} aria-label="Send message">Send</button>
            </form>
          </div>
        </section>

        <section className="store-panel" aria-label="The Everyday Edit storefront">
          <div className="store-banner"><div><span className="eyebrow">THE EVERYDAY EDIT</span><h2>Find your next favorite.</h2><p>Thoughtful picks across beauty, tech, fashion, and more.</p></div><div className="banner-orb" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M7 10h5l5 22h20l5-16H15"/><circle cx="20" cy="39" r="2.5"/><circle cx="35" cy="39" r="2.5"/></svg></div></div>
          {phase === 'connecting' && <div className="store-state"><div className="loader" /><h2>Finding today's picks</h2><p>Getting the store ready for you</p></div>}
          {phase === 'error' && <div className="store-state"><h2>Store unavailable</h2><p>{error}</p><button className="primary-button" onClick={restart}>Try again</button></div>}
          {phase === 'shop' && <>
            <div className="store-toolbar"><div><h2>Shop all products</h2><p>{shownProducts.length} products to explore</p></div><button className="cart-button" data-testid="open-cart" onClick={() => setCartOpen(true)}>Bag <span>({cartCount})</span></button></div>
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
