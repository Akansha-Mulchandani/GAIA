import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const speciesHint = url.searchParams.get('species_hint') || ''
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Forward the request to the backend inside Docker via service name
    const backendUrl = 'http://backend:8000/api';
    const backendEndpoint = `${backendUrl}/gemini/classify-upsert`;
    
    console.log('Forwarding request to Gemini backend:', backendEndpoint);
    
    const backendFormData = new FormData();
    backendFormData.append('file', file);
    if (speciesHint) backendFormData.append('species_hint', speciesHint)
    
    const response = await fetch(backendEndpoint, {
      method: 'POST',
      body: backendFormData,
    });
    
    // Forward the backend response
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Backend error:', data);
      return NextResponse.json(
        { success: false, error: data.detail || 'Failed to classify image' },
        { status: response.status }
      );
    }
    
    return NextResponse.json({
      success: true,
      predictions: data.predictions || [],
      upsert: data.upsert || null
    });
    
  } catch (error) {
    console.error('Error in Gemini classification:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

// App Router handles Request/FormData; no route-level config needed.
