/**
 * Dashboard — first page the user sees after login.
 * Shows a personalised welcome, the user's role, and a backend health indicator.
 */

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { checkHealth } from '@/services/health.service'
import type { UserRole } from '@/types'

// ── Role badge ────────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<UserRole, string> = {
  ADMIN:           'bg-red-100 text-red-700',
  ASSET_MANAGER:   'bg-blue-100 text-blue-700',
  DEPARTMENT_HEAD: 'bg-purple-100 text-purple-700',
  EMPLOYEE:        'bg-green-100 text-green-700',
}

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN:           'Administrator',
  ASSET_MANAGER:   'Asset Manager',
  DEPARTMENT_HEAD: 'Department Head',
  EMPLOYEE:        'Employee',
}

// ── Stat card data ─────────────────────────────────────────────────────────────

const STAT_CARDS = [
  { label: 'Total Assets',        value: '—', description: 'Tracked assets' },
  { label: 'Employees',           value: '—', description: 'Active employees' },
  { label: 'Open Allocations',    value: '—', description: 'Assets allocated' },
  { label: 'Pending Maintenance', value: '—', description: 'Scheduled tasks' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  useDocumentTitle('Dashboard')

  const { user } = useAuth()
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    checkHealth()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'))
  }, [])

  const role = user?.role ?? 'EMPLOYEE'

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="rounded-xl border border-primary-100 bg-primary-50 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-primary-900">
              Welcome back, {user?.full_name ?? 'User'}
            </h2>
            <p className="mt-0.5 text-sm text-primary-700">
              Here&apos;s an overview of your workspace.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${ROLE_STYLES[role]}`}
          >
            {ROLE_LABEL[role]}
          </span>
        </div>
      </div>

      {/* Backend health */}
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
        API status:{' '}
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

      {/* Account info card */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Name</dt>
              <dd className="font-medium text-gray-900">{user?.full_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Role</dt>
              <dd>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_STYLES[role]}`}>
                  {ROLE_LABEL[role]}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium text-green-600">Active</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <p className="text-sm text-gray-400">Activity feed coming soon.</p>
        </Card>
      </div>
    </div>
  )
}
