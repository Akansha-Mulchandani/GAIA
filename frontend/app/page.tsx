import Link from 'next/link'
import { Leaf, Map, AlertTriangle, Microscope, Beaker, UploadCloud, Play, Activity } from 'lucide-react'
import Reveal from './components/Reveal'
import FeatureCard from './components/FeatureCard'
import SpeciesMosaic from './components/SpeciesMosaic'

export default function Page() {
  return (
    <div className="space-y-10">
      <Reveal>
      <section className="relative overflow-hidden rounded-2xl glass glow-emerald p-6 md:p-10">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-emerald/15 text-emerald"> 
            <Leaf className="h-3 w-3" /> Biodiversity-first AI
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold">GAIA Biodiversity Intelligence</h1>
          <p className="mt-2 text-sm md:text-base text-slate-300 max-w-2xl">
            GAIA helps you discover species, detect early ecosystem collapse signals, and test conservation
            actions in a safe digital twin—powered by edge sensors, computer vision, and simulation.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/species-discovery" className="px-4 py-2 rounded-lg bg-emerald/20 text-emerald hover:bg-emerald/25 transition">Explore species discovery</Link>
            <Link href="/collapse-prediction" className="px-4 py-2 rounded-lg bg-amber/20 text-amber hover:bg-amber/25 transition">See early warnings</Link>
          </div>
        </div>
      </section>
      </Reveal>

      <Reveal>
        <section className="glass p-4">
          <SpeciesMosaic offset={0} />
        </section>
      </Reveal>

      <Reveal>
      <section>
        <h2 className="text-lg font-semibold mb-4">What you can do with GAIA</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard href="/species-discovery" icon={<Microscope className="h-4 w-4 text-emerald" />} title="Species Discovery" desc="Cluster observations, surface novel species, and track population shifts." />
          <FeatureCard href="/collapse-prediction" icon={<AlertTriangle className="h-4 w-4 text-amber" />} title="Collapse Prediction" desc="Detect tipping points early using multi-signal anomaly indicators." />
          <FeatureCard href="/edge-network" icon={<Map className="h-4 w-4 text-blue-400" />} title="Edge Network" desc="Monitor sensor nodes, throughput, and detections on a live map." />
          <FeatureCard href="/intervention-simulator" icon={<Beaker className="h-4 w-4 text-purple" />} title="Intervention Simulator" desc="Test conservation strategies virtually before deploying in the field." />
          <FeatureCard href="/system" icon={<Activity className="h-4 w-4 text-cyan-400" />} title="System Status" desc="Health, latency, and WS connectivity." />
        </div>
      </section>
      </Reveal>

      <Reveal>
        <section className="glass p-4">
          <SpeciesMosaic images={[
            'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1470115636492-6d2b56f9146e?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1500534311229-1f7a3b2b3a31?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1200&auto=format&fit=crop',
          ]} />
        </section>
      </Reveal>

      {/* Onboarding steps for clarity and scrollable depth */}
      <Reveal>
      <section className="glass p-6">
        <h2 className="text-lg font-semibold">Get started in 4 steps</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass p-4">
            <div className="flex items-center gap-2 font-medium"><Map className="h-4 w-4 text-blue-400" /> Connect an edge node</div>
            <p className="mt-1 text-sm text-slate-300">Bring a camera or acoustic sensor online in the Edge Network.</p>
          </div>
          <div className="glass p-4">
            <div className="flex items-center gap-2 font-medium"><UploadCloud className="h-4 w-4 text-emerald" /> Upload observations</div>
            <p className="mt-1 text-sm text-slate-300">Send images/telemetry. GAIA builds embeddings at the edge.</p>
          </div>
          <div className="glass p-4">
            <div className="flex items-center gap-2 font-medium"><Microscope className="h-4 w-4 text-emerald" /> Review clusters</div>
            <p className="mt-1 text-sm text-slate-300">Inspect groups, flag anomalies, and label potential new species.</p>
          </div>
          <div className="glass p-4">
            <div className="flex items-center gap-2 font-medium"><Play className="h-4 w-4 text-purple" /> Run a simulation</div>
            <p className="mt-1 text-sm text-slate-300">Test an intervention and compare outcomes before field action.</p>
          </div>
        </div>
      </section>
      </Reveal>

      <Reveal>
        <section className="glass p-4">
          <SpeciesMosaic images={[
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1463320898484-cdee8141c787?q=80&w=1200&auto=format&fit=crop',
          ]} />
        </section>
      </Reveal>

      {/* Why it matters */}
      <Reveal>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass p-5">
          <h3 className="font-semibold">Why biodiversity intelligence?</h3>
          <p className="mt-2 text-sm text-slate-300">
            Biodiversity underpins food, water, and climate stability. By combining edge AI, remote sensing, and
            simulation, GAIA turns raw observations into actionable conservation decisions.
          </p>
          <ul className="mt-3 text-sm text-slate-300 space-y-2">
            <li>• Reduce time-to-detection for invasive species and disease.</li>
            <li>• Prioritize habitats at risk with early-warning scores.</li>
            <li>• De-risk interventions by testing outcomes in a digital twin.</li>
          </ul>
        </div>
        <div className="glass p-5">
          <h3 className="font-semibold">Live activity</h3>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-amber" /> Early warning signal rising in Reef A</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-emerald" /> 120 images processed by Node-Peru-03</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-purple" /> Simulation run completed for Madagascar</li>
          </ul>
        </div>
      </section>
      </Reveal>

      <Reveal>
      <section className="relative overflow-hidden rounded-2xl glass p-8">
        <div className="max-w-2xl text-sm text-slate-300">
          GAIA focuses on forests, reefs, and pollinator networks. Visual cues here echo foliage and water bodies to
          keep biodiversity at the center of the experience.
        </div>
        <svg aria-hidden className="pointer-events-none absolute right-6 top-6 opacity-15" width="180" height="120" viewBox="0 0 180 120" fill="none">
          <path d="M30 90 C40 50, 80 30, 120 50 C150 60, 160 90, 140 100 C110 110, 70 100, 30 90 Z" stroke="#34D399" strokeWidth="2" fill="none" />
        </svg>
        <svg aria-hidden className="pointer-events-none absolute left-4 bottom-4 opacity-15" width="200" height="120" viewBox="0 0 200 120" fill="none">
          <path d="M100 10 C120 40, 160 20, 180 50 C150 60, 170 90, 130 95 C110 80, 90 110, 70 95 C60 80, 80 60, 100 10 Z" stroke="#60A5FA" strokeWidth="2" fill="none" />
        </svg>
      </section>
      </Reveal>
    </div>
  )
}
