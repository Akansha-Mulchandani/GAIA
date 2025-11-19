// Use NEXT_PUBLIC_API_URL if set, otherwise default to localhost:8000
// Ensure the URL doesn't end with a slash
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

console.log('[API] Using API base URL:', API_BASE);

/**
 * Make a GET request to the API
 * @param path The API endpoint path (e.g., '/api/endpoint')
 * @param options Optional fetch options
 */
export async function apiGet<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Remove any leading slashes to prevent double slashes
  const normalizedPath = path.replace(/^\/+/, '');
  const url = `${API_BASE}/${normalizedPath}`;
  
  console.log('[API] GET:', url);
  
  try {
    const response = await fetch(url, {
      ...options,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      credentials: 'include' // Important for cookies/auth
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch (e) {
        // If we can't parse the error as JSON, try to get text
        try {
          errorMessage = await response.text();
        } catch (e) {
          // If we can't get text, use status text
          errorMessage = response.statusText || `HTTP ${response.status}`;
        }
      }
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
  } catch (error) {
    console.error('[API] Request failed:', error);
    throw error;
  }
}
