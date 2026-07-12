/**
 * AuditsPage — list audit cycles and create new ones (Admin only).
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge, Button, Input, Modal, Pagination, Select, Table,
} from '@/components/ui'
import type { Column } from '@/components/ui/Table'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { auditService } from '@/services/audit.service'
import { departmentService } from '@/services/department.service'
import type {
  AuditCycle, AuditCycleCreate, AuditCycleStatus,
  AuditScopeType, Department,
} from '@/types'
import {
  AUDIT_CYCLE_STATUSES, AUDIT_CYCLE_STATUS_LABELS,
  AUDIT_SCOPE_LABELS, AUDIT_SCOPE_TYPES,
} from '@/types'
import { formatDate } from '@/utils'

// ── Badge colours ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<AuditCycleStatus, 'green' | 'blue' | 'gray'> = {
  OPEN:        'green',
  IN_PROGRESS: 'blue',
  CLOSED:      'gray',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuditsPage() {
  useDocumentTitle('Audits')
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'ADMIN'

  // ── List state ────────────────────────────────────────────────────────────
  const [items, setItems]             = useState<AuditCycle[]>([])
  const [total, setTotal]             = useState(0)
  const [totalPages, setTotalPages]   = useState(1)
  const [page, setPage]               = useState(1)
  const [loading, setLoading]         = useState(false)
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState<AuditCycleStatus | ''>('')

  // ── Create modal ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen]   = useState(false)
  const [form, setForm]               = useState<AuditCycleCreate>({
    name: '', scope_type: 'ALL', start_date: '', end_date: '',
  })
  const [departments, setDepartments] = useState<Department[]>([])
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating]       = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await auditService.list({
        search:   search || undefined,
        status:   (filterStatus as AuditCycleStatus) || undefined,
        page, page_size: 15,
      })
      setItems(res.items)
      setTotal(res.total)
      setTotalPages(res.total_pages)
    } catch { /* handled */ } finally { setLoading(false) }
  }, [search, filterStatus, page])

  useEffect(() => { void fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [search, filterStatus])

  useEffect(() => {
    departmentService.listActive().then(setDepartments).catch(() => {})
  }, [])

  // ── Create ────────────────────────────────────────────────────────────────

  function openCreate() {
    setForm({ name: '', scope_type: 'ALL', start_date: '', end_date: '' })
    setCreateError(null)
    setCreateOpen(true)
  }

  async function handleCreate() {
    if (!form.name.trim())   { setCreateError('Audit name is required.'); return }
    if (!form.start_date)    { setCreateError('Start date is required.'); return }
    if (!form.end_date)      { setCreateError('End date is required.'); return }
    setCreating(true); setCreateError(null)
    try {
      const cycle = await auditService.create({
        ...form,
        department_id: form.scope_type === 'DEPARTMENT' ? (form.department_id ?? null) : null,
        location:      form.scope_type === 'LOCATION'   ? (form.location   ?? null)   : null,
      })
      setCreateOpen(false)
      void fetchList()
      navigate(`/audits/${cycle.id}`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create audit.')
    } finally { setCreating(false) }
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: Column<AuditCycle>[] = [
    {
      key: 'name', header: 'Audit Name',
      render: c => (
        <button onClick={() => navigate(`/audits/${c.id}`)}
          className="text-left font-semibold text-gray-900 hover:text-primary-600 hover:underline">
          {c.name}
        </button>
      ),
    },
    {
      key: 'scope', header: 'Scope',
      render: c => <span className="text-gray-600">{AUDIT_SCOPE_LABELS[c.scope_type]}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: c => <Badge variant={STATUS_BADGE[c.status]}>{AUDIT_CYCLE_STATUS_LABELS[c.status]}</Badge>,
    },
    { key: 'start', header: 'Start',    render: c => <span className="text-sm text-gray-500">{formatDate(c.start_date)}</span> },
    { key: 'end',   header: 'End',      render: c => <span className="text-sm text-gray-500">{formatDate(c.end_date)}</span> },
    { key: 'auditors', header: 'Auditors', render: c => <span className="text-gray-600">{c.auditor_ids.length}</span> },
    { key: 'actions', header: '', className: 'text-right',
      render: c => <Button size="sm" variant="ghost" onClick={() => navigate(`/audits/${c.id}`)}>Open</Button>,
    },
  ]

  const statusOptions = AUDIT_CYCLE_STATUSES.map(s => ({ value: s, label: AUDIT_CYCLE_STATUS_LABELS[s] }))
  const scopeOptions  = AUDIT_SCOPE_TYPES.map(s => ({ value: s, label: AUDIT_SCOPE_LABELS[s] }))
  const deptOptions   = departments.map(d => ({ value: d.id, label: d.name }))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Asset Audits</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} cycle{total !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && <Button onClick={openCreate}>+ New Audit Cycle</Button>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-56"><Input placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="w-44"><Select value={filterStatus} onChange={e => setFilterStatus(e.target.value as AuditCycleStatus | '')} options={statusOptions} placeholder="All statuses" /></div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table columns={columns} data={items} loading={loading} keyExtractor={c => c.id} emptyMessage="No audit cycles found." />
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={15} onPageChange={setPage} />
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Audit Cycle" maxWidth="lg">
        <div className="space-y-4">
          {createError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{createError}</p>}

          <Input label="Audit Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Q3 2025 Physical Audit" />

          <Select
            label="Scope"
            value={form.scope_type ?? 'ALL'}
            onChange={e => setForm(f => ({ ...f, scope_type: e.target.value as AuditScopeType }))}
            options={scopeOptions}
          />

          {form.scope_type === 'DEPARTMENT' && (
            <Select
              label="Department"
              value={form.department_id ?? ''}
              onChange={e => setForm(f => ({ ...f, department_id: e.target.value ? Number(e.target.value) : null }))}
              options={deptOptions}
              placeholder="— Select department —"
            />
          )}

          {form.scope_type === 'LOCATION' && (
            <Input label="Location" value={form.location ?? ''} onChange={e => setForm(f => ({ ...f, location: e.target.value || null }))} placeholder="e.g. HQ Floor 3" />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date *" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="End Date *"   type="date" value={form.end_date}   onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
          <Button onClick={handleCreate} isLoading={creating}>Create Audit</Button>
        </div>
      </Modal>
    </div>
  )
}
