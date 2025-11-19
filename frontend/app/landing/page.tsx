"use client"
import Link from 'next/link'
import BiodiversityLogo from '../components/BiodiversityLogo'
import { fetchWithRetry } from '../lib/fetcher'
import { useState } from 'react'

export default function LandingPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSending(true)
      const r = await fetchWithRetry('/contact', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, email, message }) }, 0, 12000)
      await r.json()
      setName(''); setEmail(''); setMessage('')
      alert('Thanks! We will get back to you shortly.')
    } catch (err:any) {
      alert('Failed to send. Please try again later.')
    } finally { setSending(false) }
  }
  return (
    <div className="mx-auto max-w-6xl py-10 space-y-12">
      {/* Hero */}
      <section className="text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald/10 text-emerald text-xs uppercase tracking-wide">Planetary Biodiversity Intelligence</div>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
          Build a living model of Earth's biodiversity
        </h1>
        <p className="text-slate-300 max-w-3xl mx-auto">
          Detect species, track populations, predict ecosystem collapse, and test interventions. GAIA blends edge sensing, AI discovery, and digital twins into one coherent console.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="px-5 py-3 rounded bg-deepblue text-white hover:opacity-90 transition-opacity">Get started</Link>
          <Link href="/collapse-prediction" className="px-5 py-3 rounded glass hover:opacity-90 transition-opacity">See risk monitor</Link>
        </div>
      </section>

      {/* Value props */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-6 rounded-lg">
          <div className="text-sm text-slate-400">One-liner</div>
          <div className="mt-1 text-lg font-semibold">From raw signals to actionable ecology</div>
          <p className="mt-2 text-slate-300 text-sm">Turn satellite, drone, and camera trap data into species detections, trends, and intervention guidance—without moving heavy media.</p>
        </div>
        <div className="glass p-6 rounded-lg">
          <div className="text-sm text-slate-400">Why now</div>
          <div className="mt-1 text-lg font-semibold">Early warnings at planetary scale</div>
          <p className="mt-2 text-slate-300 text-sm">Petabyte-friendly pipelines and edge AI reveal tipping points before collapse, enabling faster conservation response.</p>
        </div>
        <div className="glass p-6 rounded-lg">
          <div className="text-sm text-slate-400">Impact</div>
          <div className="mt-1 text-lg font-semibold">Guide interventions with confidence</div>
          <p className="mt-2 text-slate-300 text-sm">Simulate outcomes in a digital twin to de-risk field actions and communicate trade-offs to stakeholders.</p>
        </div>
      </section>

      {/* Features */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard title="Species Discovery" color="emerald" desc="Unsupervised clustering highlights species and anomalies with instant thumbnails." href="/species-discovery"/>
          <FeatureCard title="Collapse Prediction" color="amber" desc="Early warnings and tipping points from signals like variance and autocorrelation." href="/collapse-prediction"/>
          <FeatureCard title="Digital Twin" color="cyan" desc="A sandbox world to test interventions and measure biodiversity impact." href="/digital-twin"/>
          <FeatureCard title="Intervention Simulator" color="purple" desc="Run what-if actions and compare scenarios with A/B panels." href="/intervention-simulator"/>
          <FeatureCard title="Edge Network" color="blue" desc="See node health, throughput, and detections across your edge fleet." href="/edge-network"/>
          <FeatureCard title="Spatial Map" color="rose" desc="Visualize sensors and detections; switch to local dataset demo." href="/map"/>
        </div>
      </section>

      {/* Tech stack */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Tech stack</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass p-6 rounded-lg">
            <ul className="text-sm text-slate-300 space-y-2 list-disc pl-5">
              <li><b>Frontend:</b> Next.js (App Router), React, Tailwind</li>
              <li><b>Backend:</b> FastAPI, Python 3.10</li>
              <li><b>Data:</b> Postgres + pgvector, Redis</li>
              <li><b>Realtime:</b> Socket.IO</li>
              <li><b>Infra:</b> Docker Compose</li>
            </ul>
          </div>
          <div className="glass p-6 rounded-lg">
            <ul className="text-sm text-slate-300 space-y-2 list-disc pl-5">
              <li><b>Computer vision:</b> Embeddings and clustering for species discovery</li>
              <li><b>Time series:</b> Variance, autocorrelation, and tipping-point heuristics</li>
              <li><b>Twin & sim:</b> Lightweight agent-based world for quick scenario testing</li>
              <li><b>Edge-first:</b> Local processing, cloud-scale summaries</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Contact</h2>
        <div className="glass p-6 rounded-lg">
          <p className="text-sm text-slate-300">Have a conservation use case or want to pilot GAIA? Reach out.</p>
          <form onSubmit={submit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-400">Name</div>
              <input value={name} onChange={e=>setName(e.target.value)} required className="mt-1 w-full bg-black/30 rounded px-3 py-2 outline-none" placeholder="Your name" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Email</div>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="mt-1 w-full bg-black/30 rounded px-3 py-2 outline-none" placeholder="you@example.com" />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-slate-400">Message</div>
              <textarea value={message} onChange={e=>setMessage(e.target.value)} required className="mt-1 w-full bg-black/30 rounded px-3 py-2 outline-none h-28" placeholder="Tell us about your project" />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <button disabled={sending} type="submit" className={`px-4 py-2 rounded bg-emerald text-white ${sending?'opacity-60':''}`}>{sending? 'Sending...':'Send message'}</button>
              <Link href="/" className="px-4 py-2 rounded bg-deepblue text-white hover:opacity-90">Get started</Link>
              <a href="https://www.linkedin.com/" target="_blank" className="px-4 py-2 rounded glass hover:opacity-90">LinkedIn</a>
            </div>
          </form>
        </div>
      </section>

      <footer className="text-center text-xs text-slate-500 py-6">© {new Date().getFullYear()} GAIA • All rights reserved</footer>
    </div>
  )
}

function FeatureCard({ title, desc, href, color = 'emerald' }: { title:string; desc:string; href:string; color?: 'emerald'|'amber'|'cyan'|'purple'|'blue'|'rose' }) {
  return (
    <Link href={href} className="no-underline">
      <div className={`relative glass p-5 rounded-lg h-full transition-all hover:shadow-xl group overflow-hidden`}>
        <div className={`pointer-events-none absolute -inset-1 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-300 ${
          color==='emerald'?'bg-emerald/20':
          color==='amber'?'bg-amber/20':
          color==='cyan'?'bg-cyan-400/20':
          color==='purple'?'bg-purple-400/20':
          color==='blue'?'bg-blue-400/20':
          'bg-rose/20'
        }`} />
        <div className="relative">
          <div className="font-semibold">{title}</div>
          <div className="mt-1 text-sm text-slate-300">{desc}</div>
          <div className={`mt-3 text-xs ${
            color==='emerald'?'text-emerald':
            color==='amber'?'text-amber':
            color==='cyan'?'text-cyan-300':
            color==='purple'?'text-purple-300':
            color==='blue'?'text-blue-300':
            'text-rose-300'
          }`}>Open →</div>
        </div>
      </div>
    </Link>
  )
}
