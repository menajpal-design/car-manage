const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Custom API client using native fetch for the driver portal.
 * Configured with `credentials: 'include'` for secure cookie routing.
 */
export async function apiRequest(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  const response = await fetch(url, mergedOptions);

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred';
    try {
      const data = await response.json();
      errorMsg = data.message || errorMsg;
    } catch {
      // JSON parsing failed
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
