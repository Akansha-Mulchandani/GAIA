export default function HeroIllustration() {
  return (
    <svg aria-hidden viewBox="0 0 600 320" className="hidden md:block w-[360px] h-[220px] lg:w-[480px] lg:h-[280px] drop-shadow-[0_20px_60px_rgba(16,185,129,0.25)]">
      <defs>
        <linearGradient id="canopy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10B981"/>
          <stop offset="100%" stopColor="#0EA5E9"/>
        </linearGradient>
      </defs>
      {/* horizon */}
      <rect x="0" y="200" width="600" height="120" fill="rgba(14,165,233,0.15)" />
      {/* mountains */}
      <path d="M0 220 L70 170 L140 210 L220 160 L300 210 L380 170 L460 210 L520 180 L600 220 L600 320 L0 320 Z" fill="rgba(16,185,129,0.18)" />
      {/* canopy blobs */}
      <circle cx="140" cy="140" r="52" fill="url(#canopy)" opacity="0.7" />
      <circle cx="210" cy="150" r="44" fill="url(#canopy)" opacity="0.5" />
      <circle cx="260" cy="130" r="56" fill="url(#canopy)" opacity="0.6" />
      <circle cx="320" cy="150" r="48" fill="url(#canopy)" opacity="0.55" />
      <circle cx="380" cy="130" r="54" fill="url(#canopy)" opacity="0.6" />
      {/* fauna silhouettes */}
      <path d="M500 120 q20 -20 40 0 q-20 10 -40 0 Z" fill="#d1fae5" opacity="0.35" />
      <path d="M470 180 q10 -8 20 0 q-10 5 -20 0 Z" fill="#bfdbfe" opacity="0.4" />
      {/* water ripples */}
      <ellipse cx="420" cy="230" rx="80" ry="10" fill="rgba(14,165,233,0.25)" />
      <ellipse cx="420" cy="230" rx="60" ry="7" fill="rgba(14,165,233,0.25)" />
    </svg>
  )
}
