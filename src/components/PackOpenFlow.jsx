import { useState, useRef } from 'react';
import CardFrame from './CardFrame';
import { RARITY_ORDER } from '../constants';

const BURST_RARITIES = new Set(['uncommon', 'rare', 'legendary', 'secret']);
const BURST_DURATION = { uncommon: 950, rare: 1500, legendary: 1600, secret: 1600 };
const FLIP_HALF = 200; // ms per half of the flip

// phases: ready → tearing → stack
// flipPhase: back → closing → opening → front
export default function PackOpenFlow({ pack, packName, onClose }) {
  const [phase, setPhase]             = useState('ready');
  const [cardIdx, setCardIdx]         = useState(0);
  const [flipPhase, setFlipPhase]     = useState('back');
  const [slideDir, setSlideDir]       = useState('right');
  const [cardKey, setCardKey]         = useState(0);
  const [exitCard, setExitCard]       = useState(null);
  const [burstKey, setBurstKey]       = useState(0);
  const [burstRarity, setBurstRarity] = useState(null);

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
    triggerFlash();
    setPhase('tearing');
    setTimeout(() => {
      setPhase('stack');
      setCardIdx(0);
      setFlipPhase('back');
      setCardKey(k => k + 1);
    }, 700);
  };

  const flipCard = () => {
    if (flipPhase !== 'back') return;
    // Phase 1: squeeze card back down to nothing
    setFlipPhase('closing');
    // Midpoint: swap content, then expand showing card front
    setTimeout(() => {
      setFlipPhase('opening');
      const card = orderedCards[cardIdx];
      if (BURST_RARITIES.has(card.rarity)) {
        setBurstRarity(card.rarity);
        setBurstKey(k => k + 1);
        setTimeout(() => setBurstRarity(null), BURST_DURATION[card.rarity] ?? 1000);
      }
    }, FLIP_HALF);
    // Done
    setTimeout(() => setFlipPhase('front'), FLIP_HALF * 2);
  };

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
    if (phase === 'ready' || (phase === 'stack' && flipPhase === 'front')) {
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
      // Ignore all input mid-flip
      if (flipPhase === 'closing' || flipPhase === 'opening') return;

      if (flipPhase === 'back') {
        if (dist < 20) flipCard(); // tap only — swipes on face-down do nothing
        return;
      }

      // front: swipe to navigate, tap does nothing
      if (dist < 20) return;
      if (dx < -50 && cardIdx < total - 1) advance(true);
      else if (dx > 50 && cardIdx > 0)     advance(false);
    }
  };

  const stopProp = (e) => e.stopPropagation();

  const advance = (forward) => {
    if (forward  && cardIdx >= total - 1) return;
    if (!forward && cardIdx <= 0)         return;
    setExitCard({ card: orderedCards[cardIdx], key: cardKey, forward });
    setSlideDir(forward ? 'right' : 'left');
    setCardIdx(i => forward ? i + 1 : i - 1);
    setCardKey(k => k + 1);
    setFlipPhase('back');
    setBurstRarity(null);
    setTimeout(() => setExitCard(null), 420);
  };

  const ghosts = [];
  for (let i = 1; i <= Math.min(3, total - cardIdx - 1); i++) ghosts.push(i);

  const currentCard = orderedCards[cardIdx];
  const isLast      = cardIdx === total - 1;

  // Whether to show the card front (during opening or fully revealed)
  const showFront = flipPhase === 'opening' || flipPhase === 'front';

  // CSS class driving the scaleX animation
  const flipAnimClass =
    flipPhase === 'closing' ? 'pof-flipX-out' :
    flipPhase === 'opening' ? 'pof-flipX-in'  : '';

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
      <div className="pof-flash" ref={flashRef} />

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

            {/* Current card — scaleX flip */}
            <div
              key={cardKey}
              style={liveDx !== 0 && showFront
                ? { position: 'absolute', inset: 0, transform: `translateX(${liveDx * 0.55}px) rotate(${liveDx * 0.025}deg)`, transition: 'none', zIndex: 30 }
                : { position: 'absolute', inset: 0, zIndex: 30 }}
            >
              <div className={`pof-flip-card ${flipAnimClass} ${flipPhase === 'back' ? 'pof-unflipped-pulse' : ''}`}>
                {showFront ? (
                  <div className={`pof-slide-in-${slideDir}`} style={{ position: 'absolute', inset: 0 }}>
                    <CardFrame card={currentCard} index={cardIdx} noTilt />
                  </div>
                ) : (
                  <>
                    <div className="pof-card-back"><ScLogo /></div>
                    <div className="pof-back-sheen" />
                    {flipPhase === 'back' && <div className="pof-tap-hint">👆 Tap to reveal</div>}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* No arrow buttons — swipe only */}
          <div className="pof-nav">
            <span className="pof-nav-hint" style={{ minWidth: 'unset' }}>
              {flipPhase === 'back'
                ? 'Tap card to reveal'
                : isLast
                  ? '🎉 All cards revealed!'
                  : '← Swipe to navigate →'}
            </span>
          </div>

          {isLast && flipPhase === 'front' && (
            <button
              className="btn btn-primary pof-done-btn"
              onMouseDown={stopProp}
              onTouchStart={stopProp}
              onClick={onClose}
            >
              Done ✓
            </button>
          )}
        </div>
      )}

      {phase !== 'tearing' && (
        <button
          className="pof-close"
          onMouseDown={stopProp}
          onTouchStart={stopProp}
          onClick={onClose}
          type="button"
        >✕</button>
      )}
    </div>
  );
}

/* SC logo — gradient fill (lit from top) gives raised 3D look without glitch */
function ScLogo() {
  return (
    <svg
      className="pof-sc-logo"
      viewBox="0 0 230 328"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="scGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.38)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
        </linearGradient>
      </defs>
      {/* 1px drop for depth */}
      <text x="115" y="186" fontFamily="Nerko One, cursive" fontSize="178"
        textAnchor="middle" dominantBaseline="central" fill="rgba(0,0,0,0.28)">SC</text>
      {/* gradient main */}
      <text x="115" y="185" fontFamily="Nerko One, cursive" fontSize="178"
        textAnchor="middle" dominantBaseline="central" fill="url(#scGrad)">SC</text>
    </svg>
  );
}
