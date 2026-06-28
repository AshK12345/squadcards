import { useState, useEffect, useRef } from 'react';
import {
  createLobby, joinLobby, setRecipientCard,
  setReady, executeTrade, claimCard, cancelLobby,
  fetchTrade, subscribeTrade,
} from '../utils/trade';
import { generateAIOpponentCard, refreshBrainrotPool, wordTrunc } from '../utils/ai';
import { saveTradePartner } from '../utils/aiMemory';
import CardFrame from '../components/CardFrame';
import TradeAnimation from '../components/TradeAnimation';
import { SUPABASE_ENABLED } from '../lib/supabase';
import { HP_MAP, DEFAULT_STATS } from '../constants';

// ── Brainrot theme pool ──────────────────────────────────────────────────────
// Entries appear multiple times to weight era probability:
//   2026 (Italian brainrot + late 2025/2026) → ~2× weight
//   2025 → ~1.5× weight
//   2024 and earlier classics → 1× weight
const _BR_2024 = [
  'skibidi toilet final boss', 'sigma grindset emperor', 'NPC streamer going viral',
  'fanum tax collector agent', 'gyatt apostle awakened', 'rizz lord anointed',
  'delulu princess manifesting', 'ratio machine activated', 'ohio final boss unlocked',
  'main character disorder type', 'looksmaxxing devotee ascended', 'aura farmer grinding',
  'chat is this real guy', 'mewing master unlocked form', 'chronically online goblin mode',
  'touch grass desperado', 'grimace shake survivor', 'patrick bateman cosplayer',
  'red pill podcast enjoyer', 'rizzler supreme form', 'negative aura emitter cursed',
  'brain worm manifestation IRL', 'edgelord final evolution', "it's giving creature",
  'bus riding philosopher king', 'gym bro enlightened form', 'minecraft creeper IRL',
  'sussy baka energy type', 'W rizz god mode', 'delulu to real life pipeline',
];
const _BR_2025 = [
  'chill guy energy descended', 'glazing machine activated', 'gooning lord awakened',
  'yapping apostle unlocked', 'villain arc speedrunner', 'caught in 4K supremacy',
  'aura farming level 100', 'rent free in your head', 'fatherless behavior detected',
  'rizz demon no printer', 'based NPC philosopher', 'certified ohio moment IRL',
  'brain rot speedrunner type', 'no cap prophet ascended', 'certified glazer devotee',
];
const _BR_2026 = [
  // Italian brainrot
  'tralalero tralala shark energy', 'bombardiro crocodilo air strike', 'cappuccino assassino vibes',
  'tung tung sahur drumming chaos', 'brr brr patapim creature', 'la vaca saturno saturnita',
  'frigo camelo frozen wanderer', 'ballerina cappuccina energy', 'burbaloni luliloli entity',
  'glorbo frutiger anomaly', 'chimpanzee in tuxedo energy', 'crocodillo alligatore rising',
  // Late 2025 / 2026 trends
  'hawk tuah energy evolved', 'demure mindset activated', 'brat summer survivor',
  'very demure very mindful', 'plant-based sigma grindset', 'looksmaxxing final form',
  'mob mentality speedrunner', 'academic weapon mode on', 'delulu pipeline activated',
  'hyperpop goblin ascended', 'main character arc ending',
];

// Build weighted pool: 2026 × 2, 2025 × 1.5 (add half again), 2024 × 1
const BRAINROT_THEMES_BASE = [
  ..._BR_2024,
  ..._BR_2025, ..._BR_2025.slice(0, Math.ceil(_BR_2025.length / 2)),   // ×1.5
  ..._BR_2026, ..._BR_2026,                                              // ×2
];

const BRAINROT_LS_KEY    = 'sc-brainrot-recent';
const BRAINROT_TERMS_KEY = 'sc-brainrot-terms';
const BRAINROT_TS_KEY    = 'sc-brainrot-ts';
const BRAINROT_MAX_RECENT = 14;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getBrainrotPool() {
  try {
    const stored = localStorage.getItem(BRAINROT_TERMS_KEY);
    if (stored) {
      const arr = JSON.parse(stored);
      if (Array.isArray(arr) && arr.length >= 20) return arr;
    }
  } catch {}
  return BRAINROT_THEMES_BASE;
}

