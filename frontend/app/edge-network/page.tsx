"use client"
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { fetchWithRetry, cachedFetchJson } from '../lib/fetcher'
import Link from 'next/link'

type NodeItem = {
  id: number
  name: string
  status: 'online' | 'offline' | 'maintenance'
  node_type: string
  data_throughput: number
  recent_detections: number
  uptime_percent: number
  location: { lat: number; lng: number }
}

export default function EdgeNetworkPage() {
  const [nodes, setNodes] = useState<NodeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    
    const loadNodes = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const json = await cachedFetchJson(
          '/edge/nodes',
          { method: 'GET' },
          60000, // cache for 60s
          2,
          8000
        )
        if (!mounted) return
        const nodesData = Array.isArray(json) ? json : (json.data || [])
        
        setNodes(nodesData)
        setLoading(false)
        
        if (nodesData.length > 0) {
          toast.success('Edge nodes loaded', { 
            description: `${nodesData.length} nodes available` 
          })
        } else {
          toast.info('No edge nodes found', {
            description: 'The edge network is currently empty'
          })
        }
      } catch (e) {
        if (!mounted) return
        
        const errorMessage = e instanceof Error ? e.message : 'Failed to load edge nodes'
        console.error('Failed to load edge nodes:', e)
        
        setError(errorMessage)
        setLoading(false)
        
        toast.error('Failed to load edge nodes', { 
          description: errorMessage,
          action: {
            label: 'Retry',
            onClick: () => loadNodes()
          }
        })
      }
    }
    
    loadNodes()
    return () => { mounted = false }
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edge Network</h1>
      <p className="text-sm text-slate-300">Federated data mesh: edge nodes process data locally and stream only embeddings. Monitor status, throughput, and recent detections.</p>
      <div className="glass p-4 text-sm mt-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-slate-300">Looking for the spatial view? The <span className="font-semibold">Map</span> shows where sensors are placed and how detections accumulate over time (demo layer).</div>
          <Link href="/map" className="px-3 py-2 bg-deepblue text-white rounded hover:opacity-90 transition-opacity w-max">Open Map</Link>
        </div>
      </div>
      <div className="glass p-4 fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium">What is this?</div>
            <div className="text-slate-300 mt-1">A global map of GAIA edge nodes. Each node ingests raw data on-site and sends lightweight embeddings to the cloud.</div>
          </div>
          <div>
            <div className="font-medium">What do colors mean?</div>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 rounded-full bg-emerald inline-block" /> online</div>
              <div className="flex items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 rounded-full bg-amber inline-block" /> maintenance</div>
              <div className="flex items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 rounded-full bg-rose inline-block" /> offline</div>
            </div>
          </div>
          <div>
            <div className="font-medium">What can I read?</div>
            <div className="text-slate-300 mt-1">Throughput shows live bandwidth. Detections are recent biodiversity hits. Uptime reflects reliability.</div>
          </div>
        </div>
      </div>
      {!loading && !error && (
        <div className="fade-in">
          {DynamicEdgeMap && <DynamicEdgeMap nodes={nodes} />}
        </div>
      )}
      {!loading && !error && (
        <div className="glass p-3 text-xs text-slate-300 fade-in">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald inline-block" /> Online</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber inline-block" /> Maintenance</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose inline-block" /> Offline</div>
          </div>
        </div>
      )}
      {loading && (
        <div className="glass p-2">
          <div className="h-[420px] w-full rounded-lg overflow-hidden skeleton" />
        </div>
      )}
      {error && <div className="text-sm text-rose">Error: {error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 fade-in">
          {nodes.map(n => (
            <div key={n.id} className="glass p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{n.name}</div>
                <span className={
                  'text-xs px-2 py-0.5 rounded-full '+
                  (n.status === 'online' ? 'bg-emerald/10 text-emerald' : n.status === 'offline' ? 'bg-rose/10 text-rose' : 'bg-amber/10 text-amber')
                }>
                  {n.status}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-300">{n.node_type}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-slate-400 text-xs">Detections</div>
                  <div className="font-medium">{n.recent_detections}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Throughput</div>
                  <div className="font-medium">{Math.round(n.data_throughput/1_000_000)} MB/s</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Uptime</div>
                  <div className="font-medium">{n.uptime_percent}%</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-400">Lat: {n.location.lat}, Lng: {n.location.lng}</div>
            </div>
          ))}
        </div>
      )}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="glass p-4">
              <div className="h-4 w-32 skeleton" />
              <div className="mt-2 h-3 w-24 skeleton" />
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="h-10 skeleton" />
                <div className="h-10 skeleton" />
                <div className="h-10 skeleton" />
              </div>
              <div className="mt-3 h-3 w-40 skeleton" />
            </div>
          ))}
        </div>
      )}
      {!loading && !error && (
        <div className="glass p-5 fade-in">
          <div className="text-sm font-medium">How it works</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="glass p-4">
              <div className="font-medium">1) Process on the edge</div>
              <div className="text-slate-300 mt-1">Nodes run on-site models to extract embeddings and detections without moving raw media.</div>
            </div>
            <div className="glass p-4">
              <div className="font-medium">2) Stream metrics</div>
              <div className="text-slate-300 mt-1">Only compact signals are streamed, reducing bandwidth and preserving privacy.</div>
            </div>
            <div className="glass p-4">
              <div className="font-medium">3) Monitor health</div>
              <div className="text-slate-300 mt-1">Use the map and cards to watch status, throughput, detections, and uptime trends.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const DynamicEdgeMap = dynamic(() => import('./components/EdgeMap'), { ssr: false })
