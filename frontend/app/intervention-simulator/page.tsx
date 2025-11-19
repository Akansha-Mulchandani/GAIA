"use client"
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { fetchWithRetry } from '../lib/fetcher'
 import { socket } from '../../lib/socket'
import Link from 'next/link'

type Results = {
  population_change_percent: number
  risk_change_percent: number
  biodiversity_index: number
  trajectories: { species:string; before:number; after:number }[]
} | null

export default function InterventionSimulatorPage() {
  const [fromTwin, setFromTwin] = useState<string | null>(null)
  const [simulationId, setSimulationId] = useState<number | null>(null)
  const [status, setStatus] = useState<string>('idle')
  const [phase, setPhase] = useState<string>('idle')
  const [progress, setProgress] = useState<number>(0)
  const [results, setResults] = useState<Results>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intensity, setIntensity] = useState<number>(0.5)
  const [action, setAction] = useState<string>('habitat-restoration')
  const [speciesLimit, setSpeciesLimit] = useState<number>(8)
  const [sampling, setSampling] = useState<string>('random')
  const [customMode, setCustomMode] = useState<boolean>(false)
  const [customSpecies, setCustomSpecies] = useState<string>('')
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  // scenarios state (additive)
  const [saving, setSaving] = useState(false)
  const [scenarios, setScenarios] = useState<any[]>([])
  const [scenarioName, setScenarioName] = useState<string>('Scenario')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pickA, setPickA] = useState<number | null>(null)
  const [pickB, setPickB] = useState<number | null>(null)

  useEffect(() => {
    try {
      const u = new URL(window.location.href)
      setFromTwin(u.searchParams.get('from_twin'))
    } catch {}
  }, [])

  const create = async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetchWithRetry('/simulation/create', { method: 'POST' })
      const j = await r.json()
      const newId = j?.data?.simulation_id
      if (!newId) throw new Error('Create simulation: invalid response')
      setSimulationId(newId)
      setStatus('created')
      setPhase('idle')
      setProgress(0)
      setResults(null)
      toast.success('Simulation created', { description: `ID ${newId}` })
    } catch (e:any) { setError(String(e)) } finally { setLoading(false) }

  }

  const saveScenario = async () => {
    if (!simulationId || !results) { toast.error('Run a simulation first'); return }
    try {
      setSaving(true)
      const r = await fetchWithRetry(`/simulation/scenarios?simulation_id=${simulationId}&name=${encodeURIComponent(scenarioName||'Scenario')}`, { method: 'POST' }, 0, 12000)
      const j = await r.json()
      if (!j?.success) throw new Error(j?.error?.message || 'Save failed')
      toast.success('Scenario saved', { description: j?.data?.name })
      await refreshScenarios()
    } catch (e:any) { toast.error('Failed to save scenario', { description: String(e) }) } finally { setSaving(false) }
  }

  const refreshScenarios = async () => {
    try {
      const r = await fetchWithRetry('/simulation/scenarios', {}, 0, 10000)
      const j = await r.json()
      const items = Array.isArray(j?.data) ? j.data.map((s:any)=> ({ ...s, id: Number(s.id) })) : []
      setScenarios(items)
    } catch {}
  }

  useEffect(() => { refreshScenarios() }, [])

