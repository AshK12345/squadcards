import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Card image area: 214px wide × 128px tall (8px margin each side inside 230px card)
const CARD_IMG_W = 214;
const CARD_IMG_H = 128;
const CARD_RATIO  = CARD_IMG_H / CARD_IMG_W;   // ≈ 0.5981

// Display frame inside the modal
const FRAME_W = 280;
const FRAME_H = Math.round(FRAME_W * CARD_RATIO);  // 167
const OUTER_W = 320;
const OUTER_H = FRAME_H + 100;                      // 80px padding top+bottom

const FRAME_X = (OUTER_W - FRAME_W) / 2;
const FRAME_Y = (OUTER_H - FRAME_H) / 2;

// Canvas output (2× frame for quality)
const OUT_SCALE = 2;
const OUT_W = FRAME_W * OUT_SCALE;
const OUT_H = FRAME_H * OUT_SCALE;

export default function ImageCropModal({ src, onSave, onCancel }) {
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [zoom, setZoom]       = useState(1);
  const [rotation, setRotation] = useState(0);   // multiples of 90
  const [flipH, setFlipH]     = useState(false);
  const [flipV, setFlipV]     = useState(false);
  const [baseScale, setBaseScale] = useState(1);

  const imgRef  = useRef(null);
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 });
  const pinchRef = useRef({ active: false, lastDist: 0 });

  const effectiveScale = baseScale * zoom;
  const sx = effectiveScale * (flipH ? -1 : 1);
  const sy = effectiveScale * (flipV ? -1 : 1);

  const imgTransform = [
    `translate(${offsetX}px, ${offsetY}px)`,
    `rotate(${rotation}deg)`,
    `scale(${sx}, ${sy})`,
  ].join(' ');

  // Compute baseScale when image loads so it covers the frame
  const onImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const bs = Math.max(FRAME_W / img.naturalWidth, FRAME_H / img.naturalHeight);
    setBaseScale(bs);
  }, []);

  // ── pointer (mouse + stylus + touch-as-pointer) ──
  const onPointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    setOffsetX(x => x + dx);
    setOffsetY(y => y + dy);
  };
  const onPointerUp = () => { dragRef.current.active = false; };

  // Two-finger pinch zoom
  const onTouchMove = (e) => {
    if (e.touches.length < 2) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    if (pinchRef.current.active && pinchRef.current.lastDist > 0) {
      const ds = dist / pinchRef.current.lastDist;
      setZoom(z => Math.max(0.2, Math.min(6, z * ds)));
    }
    pinchRef.current = { active: true, lastDist: dist };
  };
  const onTouchEnd = () => { pinchRef.current = { active: false, lastDist: 0 }; };

  // Scroll-wheel zoom on desktop
  const onWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.2, Math.min(6, z * (e.deltaY < 0 ? 1.07 : 0.93))));
  };

  // ── controls ──
  const rotateCW  = () => setRotation(r => (r + 90) % 360);
  const rotateCCW = () => setRotation(r => (r - 90 + 360) % 360);
  const zoomIn    = () => setZoom(z => Math.min(6, z * 1.2));
  const zoomOut   = () => setZoom(z => Math.max(0.2, z / 1.2));

  // ── bake to canvas ──
  const handleSave = () => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    canvas.width  = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext('2d');

    ctx.save();
    // Move origin to canvas center (= display frame center)
    ctx.translate(OUT_W / 2, OUT_H / 2);
    // Scale from display-frame units to canvas pixels
    ctx.scale(OUT_SCALE, OUT_SCALE);
    // Replicate the same transforms applied in CSS (relative to frame center)
    ctx.translate(offsetX, offsetY);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(
      effectiveScale * (flipH ? -1 : 1),
      effectiveScale * (flipV ? -1 : 1),
    );
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    try {
      onSave(canvas.toDataURL('image/jpeg', 0.92));
    } catch {
      // CORS-tainted canvas (remote URL) — close without saving
      onCancel();
    }
  };

  // SVG mask IDs — static, only one modal at a time
  return createPortal(
    <div className="crop-backdrop" onPointerDown={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="crop-modal">
        <h3 className="crop-title">Adjust Photo</h3>

        {/* ── Crop area ── */}
        <div
          className="crop-outer"
          style={{ width: OUTER_W, height: OUTER_H }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onWheel={onWheel}
        >
          {/* Image — centered in crop-outer, transforms applied */}
          <img
            ref={imgRef}
            src={src}
            onLoad={onImgLoad}
            crossOrigin="anonymous"
            draggable={false}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) ${imgTransform}`,
              transformOrigin: 'center center',
              maxWidth: 'none',
              userSelect: 'none',
              pointerEvents: 'none',
              touchAction: 'none',
            }}
            alt=""
          />

          {/* Dark overlay outside frame (SVG mask) */}
          <svg
            style={{ position: 'absolute', inset: 0, width: OUTER_W, height: OUTER_H, pointerEvents: 'none' }}
            aria-hidden="true"
          >
            <defs>
              <mask id="icm-mask">
                <rect width={OUTER_W} height={OUTER_H} fill="white" />
                <rect x={FRAME_X} y={FRAME_Y} width={FRAME_W} height={FRAME_H} fill="black" rx="4" />
              </mask>
            </defs>
            <rect width={OUTER_W} height={OUTER_H} fill="rgba(0,0,0,0.58)" mask="url(#icm-mask)" />
            {/* Frame border */}
            <rect x={FRAME_X} y={FRAME_Y} width={FRAME_W} height={FRAME_H}
              fill="none" stroke="white" strokeWidth="2" rx="4" />
            {/* Corner handles */}
            {[
              [FRAME_X,           FRAME_Y          ],
              [FRAME_X + FRAME_W, FRAME_Y          ],
              [FRAME_X,           FRAME_Y + FRAME_H],
              [FRAME_X + FRAME_W, FRAME_Y + FRAME_H],
            ].map(([cx, cy], i) => (
              <g key={i} transform={`translate(${cx},${cy})`}>
                <rect x={-8} y={-8} width={16} height={16} fill="none" />
                <rect x={cx > OUTER_W/2 ? -12 : 0} y={-2} width={12} height={4} fill="white" rx="2" />
                <rect x={-2} y={cy > OUTER_H/2 ? -12 : 0} width={4} height={12} fill="white" rx="2" />
              </g>
            ))}
          </svg>

          {/* Hint */}
          <div className="crop-hint">drag to pan · pinch/scroll to zoom</div>
        </div>

        {/* ── Controls ── */}
        <div className="crop-controls">
          <button className="crop-btn" onClick={rotateCCW} title="Rotate left"  type="button">↺</button>
          <button className="crop-btn" onClick={rotateCW}  title="Rotate right" type="button">↻</button>
          <button className="crop-btn" onClick={() => setFlipH(f => !f)} title="Flip horizontal" type="button" style={flipH ? {background:'#ff3b3b',color:'#fff'} : {}}>↔</button>
          <button className="crop-btn" onClick={() => setFlipV(f => !f)} title="Flip vertical"   type="button" style={flipV ? {background:'#ff3b3b',color:'#fff'} : {}}>↕</button>
          <button className="crop-btn" onClick={zoomIn}  title="Zoom in"  type="button">＋</button>
          <button className="crop-btn" onClick={zoomOut} title="Zoom out" type="button">－</button>
        </div>

        {/* ── Actions ── */}
        <div className="crop-actions">
          <button className="btn btn-secondary" onClick={onCancel} type="button">Cancel</button>
          <button className="btn btn-primary"   onClick={handleSave} type="button">Done ✓</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