function pickBrainrotTheme() {
  const pool = getBrainrotPool();
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(BRAINROT_LS_KEY) || '[]'); } catch {}
  const available = pool.filter(t => !recent.includes(t));
  const src = available.length > 0 ? available : pool;
  const picked = src[Math.floor(Math.random() * src.length)];
  const next = [picked, ...recent].slice(0, BRAINROT_MAX_RECENT);
  try { localStorage.setItem(BRAINROT_LS_KEY, JSON.stringify(next)); } catch {}
  return picked;
}

// ── Art style pool ───────────────────────────────────────────────────────────
const ART_STYLES = [
  // ── 2D illustrated ──
  'bold flat 2D cartoon illustration, bright colors',
  'anime cel-shaded 2D, vibrant colors, clean lines',
  'comic book halftone 2D, bold ink outlines',
  'loose watercolor 2D illustration, splashing pigment',
  'ukiyo-e woodblock 2D, flat Japanese print style',
  'pop art bold 2D, Warhol primary colors halftone',
  'chibi kawaii 2D, exaggerated cute proportions',
  'thick-outline sticker art 2D, die-cut style',
  'Hanna-Barbera retro 2D cartoon, Saturday morning vibes',
  'graffiti spray-paint 2D, street art style',
  // ── 3D rendered ──
  'Pixar 3D render, glossy colorful character art',
  'low poly geometric 3D, faceted crystal style',
  'claymation 3D, stop-motion clay figure style',
  'Nintendo Switch 3D game art style, toon shading',
  'Fortnite 3D character art, chunky stylized',
  'hyper-realistic 3D digital sculpt, detailed render',
  // ── stylised / painterly ──
  'Studio Ghibli soft painterly, warm background',
  'vaporwave retro glowing aesthetic, pink and teal',
  'synthwave neon grid 80s, electric glow',
  'cyberpunk neon noir, rain-slicked dark city',
  'dark fantasy oil painting, dramatic lighting',
  'pencil sketch crosshatch, detailed linework',
  'glitch art corrupted scanlines, digital artifact',
  'abstract expressionist colorful splatter',
];

// ── Brainrot character likenesses for mashup prompts ─────────────────────────
const BRAINROT_CHARACTERS = [
  { name: 'Tralalero Tralala',    desc: 'great white shark wearing Adidas sneakers walking upright on two legs' },
  { name: 'Bombardiro Crocodilo', desc: 'green crocodile fused with a WWII bomber aircraft body with wings' },
  { name: 'Cappuccino Assassino', desc: 'giant sentient cappuccino cup wielding a blade, assassin energy' },
  { name: 'Tung Tung Sahur',      desc: 'chaotic wooden stick-figure humanoid drumming on everything' },
  { name: 'Brr Brr Patapim',      desc: 'tiny blue fuzzy gremlin with huge googly eyes patting random things' },
  { name: 'La Vaca Saturno',      desc: 'cow wearing Saturn\'s planetary rings as a glowing halo crown' },
  { name: 'Frigo Camelo',         desc: 'dromedary camel fused with a refrigerator torso, door swinging open' },
  { name: 'Ballerina Cappuccina', desc: 'ballerina dancer whose torso is a cappuccino cup, tutu and steam' },
  { name: 'Lirili Larila',        desc: 'majestic camel-elephant hybrid creature standing on a mountaintop' },
  { name: 'Shimpanzini Bananini', desc: 'chimpanzee wearing a full banana peel suit doing parkour' },
  { name: 'Burbaloni Luliloli',   desc: 'round translucent bubble creature with tiny limbs floating around' },
  { name: 'Trippi Troppi',        desc: 'trippy colorful abstract blob with googly eyes and noodle arms' },
];

function pickArtStyle() {
  return ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
}

function maybePickCharacter() {
  // 35% chance of injecting a brainrot character mashup into the prompt
  if (Math.random() > 0.35) return null;
  return BRAINROT_CHARACTERS[Math.floor(Math.random() * BRAINROT_CHARACTERS.length)];
}