function ComparePanel({ a, b }: { a: any; b: any }) {
  if (!a || !b) return null
  const ar = a.results || {}
  const br = b.results || {}
  const fmt = (v:any) => typeof v === 'number' ? v.toFixed(2) : v
  const delta = (x:number, y:number) => (x!==undefined && y!==undefined) ? (x - y) : 0
  const sign = (v:number) => v>0? '+':''
  // Build quick species impact map by name
  const at = (ar.trajectories||[]) as {species:string; before:number; after:number}[]
  const bt = (br.trajectories||[]) as {species:string; before:number; after:number}[]
  const mapA = new Map(at.map(t=>[t.species, t]))
  const names = Array.from(new Set([...at.map(t=>t.species), ...bt.map(t=>t.species)])).slice(0,10)
  const rows = names.map(n=>{
    const ta = mapA.get(n)
    const tb = bt.find(x=>x.species===n)
    const aDiff = ta? (ta.after-ta.before): 0
    const bDiff = tb? (tb.after-tb.before): 0
    return { species:n, a:aDiff, b:bDiff, d:(aDiff-bDiff) }
  }).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="glass p-3"><div className="text-slate-400 text-xs">Population change</div><div className="font-bold">A {fmt(ar.population_change_percent)}% / B {fmt(br.population_change_percent)}% <span className="ml-2 text-cyan-300">Δ {sign(delta(ar.population_change_percent, br.population_change_percent))}{fmt(delta(ar.population_change_percent, br.population_change_percent))}%</span></div></div>
        <div className="glass p-3"><div className="text-slate-400 text-xs">Risk change</div><div className="font-bold">A {fmt(ar.risk_change_percent)}% / B {fmt(br.risk_change_percent)}% <span className="ml-2 text-cyan-300">Δ {sign(delta(ar.risk_change_percent, br.risk_change_percent))}{fmt(delta(ar.risk_change_percent, br.risk_change_percent))}%</span></div></div>
        <div className="glass p-3"><div className="text-slate-400 text-xs">Biodiversity index</div><div className="font-bold">A {fmt(ar.biodiversity_index)} / B {fmt(br.biodiversity_index)} <span className="ml-2 text-cyan-300">Δ {sign(delta(ar.biodiversity_index, br.biodiversity_index))}{fmt(delta(ar.biodiversity_index, br.biodiversity_index))}</span></div></div>
      </div>
      <div>
        <h5 className="font-medium">Top species deltas</h5>
        <table className="w-full text-sm mt-2">
          <thead className="text-slate-400">
            <tr><th className="text-left">Species</th><th className="text-right">A Δ</th><th className="text-right">B Δ</th><th className="text-right">Δ(A−B)</th></tr>
          </thead>
          <tbody>
            {rows.map((r,i)=> (
              <tr key={i} className="border-t border-slate-800">
                <td className="py-1">{r.species}</td>
                <td className="py-1 text-right">{r.a}</td>
                <td className="py-1 text-right">{r.b}</td>
                <td className={`py-1 text-right ${r.d>0?'text-emerald':r.d<0?'text-rose':'text-slate-300'}`}>{sign(r.d)}{r.d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

  const run = async () => {
    if (!simulationId) return
    setLoading(true); setError(null)
    try {
      const selected_species = customMode
        ? customSpecies.split(',').map(s=>s.trim()).filter(Boolean)
        : undefined
      const r = await fetchWithRetry(`/simulation/run?simulation_id=${simulationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, intensity, species_limit: speciesLimit, sampling, selected_species })
      })
      const j = await r.json()
      setStatus(j?.data?.status || 'running')
      toast.success('Simulation started')
      // connect sockets for realtime updates
      try {
        if (!socket.connected) socket.connect()
      } catch {}
      const onProgress = (payload: any) => {
        if (payload?.simulation_id !== simulationId) return
        setPhase(payload.phase || 'running')
        setProgress(Number(payload.progress || 0))
      }
      const onCompleted = (payload: any) => {
        if (payload?.simulation_id !== simulationId) return
        setStatus('completed')
        setPhase('completed')
        setProgress(100)
        setResults(payload.results || null)
        toast.success('Simulation completed (realtime)')
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        try { socket.off('sim_progress', onProgress); socket.off('sim_completed', onCompleted) } catch {}
      }
      socket.on('sim_progress', onProgress)
      socket.on('sim_completed', onCompleted)

      // begin polling as a fallback
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const g = await fetchWithRetry(`/simulation/${simulationId}`, {}, 0, 10000)
          const gj = await g.json()
          const d = gj.data
          setStatus(d.status)
          setPhase(d.phase || 'running')
          setProgress(d.progress || 0)
          if (d.results && d.status === 'completed') {
            setResults(d.results)
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
            toast.success('Simulation completed')
          }
        } catch {}
      }, 800)
    } catch (e:any) { setError(String(e)) } finally { setLoading(false) }
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      try { if (socket.connected) socket.disconnect() } catch {}
    }
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Intervention Simulator</h1>
      {fromTwin && (
        <div className="glass p-3 text-sm">
          Source: Twin snapshot {fromTwin}
        </div>
      )}
      <div className="glass p-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="font-medium">What is this?</div>
            <div className="text-slate-300 mt-1">Run a what-if intervention and estimate impact on collapse risk and key species populations.</div>
          </div>
          <div>
            <div className="font-medium">Choose action</div>
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <select value={action} onChange={e=>setAction(e.target.value)} className="bg-slate-900/40 border border-slate-700 rounded px-2 py-1">
                <option value="habitat-restoration">Habitat restoration</option>
                <option value="anti-poaching">Anti‑poaching patrols</option>
                <option value="invasive-control">Invasive control</option>
              </select>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Intensity</span>
                <input type="range" min={0} max={1} step={0.05} value={intensity} onChange={e=>setIntensity(parseFloat(e.target.value))} />
                <span className="font-medium">{Math.round(intensity*100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Species</span>
                <input type="number" min={1} max={24} value={speciesLimit} onChange={e=>setSpeciesLimit(Math.max(1, Math.min(24, parseInt(e.target.value||'1'))))} className="w-16 bg-slate-900/40 border border-slate-700 rounded px-2 py-1" />
              </div>
              <select value={sampling} onChange={e=>setSampling(e.target.value)} className="bg-slate-900/40 border border-slate-700 rounded px-2 py-1">
                <option value="random">Random</option>
                <option value="top-by-images">Top by images</option>
              </select>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={customMode}
                  onChange={e=>setCustomMode(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900"
                />
                <span>Use custom species list</span>
              </label>
              {customMode && (
                <input
                  type="text"
                  value={customSpecies}
                  onChange={e=>setCustomSpecies(e.target.value)}
                  placeholder="e.g. Blue Morpho, Monarch, Swallowtail"
                  className="w-full bg-slate-900/40 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                />
              )}
            </div>
          </div>
          <div>
            <div className="font-medium">Run</div>
            <div className="mt-2 flex items-center gap-2">
              <button onClick={create} className="px-3 py-2 bg-deepblue text-white rounded disabled:opacity-50" disabled={loading}>Create</button>
              <button onClick={run} className="px-3 py-2 bg-emerald text-white rounded disabled:opacity-50" disabled={loading || !simulationId}>Start</button>
            </div>
            <div className="mt-2 text-slate-400">ID: {simulationId ?? '-'} • Status: {status}</div>
            {error && <div className="text-sm text-rose mt-1">{error}</div>}
          </div>
        </div>
      </div>

      <div className="glass p-4">
        <Link href="/digital-twin" className="inline-block px-3 py-2 bg-deepblue text-white rounded hover:opacity-90 transition-opacity">
          Try with a Digital Twin of your ecosystem
        </Link>
      </div>

      {(status==='running' || progress>0) && (
        <div className="glass p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-slate-300">Phase: <span className="font-medium">{phase}</span></div>
            <div className={`font-semibold ${progress>70? 'text-emerald':'text-amber'}`}>{progress}%</div>
          </div>
          <div className="mt-2 h-2 w-full rounded bg-slate-800 overflow-hidden">
            <div className={`h-full ${progress>70? 'bg-emerald':'bg-amber'}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {results && (
        <div className="glass p-5">
          <h3 className="font-semibold mb-2">Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="glass p-3"><div className="text-slate-400 text-xs">Population change</div><div className="font-bold">{results!.population_change_percent}%</div></div>
            <div className="glass p-3"><div className="text-slate-400 text-xs">Risk change</div><div className="font-bold">{results!.risk_change_percent}%</div></div>
            <div className="glass p-3"><div className="text-slate-400 text-xs">Biodiversity index</div><div className="font-bold">{results!.biodiversity_index}</div></div>
          </div>
          <div className="mt-4">
            <h4 className="font-medium">Trajectories <span className="text-xs text-slate-400">{results!.trajectories.length} species</span></h4>
            <ul className="mt-2 text-sm space-y-1">
              {results!.trajectories.map((t,i)=> (
                <li key={i} className="flex justify-between"><span>{t.species}</span><span>{t.before} → {t.after}</span></li>
              ))}
            </ul>
          </div>
          {/* Scenario actions */}
          <div className="mt-5 flex flex-col md:flex-row md:items-end gap-3">
            <div>
              <div className="text-xs text-slate-400">Scenario name</div>
              <input value={scenarioName} onChange={e=>setScenarioName(e.target.value)} className="mt-1 bg-slate-900/40 border border-slate-700 rounded px-2 py-1 text-sm" />
            </div>
            <button onClick={saveScenario} disabled={saving} className={`px-3 py-2 bg-emerald text-white rounded ${saving?'opacity-60':''}`}>{saving? 'Saving...':'Save scenario'}</button>
            <button onClick={()=>{ setDrawerOpen(true); refreshScenarios() }} className="px-3 py-2 bg-deepblue text-white rounded">Compare A/B</button>
          </div>
          {/* Compare drawer */}
          {drawerOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex">
              <div className="ml-auto w-full max-w-xl h-full bg-slate-900 p-4 overflow-auto">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Compare scenarios</h4>
                  <button onClick={()=>setDrawerOpen(false)} className="text-slate-400 hover:text-white">Close</button>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Pick A</div>
                    <select className="w-full bg-slate-800 rounded px-2 py-1" value={pickA?.toString() ?? ''} onChange={e=>setPickA(e.target.value? parseInt(e.target.value): null)}>
                      <option value="">—</option>
                      {scenarios.map(s=> (<option key={s.id} value={s.id.toString()}>{s.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Pick B</div>
                    <select className="w-full bg-slate-800 rounded px-2 py-1" value={pickB?.toString() ?? ''} onChange={e=>setPickB(e.target.value? parseInt(e.target.value): null)}>
                      <option value="">—</option>
                      {scenarios.map(s=> (<option key={s.id} value={s.id.toString()}>{s.name}</option>))}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xs text-slate-500 mb-2">Scenarios: {scenarios.length} • A: {pickA??'—'} • B: {pickB??'—'}</div>
                  {pickA && pickB ? <ComparePanel a={scenarios.find(s=>Number(s.id)===Number(pickA))} b={scenarios.find(s=>Number(s.id)===Number(pickB))} /> : <div className="text-sm text-slate-400">Select two scenarios to compare.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
