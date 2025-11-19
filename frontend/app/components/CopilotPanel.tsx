"use client"
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { fetchWithRetry } from '../lib/fetcher'
import { toast } from 'sonner'

export default function CopilotPanel() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'explain'|'act'|'nav'>('explain')
  const [topic, setTopic] = useState('biodiversity')
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const explain = () => {
    const map: Record<string,string> = {
      biodiversity: 'Biodiversity index here is a simple evenness proxy between A and B species (0–1). Higher means richer and more even communities.',
      risk: 'Risk is a proxy for collapse risk given temp, rain, and poaching. Higher means more unstable under current pressures.',
      step: 'A step advances the twin world by one tick: agents move, eat, reproduce, and may die; resources regen/decay; metrics update.'
    }
    return map[topic] || ''
  }

  const runIntervention = async () => {
    try {
      setBusy(true)
      const created = await fetchWithRetry('/simulation/create', { method: 'POST' }, 0, 12000)
      const cj = await created.json()
      const id = cj?.data?.simulation_id
      if (!id) { toast.error('Create failed'); return }
      await fetchWithRetry(`/simulation/run?simulation_id=${id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'habitat-restoration', intensity:0.5, species_limit:8, sampling:'random' }) }, 0, 12000)
      toast.success(`Simulation ${id} started`)
      router.push('/intervention-simulator')
    } catch (e:any) {
      toast.error('Failed to run intervention', { description: String(e) })
    } finally { setBusy(false) }
  }

  const go = (path:string) => { router.push(path); setOpen(false) }

  return (
    <>
      <button onClick={()=>setOpen(o=>!o)} className="fixed bottom-6 right-6 z-[60] px-4 py-2 rounded bg-deepblue text-white shadow-lg">{open? 'Close Copilot':'Open Copilot'}</button>
      {open && (
        <div className="fixed top-0 right-0 h-full w-full max-w-md z-[59] bg-slate-950/95 border-l border-slate-800 p-4 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">AI Copilot</div>
            <div className="text-xs text-slate-400">{pathname}</div>
          </div>
          <div className="flex gap-2 mb-4">
            <button className={`px-2 py-1 rounded ${tab==='explain'?'bg-slate-800 text-white':'glass'}`} onClick={()=>setTab('explain')}>Explain</button>
            <button className={`px-2 py-1 rounded ${tab==='act'?'bg-slate-800 text-white':'glass'}`} onClick={()=>setTab('act')}>Run</button>
            <button className={`px-2 py-1 rounded ${tab==='nav'?'bg-slate-800 text-white':'glass'}`} onClick={()=>setTab('nav')}>Navigate</button>
          </div>

          {tab==='explain' && (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">Topic</div>
                <select className="w-full bg-slate-900 rounded px-2 py-2" value={topic} onChange={e=>setTopic(e.target.value)}>
                  <option value="biodiversity">Explain Biodiversity</option>
                  <option value="risk">Explain Risk</option>
                  <option value="step">What is a step?</option>
                </select>
              </div>
              <div className="glass p-3 text-sm whitespace-pre-wrap">{explain()}</div>
            </div>
          )}

          {tab==='act' && (
            <div className="space-y-3">
              <div className="text-sm text-slate-300">Start a quick intervention run with recommended defaults and view progress in the simulator.</div>
              <button disabled={busy} onClick={runIntervention} className={`px-3 py-2 rounded bg-emerald text-white ${busy?'opacity-60':''}`}>{busy? 'Starting...':'Run intervention'}</button>
            </div>
          )}

          {tab==='nav' && (
            <div className="grid grid-cols-2 gap-2">
              <button className="glass p-3 text-left" onClick={()=>go('/species-discovery')}>Species Discovery</button>
              <button className="glass p-3 text-left" onClick={()=>go('/collapse-prediction')}>Collapse Prediction</button>
              <button className="glass p-3 text-left" onClick={()=>go('/digital-twin')}>Digital Twin</button>
              <button className="glass p-3 text-left" onClick={()=>go('/intervention-simulator')}>Intervention Simulator</button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
