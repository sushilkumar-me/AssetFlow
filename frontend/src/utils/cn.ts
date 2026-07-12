/**
 * Utility for conditionally joining Tailwind class names.
 * Avoids adding a clsx/classnames dependency for simple cases.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
