/**
 * StatCard — simple stat display with optional trend indicator.
 */

import { ReactNode } from 'react'
import { cn } from '@/utils'

interface StatCardProps {
  label: string
  value: string | number
  trend?: { value: number; positive: boolean }
  icon?: ReactNode
  className?: string
}

export default function StatCard({ label, value, trend, icon, className = '' }: StatCardProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={cn('mt-1 text-xs font-medium', trend.positive ? 'text-green-600' : 'text-red-600')}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </div>
  )
}