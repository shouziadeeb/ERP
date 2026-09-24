/** Production: set VITE_API_BASE to your hosted API. Dev: empty string → same origin + Vite /api proxy. */
export const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${normalized}`
}
