import { useRef, useEffect, useLayoutEffect } from 'react';
import { HP_MAP, PIPS, fmtBi } from '../constants';

const HOLO = new Set(['rare', 'legendary', 'secret']);

// ── FNV-1a hash → deterministic seed per card name ───────
function dyeSeed(name = '') {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % 9999;
}

// ── Seeded PRNG (mulberry32) ──────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Seeded permutation table for simplex noise ────────────
function buildPerm(seed) {
  const rand = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

// ── 2D Simplex noise — output ≈ [-1, 1] ──────────────────
const GRAD2 = [
  [1,1],[-1,1],[1,-1],[-1,-1],
  [1,0],[-1,0],[1,0],[-1,0],
  [0,1],[0,-1],[0,1],[0,-1],
];

function simplex2(perm, xin, yin) {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const s  = (xin + yin) * F2;
  const i  = Math.floor(xin + s);
  const j  = Math.floor(yin + s);
  const t  = (i + j) * G2;
  const x0 = xin - (i - t);
  const y0 = yin - (j - t);
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  const ii  = i & 255;
  const jj  = j & 255;
  const gi0 = perm[ii      + perm[jj     ]] % 12;
  const gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
  const gi2 = perm[ii + 1  + perm[jj + 1 ]] % 12;
  const dot = (g, x, y) => g[0] * x + g[1] * y;
  const t0 = 0.5 - x0 * x0 - y0 * y0;
  const n0 = t0 < 0 ? 0 : (t0 * t0) * (t0 * t0) * dot(GRAD2[gi0], x0, y0);
  const t1 = 0.5 - x1 * x1 - y1 * y1;
  const n1 = t1 < 0 ? 0 : (t1 * t1) * (t1 * t1) * dot(GRAD2[gi1], x1, y1);
  const t2 = 0.5 - x2 * x2 - y2 * y2;
  const n2 = t2 < 0 ? 0 : (t2 * t2) * (t2 * t2) * dot(GRAD2[gi2], x2, y2);
  return 70 * (n0 + n1 + n2);
}

// ── fBm — fractional Brownian motion ─────────────────────
function fbm(perm, x, y, harmonics, spread, gain, period) {
  let value = 0, freq = 1 / period, amp = 1, maxAmp = 0;
  for (let i = 0; i < harmonics; i++) {
    value  += simplex2(perm, x * freq, y * freq) * amp;
    maxAmp += amp;
    freq   *= spread;
    amp    *= gain;
  }
  return value / maxAmp; // normalized [-1, 1]
}

// ── Transfer: fBm [-1,1] → brightness [0,1] ──────────────
function transfer(v, amplitude, offset, exponent) {
  v = (v * amplitude + 1) * 0.5 + offset;
  v = Math.max(0, Math.min(1, v));
  return Math.pow(v, exponent);
}

// ── Grain settings (matched from user screenshot) ─────────
const GRAIN = {
  size:      128,   // texture canvas resolution (upscaled by CSS)
  period:    2.3,
  harmonics: 12,
  spread:    3.10,
  gain:      0.53,
  exponent:  1.77,
  amplitude: 2.30,
  offset:    0.330,
};

// Generates a 128×128 simplex fBm bitmap, returns a dataURL
function generateGrainURL(seed) {
  const { size, period, harmonics, spread, gain, exponent, amplitude, offset } = GRAIN;
  const perm   = buildPerm(seed);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const v   = transfer(
        fbm(perm, px / size, py / size, harmonics, spread, gain, period),
        amplitude, offset, exponent
      );
      const b   = (v * 255) | 0;
      const idx = (py * size + px) * 4;
      img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = b;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

export default function CardFrame({ card, index, noTilt = false, editImg = false, onImgChange }) {
  const wrapRef   = useRef(null);
  const frameRef  = useRef(null);
  const nameRef   = useRef(null);
  const holoRef   = useRef(null);
  const sparkRef  = useRef(null);
  const grainRef  = useRef(null);
  const imgDrag   = useRef({ active: false, lastX: 0, lastY: 0 });
  const pinchRef  = useRef({ active: false, lastDist: 0 });

  const isHolo   = HOLO.has(card.rarity);
  const pipCount = PIPS[card.rarity] ?? 1;
  // Seed priority: explicit grainSeed (preview/localStorage) → card id (Supabase) → name fallback
  const seed = card.grainSeed ?? dyeSeed(card.id ?? card.name ?? '');

  // Shrink card name font until it fits — Yu-Gi-Oh style
  useLayoutEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    el.style.fontSize = '';
    const MIN = 7;
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.offsetWidth && size > MIN) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
  }, [card.name]);

  // Generate grain texture after first paint (non-blocking)
  useEffect(() => {
    const el = grainRef.current;
    if (!el) return;
    const id = setTimeout(() => {
      el.style.backgroundImage = `url(${generateGrainURL(seed)})`;
    }, 0);
    return () => clearTimeout(id);
  }, [seed]);

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

    if (holoRef.current) {
      const angle = 110 + (x - 0.5) * 90;
      const shine = `radial-gradient(circle at ${x * 100}% ${y * 100}%,
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
      sparkRef.current.style.backgroundPosition = `${x * 80}% ${y * 80}%`;
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

  /* ── image crop interaction (editImg mode only) ── */
  const onImgPointerDown = (e) => {
    if (!editImg) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    imgDrag.current = { active: true, lastX: e.clientX, lastY: e.clientY };
  };
  const onImgPointerMove = (e) => {
    if (!editImg || !imgDrag.current.active) return;
    e.stopPropagation();
    const dx = e.clientX - imgDrag.current.lastX;
    const dy = e.clientY - imgDrag.current.lastY;
    imgDrag.current.lastX = e.clientX;
    imgDrag.current.lastY = e.clientY;
    onImgChange?.({ dx, dy, ds: 1 });
  };
  const onImgPointerUp = (e) => {
    if (!editImg) return;
    e.stopPropagation();
    imgDrag.current.active = false;
  };
  const onImgWheel = (e) => {
    if (!editImg) return;
    e.preventDefault();
    e.stopPropagation();
    onImgChange?.({ dx: 0, dy: 0, ds: e.deltaY < 0 ? 1.06 : 0.94 });
  };
  const onImgTouchMove = (e) => {
    if (!editImg || e.touches.length < 2) return;
    e.preventDefault();
    const dx = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
    const dy = Math.abs(e.touches[0].clientY - e.touches[1].clientY);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (pinchRef.current.active && pinchRef.current.lastDist > 0) {
      const ds = dist / pinchRef.current.lastDist;
      onImgChange?.({ dx: 0, dy: 0, ds });
    }
    pinchRef.current = { active: true, lastDist: dist };
  };
  const onImgTouchEnd = () => { pinchRef.current = { active: false, lastDist: 0 }; };

  const onMouseMove = (e) => applyTilt(e.clientX, e.clientY);

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

        {/* ── Simplex fBm grain texture (unique seed per card name) ── */}
        <div className="card-grain-layer" ref={grainRef} aria-hidden="true" />

        {/* ── holographic layers (rare / legendary / secret only) ── */}
        {isHolo && <div className="holo-shimmer" />}
        {isHolo && <div className="holo-overlay"  ref={holoRef}  />}
        {isHolo && <div className="sparkle-overlay" ref={sparkRef} />}

        <div className="card-rarity-stamp" />

        <div className="card-header">
          <div className="card-name" ref={nameRef}>{card.name}</div>
          <div className="card-hp">{HP_MAP[card.rarity]}</div>
        </div>

        <div
          className={`card-img-wrap${editImg ? ' card-img-edit' : ''}`}
          onPointerDown={editImg ? onImgPointerDown : undefined}
          onPointerMove={editImg ? onImgPointerMove : undefined}
          onPointerUp={editImg ? onImgPointerUp : undefined}
          onWheel={editImg ? onImgWheel : undefined}
          onTouchMove={editImg ? onImgTouchMove : undefined}
          onTouchEnd={editImg ? onImgTouchEnd : undefined}
        >
          {card.photo
            ? <img
                src={card.photo}
                alt={card.name}
                style={{
                  transform: `translate(${card.imgX ?? 0}px, ${card.imgY ?? 0}px) scale(${card.imgScale ?? 1})`,
                  transformOrigin: 'center center',
                  userSelect: 'none',
                  touchAction: editImg ? 'none' : undefined,
                }}
                draggable={false}
                onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
              />
            : null}
          <div className="card-img-placeholder" style={card.photo ? { display: 'none' } : {}}>👤</div>
          {editImg && card.photo && (
            <div className="card-img-edit-hint">✋ drag · scroll to zoom</div>
          )}
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
