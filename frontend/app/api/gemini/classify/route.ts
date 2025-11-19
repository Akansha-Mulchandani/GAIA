import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    const backendUrl = 'http://backend:8000/api'
    const endpoint = `${backendUrl.replace(/\/+$/, '')}/gemini/classify`

    const fd = new FormData()
    fd.append('file', file)

    const resp = await fetch(endpoint, { method: 'POST', body: fd })
    const data = await resp.json()

    if (!resp.ok) {
      return NextResponse.json(
        { success: false, error: data.detail || 'Gemini classify failed' },
        { status: resp.status }
      )
    }

    return NextResponse.json({ success: true, predictions: data.predictions || [] })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// Ensure TS treats this file as a module
export {}