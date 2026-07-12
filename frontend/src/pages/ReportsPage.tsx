/**
 * ReportsPage — analytics dashboard with 5 tabs: Assets, Departments, Maintenance, Bookings, Audits.
 */

import { useEffect, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Button, Card, Spinner } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { reportsService } from '@/services/reports.service'
import { cn } from '@/utils'
import { ChartCard, StatCard } from '@/components/charts'
import type {
  AssetReport, AuditReport, BookingReport, DepartmentReport, MaintenanceReport,
} from '@/types'

type TabId = 'assets' | 'departments' | 'maintenance' | 'bookings' | 'audits'

const TABS: { id: TabId; label: string }[] = [
  { id: 'assets', label: 'Assets' },
  { id: 'departments', label: 'Departments' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'audits', label: 'Audits' },
]

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

function ExportButton({ reportType }: { reportType: string }) {
  const handleExport = async (fmt: 'csv' | 'pdf' | 'excel') => {
    const result = await reportsService.exportReport(reportType, fmt)
    // Frontend can generate file from result.data — for now just log
    console.log(`Exported ${reportType} as ${fmt}`, result)
    alert(`Exported as ${fmt.toUpperCase()}`)
  }
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" onClick={() => handleExport('csv')}>CSV</Button>
      <Button size="sm" variant="secondary" onClick={() => handleExport('pdf')}>PDF</Button>
      <Button size="sm" variant="secondary" onClick={() => handleExport('excel')}>Excel</Button>
    </div>
  )
}

