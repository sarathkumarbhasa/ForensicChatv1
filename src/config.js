// Central API configuration
// In development: uses localhost. In production: uses the deployed Render backend.
const isDev = import.meta.env.DEV;

export const API_BASE_URL = isDev
  ? 'http://localhost:8000'
  : (import.meta.env.VITE_API_URL || 'https://forensichat-backend.onrender.com');
