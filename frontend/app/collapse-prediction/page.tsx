"use client"
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import FeatureCard from '../components/FeatureCard'
import { Activity, AlertTriangle, Beaker } from 'lucide-react'
import { fetchWithRetry } from '../lib/fetcher'

type Warning = { id:number; ecosystem_id:string; severity:'low'|'medium'|'high'|'critical'; message:string; created_at:string }
type Tipping = { risk_level:string; risk_percent:number; estimated_time_months:number; confidence:number }
type Signals = { autocorrelation:number[]; variance:number[]; detections:number[] }

export default function CollapsePredictionPage() {
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [tipping, setTipping] = useState<Tipping | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)
  const [signals, setSignals] = useState<Signals | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState<string>('https://webhook.site/d4685af7-94b7-447c-9f82-8ac87d7ff746')
  const [varianceTh, setVarianceTh] = useState<number>(0.7)
  const [autocorrTh, setAutocorrTh] = useState<number>(0.7)
  const [alertStatus, setAlertStatus] = useState<any>(null)
  const [banner, setBanner] = useState<{ level:'low'|'medium'|'high'|'critical'; text:string } | null>(null)
  const lastSeenRef = useRef<number>(0) // track most recent warning id/ts for toasts
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    let mounted = true
    Promise.all([
      fetchWithRetry('/prediction/warnings', {}, 2, 15000).then(r=>r.json()),
      fetchWithRetry('/prediction/tipping-points', {}, 2, 15000).then(r=>r.json()),
      fetchWithRetry('/prediction/signals', {}, 2, 15000).then(r=>r.json()),
    ])
    .then(([w,t,s]) => {
      if (!mounted) return
      setWarnings(w.data||[])
      setTipping(t.data||null)
      setSignals(s.data||null)
      setLoading(false)
      toast.success('Risk snapshot loaded')
    })
    .catch(e=>{ if (!mounted) return; setError(String(e)); setLoading(false); toast.error('Failed to load prediction', { description: String(e) }) })
    return () => { mounted = false }
  }, [])

  // Poll warnings and tipping points to keep the page up to date and show banner/toasts
  useEffect(() => {
    const tick = async () => {
      try {
        const [w, t] = await Promise.all([
          fetchWithRetry('/prediction/warnings', {}, 0, 10000).then(r=>r.json()).catch(()=>null),
          fetchWithRetry('/prediction/tipping-points', {}, 0, 10000).then(r=>r.json()).catch(()=>null),
        ])
        const ws: Warning[] = w?.data || []
        const tp: Tipping | null = t?.data || null
        setWarnings(ws)
        setTipping(tp)

        // Determine banner
        const top = ws.find(x=>x.severity==='critical') || ws.find(x=>x.severity==='high')
        if (top) setBanner({ level: top.severity, text: top.message })
        else if (tp && tp.risk_percent >= 70) setBanner({ level: 'high', text: `High collapse risk (${tp.risk_percent}%)` })
        else setBanner(null)

        // Toast for new high/critical warnings
        const latestTs = ws.length ? Date.parse(ws[0].created_at) || 0 : 0
        if (latestTs && latestTs > lastSeenRef.current) {
          lastSeenRef.current = latestTs
          const sev = ws[0].severity
          if (sev === 'critical' || sev === 'high') {
            const fn = sev==='critical'? toast.error : toast.warning
            fn(`${sev==='critical'?'Critical':'High'} risk warning`, { description: ws[0].message })
          }
        }
      } catch { /* noop */ }
    }
    tick()
    pollRef.current = window.setInterval(tick, 30000)
    return () => { if (pollRef.current) window.clearInterval(pollRef.current) }
  }, [])

  useEffect(() => {
    fetchWithRetry('/alerts/status', {}, 0, 8000)
      .then(r=>r.json())
      .then(j=>{ setAlertStatus(j?.config||null) })
      .catch(()=>{})
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Collapse Prediction</h1>
      <p className="text-sm text-slate-300">Early warning system for ecosystem collapse using trends like autocorrelation, variance, and detection rates.</p>
      {banner && (
        <div className={`glass p-3 text-sm ${banner.level==='critical'?'border border-rose/40 bg-rose-900/10 text-rose-200':banner.level==='high'?'border border-amber/40 bg-amber-900/10 text-amber-200':'text-slate-200'}`}>
          <div className="font-medium">{banner.level==='critical'?'Critical':'High'} alert</div>
          <div className="text-xs opacity-90">{banner.text}</div>
        </div>
      )}
      <div className="glass p-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="font-medium">What is this?</div>
            <div className="text-slate-300 mt-1">A risk monitor that estimates collapse likelihood and surfaces early warning signals.</div>
          </div>
          <div>
            <div className="font-medium">What do colors mean?</div>
            <div className="mt-2 flex items-center gap-4 text-slate-300">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald inline-block"/> low</span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber inline-block"/> medium</span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose inline-block"/> high</span>
            </div>
          </div>
          <div>
            <div className="font-medium">What can I do?</div>
            <div className="text-slate-300 mt-1">Open warnings, review context, and test interventions in the simulator.</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard href="#signals" icon={<Activity className="h-4 w-4 text-emerald" />} title="Analyze signals" desc="Autocorrelation, variance, detections" className="float-card" />
        <FeatureCard href="#warnings" icon={<AlertTriangle className="h-4 w-4 text-amber" />} title="Review warnings" desc="Prioritize by severity and freshness" className="float-card" />
        <FeatureCard href="/intervention-simulator" icon={<Beaker className="h-4 w-4 text-purple" />} title="Simulate actions" desc="Test strategies before deployment" className="float-card" />
      </div>
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass p-4"><div className="h-28 skeleton rounded"/></div>
          <div className="glass p-4"><div className="h-40 skeleton rounded"/></div>
        </div>
      )}

      {!loading && signals && (
        <div className="glass p-5" id="signals">
          <h3 className="font-semibold mb-3">Signals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SparkCard title="Autocorrelation" data={signals.autocorrelation} color="#60A5FA" />
            <SparkCard title="Variance" data={signals.variance} color="#F59E0B" />
            <SparkCard title="Detections" data={signals.detections} color="#10B981" />
          </div>
        </div>
      )}
      {error && <div className="text-sm text-rose">Error: {error}</div>}

      {!loading && tipping && (
        <div className="glass p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Risk level</div>
              <div className="text-xl font-bold">{tipping.risk_level} ({tipping.risk_percent}%)</div>
              <div className="text-xs text-slate-400">ETA {tipping.estimated_time_months} months • Confidence {Math.round((tipping.confidence||0)*100)}%</div>
            </div>
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-slate-800/50" />
              <svg viewBox="0 0 36 36" className="w-24 h-24 relative">
                <path className="text-slate-700" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2a16 16 0 1 1 0 32a16 16 0 1 1 0-32" opacity="0.3" />
                <path stroke={tipping.risk_percent>70? '#F43F5E' : tipping.risk_percent>40? '#F59E0B' : '#10B981'} strokeWidth="3" fill="none" strokeLinecap="round"
                  strokeDasharray={`${(tipping.risk_percent/100)*100}, 100`} d="M18 2a16 16 0 1 1 0 32a16 16 0 1 1 0-32" />
              </svg>
              <div className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${tipping.risk_percent>70? 'text-rose' : tipping.risk_percent>40? 'text-amber' : 'text-emerald'}`}>{tipping.risk_percent}%</div>
            </div>
          </div>
        </div>
      )}

      <div className="glass p-5">
        <h3 className="font-semibold mb-3">Alerts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-slate-400">Webhook URL</div>
            <input value={webhookUrl} onChange={e=>setWebhookUrl(e.target.value)} className="mt-1 w-full bg-black/30 rounded px-2 py-1 text-sm outline-none" placeholder="https://..." />
          </div>
          <div>
            <div className="text-xs text-slate-400">Variance threshold</div>
            <input type="number" step="0.01" value={varianceTh} onChange={e=>setVarianceTh(parseFloat(e.target.value||'0'))} className="mt-1 w-full bg-black/30 rounded px-2 py-1 text-sm outline-none" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Autocorr threshold</div>
            <input type="number" step="0.01" value={autocorrTh} onChange={e=>setAutocorrTh(parseFloat(e.target.value||'0'))} className="mt-1 w-full bg-black/30 rounded px-2 py-1 text-sm outline-none" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button disabled={submitting} onClick={async()=>{
            try {
              setSubmitting(true)
              const r = await fetchWithRetry('/alerts/subscribe', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ webhook_url: webhookUrl, email: 'akanshamulchandani429@gmail.com', thresholds: { variance: varianceTh, autocorr: autocorrTh } }) }, 0, 10000)
              const j = await r.json(); setAlertStatus(j?.config||null); toast.success('Alerts subscription saved')
            } catch (e:any) { toast.error('Failed to subscribe', { description: String(e) }) } finally { setSubmitting(false) }
          }} className={`px-3 py-1.5 rounded text-sm ${submitting? 'opacity-60':'glass'}`}>{submitting? 'Saving...':'Subscribe'}</button>
          <button disabled={testing} onClick={async()=>{
            try { setTesting(true); await fetchWithRetry('/alerts/test', { method:'POST' }, 0, 8000); toast.success('Test alert sent') }
            catch (e:any) { toast.error('Failed to send test alert', { description: String(e) }) } finally { setTesting(false) }
          }} className={`px-3 py-1.5 rounded text-sm ${testing? 'opacity-60':'glass'}`}>{testing? 'Testing...':'Test alert'}</button>
          {alertStatus && (
            <div className="text-xs text-slate-400">Last trigger: {alertStatus?.last_trigger?.at? alertStatus.last_trigger.at : '—'}</div>
          )}
        </div>
      </div>

      {!loading && warnings.length>0 && (
        <div className="glass p-5" id="warnings">
          <h3 className="font-semibold mb-2">Early warnings</h3>
          <ul className="space-y-2 text-sm">
            {warnings.map(w => (
              <li key={w.id} className="flex items-start gap-2">
                <span className={'mt-1 h-2 w-2 rounded-full '+(w.severity==='critical'?'bg-rose':w.severity==='high'?'bg-rose':w.severity==='medium'?'bg-amber':'bg-emerald')} />
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {w.message}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${w.severity==='critical'?'bg-rose-500/20 text-rose-300':w.severity==='high'?'bg-rose-500/20 text-rose-300':w.severity==='medium'?'bg-amber-500/20 text-amber-200':'bg-emerald-500/20 text-emerald-200'}`}>{w.severity}</span>
                  </div>
                  <div className="text-slate-500 text-xs">{w.ecosystem_id} • {new Date(w.created_at).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SparkCard({ title, data, color }: { title: string; data: number[]; color: string }) {
  const w = 140
  const h = 40
  const pad = 4
  const min = Math.min(...data)
  const max = Math.max(...data)
  const scaleX = (i: number) => pad + (i * (w - 2 * pad) / Math.max(1, (data.length - 1)))
  const scaleY = (v: number) => h - pad - ((v - min) / Math.max(1e-9, (max - min))) * (h - 2 * pad)
  const points = data.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(' ')
  const last = data[data.length - 1]
  return (
    <div className="glass p-3">
      <div className="text-xs text-slate-400">{title}</div>
      <div className="mt-1 flex items-center justify-between">
        <svg width={w} height={h} className="rounded bg-black/20">
          <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
        </svg>
        <div className="text-sm font-semibold" style={{ color }}>{typeof last === 'number' ? last.toFixed(2) : last}</div>
      </div>
    </div>
  )
}