export default function ReportsPage() {
  useDocumentTitle('Reports')
  const [activeTab, setActiveTab] = useState<TabId>('assets')
  const [loading, setLoading] = useState(true)

  // Report data states
  const [assetReport, setAssetReport] = useState<AssetReport | null>(null)
  const [deptReport, setDeptReport] = useState<DepartmentReport | null>(null)
  const [maintReport, setMaintReport] = useState<MaintenanceReport | null>(null)
  const [bookingReport, setBookingReport] = useState<BookingReport | null>(null)
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      reportsService.getAssetReport(),
      reportsService.getDepartmentReport(),
      reportsService.getMaintenanceReport(),
      reportsService.getBookingReport(),
      reportsService.getAuditReport(),
    ])
      .then(([a, d, m, b, au]) => {
        setAssetReport(a)
        setDeptReport(d)
        setMaintReport(m)
        setBookingReport(b)
        setAuditReport(au)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Asset Tab
  // ─────────────────────────────────────────────────────────────────────────
  const AssetTab = () => {
    if (!assetReport) return null
    const statusData = Object.entries(assetReport.status_breakdown).map(([k, v]) => ({ name: k, value: v }))
    return (
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Assets" value={assetReport.total_assets} />
          <StatCard label="Allocated %" value={`${assetReport.allocation_percentage}%`} />
          <StatCard label="Idle Assets" value={assetReport.idle_assets.length} />
          <StatCard label="Most Used" value={assetReport.most_used_assets[0]?.name ?? '—'} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard title="Asset Status Distribution" subtitle="By current status">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top 10 Most Used Assets">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={assetReport.most_used_assets.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="allocation_count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 font-semibold">Idle Assets</div>
            <div className="divide-y divide-gray-50">
              {assetReport.idle_assets.slice(0, 5).map(a => (
                <div key={a.id} className="flex justify-between px-5 py-2 text-sm">
                  <span>{a.name} ({a.asset_tag})</span>
                  <span className="text-gray-400">{a.status}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="px-5 py-3 border-b border-gray-100 font-semibold">Least Used Assets</div>
            <div className="divide-y divide-gray-50">
              {assetReport.least_used_assets.slice(0, 5).map(a => (
                <div key={a.id} className="flex justify-between px-5 py-2 text-sm">
                  <span>{a.name} ({a.asset_tag})</span>
                  <span className="text-gray-400">{a.allocation_count} allocations</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <ExportButton reportType="assets" />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Department Tab
  // ─────────────────────────────────────────────────────────────────────────
  const DepartmentTab = () => {
    if (!deptReport) return null
    const chartData = deptReport.departments.map(d => ({
      name: d.department_name,
      allocated: d.allocated,
      available: d.available,
      maintenance: d.under_maintenance,
    }))
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Departments" value={deptReport.departments.length} />
          <StatCard label="Total Assets" value={deptReport.departments.reduce((s, d) => s + d.total, 0)} />
          <StatCard label="Allocated" value={deptReport.departments.reduce((s, d) => s + d.allocated, 0)} />
          <StatCard label="Unassigned" value={deptReport.unassigned_assets} />
        </div>

        <ChartCard title="Assets by Department" subtitle="Allocated vs Available vs Maintenance">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="allocated" stackId="a" fill="#3b82f6" name="Allocated" />
              <Bar dataKey="available" stackId="a" fill="#10b981" name="Available" />
              <Bar dataKey="maintenance" stackId="a" fill="#f59e0b" name="Maintenance" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <div className="px-5 py-3 border-b border-gray-100 font-semibold">Department Details</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-2 text-left">Department</th>
                <th className="px-5 py-2 text-right">Allocated</th>
                <th className="px-5 py-2 text-right">Available</th>
                <th className="px-5 py-2 text-right">Maintenance</th>
                <th className="px-5 py-2 text-right">Lost</th>
                <th className="px-5 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deptReport.departments.map(d => (
                <tr key={d.department_id}>
                  <td className="px-5 py-2">{d.department_name}</td>
                  <td className="px-5 py-2 text-right">{d.allocated}</td>
                  <td className="px-5 py-2 text-right">{d.available}</td>
                  <td className="px-5 py-2 text-right">{d.under_maintenance}</td>
                  <td className="px-5 py-2 text-right">{d.lost}</td>
                  <td className="px-5 py-2 text-right font-medium">{d.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <ExportButton reportType="departments" />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Maintenance Tab
  // ─────────────────────────────────────────────────────────────────────────
  const MaintenanceTab = () => {
    if (!maintReport) return null
    const priorityData = Object.entries(maintReport.priority_distribution).map(([k, v]) => ({ name: k, value: v }))
    const monthlyData = maintReport.monthly_requests.map(m => ({
      name: `${m.month}/${m.year}`,
      requests: m.count,
    }))
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Requests" value={maintReport.total_requests} />
          <StatCard label="Avg Resolution" value={`${maintReport.average_resolution_days} days`} />
          <StatCard label="Pending" value={maintReport.status_distribution.PENDING ?? 0} />
          <StatCard label="Resolved" value={maintReport.status_distribution.RESOLVED ?? 0} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard title="Monthly Requests">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Priority Distribution">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {priorityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <Card>
          <div className="px-5 py-3 border-b border-gray-100 font-semibold">Most Repaired Assets</div>
          <div className="divide-y divide-gray-50">
            {maintReport.most_repaired_assets.slice(0, 10).map(a => (
              <div key={a.id} className="flex justify-between px-5 py-2 text-sm">
                <span>{a.name} ({a.asset_tag})</span>
                <span className="text-gray-400">{a.repair_count} repairs</span>
              </div>
            ))}
          </div>
        </Card>

        <ExportButton reportType="maintenance" />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bookings Tab
  // ─────────────────────────────────────────────────────────────────────────
  const BookingsTab = () => {
    if (!bookingReport) return null
    const hourlyData = Array.from({ length: 24 }, (_, h) => {
      const found = bookingReport.hourly_distribution.find(x => x.hour === h)
      return { hour: `${h}:00`, bookings: found?.count ?? 0 }
    })
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Bookings" value={bookingReport.total_bookings} />
          <StatCard label="Upcoming" value={bookingReport.status_distribution.UPCOMING ?? 0} />
          <StatCard label="Ongoing" value={bookingReport.status_distribution.ONGOING ?? 0} />
          <StatCard label="Completed" value={bookingReport.status_distribution.COMPLETED ?? 0} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard title="Peak Hours" subtitle="Bookings by hour of day">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Most Booked Resources">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bookingReport.most_booked_assets.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="booking_count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <Card>
          <div className="px-5 py-3 border-b border-gray-100 font-semibold">Daily Usage (Last 30 Days)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={bookingReport.daily_usage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <ExportButton reportType="bookings" />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Audits Tab
  // ─────────────────────────────────────────────────────────────────────────
  const AuditsTab = () => {
    if (!auditReport) return null
    const statusData = [
      { name: 'Open', value: auditReport.open_audits },
      { name: 'In Progress', value: auditReport.in_progress_audits },
      { name: 'Closed', value: auditReport.closed_audits },
    ]
    const verifyData = [
      { name: 'Verified', value: auditReport.verified_assets },
      { name: 'Missing', value: auditReport.missing_assets },
      { name: 'Damaged', value: auditReport.damaged_assets },
    ]
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Open Audits" value={auditReport.open_audits} />
          <StatCard label="In Progress" value={auditReport.in_progress_audits} />
          <StatCard label="Closed" value={auditReport.closed_audits} />
          <StatCard label="Discrepancies" value={auditReport.missing_assets + auditReport.damaged_assets} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard title="Audit Status">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Verification Results">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={verifyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {verifyData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <Card>
          <div className="px-5 py-3 border-b border-gray-100 font-semibold">Recent Audits</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-2 text-left">Name</th>
                <th className="px-5 py-2 text-center">Status</th>
                <th className="px-5 py-2 text-right">Verified</th>
                <th className="px-5 py-2 text-right">Missing</th>
                <th className="px-5 py-2 text-right">Damaged</th>
                <th className="px-5 py-2 text-right">Discrepancy %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {auditReport.recent_audits.map(a => (
                <tr key={a.id}>
                  <td className="px-5 py-2">{a.name}</td>
                  <td className="px-5 py-2 text-center">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      a.status === 'CLOSED' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700',
                    )}>{a.status}</span>
                  </td>
                  <td className="px-5 py-2 text-right">{a.total_verified}</td>
                  <td className="px-5 py-2 text-right text-red-600">{a.missing}</td>
                  <td className="px-5 py-2 text-right text-yellow-600">{a.damaged}</td>
                  <td className="px-5 py-2 text-right font-medium">{a.discrepancy_percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <ExportButton reportType="audits" />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'assets' && <AssetTab />}
        {activeTab === 'departments' && <DepartmentTab />}
        {activeTab === 'maintenance' && <MaintenanceTab />}
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'audits' && <AuditsTab />}
      </div>
    </div>
  )
}