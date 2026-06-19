import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CardFrame from './CardFrame';
import ScLogo from './ScLogo';

const BURST_RARITIES = new Set(['uncommon', 'rare', 'legendary', 'secret']);

// phase timeline:
//   0      slide-in — departing card slides up from below screen to center
//   800    depart   — card winds up & shoots right (2.0s frisbee throw)
//   2800   arrive   — face-down card hurled in, bounces off walls
//   5000   flip-out — scaleX squeeze to 0
//   5200   flip-in  — swap to front, scaleX expand from 0
//   5420   show     — received card visible, upgrade burst, button

export default function TradeAnimation({
  departingCard, receivedCard,
  upgraded, originalRarity, newRarity,
  onComplete,
}) {
  const [phase, setPhase]       = useState('slide-in');
  const [showFront, setShowFront] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase('depart'),   800),
      setTimeout(() => setPhase('arrive'),   2800),  // 800 + 2000
      setTimeout(() => setPhase('flip-out'), 5000),  // 2800 + 2200
      setTimeout(() => {
        setShowFront(true);
        setPhase('flip-in');
        if (upgraded) setBurstKey(k => k + 1);
      }, 5200),                                      // 5000 + 200
      setTimeout(() => setPhase('show'),     5420),  // 5200 + 220
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  const isFlipPhase = phase === 'flip-out' || phase === 'flip-in' || phase === 'show';

  return createPortal(
    <div className="ta-backdrop">

      {/* Scanline overlay */}
      <div className="ta-scanlines" />

      {/* "TRADE!" flash text — visible while card slides in */}
      {phase === 'slide-in' && <div className="ta-title">TRADE!</div>}

      {/* ── SLIDE-IN: departing card rises from bottom of screen ── */}
      {phase === 'slide-in' && (
        <div className="ta-stage ta-slide-in">
          <CardFrame card={departingCard} index={0} noTilt />
        </div>
      )}

      {/* ── DEPARTING CARD (1f spirograph frisbee) ── */}
      {phase === 'depart' && (
        <div className="ta-stage ta-frisbee-pos">
          {/* ta-frisbee-spin rotates AND contains the SVG, so arcs rotate with card */}
          <div className="ta-frisbee-spin">
            {/*
              Spirograph arcs in card-local rotating space (0,0=top-left, 230×380).
              Top-right corner (230,0) and bottom-left (0,380) each get:
                outer bloom (heavy blur) + inner glow (soft blur) + sharp core + spike bloom.
              Gradient fades tip-first → trailing effect as overall opacity drops.
            */}
            <svg className="ta-spiro-svg" viewBox="0 0 230 380"
                 xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <filter id="taBlur1" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="6"/>
                </filter>
                <filter id="taBlur2" x="-150%" y="-150%" width="400%" height="400%">
                  <feGaussianBlur stdDeviation="14"/>
                </filter>
                <linearGradient id="taGTR" gradientUnits="userSpaceOnUse"
                                x1="230" y1="0" x2="-93" y2="160">
                  <stop offset="0%"   stopColor="#b8d4ff" stopOpacity="0.95"/>
                  <stop offset="18%"  stopColor="#b8d4ff" stopOpacity="0.80"/>
                  <stop offset="55%"  stopColor="#b8d4ff" stopOpacity="0.35"/>
                  <stop offset="100%" stopColor="#b8d4ff" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="taGBL" gradientUnits="userSpaceOnUse"
                                x1="0" y1="380" x2="322" y2="209">
                  <stop offset="0%"   stopColor="#c8dcff" stopOpacity="0.80"/>
                  <stop offset="18%"  stopColor="#c8dcff" stopOpacity="0.65"/>
                  <stop offset="55%"  stopColor="#c8dcff" stopOpacity="0.28"/>
                  <stop offset="100%" stopColor="#c8dcff" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="taGTRspike" gradientUnits="userSpaceOnUse"
                                x1="230" y1="0" x2="64" y2="-38">
                  <stop offset="0%"   stopColor="white" stopOpacity="0"/>
                  <stop offset="30%"  stopColor="#e0eeff" stopOpacity="0.85"/>
                  <stop offset="100%" stopColor="#e0eeff" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="taGBLspike" gradientUnits="userSpaceOnUse"
                                x1="0" y1="380" x2="166" y2="407">
                  <stop offset="0%"   stopColor="white" stopOpacity="0"/>
                  <stop offset="30%"  stopColor="#e0eeff" stopOpacity="0.75"/>
                  <stop offset="100%" stopColor="#e0eeff" stopOpacity="0"/>
                </linearGradient>
              </defs>

              {/* TOP-RIGHT CORNER (230, 0) — arcs sweep CCW ~120° */}
              <path d="M 230 0 Q 160 -51 73 -32 Q 0 -16 -57 57 Q -80 96 -93 160"
                    stroke="url(#taGTR)" strokeWidth="55" fill="none" strokeLinecap="round"
                    filter="url(#taBlur2)" opacity="0.22"/>
              <path d="M 230 0 Q 160 -51 73 -32 Q 0 -16 -57 57 Q -80 96 -93 160"
                    stroke="url(#taGTR)" strokeWidth="16" fill="none" strokeLinecap="round"
                    filter="url(#taBlur1)" opacity="0.60"/>
              <path d="M 230 0 Q 185 -38 147 -32 Q 115 -29 73 -32"
                    stroke="url(#taGTR)" strokeWidth="9" fill="none" strokeLinecap="round"
                    opacity="0.95"/>
              <path d="M 230 0 Q 210 -16 182 -22"
                    stroke="url(#taGTRspike)" strokeWidth="35" fill="none" strokeLinecap="round"
                    filter="url(#taBlur1)" opacity="0.72"/>

              {/* BOTTOM-LEFT CORNER (0, 380) — arcs sweep CCW ~120° */}
              <path d="M 0 380 Q 89 407 156 400 Q 230 391 287 311 Q 319 263 322 209"
                    stroke="url(#taGBL)" strokeWidth="46" fill="none" strokeLinecap="round"
                    filter="url(#taBlur2)" opacity="0.18"/>
              <path d="M 0 380 Q 89 407 156 400 Q 230 391 287 311 Q 319 263 322 209"
                    stroke="url(#taGBL)" strokeWidth="14" fill="none" strokeLinecap="round"
                    filter="url(#taBlur1)" opacity="0.55"/>
              <path d="M 0 380 Q 51 391 96 394 Q 127 397 156 400"
                    stroke="url(#taGBL)" strokeWidth="8" fill="none" strokeLinecap="round"
                    opacity="0.88"/>
              <path d="M 0 380 Q 38 388 77 391"
                    stroke="url(#taGBLspike)" strokeWidth="32" fill="none" strokeLinecap="round"
                    filter="url(#taBlur1)" opacity="0.68"/>
            </svg>
            <CardFrame card={departingCard} index={0} noTilt />
          </div>
        </div>
      )}

      {/* ── ARRIVING CARD (face-down, bouncing) ── */}
      {phase === 'arrive' && (
        <div className="ta-stage ta-bounce">
          <div className="pof-card-back" style={{ position: 'relative' }}>
            <ScLogo idPrefix="ta" />
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
              : <div className="pof-card-back" style={{ position: 'relative' }}><ScLogo idPrefix="ta" /></div>
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

