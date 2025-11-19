"use client"
import Link from 'next/link'
import { MouseEvent, ReactNode, useRef } from 'react'

export default function FeatureCard({ href, icon, title, desc, glowColor = '#34D399', className = '' }: { href: string, icon: ReactNode, title: string, desc: string, glowColor?: string, className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const onDown = (e: MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    el.style.setProperty('--x', x + 'px')
    el.style.setProperty('--y', y + 'px')
    const span = document.createElement('span')
    span.className = 'ripple'
    span.style.left = x + 'px'
    span.style.top = y + 'px'
    el.appendChild(span)
    setTimeout(() => { span.remove() }, 600)
  }

  return (
    <Link href={href} className="block">
      <div
        ref={ref}
        onMouseDown={onDown}
        className={`relative overflow-hidden glass p-4 hover:opacity-95 transition ripple-container feature-card float-card ${className}`}
        style={{ ['--glow' as any]: glowColor }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <div className="font-semibold">{title}</div>
        </div>
        <p className="mt-1 text-sm text-slate-300">{desc}</p>
        <div className="mt-3 text-xs opacity-90">Open feature →</div>
      </div>
    </Link>
  )
}
