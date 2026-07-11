export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '/api';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
};

/**
 * Custom API client using native fetch.
 * Configured with `credentials: 'include'` so HTTP-only cookies are sent and received correctly.
 */
export async function apiRequest(path: string, options: RequestInit = {}) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  console.log("[apiRequest] path:", path, "baseUrl:", baseUrl, "url:", url);
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Crucial for HTTP-only cookies
  };

  const response = await fetch(url, mergedOptions);

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("owner_profile");
      localStorage.removeItem("driver_profile");
      localStorage.removeItem("assigned_vehicle");
      window.location.href = "/login";
    }
  }

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

  // Handle logout or empty responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
