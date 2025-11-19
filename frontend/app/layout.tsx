import './globals.css'
import Link from 'next/link'
import { Toaster } from 'sonner'
import ThemeToggle from './components/ThemeToggle'
import BiodiversityLogo from './components/BiodiversityLogo'
import CopilotPanel from './components/CopilotPanel'

export const metadata = {
  title: 'GAIA',
  description: 'Biodiversity Intelligence Platform',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="app-bg min-h-screen flex flex-col">
        <header className="w-full sticky top-0 z-50">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between glass glow-blue">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
              <BiodiversityLogo className="h-6 w-6" />
              GAIA
            </Link>
            <nav className="flex items-center gap-6 text-sm text-slate-200">
              <Link href="/edge-network" className="hover:text-white transition-colors">Edge Network</Link>
              <Link href="/species-discovery" className="hover:text-white transition-colors">Species Discovery</Link>
              <Link href="/collapse-prediction" className="hover:text-white transition-colors">Collapse Prediction</Link>
              <Link href="/intervention-simulator" className="hover:text-white transition-colors">Intervention Simulator</Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl glass glow-emerald mt-8 mb-6 py-3 text-center text-xs text-slate-200">All systems operational • GAIA v0.1.0</footer>
        <CopilotPanel />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
