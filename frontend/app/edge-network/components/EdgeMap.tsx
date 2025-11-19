"use client"
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type NodeItem = {
  id: number
  name: string
  status: 'online' | 'offline' | 'maintenance'
  node_type: string
  data_throughput: number
  recent_detections: number
  location: { lat: number; lng: number }
}

export default function EdgeMap({ nodes }: { nodes: NodeItem[] }) {
  return (
    <div className="glass p-2">
      <div className="h-[420px] w-full rounded-lg overflow-hidden">
        {/* Type casts ensure compatibility with various TS setups */}
        <MapContainer {...({ center:[10,8], zoom:2, scrollWheelZoom:true, style:{ height:'100%', width:'100%' }} as any)}>
          <TileLayer {...({ attribution:'© OpenStreetMap contributors', url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' } as any)} />
          {nodes.map(n => (
            <CircleMarker key={n.id} {...({ center:[n.location.lat, n.location.lng], radius:8, pathOptions:{ color: n.status==='online' ? '#10B981' : n.status==='offline' ? '#F43F5E' : '#F59E0B', fillColor: n.status==='online' ? '#10B981' : n.status==='offline' ? '#F43F5E' : '#F59E0B', fillOpacity:0.7 } } as any)}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{n.name}</div>
                  <div className="text-slate-500 text-xs">{n.node_type} • {n.status}</div>
                  <div className="mt-1 text-xs">Detections: {n.recent_detections}</div>
                  <div className="text-xs">Throughput: {Math.round(n.data_throughput/1_000_000)} MB/s</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
