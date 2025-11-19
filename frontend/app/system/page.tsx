"use client"
import { useEffect, useMemo, useState } from 'react'
import { socket } from '../../lib/socket'
import { fetchWithRetry } from '../lib/fetcher'

export default function SystemPage() {
  const [backendMs, setBackendMs] = useState<number | null>(null)
  const [apiBase, setApiBase] = useState<string>(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api')
  const [appBase, setAppBase] = useState<string>(() => (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/api$/, ''))
  const [health, setHealth] = useState<string>('unknown')
  const [ws, setWs] = useState<'connected'|'disconnected'|'connecting'>('disconnected')
  const [latencies, setLatencies] = useState<number[]>([])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const url = `${appBase}/health`
        const t0 = performance.now()
        const r = await fetchWithRetry(url, {}, 0, 5000)
        const t1 = performance.now()
        if (!mounted) return
        setBackendMs(Math.round(t1 - t0))
        setLatencies(prev => [...prev.slice(-10), Math.round(t1 - t0)])
        const j = await r.json().catch(()=>({}))
        setHealth(j?.status || 'ok')
      } catch (e) {
        if (!mounted) return
        setHealth('error')
      }
    }
    run()
    const id = setInterval(run, 8000)
    return () => { mounted = false; clearInterval(id) }
  }, [appBase])

  useEffect(() => {
    setWs(socket.connected ? 'connected' : 'disconnected')
    try {
      if (!socket.connected) { setWs('connecting'); socket.connect() }
    } catch {}
    const onConnect = () => setWs('connected')
    const onDisconnect = () => setWs('disconnected')
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    return () => { try { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect) } catch {} }
  }, [])

  const p50 = useMemo(() => latencies.length ? latencies.slice().sort((a,b)=>a-b)[Math.floor(0.5*(latencies.length-1))] : null, [latencies])
  const p95 = useMemo(() => latencies.length ? latencies.slice().sort((a,b)=>a-b)[Math.floor(0.95*(latencies.length-1))] : null, [latencies])

  // Build sparkline path for the last N latency samples
  const Spark = ({ data, width=380, height=80 }: { data:number[]; width?:number; height?:number }) => {
    const n = data.length
    if (!n) return <div className="text-xs text-slate-500">No samples yet</div>
    const max = Math.max(...data)
    const min = Math.min(...data)
    const pad = 6
    const w = width - pad*2
    const h = height - pad*2
    const norm = (v:number) => max===min ? h/2 : h - ((v-min)/(max-min))*h
    const pts = data.map((v,i)=>{
      const x = pad + (i*(w/Math.max(1,n-1)))
      const y = pad + norm(v)
      return [x,y]
    })
    const d = pts.map((p,i)=> (i? 'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')
    const gradId = 'lat-grad'
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={`${d} L ${pad+w},${pad+h} L ${pad},${pad+h} Z`} fill={`url(#${gradId})`} opacity={0.5} />
        {/* Line */}
        <path d={d} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">System Status</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-4"><div className="text-xs text-slate-400">Backend</div><div className={`text-lg font-semibold ${health==='ok'?'text-emerald':health==='error'?'text-rose':'text-amber'}`}>{health}</div><div className="text-xs text-slate-400 mt-1">{backendMs!==null? `${backendMs} ms` : '-'}</div></div>
        <div className="glass p-4"><div className="text-xs text-slate-400">API base</div><div className="text-sm font-mono truncate">{apiBase}</div><div className="text-xs text-slate-400 mt-1">p50 {p50??'-'} ms • p95 {p95??'-'} ms</div></div>
        <div className="glass p-4"><div className="text-xs text-slate-400">WebSocket</div><div className={`text-lg font-semibold ${ws==='connected'?'text-emerald':ws==='connecting'?'text-amber':'text-rose'}`}>{ws}</div></div>
      </div>
      <div className="glass p-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">Activity (latency)</div>
          <div className="text-xs text-slate-400">last {Math.min(latencies.length,10)} samples • range {latencies.length? `${Math.min(...latencies)}-${Math.max(...latencies)} ms`:'-'}</div>
        </div>
        <div className="mt-2">
          <Spark data={latencies.slice(-20)} />
        </div>
      </div>
    </div>
  )
}
