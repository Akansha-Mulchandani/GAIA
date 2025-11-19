"use client"
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import FeatureCard from '../components/FeatureCard'
import { Image as ImageIcon, Tag, Download, Search } from 'lucide-react'
import Link from 'next/link'
import { fetchWithRetry, cachedFetchJson } from '../lib/fetcher'

type Cluster = {
  id: number
  name: string
  cohesion_score: number
  size: number
  is_anomaly: boolean
  images: string[]
}

export default function SpeciesDiscoveryPage() {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const limit = 24 // Number of clusters per page

  const loadClusters = async (pageNum: number) => {
    try {
      setLoading(true);
      setError(null);
      
      // Cached fetch (60s TTL) using relative path to avoid double /api
      const json = await cachedFetchJson(
        `/species/clusters?page=${pageNum}&limit=${limit}`,
        { method: 'GET' },
        0, // disable cache for clusters so UI always reflects latest data
        2,
        30000 // allow up to 30s; endpoint may compute clusters/images
      );
      
      if (json && json.success === false) {
        throw new Error(json.error?.message || json.detail || 'Failed to load clusters');
      }
      
      // Handle the response data
      const clustersData = Array.isArray(json) ? json : (json?.data ?? []); // Handle both formats safely
      
      if (pageNum === 1) {
        setClusters(Array.isArray(clustersData) ? clustersData : []);
      } else {
        setClusters((prev: Cluster[]) => [...prev, ...(Array.isArray(clustersData) ? clustersData : [])]);
      }
      
      setHasMore(Array.isArray(clustersData) && clustersData.length === limit);
      
      if (pageNum === 1) {
        const count = json.total || (Array.isArray(clustersData) ? clustersData.length : 0);
        toast.success('Clusters loaded', { 
          description: `${count} clusters available` 
        });
      }
      
      return json;
    } catch (e: any) {
      console.error('Error loading clusters:', e);
      const errorMessage = e.message || 'Failed to load clusters. Please try again.';
      setError(errorMessage);
      setLoading(false);
      
      toast.error('Error', { 
        description: errorMessage,
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => loadClusters(pageNum)
        }
      });
      
      // If it's the first page load, set empty clusters
      if (pageNum === 1) {
        setClusters([]);
      }
      
      throw e; // Re-throw to allow component to handle if needed
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true
    loadClusters(page)
    return () => { mounted = false }
  }, [page])
  
  const loadMore = async () => {
    if (!loading && hasMore) {
      try {
        await loadClusters(page + 1);
        setPage(p => p + 1);
      } catch (e) {
        console.error('Failed to load more clusters:', e);
        // Error is already handled in loadClusters
      }
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Species Discovery</h1>
      <p className="text-sm text-slate-300">Unsupervised embeddings group observations into clusters. Review thumbnails, cohesion, and sizes to surface novel species or anomalies.</p>
      <div className="glass p-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="font-medium">What is this?</div>
            <div className="text-slate-300 mt-1">Automated grouping of similar observations into species-level clusters using image embeddings.</div>
          </div>
          <div>
            <div className="font-medium">How to use</div>
            <div className="text-slate-300 mt-1">Scan thumbnails for consistency, check cohesion and size, then open a cluster to inspect samples and label candidates.</div>
          </div>
          <div>
            <div className="font-medium">What to look for</div>
            <div className="text-slate-300 mt-1">High cohesion + medium/large size for stable species. Low size or mixed thumbnails may be novel or mislabeled groups.</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FeatureCard href="#clusters" icon={<ImageIcon className="h-4 w-4 text-emerald" />} title="Browse clusters" desc="Open a cluster to preview samples and quality." className="float-card" />
        <FeatureCard href="#label" icon={<Tag className="h-4 w-4 text-blue-400" />} title="Assign labels" desc="Confirm species names and flag anomalies." className="float-card" />
        <FeatureCard href="#export" icon={<Download className="h-4 w-4 text-purple" />} title="Export set" desc="Export cluster lists or thumbnails for review." className="float-card" />
        <Link href="/butterfly-classifier" className="no-underline">
          <div className="glass p-4 rounded-lg h-full transition-all hover:ring-2 hover:ring-emerald/50 cursor-pointer group">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-emerald-400 group-hover:text-emerald-300" />
              <span className="font-medium text-sm">Classify Species</span>
            </div>
            <p className="mt-1 text-xs text-slate-400 group-hover:text-slate-300">Upload an image to identify butterfly or moth species using AI</p>
          </div>
        </Link>
      </div>
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="glass p-4">
              <div className="h-4 w-32 skeleton" />
              <div className="mt-2 h-3 w-24 skeleton" />
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="h-20 skeleton rounded" />
                <div className="h-20 skeleton rounded" />
                <div className="h-20 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <div className="text-sm text-rose">Error: {error}</div>}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {clusters.map(c => (
              <div key={c.id} className="glass p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-200 truncate">{c.name}</div>
                  {c.is_anomaly && (
                    <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber/10 text-amber">
                      anomaly
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Cohesion {Math.round(c.cohesion_score * 100)}% • {c.size} images
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {c.images.slice(0, 3).map((src, i) => (
                    <div key={i} className="aspect-square overflow-hidden rounded-lg">
                      <img 
                        src={src} 
                        alt={`${c.name} sample ${i + 1}`} 
                        className="h-full w-full object-cover hover:scale-105 transition-transform" 
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=640&auto=format&fit=crop';
                        }} 
                      />
                    </div>
                  ))}
                  {c.images.length === 0 && (
                    <div className="aspect-square overflow-hidden rounded-lg">
                      <img 
                        src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=640&auto=format&fit=crop" 
                        alt="No images available" 
                        className="h-full w-full object-cover opacity-50" 
                      />
                    </div>
                  )}
                </div>
                {c.size > 3 && (
                  <div className="mt-2 text-right">
                    <span className="text-xs text-slate-500">+{c.size - 3} more</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
