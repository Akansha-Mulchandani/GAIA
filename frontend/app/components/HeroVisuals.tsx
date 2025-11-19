export default function HeroVisuals() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Animated gradient auras */}
      <div className="hero-aura aura-emerald" />
      <div className="hero-aura aura-blue" />

      {/* Fauna silhouettes */}
      <svg className="absolute right-8 top-10 opacity-30" width="160" height="120" viewBox="0 0 220 160" fill="none" aria-hidden>
        <path d="M110 10 C140 40, 180 20, 200 50 C170 60, 190 100, 150 110 C130 90, 90 120, 70 100 C60 80, 80 60, 110 10 Z" stroke="#34D399" strokeWidth="2" fill="none" />
        <circle cx="150" cy="60" r="6" fill="#34D399" />
      </svg>
      <svg className="absolute left-8 bottom-6 opacity-25" width="200" height="140" viewBox="0 0 200 140" fill="none" aria-hidden>
        <path d="M20 100 C40 60, 80 40, 120 60 C150 70, 160 110, 140 120 C110 130, 70 120, 20 100 Z" stroke="#60A5FA" strokeWidth="2" fill="none" />
      </svg>

      {/* Particle field */}
      <div className="particles">
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} style={{ ['--i' as any]: i }} />
        ))}
      </div>
    </div>
  )
}
