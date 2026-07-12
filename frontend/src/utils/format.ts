/**
 * Shared formatting utilities.
 */

/**
 * Format an ISO date string to a human-readable local date.
 * e.g. "2024-03-15T10:00:00Z" → "Mar 15, 2024"
 */
export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoString))
}

/**
 * Capitalise the first letter of a string.
 */
export function capitalise(value: string): string {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * Convert a snake_case or kebab-case string to Title Case.
 * e.g. "asset_flow" → "Asset Flow"
 */
export function toTitleCase(value: string): string {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
