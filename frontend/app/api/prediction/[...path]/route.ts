import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const segs = params.path || []
    const endpoint = segs.join('/')
    if (!endpoint) return NextResponse.json({ success: false, error: 'Missing endpoint' }, { status: 400 })

    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '')
    const url = `${apiBase}/prediction/${endpoint}`

    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' })
    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Proxy error' }, { status: 502 })
  }
}
