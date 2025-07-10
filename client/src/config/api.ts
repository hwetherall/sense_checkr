// API Configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// Get the API base URL based on environment
export const getApiBaseUrl = (): string => {
  // In development, use the proxy (relative URLs work)
  if (isDevelopment) {
    return '';
  }
  
  // In production, use the backend URL from environment variable
  const backendUrl = process.env.REACT_APP_API_URL;
  
  if (!backendUrl) {
    console.error('REACT_APP_API_URL environment variable is not set');
    console.error('Please set REACT_APP_API_URL to your Railway backend URL');
    // Fallback to prevent complete failure
    return 'https://sense-checkr-production.up.railway.app';
  }
  
  return backendUrl;
};

// Helper function to build API URLs
export const apiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return baseUrl ? `${baseUrl}/${cleanEndpoint}` : `/${cleanEndpoint}`;
};

// Export the base URL for direct use
export const API_BASE_URL = getApiBaseUrl(); 