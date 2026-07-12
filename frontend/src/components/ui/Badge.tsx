import { cn } from '@/utils'

type BadgeVariant = 'green' | 'red' | 'blue' | 'purple' | 'yellow' | 'gray'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  green:  'bg-green-100  text-green-700',
  red:    'bg-red-100    text-red-700',
  blue:   'bg-blue-100   text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  gray:   'bg-gray-100   text-gray-600',
}

export default function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
