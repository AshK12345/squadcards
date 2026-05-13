import { useState, useRef, useEffect } from 'react';
import CardFrame from './CardFrame';
import { RARITY_ORDER } from '../constants';

// phases: expanding → shuffling → ready → tearing → stack
export default function PackOpenFlow({ pack, packName, onClose }) {
  const [phase, setPhase]       = useState('expanding');
  const [cardIdx, setCardIdx]   = useState(0);
  const [slideDir, setSlideDir] = useState('right');
  const [cardKey, setCardKey]   = useState(0);
  const [exitCard, setExitCard] = useState(null); // { card, key, forward }

  // swipe tracking
  const swipeRef = useRef({ active: false, x0: 0, y0: 0, dx: 0, dy: 0 });
  const [liveDx, setLiveDx]     = useState(0);

  const orderedCards = [...pack].sort(
    (a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
  );
  const total = orderedCards.length;

  /* expanding → shuffling → ready */
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('shuffling'), 380);
    const t2 = setTimeout(() => setPhase('ready'), 1680);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

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
    setLiveDx(swipeRef.current.dx);
  };

  const onEnd = () => {
    if (!swipeRef.current.active) return;
    const { dx, dy } = swipeRef.current;
    const dist = Math.sqrt(dx * dx + dy * dy);
    swipeRef.current.active = false;
    setLiveDx(0);

    if (phase === 'ready' && dist > 48) {
      setPhase('tearing');
      setTimeout(() => { setPhase('stack'); setCardIdx(0); setCardKey(k => k + 1); }, 680);
      return;
    }

    if (phase === 'stack') {
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
    setTimeout(() => setExitCard(null), 420);
  };

  const goNext = () => advance(true);
  const goPrev = () => advance(false);

  /* ── ghost card stack (cards still to come) ── */
  const ghosts = [];
  for (let i = 1; i <= Math.min(3, total - cardIdx - 1); i++) ghosts.push(i);

  const currentCard = orderedCards[cardIdx];
  const isLast      = cardIdx === total - 1;

  /* ── tear pieces ── */
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
      {/* ── EXPANDING ── */}
      {phase === 'expanding' && (
        <div className="pof-pack-stage pof-expanding">
          <div className="pof-pack-wrap">
            <div className="pack-body">
              <div className="pack-title-text">{packName?.toUpperCase()}</div>
              <div className="pack-count-badge">{total} cards</div>
            </div>
          </div>
        </div>
      )}

      {/* ── SHUFFLING ── */}
      {phase === 'shuffling' && (
        <div className="pof-pack-stage">
          <div className="pof-shuffle-wrap">
            {/* card backs that fan out and snap back */}
            <div className="pof-shuffle-card pof-shuffle-0"><div className="pof-card-back" /></div>
            <div className="pof-shuffle-card pof-shuffle-1"><div className="pof-card-back" /></div>
            <div className="pof-shuffle-card pof-shuffle-2"><div className="pof-card-back" /></div>
            {/* pack sits on top */}
            <div className="pof-pack-wrap pof-pack-top">
              <div className="pack-body">
                <div className="pack-title-text">{packName?.toUpperCase()}</div>
                <div className="pack-count-badge">{total} cards</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── READY ── */}
      {phase === 'ready' && (
        <div className="pof-pack-stage pof-ready">
          <div
            className="pof-pack-wrap"
            style={liveDx !== 0
              ? { transform: `rotate(${liveDx * 0.025}deg) scale(${1 + Math.abs(liveDx) * 0.001})` }
              : undefined}
          >
            <div className="pack-body">
              <div className="pack-title-text">{packName?.toUpperCase()}</div>
              <div className="pack-count-badge">{total} cards</div>
            </div>
          </div>
          <p className="pof-hint">
            {Math.abs(liveDx) > 20 ? '💢 RIP IT!' : 'Swipe anywhere to tear it open'}
          </p>
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
            {/* ghost cards behind current */}
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
                <div className="pof-card-back" />
              </div>
            ))}

            {/* exiting card — sinks into the stack */}
            {exitCard && (
              <div
                key={`exit-${exitCard.key}`}
                className={`pof-exit-card ${exitCard.forward ? 'pof-exit-to-back' : 'pof-exit-off-right'}`}
                style={{ zIndex: 25 }}
              >
                <CardFrame card={exitCard.card} index={0} noTilt />
              </div>
            )}

            {/* current card */}
            <div
              key={cardKey}
              className={`pof-main-card pof-slide-in-${slideDir}`}
              style={liveDx !== 0
                ? { transform: `translateX(${liveDx * 0.55}px) rotate(${liveDx * 0.025}deg)`, transition: 'none', zIndex: 30 }
                : { zIndex: 30 }}
            >
              <CardFrame card={currentCard} index={cardIdx} />
            </div>
          </div>

          {/* nav */}
          <div className="pof-nav">
            <button className="pof-nav-btn" onClick={goPrev} disabled={cardIdx === 0}>←</button>
            <span className="pof-nav-hint">
              {isLast ? "🎉 That's the lot!" : 'Swipe or tap arrows'}
            </span>
            <button className="pof-nav-btn" onClick={goNext} disabled={isLast}>→</button>
          </div>

          {isLast && (
            <button className="btn btn-primary pof-done-btn" onClick={onClose}>
              Add to collection ✓
            </button>
          )}
        </div>
      )}

      {/* close — always except mid-tear */}
      {phase !== 'tearing' && (
        <button className="pof-close" onClick={onClose} type="button">✕</button>
      )}
    </div>
  );
}
