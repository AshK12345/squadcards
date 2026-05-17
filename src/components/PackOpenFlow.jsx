import { useState, useRef } from 'react';
import CardFrame from './CardFrame';
import { RARITY_ORDER } from '../constants';

const HOLO = new Set(['rare', 'legendary', 'secret']);

// phases: ready → tearing → stack
export default function PackOpenFlow({ pack, packName, onClose }) {
  const [phase, setPhase]         = useState('ready');     // skip expanding entirely
  const [cardIdx, setCardIdx]     = useState(0);
  const [flipped, setFlipped]     = useState(false);
  const [flipTime, setFlipTime]   = useState(0);
  const [slideDir, setSlideDir]   = useState('right');
  const [cardKey, setCardKey]     = useState(0);
  const [exitCard, setExitCard]   = useState(null);
  const [burstKey, setBurstKey]   = useState(0);
  const [burstRarity, setBurstRarity] = useState(null);

  // DOM ref for flash — manipulate directly to avoid re-renders during tearing
  const flashRef = useRef(null);
  const swipeRef = useRef({ active: false, x0: 0, y0: 0, dx: 0, dy: 0 });
  const [liveDx, setLiveDx] = useState(0);

  const orderedCards = [...pack].sort(
    (a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
  );
  const total = orderedCards.length;

  const triggerFlash = () => {
    const el = flashRef.current;
    if (!el) return;
    el.classList.add('on');
    setTimeout(() => el.classList.remove('on'), 500);
  };

  const openPack = () => {
    if (phase !== 'ready') return;
    triggerFlash();                         // no state change → no re-render
    setPhase('tearing');                    // single state change for the tear
    setTimeout(() => {
      setPhase('stack');
      setCardIdx(0);
      setFlipped(false);
      setCardKey(k => k + 1);
    }, 700);
  };

  const flipCard = () => {
    if (flipped) return;
    setFlipped(true);
    setFlipTime(Date.now());
    const card = orderedCards[cardIdx];
    if (HOLO.has(card.rarity)) {
      setBurstRarity(card.rarity);
      setBurstKey(k => k + 1);
      setTimeout(() => setBurstRarity(null), 900);
    }
  };

  /* ── pointer helpers ── */
  const pt = (e) => {
    const s = e.touches?.[0] ?? e.changedTouches?.[0] ?? e;
    return { x: s.clientX, y: s.clientY };
  };

  const onStart = (e) => {
    const { x, y } = pt(e);
    swipeRef.current = { active: true, x0: x, y0: y, dx: 0, dy: 0 };
  };

  const onMove = (e) => {
    if (!swipeRef.current.active) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = pt(e);
    swipeRef.current.dx = x - swipeRef.current.x0;
    swipeRef.current.dy = y - swipeRef.current.y0;
    if (phase === 'ready' || (phase === 'stack' && flipped)) {
      setLiveDx(swipeRef.current.dx);
    }
  };

  const onEnd = () => {
    if (!swipeRef.current.active) return;
    const { dx, dy } = swipeRef.current;
    const dist = Math.sqrt(dx * dx + dy * dy);
    swipeRef.current.active = false;
    setLiveDx(0);

    if (phase === 'ready') { openPack(); return; }

    if (phase === 'stack') {
      if (!flipped) {
        if (dist < 20) flipCard();
        return;
      }
      if (dist < 20) {
        if (Date.now() - flipTime > 350 && !isLast) advance(true);
        return;
      }
      if (dx < -55 && cardIdx < total - 1) advance(true);
      else if (dx > 55 && cardIdx > 0)     advance(false);
    }
  };

  const advance = (forward) => {
    if (forward  && cardIdx >= total - 1) return;
    if (!forward && cardIdx <= 0)         return;
    setExitCard({ card: orderedCards[cardIdx], key: cardKey, forward });
    setSlideDir(forward ? 'right' : 'left');
    setCardIdx(i => forward ? i + 1 : i - 1);
    setCardKey(k => k + 1);
    setFlipped(false);
    setBurstRarity(null);
    setTimeout(() => setExitCard(null), 420);
  };

  const ghosts = [];
  for (let i = 1; i <= Math.min(3, total - cardIdx - 1); i++) ghosts.push(i);

  const currentCard = orderedCards[cardIdx];
  const isLast      = cardIdx === total - 1;

  const TearHalf = ({ top }) => (
    <div
      className={`pof-tear-half pof-tear-${top ? 'top' : 'bot'}`}
      style={{
        clipPath: top
          ? 'polygon(0 0,100% 0,100% 52%,93% 48%,85% 53%,76% 48%,67% 52%,57% 47%,47% 52%,37% 48%,27% 53%,17% 48%,8% 52%,0 49%)'
          : 'polygon(0 49%,8% 52%,17% 48%,27% 53%,37% 48%,47% 52%,57% 47%,67% 52%,76% 48%,85% 53%,93% 48%,100% 52%,100% 100%,0 100%)',
      }}
    >
      <div className="pack-body">
        <div className="pack-title-text">{packName?.toUpperCase()}</div>
        <div className="pack-count-badge">{total} cards</div>
      </div>
    </div>
  );

  return (
    <div
      className="pof-backdrop"
      onMouseDown={onStart}
      onMouseMove={onMove}
      onMouseUp={onEnd}
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
    >
      {/* Flash — DOM-only, no state, no re-renders */}
      <div className="pof-flash" ref={flashRef} />

      {/* Holo burst — fixed overlay, outside all 3D contexts */}
      {burstRarity && (
        <div key={burstKey} className={`pof-reveal-burst pof-burst-${burstRarity}`} />
      )}

      {/* ── READY ── */}
      {phase === 'ready' && (
        <div className="pof-pack-stage pof-ready">
          <div className="pof-pack-aura" />
          <div
            className="pof-pack-wrap pof-pack-float"
            style={liveDx !== 0
              ? { transform: `rotate(${liveDx * 0.025}deg) scale(${1 + Math.abs(liveDx) * 0.001})`, animation: 'none' }
              : undefined}
          >
            <div className="pack-body">
              <div className="pof-tear-line" />
              <div className="pack-title-text">{packName?.toUpperCase()}</div>
              <div className="pack-count-badge">{total} cards</div>
            </div>
          </div>
          <p className="pof-hint">Tap to tear it open ⚡</p>
        </div>
      )}

      {/* ── TEARING ── */}
      {phase === 'tearing' && (
        <div className="pof-tear-stage">
          <TearHalf top />
          <TearHalf top={false} />
        </div>
      )}

      {/* ── CARD STACK ── */}
      {phase === 'stack' && (
        <div className="pof-stack-scene">
          <div className="pof-counter">
            {cardIdx + 1} <span>/ {total}</span>
          </div>

          <div className="pof-deck">
            {ghosts.map((offset) => (
              <div
                key={offset}
                className="pof-ghost"
                style={{
                  transform: `translateX(${offset * 7}px) translateY(${offset * 5}px) rotate(${offset * 2}deg) scale(${1 - offset * 0.04})`,
                  opacity: 1 - offset * 0.28,
                  zIndex: 20 - offset,
                }}
              >
                <div className="pof-card-back"><ScLogo /></div>
              </div>
            ))}

            {exitCard && (
              <div
                key={`exit-${exitCard.key}`}
                className={`pof-exit-card ${exitCard.forward ? 'pof-exit-to-back' : 'pof-exit-off-right'}`}
                style={{ zIndex: 25 }}
              >
                <CardFrame card={exitCard.card} index={0} noTilt />
              </div>
            )}

            {/* current card — outer handles swipe drag */}
            <div
              key={cardKey}
              style={liveDx !== 0 && flipped
                ? { position: 'absolute', inset: 0, perspective: '900px', transform: `translateX(${liveDx * 0.55}px) rotate(${liveDx * 0.025}deg)`, transition: 'none', zIndex: 30 }
                : { position: 'absolute', inset: 0, perspective: '900px', zIndex: 30 }}
            >
              <div className={`pof-flip-inner ${flipped ? 'is-flipped' : 'pof-unflipped-pulse'}`}>

                {/* FRONT — face down (card back) */}
                <div className="pof-flip-face pof-flip-front">
                  <div className="pof-card-back">
                    <ScLogo />
                  </div>
                  <div className="pof-back-sheen" />
                  <div className="pof-tap-hint">👆 Tap to reveal</div>
                </div>

                {/* BACK — face up (actual card) */}
                <div className="pof-flip-face pof-flip-back">
                  <div className={`pof-slide-in-${slideDir}`} style={{ position: 'absolute', inset: 0 }}>
                    <CardFrame card={currentCard} index={cardIdx} noTilt />
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="pof-nav">
            <button className="pof-nav-btn" onClick={() => advance(false)} disabled={cardIdx === 0}>←</button>
            <span className="pof-nav-hint">
              {!flipped
                ? 'Tap card to reveal'
                : isLast
                  ? '🎉 All cards revealed!'
                  : 'Tap or swipe → for next'}
            </span>
            <button
              className="pof-nav-btn"
              onClick={() => flipped ? advance(true) : flipCard()}
              disabled={isLast && flipped}
            >→</button>
          </div>

          {isLast && flipped && (
            <button className="btn btn-primary pof-done-btn" onClick={onClose}>
              Done ✓
            </button>
          )}
        </div>
      )}

      {phase !== 'tearing' && (
        <button className="pof-close" onClick={onClose} type="button">✕</button>
      )}
    </div>
  );
}

/* SC logo — vector, sits on the card back */
function ScLogo() {
  return (
    <svg
      className="pof-sc-logo"
      viewBox="0 0 230 328"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* drop shadow */}
      <text
        x="115" y="185"
        fontFamily="Nerko One, cursive"
        fontSize="178"
        fontWeight="900"
        textAnchor="middle"
        dominantBaseline="central"
        fill="rgba(0,0,0,0.35)"
        dx="3" dy="4"
      >SC</text>
      {/* main lettering */}
      <text
        x="115" y="185"
        fontFamily="Nerko One, cursive"
        fontSize="178"
        fontWeight="900"
        textAnchor="middle"
        dominantBaseline="central"
        fill="rgba(255,255,255,0.22)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="2"
      >SC</text>
    </svg>
  );
}
