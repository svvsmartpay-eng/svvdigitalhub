/**
 * Returns the full URL for a file uploaded to the API server.
 * In dev, the Vite proxy handles /uploads → http://localhost:4000
 * In prod, this should be configured via VITE_UPLOADS_URL env variable.
 */
export const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_URL || '';

export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path; // already absolute
  return `${UPLOADS_BASE}${path}`;
}
