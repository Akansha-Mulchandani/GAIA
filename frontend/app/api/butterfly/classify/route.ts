import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create a new FormData to forward to the backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    // Forward the request to the backend. Prefer SERVER_API_URL when running in Docker container,
    // fallback to NEXT_PUBLIC_API_URL (browser/base), then localhost.
    const apiBase = (
      process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
    ).replace(/\/+$/, '');
    const backendEndpoint = `${apiBase}/butterfly/classify`;
    
    console.log('Forwarding request to backend:', backendEndpoint);
    
    try {
      const backendResponse = await fetch(backendEndpoint, {
        method: 'POST',
        body: backendFormData,
        // Let the browser set the content type with the boundary
        headers: {}
      });
      
      console.log('Backend response status:', backendResponse.status);

      // Handle non-OK responses
      if (!backendResponse.ok) {
        let errorText = await backendResponse.text();
        console.error('Backend error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { detail: errorText };
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: errorData.detail || `Backend error: ${backendResponse.statusText}`,
            status: backendResponse.status,
            rawError: errorData
          },
          { status: backendResponse.status }
        );
      }

      const data = await backendResponse.json();
      console.log('Backend response data:', data);
      return NextResponse.json({ ...data, success: true });
      
    } catch (error) {
      console.error('Error forwarding request to backend:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to forward request to backend: ${error instanceof Error ? error.message : String(error)}`,
          status: 500
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in butterfly classification:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Note: In the App Router, body parsing is handled by the Web APIs (Request/FormData).
// No route-level page config export is required here.
