import { useRef, useLayoutEffect } from 'react';

export default function BipolarSlider({ value, onChange }) {
  const trackRef = useRef(null);
  const barRef = useRef(null);
  const thumbRef = useRef(null);

  useLayoutEffect(() => {
    paint();
  });

  function paint() {
    const track = trackRef.current;
    const bar = barRef.current;
    const thumb = thumbRef.current;
    if (!track || !bar || !thumb) return;

    const W = track.clientWidth || 160;
    const pct = (value + 999) / 1998;
    const px = pct * W;
    const mid = W / 2;
    const neg = value < 0;

    if (neg) {
      bar.style.left = px + 'px';
      bar.style.width = mid - px + 'px';
      bar.style.background = '#2563eb';
    } else {
      bar.style.left = mid + 'px';
      bar.style.width = px - mid + 'px';
      bar.style.background = '#ff3b3b';
    }
    thumb.style.left = px + 'px';
    thumb.style.background = neg ? '#2563eb' : '#ff3b3b';
  }

  return (
    <div className="bipolar-wrap">
      <div className="bipolar-track" ref={trackRef}>
        <div className="bipolar-bar" ref={barRef} />
        <div className="bipolar-center-line" />
        <div className="bipolar-thumb" ref={thumbRef} />
        <input
          type="range"
          className="bipolar-input"
          min="-999"
          max="999"
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
        />
      </div>
    </div>
  );
}
