"use client"
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { fetchWithRetry } from '../lib/fetcher'
import { useRouter } from 'next/navigation'

type Metrics = { count_A:number; count_B:number; biodiversity:number; risk:number }

type TwinState = {
  step: number
  env: { temp:number; rain:number; poaching:number }
  metrics: Metrics
  agents: { x:number; y:number; s:'A'|'B' }[]
  grid: { w:number; h:number }
} | null

type Snapshot = { id:number; name:string; saved_at:string; step:number; env:{temp:number;rain:number;poaching:number}; metrics: Metrics }

export default function DigitalTwinPage() {
  const [state, setState] = useState<TwinState>(null)
  const [playing, setPlaying] = useState(false)
  const [temp, setTemp] = useState(0)
  const [rain, setRain] = useState(0.5)
  const [poach, setPoach] = useState(0)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [snapName, setSnapName] = useState('Snapshot')
  const rafRef = useRef<number | null>(null)
  const lastStepRef = useRef<number>(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const router = useRouter()

  const api = async (path:string, init?: RequestInit) => {
    const r = await fetchWithRetry(path, init, 0, 12000)
    const j = await r.json()
    if (!j?.success) throw new Error(j?.error?.message || 'Request failed')
    return j
  }

  const create = async () => {
    try {
      const j = await api('/twin/create', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ temp: 0, rain: 0.5, poaching: 0 }) })
      setState(j.data.state)
      setTemp(0); setRain(0.5); setPoach(0)
      toast.success('Twin created')
      await refreshSnapshots()
    } catch (e:any) { toast.error('Create failed', { description: String(e) }) }
  }

  const refreshState = async () => {
    try { const j = await api('/twin/state'); setState(j.data) } catch {}
  }

  const applyEnv = async (t:number, r:number, p:number) => {
    try { const j = await api('/twin/apply', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ temp:t, rain:r, poaching:p }) }); setState(j.data) } catch {}
  }

  const step = async (n=1) => {
    try {
      const j = await api('/twin/step', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ steps:n }) })
      setState(j.data)
    } catch {}
  }

  const saveSnapshot = async () => {
    try { await api('/twin/snapshot', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ name: snapName || 'Snapshot' }) }); toast.success('Snapshot saved'); await refreshSnapshots() } catch (e:any) { toast.error('Snapshot failed', { description: String(e) }) }
  }

  const runInterventionOnThisTwin = async () => {
    try {
      const r = await fetchWithRetry('/twin/snapshot', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ name: snapName || 'Snapshot' }) }, 0, 12000)
      const j = await r.json()
      let id: number | null = j?.data?.id ?? null
      if (!id) {
        try {
          const list = await fetchWithRetry('/twin/snapshots', {}, 0, 12000)
          const lj = await list.json()
          const items: Snapshot[] = lj?.data || []
          if (items.length) {
            items.sort((a,b)=> new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime())
            id = items[0].id
          }
        } catch {}
      }
      if (id) {
        router.push(`/intervention-simulator?from_twin=${id}`)
      } else {
        toast.error('Could not locate snapshot ID for handoff')
      }
    } catch (e:any) {
      toast.error('Handoff failed', { description: String(e) })
    }
  }

  const refreshSnapshots = async () => {
    try { const j = await api('/twin/snapshots'); setSnapshots(j.data || []) } catch {}
  }

  // animation loop
  useEffect(() => {
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; return }
    const loop = async () => {
      if (!lastStepRef.current) lastStepRef.current = Date.now()
      const now = Date.now()
      if (now - lastStepRef.current > 180) { // ~5-6 fps to stay light
        await step(1)
        lastStepRef.current = now
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [playing])

  // draw
  useEffect(() => {
    if (!state || !canvasRef.current) return
    const c = canvasRef.current
    const ctx = c.getContext('2d')!
    const W = c.width, H = c.height
    ctx.clearRect(0,0,W,H)
    // grid scale
    const sx = W / (state.grid.w)
    const sy = H / (state.grid.h)
    // draw agents
    for (const a of state.agents) {
      ctx.fillStyle = a.s === 'A' ? '#34d399' : '#60a5fa'
      const x = (a.x + 0.5) * sx
      const y = (a.y + 0.5) * sy
      ctx.beginPath(); ctx.arc(x, y, Math.max(2, Math.min(sx, sy)/3), 0, Math.PI*2); ctx.fill()
    }
    // overlay metrics
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(8,8,210,52)
    ctx.fillStyle = '#e5e7eb'
    ctx.font = '12px ui-sans-serif, system-ui'
    ctx.fillText(`Step ${state.step}`, 16, 24)
    ctx.fillText(`A ${state.metrics.count_A}  B ${state.metrics.count_B}`, 16, 38)
    ctx.fillText(`Biodiv ${state.metrics.biodiversity.toFixed(2)}  Risk ${state.metrics.risk.toFixed(2)}`, 16, 52)
  }, [state])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Digital Twin</h1>
      <p className="text-sm text-slate-300">Minimal agent-based ecosystem. Adjust environment and apply interventions, step the world, and save snapshots.</p>

      <div className="glass p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="font-medium">Controls</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <button className="px-3 py-1.5 glass" onClick={create}>Create</button>
            <button className="px-3 py-1.5 glass" onClick={()=>setPlaying(p=>!p)}>{playing? 'Pause':'Play'}</button>
            <button className="px-3 py-1.5 glass" onClick={()=>step(1)}>Step</button>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <label className="block">Temperature <span className="text-slate-400">{temp.toFixed(2)}</span>
              <input type="range" min={-1} max={1} step={0.05} value={temp} onChange={e=>{ const v=parseFloat(e.target.value); setTemp(v); applyEnv(v, rain, poach) }} className="w-full" />
            </label>
            <label className="block">Rainfall <span className="text-slate-400">{rain.toFixed(2)}</span>
              <input type="range" min={0} max={1} step={0.05} value={rain} onChange={e=>{ const v=parseFloat(e.target.value); setRain(v); applyEnv(temp, v, poach) }} className="w-full" />
            </label>
            <label className="block">Poaching <span className="text-slate-400">{poach.toFixed(2)}</span>
              <input type="range" min={0} max={1} step={0.05} value={poach} onChange={e=>{ const v=parseFloat(e.target.value); setPoach(v); applyEnv(temp, rain, v) }} className="w-full" />
            </label>
          </div>
          <div className="mt-3 text-xs text-slate-400">Env now • Temp {state ? state.env.temp.toFixed(2) : '-'} • Rain {state ? state.env.rain.toFixed(2) : '-'} • Poach {state ? state.env.poaching.toFixed(2) : '-'}</div>
        </div>
        <div className="md:col-span-2">
          <canvas ref={canvasRef} width={640} height={384} className="w-full rounded bg-black/30" />
          <div className="mt-2 text-xs text-slate-400">
            <span className="underline decoration-dotted" title="Biodiversity index: higher ≈ richer and more even species distribution (0–1).">Biodiv</span> shows ecosystem diversity; <span className="underline decoration-dotted" title="Collapse risk proxy: higher ≈ more unstable under current pressures (0–1).">Risk</span> is a collapse‑risk proxy.
          </div>
        </div>
      </div>

      <div className="glass p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <div className="text-xs text-slate-400">Snapshot name</div>
            <input value={snapName} onChange={e=>setSnapName(e.target.value)} className="mt-1 bg-slate-900/40 border border-slate-700 rounded px-2 py-1 text-sm" />
          </div>
          <button className="px-3 py-2 bg-emerald text-white rounded" onClick={saveSnapshot}>Save snapshot</button>
          <button className="px-3 py-2 glass" onClick={refreshSnapshots}>Refresh list</button>
          <button className="px-3 py-2 bg-deepblue text-white rounded" onClick={runInterventionOnThisTwin}>Run intervention on this Twin</button>
          <div className="text-xs text-slate-400">Count {snapshots.length}</div>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          {snapshots.slice(0,6).map(s => (
            <div key={s.id} className="glass p-3">
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-slate-400">{new Date(s.saved_at).toLocaleString()}</div>
              <div className="mt-1">Step {s.step} • Bio {s.metrics.biodiversity.toFixed(2)} • Risk {s.metrics.risk.toFixed(2)}</div>
              <div className="text-xs text-slate-400 mt-1">Env • Temp {s.env.temp.toFixed(2)} • Rain {s.env.rain.toFixed(2)} • Poach {s.env.poaching.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
