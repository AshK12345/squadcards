import { useRef, useEffect } from 'react';
import { HP_MAP, PIPS, fmtBi } from '../constants';

const HOLO = new Set(['rare', 'legendary', 'secret']);

export default function CardFrame({ card, index, noTilt = false }) {
  const wrapRef  = useRef(null);
  const frameRef = useRef(null);
  const holoRef  = useRef(null);
  const sparkRef = useRef(null);

  const isHolo  = HOLO.has(card.rarity);
  const pipCount = PIPS[card.rarity] ?? 1;

  /* ── pointer tracking ── */
  const applyTilt = (clientX, clientY) => {
    if (!isHolo || noTilt || !wrapRef.current || !frameRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left)  / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top)   / rect.height));
    const rx = (y - 0.5) * -22;
    const ry = (x - 0.5) *  22;

    frameRef.current.style.transform =
      `perspective(550px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.04)`;
    frameRef.current.style.transition = 'transform 0.08s linear';
    frameRef.current.style.boxShadow  =
      `${-ry * 0.6 + 6}px ${rx * 0.4 + 6}px 24px rgba(0,0,0,0.35)`;

    // Holographic gradient follows the pointer
    if (holoRef.current) {
      const angle = 110 + (x - 0.5) * 90;
      const shine = `radial-gradient(circle at ${x*100}% ${y*100}%,
        rgba(255,255,255,0.28) 0%, transparent 55%)`;

      let rainbow;
      if (card.rarity === 'legendary') {
        rainbow = `linear-gradient(${angle}deg,
          transparent 15%,
          rgba(255,215,0,0.45) 22%, rgba(255,165,0,0.45) 32%,
          rgba(255,240,120,0.45) 42%, rgba(255,215,0,0.45) 52%,
          transparent 60%)`;
      } else {
        rainbow = `linear-gradient(${angle}deg,
          transparent 5%,
          rgba(255,0,128,0.3) 12%, rgba(255,165,0,0.3) 19%,
          rgba(255,255,0,0.3) 26%, rgba(0,255,128,0.3) 34%,
          rgba(0,200,255,0.3) 42%, rgba(100,0,255,0.3) 50%,
          rgba(255,0,255,0.3) 57%, transparent 64%)`;
      }

      holoRef.current.style.background = `${shine}, ${rainbow}`;
      holoRef.current.style.opacity = '1';
    }

    if (sparkRef.current) {
      sparkRef.current.style.backgroundPosition = `${x*80}% ${y*80}%`;
      sparkRef.current.style.opacity = '0.65';
    }
  };

  const clearTilt = () => {
    if (!frameRef.current) return;
    frameRef.current.style.transform  = '';
    frameRef.current.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease';
    frameRef.current.style.boxShadow  = '';
    if (holoRef.current)  holoRef.current.style.opacity  = '0';
    if (sparkRef.current) sparkRef.current.style.opacity = '0';
  };

  const onMouseMove = (e) => applyTilt(e.clientX, e.clientY);

  // Non-passive touchmove so preventDefault actually stops page scroll while tilting
  const applyTiltRef = useRef(applyTilt);
  applyTiltRef.current = applyTilt;
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e) => {
      if (e.cancelable) e.preventDefault();
      applyTiltRef.current(e.touches[0].clientX, e.touches[0].clientY);
    };
    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, []);

  return (
    <div
      className={`card-grid-item rarity-${card.rarity}`}
      ref={wrapRef}
      onMouseMove={onMouseMove}
      onMouseLeave={clearTilt}
      onTouchEnd={clearTilt}
      style={{ perspective: '550px' }}
    >
      <div className="card-frame" ref={frameRef}>

        {/* ── holographic layers (rare / legendary / secret only) ── */}
        {isHolo && <div className="holo-shimmer" />}
        {isHolo && <div className="holo-overlay"  ref={holoRef}  />}
        {isHolo && <div className="sparkle-overlay" ref={sparkRef} />}

        <div className="card-rarity-stamp" />

        <div className="card-header">
          <div className="card-name">{card.name}</div>
          <div className="card-hp">{HP_MAP[card.rarity]}</div>
        </div>

        <div className="card-img-wrap">
          {card.photo
            ? <img src={card.photo} alt={card.name} onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
            : null}
          <div className="card-img-placeholder" style={card.photo ? { display: 'none' } : {}}>👤</div>
        </div>

        <div className="card-type-line">{card.type}</div>

        <div className="card-text-box">
          <div className="card-flavor">
            {(card.flavor || 'Allegedly a person.').slice(0, 100)}
          </div>
          <div className="card-stat-line">
            {card.stats?.map((s, i) => {
              const neg  = s.bipolar && s.val < 0;
              const disp = s.bipolar ? fmtBi(s.val) : s.val;
              return <span key={i} className={neg ? 'neg' : ''}>{s.emoji}{disp}</span>;
            })}
          </div>
        </div>

        <div className="card-footer-group">
          <div className="card-overbar" />
          <div className="card-footer">
            <div className="rarity-pip">
              {Array.from({ length: pipCount }).map((_, i) => <div key={i} className="pip" />)}
            </div>
            <div className="card-set-stamp">SC</div>
            <div className="card-number">#{String((index ?? 0) + 1).padStart(3, '0')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
