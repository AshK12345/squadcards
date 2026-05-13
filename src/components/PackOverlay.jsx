import { useState, useRef } from 'react';
import CardFrame from './CardFrame';
import { RARITY_ORDER } from '../constants';

export default function PackOverlay({ pack, onClose }) {
  const orderedPack = [...pack].sort(
    (a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
  );

  const backCount = Math.min(4, Math.floor(orderedPack.length / 2));
  const frontCount = orderedPack.length - backCount;
  const hasHit = orderedPack.some((c) => RARITY_ORDER[c.rarity] >= 3);

  const [phase, setPhase] = useState('trick'); // 'trick' | 'reveal'
  const [animating, setAnimating] = useState(false);
  const [revealedSet, setRevealedSet] = useState(new Set());
  const [shake, setShake] = useState(false);

  const backStackRef = useRef(null);
  const frontStackRef = useRef(null);

  const doTrick = () => {
    if (animating) return;
    setAnimating(true);
    const backEl = backStackRef.current;
    const frontEl = frontStackRef.current;
    if (backEl && frontEl) {
      const bR = backEl.getBoundingClientRect();
      const fR = frontEl.getBoundingClientRect();
      const dx = fR.left - bR.left;
      const dy = fR.top - bR.top;
      const cards = [...backEl.querySelectorAll('.fd-card')];
      cards.forEach((c, i) => {
        setTimeout(() => {
          c.style.transform = `translate(${dx - i * 10}px, ${dy - 8}px) rotate(-5deg)`;
          c.style.zIndex = 20;
        }, i * 130);
      });
      setTimeout(() => startReveal(), cards.length * 130 + 700);
    } else {
      setTimeout(() => startReveal(), 600);
    }
  };

  const startReveal = () => {
    setPhase('reveal');
    orderedPack.forEach((_, i) => {
      setTimeout(() => {
        setRevealedSet((prev) => new Set([...prev, i]));
        if (i === orderedPack.length - 1 && hasHit) {
          setShake(true);
          setTimeout(() => setShake(false), 500);
        }
      }, 350 + i * 300);
    });
  };

  function CardStack({ count, id, stackRef }) {
    const visible = Math.min(count, 6);
    return (
      <div className="card-stack-vis" style={{ width: visible * 5 + 72 }} id={id} ref={stackRef}>
        {Array.from({ length: visible }).map((_, i) => (
          <div
            key={i}
            className="fd-card"
            style={{ left: i * 5, top: i * 4 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="pack-overlay visible">
      {/* TRICK PHASE */}
      <div className={`pack-phase ${phase === 'trick' ? 'active' : ''}`}>
        <div className="trick-headline">🃏 The Move</div>
        <div className="trick-subline">Stack the deck so your rarest drops last</div>
        <div className="trick-instruction">
          Take{' '}
          <strong>
            {backCount} card{backCount !== 1 ? 's' : ''}
          </strong>{' '}
          from the back of the stack and move them to the front — face down. Your rarest card reveals last.
        </div>
        <div className="trick-stage">
          <div className="stack-wrap">
            <CardStack count={frontCount} id="stk-front" stackRef={frontStackRef} />
            <div className="stack-label">
              Front
              <br />
              {frontCount} cards
            </div>
          </div>
          <div className="arrow-big">←</div>
          <div className="stack-wrap">
            <CardStack count={backCount} id="stk-back" stackRef={backStackRef} />
            <div className="stack-label" style={{ color: '#ff3b3b' }}>
              Back
              <br />
              move {backCount}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={doTrick}
            disabled={animating}
            type="button"
          >
            {animating ? 'Moving...' : 'Do the move ✋'}
          </button>
          <button className="btn btn-secondary" onClick={startReveal} type="button">
            Skip →
          </button>
        </div>
      </div>

      {/* REVEAL PHASE */}
      <div
        className={`pack-phase ${phase === 'reveal' ? 'active' : ''}`}
        style={shake ? { animation: 'shake 0.4s ease' } : {}}
      >
        <div
          className="reveal-headline"
          style={{ color: hasHit ? '#f59e0b' : '#ff3b3b' }}
        >
          {hasHit ? '🔥 LEGENDARY PULL!!' : 'PACK OPENED! 💥'}
        </div>
        <div className="reveal-grid">
          {orderedPack.map((card, i) => {
            const isLast = i === orderedPack.length - 1;
            const isLegendaryLast = isLast && RARITY_ORDER[card.rarity] >= 3;
            let cls = 'reveal-card';
            if (revealedSet.has(i)) cls += isLegendaryLast ? ' legendary-show' : ' show';
            return (
              <div key={i} className={cls}>
                <CardFrame card={card} index={i} />
              </div>
            );
          })}
        </div>
        <div className="overlay-close" onClick={onClose}>
          Add to collection &amp; close
        </div>
      </div>
    </div>
  );
}
