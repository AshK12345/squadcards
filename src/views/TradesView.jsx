import { useState, useEffect, useRef } from 'react';
import {
  createLobby, joinLobby, setRecipientCard,
  setReady, executeTrade, claimCard, cancelLobby,
  fetchTrade, subscribeTrade,
} from '../utils/trade';
import { generateAIOpponentCard } from '../utils/ai';
import CardFrame from '../components/CardFrame';
import TradeAnimation from '../components/TradeAnimation';
import { SUPABASE_ENABLED } from '../lib/supabase';
import { HP_MAP, DEFAULT_STATS } from '../constants';

// Generate an image via Pollinations.ai (free, no API key needed).
// Falls back to emoji canvas if the fetch fails.
async function generateCardImage(name, type, emoji = '🤖') {
  const imagePrompt = encodeURIComponent(
    `${emoji} cartoon character: ${name}, ${type}, gen alpha brainrot meme energy, vibrant funny trading card art, digital art, no text, no words`
  );
  const seed = Math.floor(Math.random() * 99999);
  const url = `https://image.pollinations.ai/prompt/${imagePrompt}?width=512&height=512&nologo=true&seed=${seed}`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!resp.ok) throw new Error('non-ok');
    const blob = await resp.blob();
    return await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload  = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  } catch {
    // Fallback: draw emoji on a dark canvas
    const S = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#0d0d1f'); g.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    ctx.font = `${S * 0.46}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, S / 2, S / 2);
    return canvas.toDataURL('image/jpeg', 0.88);
  }
}
const clampAI = (v, mn, mx) => Math.min(mx, Math.max(mn, Math.round(Number(v) || 0)));

const LS_KEY = 'sc-pending-trade';
const BURST_RARITIES = new Set(['uncommon', 'rare', 'legendary', 'secret']);

