// API Configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// Get the API base URL based on environment
export const getApiBaseUrl = (): string => {
  // In development, use the proxy (relative URLs work)
  if (isDevelopment) {
    return '';
  }
  
  // In production, use the backend URL from environment variable
  let backendUrl = process.env.REACT_APP_API_URL;
  
  if (!backendUrl) {
    console.error('REACT_APP_API_URL environment variable is not set');
    console.error('Please set REACT_APP_API_URL to your Railway backend URL');
    // Fallback to prevent complete failure
    backendUrl = 'https://sense-checkr-production.up.railway.app';
  }
  
  // Ensure the URL has the correct protocol
  if (!backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
    backendUrl = `https://${backendUrl}`;
  }
  
  // Remove trailing slash if present
  backendUrl = backendUrl.replace(/\/$/, '');
  
  console.log('API Base URL:', backendUrl);
  return backendUrl;
};

// Helper function to build API URLs
export const apiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  
  // In development, just return the endpoint (proxy handles it)
  if (isDevelopment) {
    return endpoint;
  }
  
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const fullUrl = `${baseUrl}/${cleanEndpoint}`;
  
  console.log('API URL:', fullUrl);
  return fullUrl;
};

// Export the base URL for direct use
export const API_BASE_URL = getApiBaseUrl(); 