"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchWithRetry } from '../lib/fetcher'

// Simple canvas-based map skeleton with mock layers and time slider
export default function MapPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [showSensors, setShowSensors] = useState(true)
  const [showDetections, setShowDetections] = useState(true)
  const [timeIdx, setTimeIdx] = useState(6) // 0..23 hours
  const [showLabels, setShowLabels] = useState(false)
  const [useDataset, setUseDataset] = useState(false)
  const [live, setLive] = useState<{lat:number;lon:number;species:string;observed_at:string}[]>([])
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState<string|undefined>()

  // Demo extent and mock data
  const region = { name: 'Demo Reserve', lat1: 12.95, lon1: 77.55, lat2: 13.05, lon2: 77.65 }
  const sensors = useMemo(() => ([
    { type: 'sat', name: 'Sat-A', lat: 13.00, lon: 77.60 },
    { type: 'drone', name: 'Drone-1', lat: 12.985, lon: 77.585 },
    { type: 'cam', name: 'Cam-7', lat: 13.015, lon: 77.63 },
  ]), [])

  // Deterministic pseudo-random for detections over time
  const detections = useMemo(() => {
    const arr: { t:number; lat:number; lon:number; species:string }[] = []
    const seeds = [ [12.992,77.592], [13.008,77.618], [12.998,77.607], [13.02,77.64] ]
    const species = ['Monarch','Morpho','Swallowtail','Heliconian']
    for (let h=0; h<24; h++) {
      seeds.forEach((s, i) => {
        const jitter = (n:number) => (Math.sin(h*13.37 + i*3.14 + n)*0.002)
        arr.push({ t:h, lat: s[0] + jitter(1), lon: s[1] + jitter(2), species: species[i%species.length] })
      })
    }
    return arr
  }, [])

  // Load detections from backend when dataset mode is on
  useEffect(() => {
    let mounted = true
    async function load() {
      if (!useDataset) return
      try {
        setLiveLoading(true); setLiveError(undefined)
        const url = `/map/detections?nelat=${region.lat2}&nelng=${region.lon2}&swlat=${region.lat1}&swlng=${region.lon1}&limit=300&hours=24`
        const r = await fetchWithRetry(url, {}, 0, 12000)
        const j = await r.json()
        const arr = Array.isArray(j?.data)? j.data: []
        if (!mounted) return
        setLive(arr)
      } catch (e:any) {
        if (!mounted) return
        setLiveError(String(e))
      } finally {
        if (mounted) setLiveLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [useDataset])

  // Project lat/lon to canvas coordinates within region bounds
  function project(lat:number, lon:number, W:number, H:number) {
    const u = (lon - region.lon1) / (region.lon2 - region.lon1)
    const v = 1 - (lat - region.lat1) / (region.lat2 - region.lat1)
    return { x: Math.max(0, Math.min(W, u*W)), y: Math.max(0, Math.min(H, v*H)) }
  }

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const W=c.width, H=c.height

    // Background
    ctx.fillStyle = '#0b1220'
    ctx.fillRect(0,0,W,H)

    // Base grid background (placeholder for map tiles)
    for (let y=0; y<H; y+=32){
      for (let x=0; x<W; x+=32){
        ctx.fillStyle = ((x+y)/32)%2===0? '#0f172a' : '#0d1527'
        ctx.fillRect(x,y,32,32)
      }
    }

    // Region outline
    ctx.strokeStyle = '#2dd4bf'
    ctx.lineWidth = 2
    ctx.strokeRect(8,8,W-16,H-16)

    // Draw sensors
    if (showSensors) {
      sensors.forEach(s => {
        const { x, y } = project(s.lat, s.lon, W, H)
        ctx.beginPath()
        ctx.fillStyle = s.type==='sat' ? '#60a5fa' : s.type==='drone' ? '#f59e0b' : '#22c55e'
        ctx.arc(x, y, 5, 0, Math.PI*2)
        ctx.fill()
        if (showLabels) {
          ctx.fillStyle = '#cbd5e1'
          ctx.font = '11px ui-sans-serif, system-ui'
          ctx.fillText(s.name, x+8, y-6)
        }
      })
    }

    // Draw detections (dataset or demo) up to timeIdx
    if (showDetections) {
      if (useDataset && live.length) {
        const now = Date.now()
        const items = live.filter(d => {
          const t = Date.parse(d.observed_at || '')
          if (!isFinite(t)) return false
          const hoursAgo = (now - t) / (1000*60*60)
          return hoursAgo <= timeIdx
        })
        items.forEach(d => {
          const { x, y } = project(d.lat, d.lon, W, H)
          ctx.beginPath(); ctx.fillStyle = '#f43f5e'; ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill()
        })
      } else {
        const items = detections.filter(d => d.t <= timeIdx)
        items.forEach(d => {
          const { x, y } = project(d.lat, d.lon, W, H)
          ctx.beginPath(); ctx.fillStyle = '#f43f5e'; ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill()
        })
      }
    }

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(10, 10, 210, 52)
    ctx.fillStyle = '#e5e7eb'
    ctx.font = '12px ui-sans-serif, system-ui'
    ctx.fillText(`${region.name}`, 16, 24)
    ctx.fillText(`Time ${String(timeIdx).padStart(2,'0')}:00`, 16, 38)

  }, [showSensors, showDetections, showLabels, useDataset, timeIdx, detections, sensors, live])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Map</h1>
        <span className="text-[10px] uppercase tracking-wide bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Demo data</span>
      </div>
      <p className="text-sm text-slate-300">See where edge devices are placed (blue=Satellite, amber=Drone, green=Camera) and how biodiversity detections (red) accumulate across the day. Use the time slider to scrub through the last 24 hours.</p>

      <div className="glass p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-3">
          <div className="font-medium">Layers</div>
          <div className="flex items-center gap-2 text-sm" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setShowSensors(v=>!v)}}>
            <input id="layer-sensors" type="checkbox" checked={showSensors} onClick={(e)=>{e.stopPropagation()}} onChange={e=>setShowSensors(e.target.checked)} />
            <button type="button" className="text-left" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setShowSensors(v=>!v)}}>Sensors</button>
          </div>
          <div className="flex items-center gap-2 text-sm" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setShowDetections(v=>!v)}}>
            <input id="layer-detections" type="checkbox" checked={showDetections} onClick={(e)=>{e.stopPropagation()}} onChange={e=>setShowDetections(e.target.checked)} />
            <button type="button" className="text-left" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setShowDetections(v=>!v)}}>Detections</button>
          </div>
          <div className="flex items-center gap-2 text-sm" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setShowLabels(v=>!v)}}>
            <input id="layer-labels" type="checkbox" checked={showLabels} onClick={(e)=>{e.stopPropagation()}} onChange={e=>setShowLabels(e.target.checked)} />
            <button type="button" className="text-left" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setShowLabels(v=>!v)}}>Labels</button>
          </div>
          <div className="flex items-center gap-2 text-sm" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setUseDataset(v=>!v)}}>
            <input id="layer-dataset" type="checkbox" checked={useDataset} onClick={(e)=>{e.stopPropagation()}} onChange={e=>setUseDataset(e.target.checked)} />
            <button type="button" className="text-left" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setUseDataset(v=>!v)}}>Use dataset (local)</button>
          </div>
          <div className="font-medium mt-3">Legend</div>
          <div className="text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full inline-block" style={{background:'#60a5fa'}} /> Satellite sensor</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full inline-block" style={{background:'#f59e0b'}} /> Drone sensor</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full inline-block" style={{background:'#22c55e'}} /> Camera trap</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full inline-block" style={{background:'#f43f5e'}} /> Biodiversity detection</div>
            {useDataset && (
              <div className="text-[11px] text-slate-400">Source: local butterflies dataset (synthetic geo sampling)</div>
            )}
          </div>
          <div className="font-medium mt-3">Time</div>
          <input type="range" min={0} max={23} value={timeIdx} onChange={e=>setTimeIdx(parseInt(e.target.value))} />
          <div className="text-xs text-slate-400">{String(timeIdx).padStart(2,'0')}:00</div>
          <div className="text-xs text-slate-400">Tip: enable Labels to see sensor names.</div>
          {useDataset && (
            <div className="text-xs text-slate-400">{liveLoading? 'Loading dataset…' : liveError? `Dataset error: ${liveError}` : `${live.length} detections in last 24h`}</div>
          )}
          <div className="mt-4 glass p-3">
            <div className="text-sm font-medium">How to read this</div>
            <ul className="mt-2 text-xs text-slate-300 space-y-1 list-disc pl-4">
              <li>Sensors are where data originates (satellite, drone, camera).</li>
              <li>Red dots are detections accumulated up to the selected time.</li>
              <li>Use the slider to scrub through activity across the day.</li>
            </ul>
          </div>
        </div>
        <div className="md:col-span-2">
          <canvas ref={canvasRef} width={800} height={480} className="w-full rounded bg-black/20" />
          <div className="mt-1 text-[11px] text-slate-400">Detections shown up to {String(timeIdx).padStart(2,'0')}:00</div>
        </div>
      </div>
    </div>
  )
}
