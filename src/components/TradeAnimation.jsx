import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CardFrame from './CardFrame';

const BURST_RARITIES = new Set(['uncommon', 'rare', 'legendary', 'secret']);

// phase timeline:
//   0      depart   — departing card squishes & shoots right
//   900    arrive   — face-down card hurled in, bounces off walls
//   3100   flip-out — scaleX squeeze to 0
//   3300   flip-in  — swap to front, scaleX expand from 0
//   3520   show     — received card visible, upgrade burst, button

export default function TradeAnimation({
  departingCard, receivedCard,
  upgraded, originalRarity, newRarity,
  onComplete,
}) {
  const [phase, setPhase]       = useState('depart');
  const [showFront, setShowFront] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase('arrive'),   900),
      setTimeout(() => setPhase('flip-out'), 3100),
      setTimeout(() => {
        setShowFront(true);
        setPhase('flip-in');
        if (upgraded) setBurstKey(k => k + 1);
      }, 3300),
      setTimeout(() => setPhase('show'),     3520),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  const isFlipPhase = phase === 'flip-out' || phase === 'flip-in' || phase === 'show';

  return createPortal(
    <div className="ta-backdrop">

      {/* Scanline overlay */}
      <div className="ta-scanlines" />

      {/* "TRADE!" flash text */}
      {phase === 'depart' && <div className="ta-title">TRADE!</div>}

      {/* ── DEPARTING CARD ── */}
      {phase === 'depart' && (
        <div className="ta-stage ta-depart">
          <CardFrame card={departingCard} index={0} noTilt />
        </div>
      )}

      {/* ── ARRIVING CARD (face-down, bouncing) ── */}
      {phase === 'arrive' && (
        <div className="ta-stage ta-bounce">
          <div className="pof-card-back" style={{ position: 'relative' }}>
            <TaLogo />
          </div>
        </div>
      )}

      {/* ── FLIP + SHOW ── */}
      {isFlipPhase && (
        <div className="ta-stage">
          <div className={`pof-flip-card ${
            phase === 'flip-out' ? 'pof-flipX-out' :
            phase === 'flip-in'  ? 'pof-flipX-in'  : ''
          }`}>
            {showFront
              ? <CardFrame card={receivedCard} index={0} noTilt />
              : <div className="pof-card-back" style={{ position: 'relative' }}><TaLogo /></div>
            }
          </div>
        </div>
      )}

      {/* ── UPGRADE BURST ── */}
      {phase === 'show' && upgraded && BURST_RARITIES.has(newRarity) && (
        <div key={burstKey} className={`pof-reveal-burst pof-burst-${newRarity}`} />
      )}

      {/* ── YOU GOT label + button ── */}
      {phase === 'show' && (
        <div className="ta-result-footer">
          {upgraded && (
            <p className="ta-upgrade-badge">
              ⬆️ {originalRarity} → {newRarity.toUpperCase()}
            </p>
          )}
          <button className="btn ta-done-btn" onClick={onComplete} type="button">
            Sweet ✓
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

function TaLogo() {
  return (
    <svg className="pof-sc-logo" viewBox="0 0 230 328"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="scGradTA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.38)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
        </linearGradient>
      </defs>
      <text x="115" y="186" fontFamily="Nerko One, cursive" fontSize="178"
        textAnchor="middle" dominantBaseline="central"
        fill="rgba(0,0,0,0.28)">SC</text>
      <text x="115" y="185" fontFamily="Nerko One, cursive" fontSize="178"
        textAnchor="middle" dominantBaseline="central"
        fill="url(#scGradTA)">SC</text>
    </svg>
  );
}