// Assign AI card rarity randomly — never influenced by the traded card.
// 65% common, 25% uncommon, 10% rare.
function randomAIRarity() {
  const r = Math.random();
  return r < 0.65 ? 'common' : r < 0.90 ? 'uncommon' : 'rare';
}

// Build a Pollinations image URL
function buildImageUrl(name, type, emoji = '🤖', brainrotTheme = '') {
  const artStyle  = pickArtStyle();
  const character = maybePickCharacter();
  const themeNote = brainrotTheme ? `, ${brainrotTheme} energy` : '';
  const charNote  = character ? `, as ${character.name} (${character.desc})` : '';
  const prompt    = `${artStyle}: ${emoji} funny trading card character — ${name}, ${type}${charNote}${themeNote}, colorful expressive portrait, no text, no words`;
  const seed      = Math.floor(Math.random() * 999999);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}`;
}

// Emoji fallback canvas — used when Pollinations fails or times out
function emojiFallback(emoji = '🤖') {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#1a1a2e'); g.addColorStop(1, '#16213e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  ctx.font = `${S * 0.46}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, S / 2, S / 2);
  return canvas.toDataURL('image/jpeg', 0.88);
}

// Preload the Pollinations URL before the animation starts.
// If it fails or times out (8s), fall back to the emoji canvas data-URL.
// This ensures every trade shows *something* and eliminates the "null image"
// on second+ trades caused by Pollinations rate-limiting subsequent requests.
async function generateCardImage(name, type, emoji = '🤖', brainrotTheme = '') {
  const url = buildImageUrl(name, type, emoji, brainrotTheme);
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; resolve(emojiFallback(emoji)); }, 8000);
    img.onload  = () => { clearTimeout(timer); resolve(url); };
    img.onerror = () => { clearTimeout(timer); resolve(emojiFallback(emoji)); };
    img.src = url;
  });
}
const clampAI = (v, mn, mx) => Math.min(mx, Math.max(mn, Math.round(Number(v) || 0)));

const LS_KEY = 'sc-pending-trade';
const BURST_RARITIES = new Set(['uncommon', 'rare', 'legendary', 'secret']);

export default function TradesView({
  active, collection, deviceId, userId, reloadCards,
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
      const res = await claimCard(updated, myRole, deviceId, userId);
      // Save the partner's card name so flavor AI can reference real trade partners
      const partnerSnap = myRole === 'initiator'
        ? updated.recipient_card_snapshot
        : updated.initiator_card_snapshot;
      if (partnerSnap?.name) saveTradePartner(partnerSnap.name);
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

  /* ── 30-day brainrot pool refresh (non-blocking) ── */
  useEffect(() => {
    const ts = Number(localStorage.getItem(BRAINROT_TS_KEY) || 0);
    if (Date.now() - ts < THIRTY_DAYS_MS) return;
    // Fire and forget — never blocks UI
    refreshBrainrotPool().then(terms => {
      if (!terms) return;
      try {
        localStorage.setItem(BRAINROT_TERMS_KEY, JSON.stringify(terms));
        localStorage.setItem(BRAINROT_TS_KEY, String(Date.now()));
      } catch {}
    });
  }, []);

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
      const aiData        = await generateAIOpponentCard();
      const brainrotTheme = pickBrainrotTheme();
      const photo         = await generateCardImage(aiData.name, aiData.type, aiData.emoji || '🤖', brainrotTheme);
      // Rarity assigned randomly — never derived from the traded card's rarity
      const aiRarity = randomAIRarity();
      const aiCardData = {
        name:   wordTrunc(aiData.name   || 'Glitch Entity',  18),
        type:   wordTrunc(aiData.type   || 'unhinged goblin mode', 28),
        rarity: aiRarity,
        flavor: wordTrunc(aiData.flavor || 'Spawned from corrupted data. Smells like WiFi.', 72),
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
      setResult({ newCard: aiCardData, upgraded: false, originalRarity: picked.rarity, newRarity: aiRarity });
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
