export default function BiodiversityLogo({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-label="GAIA logo">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10B981"/>
          <stop offset="100%" stopColor="#06B6D4"/>
        </linearGradient>
      </defs>
      <path d="M32 6 C18 18, 14 28, 14 36 C14 46, 21 54, 32 54 C43 54, 50 46, 50 36 C50 28, 46 18, 32 6 Z" fill="url(#g1)"/>
      <path d="M22 36 C28 34, 36 30, 44 24" stroke="white" strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="28" cy="32" r="2" fill="#fff"/>
    </svg>
  )
}
