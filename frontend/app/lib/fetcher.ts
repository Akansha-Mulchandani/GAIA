// Base URL selection: use backend service name when running on server (container),
// and localhost when running in the browser. Ensure no trailing slash.
const CLIENT_DEFAULT = 'http://localhost:8000/api';
const SERVER_DEFAULT = process.env.SERVER_API_URL || 'http://backend:8000/api';
const API_BASE = (
  typeof window === 'undefined'
    ? (process.env.SERVER_API_URL || SERVER_DEFAULT)
    : (process.env.NEXT_PUBLIC_API_URL || CLIENT_DEFAULT)
).replace(/\/+$/, '');

// Debug log the API base URL
console.log(`[API] Using API base URL: ${API_BASE}`);

// Simple in-memory cache with TTL
type CacheEntry = { ts: number; json: any };
const memCache = new Map<string, CacheEntry>();

function cacheGet(key: string, ttlMs: number): any | null {
  try {
    const now = Date.now();
    const inMem = memCache.get(key);
    if (inMem && now - inMem.ts < ttlMs) return inMem.json;
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed: CacheEntry = JSON.parse(raw);
      if (now - parsed.ts < ttlMs) {
        memCache.set(key, parsed);
        return parsed.json;
      } else {
        sessionStorage.removeItem(key);
      }
    }
  } catch {}
  return null;
}

function cacheSet(key: string, json: any) {
  try {
    const entry: CacheEntry = { ts: Date.now(), json };
    memCache.set(key, entry);
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {}
}

/**
 * Fetches data from the API with retry logic
 */
export async function fetchWithRetry(
  path: string, 
  opts: RequestInit = {}, 
  retries = 2, 
  timeoutMs = 10000
): Promise<Response> {
  // If path is already a full URL, use it as is
  if (path.startsWith('http')) {
    console.warn(`[API] Using full URL in fetchWithRetry: ${path}`);
    return fetch(path, opts);
  }
  
  // Ensure path doesn't start with /api to avoid double /api in the URL
  const cleanPath = path.startsWith('/api/') ? path.substring(4) : path;
  
  // Ensure path starts with a slash
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  const url = `${API_BASE}${normalizedPath}`;
  
  console.log(`[API] Fetching: ${url}`);
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const isGet = (opts.method || 'GET').toUpperCase() === 'GET'
      const response = await fetch(url, {
        ...opts,
        signal: controller.signal,
        mode: 'cors',
        headers: isGet ? (opts.headers || {}) : { 'Content-Type': 'application/json', ...(opts.headers || {}) },
        // Avoid credentials by default to prevent strict CORS preflight requirements
      });
      
      clearTimeout(timeoutId);
      
      // Handle non-2xx responses
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
      
      return response;
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;
      
      // Normalize abort/timeout error message
      if (error?.name === 'AbortError') {
        error = new Error('Request timed out');
        (error as any).status = 408;
      }
      
      // Don't retry on 4xx errors (except 408, 429, etc.)
      if (error.status && error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
        console.error(`[API] Client error (${error.status}):`, error.message);
        throw error;
      }
      
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff
        console.warn(`[API] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[API] All ${retries + 1} attempts failed for ${url}`, error);
        throw new Error(`Failed to fetch: ${error.message || 'Network error'}`);
      }
    }
  }
  
  // This should never be reached due to the throw in the loop
  throw lastError || new Error('Unknown error occurred during fetch');
}

// Cached JSON fetch helper (GET-only recommended)
export async function cachedFetchJson(
  path: string,
  opts: RequestInit = {},
  ttlMs = 30000,
  retries = 2,
  timeoutMs = 8000,
): Promise<any> {
  const key = `gaia:cache:${path}:${opts.method||'GET'}`;
  const cached = cacheGet(key, ttlMs);
  if (cached) return cached;
  const res = await fetchWithRetry(path, opts, retries, timeoutMs);
  const json = await res.json();
  cacheSet(key, json);
  return json;
}
