"use client"
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [light, setLight] = useState(false)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('gaia-theme') : null
    if (saved === 'light') {
      document.documentElement.classList.add('light')
      setLight(true)
    }
  }, [])

  const toggle = () => {
    const next = !light
    setLight(next)
    if (next) {
      document.documentElement.classList.add('light')
      localStorage.setItem('gaia-theme', 'light')
    } else {
      document.documentElement.classList.remove('light')
      localStorage.setItem('gaia-theme', 'dark')
    }
  }

  return (
    <button onClick={toggle} className="text-xs px-2 py-1 rounded-md glass hover:opacity-90 transition">
      {light ? 'Light' : 'Dark'}
    </button>
  )
}
