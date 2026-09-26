/**
 * formatters.ts
 *
 * Date, number, and path formatting helpers.
 */

/**
 * Format an ISO date string to "26 Sep 2026" style.
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format bytes to human-readable size.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Return just the filename from a full path.
 */
export function basename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath;
}
