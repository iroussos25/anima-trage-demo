export const environment = {
  production: true,
  // Set via Vercel environment variable: VITE_API_URL
  apiUrl: (window as any).__env?.API_URL ?? '',
};
