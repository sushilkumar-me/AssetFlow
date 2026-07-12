/**
 * Shared formatting utilities.
 */

/** Format ISO → "Mar 15, 2024" */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    }).format(new Date(isoString))
  } catch {
    return '—'
  }
}

/** Format ISO → "Mar 15, 2024 · 10:32 AM" */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }).format(new Date(isoString))
  } catch {
    return '—'
  }
}

/** Relative time: "2 hours ago", "in 3 days" */
export function formatRelative(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    const diff = (new Date(isoString).getTime() - Date.now()) / 1000
    const abs = Math.abs(diff)
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    if (abs < 60)    return rtf.format(Math.round(diff), 'second')
    if (abs < 3600)  return rtf.format(Math.round(diff / 60), 'minute')
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
    return rtf.format(Math.round(diff / 86400), 'day')
  } catch {
    return formatDate(isoString)
  }
}

/** Format currency: 5000 → "$5,000.00" */
export function formatCurrency(value: number | string | null | undefined, currency = 'USD'): string {
  if (value === null || value === undefined || value === '') return '—'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value))
  } catch {
    return String(value)
  }
}

/** Capitalise first letter */
export function capitalise(value: string): string {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** snake_case / kebab-case → Title Case */
export function toTitleCase(value: string): string {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/** Truncate long strings */
export function truncate(value: string, max = 40): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}
