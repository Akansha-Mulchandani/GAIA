"use client"
 
const urls = [
  // Forests, leaves, pollinators, macro flora – all unique
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1465101162946-4377e57745c3?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1469478712689-33e4f3cf0a42?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470115636492-6d2b56f9146e?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500534311229-1f7a3b2b3a31?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1502082552872-9b69d3b1c9ad?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1200&auto=format&fit=crop'
]

export default function SpeciesMosaic({ offset = 0, images }: { offset?: number, images?: string[] }) {
  const pool = urls
  const strip = images && images.length === 6
    ? images
    : Array.from({ length: 6 }).map((_, i) => pool[(offset + i) % pool.length])
  const safe = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop'
  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      <div className="flex gap-3 h-24">
        {strip.map((u, i) => (
          <div key={i} className="relative h-full flex-1 min-w-0 rounded-lg overflow-hidden">
            <img src={u} alt="biodiversity" className="absolute inset-0 h-full w-full object-cover" onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).src = pool[(offset + i + 9) % pool.length] || safe
            }} />
            <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/0" />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute -z-10 -inset-6 hero-aura aura-emerald" />
      <div className="pointer-events-none absolute -z-10 -inset-6 hero-aura aura-blue" />
    </div>
  )
}
