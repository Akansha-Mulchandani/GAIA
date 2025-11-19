"use client"
import { useEffect, useRef, useState } from 'react'
import { fetchWithRetry } from '../lib/fetcher'
import { toast } from 'sonner'

export default function AlertsBar() {
  const [enabled, setEnabled] = useState<boolean>(true)
  const [subscribed, setSubscribed] = useState<boolean>(false)
  const [pending, setPending] = useState<boolean>(false)
  const [banner, setBanner] = useState<{ level:'info'|'warn'|'crit'; text:string } | null>(null)
  const [lastCritTs, setLastCritTs] = useState<number>(0)
  const timerRef = useRef<number | null>(null)

  // Fetch subscription status once
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const r = await fetchWithRetry('/alerts/status', {}, 0, 8000)
        const j = await r.json()
        if (!mounted) return
        setSubscribed(!!j?.data?.subscribed)
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

  // Poll warnings and tipping points
  useEffect(() => {
    if (!enabled) return
    const tick = async () => {
      try {
        const [rw, rt] = await Promise.all([
          fetchWithRetry('/prediction/warnings', {}, 0, 8000).then(r=>r.json()).catch(()=>null),
          fetchWithRetry('/prediction/tipping-points', {}, 0, 8000).then(r=>r.json()).catch(()=>null),
        ])
        const warnings = rw?.data?.warnings || []
        const tips = rt?.data?.tipping_points || []
        const top = tips.find((t:any)=>t.severity==='critical') || warnings.find((w:any)=>w.severity==='high')
        if (top) {
          setBanner({ level: top.severity==='critical' ? 'crit' : 'warn', text: top.message || top.name || 'Alert' })
          const now = Date.now()
          if (top.severity==='critical' && now - lastCritTs > 30000) {
            setLastCritTs(now)
            toast.error('Critical risk alert', { description: top.message || top.name })
          }
        } else {
          setBanner(null)
        }
      } catch {}
    }
    tick()
    timerRef.current = window.setInterval(tick, 30000)
    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  }, [enabled, lastCritTs])

  const toggleSub = async () => {
    try {
      setPending(true)
      const want = !subscribed
      const r = await fetchWithRetry(want? '/alerts/subscribe' : '/alerts/unsubscribe', { method:'POST' }, 0, 8000)
      await r.json()
      setSubscribed(want)
      toast.success(want? 'Subscribed to alerts' : 'Unsubscribed from alerts')
    } catch (e:any) {
      toast.error('Alert subscription failed', { description: String(e) })
    } finally { setPending(false) }
  }

  const test = async () => {
    try {
      await fetchWithRetry('/alerts/test', {}, 0, 8000)
      toast.message('Test alert triggered')
    } catch {}
  }

  return (
    <div className="mx-auto max-w-6xl mb-3">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-wide text-slate-400">Alerts</span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} /> Enabled
            </label>
            <button disabled={pending} onClick={toggleSub} className="glass px-2 py-1 rounded">{subscribed? 'Unsubscribe':'Subscribe'}</button>
            <button onClick={test} className="glass px-2 py-1 rounded">Test</button>
          </div>
        </div>
        {banner && (
          <div className={`px-2 py-1 rounded ${banner.level==='crit'?'bg-rose-600/20 text-rose-300':'bg-amber-600/20 text-amber-200'}`}>{banner.text}</div>
        )}
      </div>
    </div>
  )
}
