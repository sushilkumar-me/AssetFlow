/**
 * ChartCard — wrapper for Recharts visualizations with title and optional actions.
 */

import { ReactNode } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui'

interface ChartCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export default function ChartCard({ title, subtitle, action, children, className = '' }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      {subtitle && <p className="px-5 text-sm text-gray-500">{subtitle}</p>}
      <div className="p-4">{children}</div>
    </Card>
  )
}