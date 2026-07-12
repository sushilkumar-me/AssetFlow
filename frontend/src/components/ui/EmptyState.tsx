/**
 * Empty state, error state, and network error components.
 */
import { ReactNode } from 'react'
import { cn } from '@/utils'
import Button from './Button'

interface EmptyStateProps {
  title?: string
  message?: string
  action?: { label: string; onClick: () => void }
  icon?: ReactNode
  className?: string
}

export function EmptyState({
  title = 'No data found',
  message = 'Nothing to show here yet.',
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon ? (
        <div className="mb-3 text-gray-300">{icon}</div>
      ) : (
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <p className="font-medium text-gray-700">{title}</p>
      <p className="mt-1 text-sm text-gray-400">{message}</p>
      {action && (
        <div className="mt-4">
          <Button size="sm" onClick={action.onClick}>{action.label}</Button>
        </div>
      )}
    </div>
  )
}

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <p className="font-medium text-gray-700">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>
        </div>
      )}
    </div>
  )
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <div className="flex items-start gap-3">
        <svg className="h-5 w-5 shrink-0 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-12.728 0a9 9 0 010-12.728m1.414 1.414a7 7 0 000 9.9m9.9 0a7 7 0 000-9.9" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-red-700">Unable to connect to the server</p>
          <p className="mt-0.5 text-xs text-red-500">Check that the backend is running on port 8000.</p>
        </div>
        {onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>
        )}
      </div>
    </div>
  )
}
