/**
 * DashboardPage — role-aware ERP dashboard with live KPIs, recent activity,
 * unread notification count, and quick-action shortcuts.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, SkeletonKPIGrid, Spinner } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { dashboardService } from '@/services/dashboard.service'
import { cn, formatRelative } from '@/utils'
import type { DashboardData, KPIData, UserRole } from '@/types'

// ── Role styles ───────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<UserRole, string> = {
  ADMIN:           'bg-red-100 text-red-700',
  ASSET_MANAGER:   'bg-blue-100 text-blue-700',
  DEPARTMENT_HEAD: 'bg-purple-100 text-purple-700',
  EMPLOYEE:        'bg-green-100 text-green-700',
}
const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrator', ASSET_MANAGER: 'Asset Manager',
  DEPARTMENT_HEAD: 'Department Head', EMPLOYEE: 'Employee',
}

// ── KPI card definition ───────────────────────────────────────────────────────

interface KPICardDef {
  key: keyof KPIData
  label: string
  color: string
  link?: string
}

const KPI_CARDS: KPICardDef[] = [
  { key: 'available_assets',   label: 'Available Assets',    color: 'border-l-green-500',  link: '/assets' },
  { key: 'allocated_assets',   label: 'Allocated Assets',    color: 'border-l-blue-500',   link: '/allocations' },
  { key: 'under_maintenance',  label: 'Under Maintenance',   color: 'border-l-yellow-500', link: '/maintenance' },
  { key: 'overdue_returns',    label: 'Overdue Returns',     color: 'border-l-red-500',    link: '/allocations' },
  { key: 'todays_bookings',    label: "Today's Bookings",    color: 'border-l-indigo-500', link: '/bookings' },
  { key: 'pending_transfers',  label: 'Pending Transfers',   color: 'border-l-orange-500', link: '/transfers' },
  { key: 'pending_maintenance',label: 'Pending Maintenance', color: 'border-l-pink-500',   link: '/maintenance' },
  { key: 'open_audit_cycles',  label: 'Open Audits',         color: 'border-l-teal-500',   link: '/audits' },
]

// ── Quick actions ─────────────────────────────────────────────────────────────

interface QuickAction { label: string; path: string; roles: UserRole[] }

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Register Asset',     path: '/assets',       roles: ['ADMIN', 'ASSET_MANAGER'] },
  { label: 'Allocate Asset',     path: '/allocations',  roles: ['ADMIN', 'ASSET_MANAGER'] },
  { label: 'Book Resource',      path: '/bookings',     roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'] },
  { label: 'Raise Maintenance',  path: '/maintenance',  roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'] },
  { label: 'Create Audit',       path: '/audits',       roles: ['ADMIN'] },
  { label: 'View Notifications', path: '/notifications',roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'] },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const navigate = useNavigate()
  const role = user?.role ?? 'EMPLOYEE'

  const [data, setData]         = useState<DashboardData | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    dashboardService
      .getDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const actions = QUICK_ACTIONS.filter(a => a.roles.includes(role))

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="rounded-xl border border-primary-100 bg-primary-50 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-primary-900">
              Welcome back, {user?.full_name ?? 'User'}
            </h1>
            <p className="mt-0.5 text-sm text-primary-700">
              Here's your organisation overview for today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data && data.unread_notifications > 0 && (
              <button onClick={() => navigate('/notifications')}
                className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {data.unread_notifications} unread
              </button>
            )}
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ROLE_STYLES[role]}`}>
              {ROLE_LABEL[role]}
            </span>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      {loading ? (
        <SkeletonKPIGrid count={8} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPI_CARDS.map(card => (
            <button
              key={card.key}
              onClick={() => card.link && navigate(card.link)}
              className={cn(
                'rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm',
                'border-l-4 transition-shadow hover:shadow-md',
                card.color,
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {data ? data.kpis[card.key] : '—'}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Bottom grid: recent activity + quick actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card noPadding>
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-800">Recent Activity</h2>
            </div>
            {loading ? (
              <div className="flex h-40 items-center justify-center"><Spinner /></div>
            ) : data && data.recent_activity.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {data.recent_activity.map(item => (
                  <li key={item.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800">{item.description}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {item.user_name} · {formatRelative(item.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-sm text-gray-400">No recent activity.</p>
            )}
            <div className="border-t border-gray-100 px-5 py-3">
              <button onClick={() => navigate('/activity-logs')}
                className="text-xs font-medium text-primary-600 hover:underline">
                View all activity →
              </button>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <div className="grid grid-cols-1 gap-2">
              {actions.map(a => (
                <button key={a.path + a.label} onClick={() => navigate(a.path)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm
                             font-medium text-gray-700 transition-colors hover:border-primary-300
                             hover:bg-primary-50 hover:text-primary-700">
                  {a.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
