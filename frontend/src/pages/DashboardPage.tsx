/**
 * Dashboard — landing page of the ERP.
 * Placeholder: stats and widgets will be added per module.
 */

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { checkHealth } from '@/services/health.service'

interface StatCard {
  label: string
  value: string
  description: string
}

const STAT_CARDS: StatCard[] = [
  { label: 'Total Assets',       value: '—', description: 'Tracked assets' },
  { label: 'Employees',          value: '—', description: 'Active employees' },
  { label: 'Open Allocations',   value: '—', description: 'Assets allocated' },
  { label: 'Pending Maintenance',value: '—', description: 'Scheduled tasks' },
]

export default function DashboardPage() {
  useDocumentTitle('Dashboard')
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    checkHealth()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'))
  }, [])

  return (
    <div className="space-y-6">
      {/* Backend status banner */}
      <div
        className={`rounded-lg px-4 py-3 text-sm font-medium ${
          backendStatus === 'online'
            ? 'bg-green-50 text-green-700'
            : backendStatus === 'offline'
              ? 'bg-red-50 text-red-700'
              : 'bg-yellow-50 text-yellow-700'
        }`}
        role="status"
      >
        Backend status:{' '}
        {backendStatus === 'checking' && 'Checking connection…'}
        {backendStatus === 'online'   && 'Connected'}
        {backendStatus === 'offline'  && 'Unreachable — is the backend running?'}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="mt-1 text-xs text-gray-400">{stat.description}</p>
          </Card>
        ))}
      </div>

      {/* Recent activity placeholder */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Assets</CardTitle>
          </CardHeader>
          <p className="text-sm text-gray-400">Asset list coming soon.</p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Maintenance</CardTitle>
          </CardHeader>
          <p className="text-sm text-gray-400">Maintenance schedule coming soon.</p>
        </Card>
      </div>
    </div>
  )
}
