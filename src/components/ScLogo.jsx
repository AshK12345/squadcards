/**
 * Spray-painted "SC" logo — used on card backs and in the nav.
 * Each instance needs a unique idPrefix so SVG filter/gradient IDs
 * don't conflict when multiple copies share the same document.
 */
export default function ScLogo({ idPrefix = 'sc', className = 'pof-sc-logo' }) {
  const fSpray  = `${idPrefix}-f-spray`;
  const fRough  = `${idPrefix}-f-rough`;
  const gRed    = `${idPrefix}-g-red`;
  const gGlow   = `${idPrefix}-g-glow`;
  const gRadial = `${idPrefix}-g-radial`;

  return (
    <svg
      className={className}
      viewBox="0 0 230 328"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Spray stipple — punches irregular holes in the fill */}
        <filter id={fSpray} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.70 0.60" numOctaves="4" seed="9" result="noise"/>
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 20 -9"
            in="noise" result="stipple"
          />
          <feComposite in="SourceGraphic" in2="stipple" operator="in"/>
        </filter>

        {/* Rough edge — displaces contour so edges look ragged */}
        <filter id={fRough} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="turbulence" baseFrequency="0.04 0.07" numOctaves="3" seed="5" result="warp"/>
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="11"
            xChannelSelector="R" yChannelSelector="G"/>
        </filter>

        {/* Hot orange → red → deep red */}
        <linearGradient id={gRed} x1="0.2" y1="0.05" x2="0.85" y2="0.95">
          <stop offset="0%"   stopColor="#ff7040"/>
          <stop offset="35%"  stopColor="#ff3b3b"/>
          <stop offset="100%" stopColor="#8b0000"/>
        </linearGradient>

        {/* White gloss — alpha fades top to bottom */}
        <linearGradient id={gGlow} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.60"/>
          <stop offset="50%"  stopColor="#ffffff" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>

        {/* Subtle halo behind the letters */}
        <radialGradient id={gRadial} cx="50%" cy="48%" r="42%">
          <stop offset="0%"   stopColor="#ff3b3b" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#ff3b3b" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* Glow halo */}
      <ellipse cx="115" cy="186" rx="90" ry="110" fill={`url(#${gRadial})`}/>

      {/* Layer 1 — ink bleed / stencil shadow */}
      <text
        x="121" y="193"
        fontFamily="Nerko One, cursive" fontSize="174"
        textAnchor="middle" dominantBaseline="central"
        fill="rgba(0,0,0,0.70)"
        filter={`url(#${fRough})`}
      >SC</text>

      {/* Layer 2 — main stippled spray fill */}
      <text
        x="115" y="187"
        fontFamily="Nerko One, cursive" fontSize="174"
        textAnchor="middle" dominantBaseline="central"
        fill={`url(#${gRed})`}
        filter={`url(#${fSpray})`}
      >SC</text>

      {/* Layer 3 — rough overspray for edge density */}
      <text
        x="115" y="187"
        fontFamily="Nerko One, cursive" fontSize="174"
        textAnchor="middle" dominantBaseline="central"
        fill={`url(#${gRed})`}
        filter={`url(#${fRough})`}
        opacity="0.55"
      >SC</text>

      {/* Layer 4 — alpha gloss highlight */}
      <text
        x="115" y="187"
        fontFamily="Nerko One, cursive" fontSize="174"
        textAnchor="middle" dominantBaseline="central"
        fill={`url(#${gGlow})`}
        opacity="0.80"
      >SC</text>
    </svg>
  );
}