export default function TradesView({
  active, collection, deviceId, reloadCards,
  showToast, incomingTradeId, clearIncomingTrade,
  addCard, removeCard,
}) {
  const [phase, setPhase]           = useState('home');
  const [role, setRole]             = useState(null);
  const [trade, setTrade]           = useState(null);
  const [myCard, setMyCard]         = useState(null);
  const [picked, setPicked]         = useState(null);
  const [joinCode, setJoinCode]     = useState('');
  const [myReady, setMyReady]       = useState(false);
  const [theirReady, setTheirReady] = useState(false);
  const [roomUrl, setRoomUrl]       = useState('');
  const [copied, setCopied]         = useState(false);
  const [result, setResult]         = useState(null);
  const [burstKey, setBurstKey]     = useState(0);

  const subRef     = useRef(null);
  const claimedRef = useRef(false);
  const roleRef    = useRef(null);
  const tradeIdRef = useRef(null);

  /* ── helpers ── */
  const resetToHome = () => {
    subRef.current?.unsubscribe();
    subRef.current  = null;
    claimedRef.current = false;
    roleRef.current = null;
    tradeIdRef.current = null;
    localStorage.removeItem(LS_KEY);
    setPhase('home'); setRole(null); setTrade(null);
    setMyCard(null); setPicked(null); setMyReady(false);
    setTheirReady(false); setResult(null);
  };

  /* ── Realtime handler (via ref so it always captures latest state) ── */
  const onUpdateRef = useRef(null);
  onUpdateRef.current = async (updated) => {
    const myRole = roleRef.current;
    if (!myRole) return;

    setTrade(updated);

    if (updated.status === 'cancelled') {
      showToast('Trade was cancelled.');
      resetToHome(); return;
    }

    if (updated.status === 'matched') {
      setMyReady(myRole === 'initiator' ? updated.initiator_ready : updated.recipient_ready);
      setTheirReady(myRole === 'initiator' ? updated.recipient_ready : updated.initiator_ready);

      if (updated.initiator_ready && updated.recipient_ready) {
        // Race — only one client wins the executeTrade update
        executeTrade(updated);
      }
    }

    if (updated.status === 'completed') {
      if (claimedRef.current) return;
      claimedRef.current = true;
      const res = await claimCard(updated, myRole, deviceId);
      await reloadCards();
      localStorage.removeItem(LS_KEY);
      setResult(res);
      if (res.upgraded && BURST_RARITIES.has(res.newRarity)) setBurstKey(k => k + 1);
      setPhase('animating');
      showToast('🤝 Trade complete!');
    }
  };

  const subscribe = (tradeId) => {
    subRef.current?.unsubscribe();
    subRef.current = subscribeTrade(tradeId, t => onUpdateRef.current(t));
    tradeIdRef.current = tradeId;
  };

  /* ── Restore pending lobby from localStorage ── */
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved || !deviceId) return;
    try {
      const { tradeId, role: savedRole } = JSON.parse(saved);
      fetchTrade(tradeId).then(t => {
        if (!t) { localStorage.removeItem(LS_KEY); return; }
        if (t.status === 'completed') { localStorage.removeItem(LS_KEY); return; }
        if (!['waiting', 'matched'].includes(t.status)) { localStorage.removeItem(LS_KEY); return; }
        roleRef.current = savedRole;
        setRole(savedRole);
        setTrade(t);
        setMyCard(savedRole === 'initiator' ? t.initiator_card_snapshot : t.recipient_card_snapshot);
        setMyReady(savedRole === 'initiator' ? t.initiator_ready : t.recipient_ready);
        setTheirReady(savedRole === 'initiator' ? t.recipient_ready : t.initiator_ready);
        if (savedRole === 'initiator') setRoomUrl(`${window.location.origin}${window.location.pathname}#trade=${t.room_code}`);
        setPhase('lobby');
        subscribe(tradeId);
      });
    } catch { localStorage.removeItem(LS_KEY); }
  }, [deviceId]);

  /* ── Handle incoming room code from URL ── */
  useEffect(() => {
    if (!incomingTradeId) return;
    setJoinCode(incomingTradeId.toUpperCase());
    setPhase('joining');
    clearIncomingTrade();
    if (window.location.hash.includes('trade='))
      window.history.replaceState(null, '', window.location.pathname);
  }, [incomingTradeId]);

  useEffect(() => () => subRef.current?.unsubscribe(), []);

  /* ── Actions ── */
  const startTrade = async () => {
    if (!picked) return;
    const res = await createLobby(picked, deviceId);
    if (res.error) { showToast('Could not create lobby: ' + res.error); return; }
    roleRef.current = 'initiator';
    setRole('initiator'); setTrade(res.trade); setMyCard(picked);
    setRoomUrl(res.url);
    localStorage.setItem(LS_KEY, JSON.stringify({ tradeId: res.trade.id, role: 'initiator' }));
    subscribe(res.trade.id);
    setPhase('lobby');
  };

  const joinTrade = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 6) return;
    const res = await joinLobby(code, deviceId);
    if (res.error === 'self') { showToast("That's your own lobby!"); return; }
    if (res.error) { showToast(res.error); return; }
    roleRef.current = 'recipient';
    setRole('recipient'); setTrade(res.trade);
    setTheirReady(res.trade.initiator_ready);
    localStorage.setItem(LS_KEY, JSON.stringify({ tradeId: res.trade.id, role: 'recipient' }));
    subscribe(res.trade.id);
    setPhase('lobby');
  };

  const pickRecipientCard = async (card) => {
    if (role !== 'recipient' || !trade) return;
    setMyCard(card);
    await setRecipientCard(trade.id, card);
  };

  const handleReady = async () => {
    if (!trade || myReady) return;
    setMyReady(true);
    const updated = await setReady(trade.id, role);
    if (!updated) return;
    setTrade(updated);
    if (updated.initiator_ready && updated.recipient_ready && updated.status === 'matched') {
      executeTrade(updated); // race — winner triggers Realtime 'completed'
    }
  };

  const handleLeave = async () => {
    if (trade) await cancelLobby(trade.id);
    resetToHome();
  };

  /* ── AI opponent trade ── */
  const startAITrade = async () => {
    if (!picked) return;
    setPhase('ai-generating');
    try {
      const aiData = await generateAIOpponentCard();
      const photo  = await generateCardImage(aiData.name, aiData.type, aiData.emoji || '🤖');
      const aiCardData = {
        name:      (aiData.name   || 'Glitch Entity').slice(0, 22),
        type:      (aiData.type   || 'unhinged · no cap · void spawn').slice(0, 42),
        rarity:    ['common','uncommon','rare'].includes(aiData.rarity) ? aiData.rarity : 'common',
        flavor:    (aiData.flavor || 'Spawned from corrupted data. Smells like burned WiFi.').slice(0, 85),
        photo,
        stats: DEFAULT_STATS.map(s => ({
          ...s,
          val: clampAI(aiData[s.key], s.bipolar ? -999 : 0, 999),
        })),
        grainSeed: Math.floor(Math.random() * 9999),
      };
      // Add AI card to collection; remove the traded card
      await addCard(aiCardData);
      if (picked?.id) await removeCard(picked.id);
      setMyCard(picked);
      setResult({ newCard: aiCardData, upgraded: false, originalRarity: picked.rarity, newRarity: aiCardData.rarity });
      setPhase('animating');
    } catch (e) {
      console.error('AI trade error:', e);
      showToast('AI is cooked rn 😭 try again');
      setPhase('ai-picking');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ── Derived ── */
  const theirCard     = trade ? (role === 'initiator' ? trade.recipient_card_snapshot : trade.initiator_card_snapshot) : null;
  const partnerJoined = trade?.status === 'matched';
  const canReady      = partnerJoined && (role === 'initiator' || !!myCard) && !myReady;
  const eligible      = collection.filter(c => !String(c.id).startsWith('temp-'));

  if (!SUPABASE_ENABLED) {
    return (
      <div className={`view ${active ? 'active' : ''}`} id="view-trades">
        <div className="trade-area"><p style={{ color: '#888', textAlign: 'center' }}>Trading requires Supabase.</p></div>
      </div>
    );
  }

  return (
    <div className={`view ${active ? 'active' : ''}`} id="view-trades">
      <div className="trade-area">

        {/* ── HOME ── */}
        {phase === 'home' && (
          <div className="pack-builder">
            <h3>🤝 Trade Cards</h3>
            <p className="trade-desc">
              Create a lobby, share the code with your partner, pick your cards, and both hit Ready to swap.
              15% chance either card gets a rarity upgrade on delivery.
            </p>
            <button className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
              onClick={() => setPhase('picking')} type="button">
              Start a Trade
            </button>
            <button className="btn trd-cancel-btn"
              style={{ marginBottom: 10 }}
              onClick={() => setPhase('joining')} type="button">
              Join a Trade
            </button>
            <button className="btn btn-ai-trade"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => { setPicked(null); setPhase('ai-picking'); }} type="button">
              🤖 Challenge AI
            </button>
          </div>
        )}

        {/* ── AI PICKING ── */}
        {phase === 'ai-picking' && (
          <div className="pack-builder">
            <button className="trade-back-btn" onClick={() => { setPhase('home'); setPicked(null); }}>← Back</button>
            <h3 style={{ marginBottom: 4 }}>Challenge the AI 🤖</h3>
            <p className="trade-desc">Pick a card to sacrifice. The AI will generate something deeply unhinged in return.</p>
            {eligible.length === 0 ? (
              <p className="trade-empty-note">Add some cards first!</p>
            ) : (
              <div className="trd-card-list-rows">
                {eligible.map(c => (
                  <div key={c.id}
                    className={`trd-card-row rarity-${c.rarity} ${picked?.id === c.id ? 'trd-row-selected' : ''}`}
                    onClick={() => setPicked(c)}>
                    <div className="trd-row-dot" />
                    <span className="trd-row-name">{c.name}</span>
                    <span className="trd-row-hp">{HP_MAP[c.rarity]}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-ai-trade"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              onClick={startAITrade} disabled={!picked} type="button">
              {picked ? `🤖 Sacrifice "${picked.name}"` : 'Select a card above'}
            </button>
          </div>
        )}

        {/* ── AI GENERATING ── */}
        {phase === 'ai-generating' && (
          <div className="pack-builder" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🤖</div>
            <p className="trade-desc" style={{ marginBottom: 16 }}>AI is cooking something terrible...</p>
            <span className="ai-loading">
              Generating<span className="dots"><span /><span /><span /></span>
            </span>
          </div>
        )}

        {/* ── PICKING (initiator) ── */}
        {phase === 'picking' && (
          <div className="pack-builder">
            <button className="trade-back-btn" onClick={() => { setPhase('home'); setPicked(null); }}>← Back</button>
            <h3 style={{ marginBottom: 6 }}>Pick your card</h3>
            <p className="trade-desc">Choose what you're putting up for trade.</p>
            {eligible.length === 0 ? (
              <p className="trade-empty-note">Add some cards first!</p>
            ) : (
              <div className="trd-card-list-rows">
                {eligible.map(c => (
                  <div key={c.id}
                    className={`trd-card-row rarity-${c.rarity} ${picked?.id === c.id ? 'trd-row-selected' : ''}`}
                    onClick={() => setPicked(c)}>
                    <div className="trd-row-dot" />
                    <span className="trd-row-name">{c.name}</span>
                    <span className="trd-row-hp">{HP_MAP[c.rarity]}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={startTrade} disabled={!picked} type="button">
              {picked ? `Create Lobby with "${picked.name}" 🤝` : 'Select a card above'}
            </button>
          </div>
        )}

        {/* ── JOINING (recipient) ── */}
        {phase === 'joining' && (
          <div className="pack-builder">
            <button className="trade-back-btn" onClick={() => { setPhase('home'); setJoinCode(''); }}>← Back</button>
            <h3 style={{ marginBottom: 6 }}>Join a Trade</h3>
            <p className="trade-desc">Enter the 6-character room code your partner shared.</p>
            <input
              className="form-input"
              placeholder="ABCD12"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              autoCapitalize="characters"
              style={{ letterSpacing: 8, fontFamily: 'Fredoka One, sans-serif', fontSize: 24, textAlign: 'center', marginBottom: 14 }}
            />
            <button className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={joinTrade} disabled={joinCode.length < 6} type="button">
              Join →
            </button>
          </div>
        )}

        {/* ── LOBBY ── */}
        {phase === 'lobby' && trade && (
          <div className="pack-builder">
            <div className="trade-lobby-header">
              <button className="trade-back-btn" onClick={handleLeave}>← Leave</button>
              <div className="trade-lobby-code-row">
                <span className="trade-lobby-code">{trade.room_code}</span>
                {role === 'initiator' && (
                  <button className="btn btn-secondary" onClick={copyLink}
                    style={{ padding: '4px 10px', fontSize: 11 }} type="button">
                    {copied ? '✓ Copied' : 'Copy link'}
                  </button>
                )}
              </div>
            </div>

            {/* Side-by-side mini cards */}
            <div className="trade-lobby-sides">
              <div className="trade-lobby-side">
                <p className="trade-lobby-side-label">YOU</p>
                {myCard ? (
                  <div className="trade-mini-card">
                    <CardFrame card={myCard} index={0} noTilt />
                  </div>
                ) : (
                  <div className="trade-mini-slot trade-mini-waiting">
                    <span className="trade-mini-label">Pick below</span>
                  </div>
                )}
              </div>
              <div className="trade-lobby-sides-divider">⇄</div>
              <div className="trade-lobby-side">
                <p className="trade-lobby-side-label">THEM</p>
                {theirCard ? (
                  <div className="trade-mini-card">
                    <CardFrame card={theirCard} index={0} noTilt />
                  </div>
                ) : (
                  <div className="trade-mini-slot trade-mini-waiting">
                    <span className="trade-mini-label">
                      {partnerJoined ? 'Picking...' : 'Waiting...'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Recipient card picker */}
            {role === 'recipient' && !myCard && (
              <>
                <p className="trade-section-label" style={{ marginTop: 14 }}>Pick your card:</p>
                <div className="trd-card-list-rows">
                  {eligible.map(c => (
                    <div key={c.id}
                      className={`trd-card-row rarity-${c.rarity}`}
                      onClick={() => pickRecipientCard(c)}>
                      <div className="trd-row-dot" />
                      <span className="trd-row-name">{c.name}</span>
                      <span className="trd-row-hp">{HP_MAP[c.rarity]}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Ready indicators */}
            <div className="trade-ready-status">
              <span className={`trade-ready-pill ${myReady ? 'ready' : ''}`}>
                You {myReady ? '✓' : '—'}
              </span>
              <span className={`trade-ready-pill ${theirReady ? 'ready' : ''}`}>
                Them {!partnerJoined ? '—' : theirReady ? '✓' : '—'}
              </span>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              onClick={handleReady}
              disabled={!canReady}
              type="button"
            >
              {myReady ? '⏳ Waiting for partner...' : '🤝 Ready'}
            </button>
          </div>
        )}

        {/* ── ANIMATING ── */}
        {phase === 'animating' && result && (
          <TradeAnimation
            departingCard={myCard}
            receivedCard={result.newCard}
            upgraded={result.upgraded}
            originalRarity={result.originalRarity}
            newRarity={result.newRarity}
            onComplete={resetToHome}
          />
        )}

        {/* ── DONE ── */}
        {phase === 'done' && result && (
          <div className="pack-builder" style={{ textAlign: 'center' }}>
            {result.upgraded && BURST_RARITIES.has(result.newRarity) && (
              <div key={burstKey} className={`pof-reveal-burst pof-burst-${result.newRarity}`}
                style={{ position: 'fixed', zIndex: 500, pointerEvents: 'none' }} />
            )}
            <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
            <h3>{result.upgraded ? `⬆️ ${result.newRarity.toUpperCase()}!` : 'Trade Complete!'}</h3>
            {result.upgraded && (
              <p className="trade-desc" style={{ marginBottom: 4 }}>
                {result.originalRarity} → {result.newRarity} — lucky upgrade!
              </p>
            )}
            {result.newCard && (
              <div style={{ margin: '16px auto', display: 'flex', justifyContent: 'center' }}>
                <CardFrame card={result.newCard} index={0} noTilt />
              </div>
            )}
            <button className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
              onClick={resetToHome} type="button">
              Sweet ✓
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
