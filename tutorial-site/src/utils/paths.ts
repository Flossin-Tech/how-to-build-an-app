/**
 * Path utilities for handling base URL in Astro
 */

const base = import.meta.env.BASE_URL;

/**
 * Joins a path with the base URL, ensuring proper slashes
 * @param path - The path to join (e.g., '/about/', '/phases/surface/')
 * @returns The full path with base URL
 */
export function joinPath(path: string): string {
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return cleanBase + cleanPath;
}

/**
 * Get the base URL
 */
export function getBase(): string {
  return base;
}
