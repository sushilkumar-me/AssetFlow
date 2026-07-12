/**
 * MaintenancePage — list all maintenance requests, raise new ones.
 * Employees see only their own; managers/admins see all.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge, Button, Input, Modal, Pagination, Select, Table,
} from '@/components/ui'
import type { Column } from '@/components/ui/Table'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { maintenanceService } from '@/services/maintenance.service'
import { assetService } from '@/services/asset.service'
import type {
  Asset, MaintenanceCreate, MaintenancePriority,
  MaintenanceRequest, MaintenanceStatus,
} from '@/types'
import {
  MAINTENANCE_PRIORITIES, MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUSES, MAINTENANCE_STATUS_LABELS,
} from '@/types'
import { formatDate } from '@/utils'

// ── Badge colours ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<MaintenanceStatus, 'yellow' | 'green' | 'red' | 'blue' | 'purple' | 'gray'> = {
  PENDING:             'yellow',
  APPROVED:            'green',
  REJECTED:            'red',
  TECHNICIAN_ASSIGNED: 'blue',
  IN_PROGRESS:         'purple',
  RESOLVED:            'gray',
}

const PRIORITY_BADGE: Record<MaintenancePriority, 'gray' | 'yellow' | 'red' | 'red'> = {
  LOW:      'gray',
  MEDIUM:   'yellow',
  HIGH:     'red',
  CRITICAL: 'red',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  useDocumentTitle('Maintenance')
  const { } = useAuth() // available for future role checks
  const navigate = useNavigate()

  // ── List state ────────────────────────────────────────────────────────────
  const [items, setItems]             = useState<MaintenanceRequest[]>([])
  const [total, setTotal]             = useState(0)
  const [totalPages, setTotalPages]   = useState(1)
  const [page, setPage]               = useState(1)
  const [loading, setLoading]         = useState(false)
  const [filterStatus, setFilterStatus]   = useState<MaintenanceStatus | ''>('')
  const [filterPriority, setFilterPriority] = useState<MaintenancePriority | ''>('')
  const [search, setSearch]           = useState('')

  // Asset lookup map for table display
  const [assetMap, setAssetMap]       = useState<Record<number, Asset>>({})

  // ── New request modal ─────────────────────────────────────────────────────
  const [createOpen, setCreateOpen]   = useState(false)
  const [form, setForm]               = useState<MaintenanceCreate>({
    asset_id: 0, issue_title: '', issue_description: '', priority: 'MEDIUM',
  })
  const [assetSearch, setAssetSearch]     = useState('')
  const [assetOptions, setAssetOptions]   = useState<Asset[]>([])
  const [createError, setCreateError]     = useState<string | null>(null)
  const [creating, setCreating]           = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await maintenanceService.list({
        search:   search || undefined,
        status:   (filterStatus as MaintenanceStatus) || undefined,
        priority: (filterPriority as MaintenancePriority) || undefined,
        page, page_size: 15,
      })
      setItems(res.items)
      setTotal(res.total)
      setTotalPages(res.total_pages)

      const ids = [...new Set(res.items.map(r => r.asset_id))]
      const missing = ids.filter(id => !assetMap[id])
      if (missing.length > 0) {
        Promise.all(missing.map(id => assetService.getById(id))).then(assets => {
          const map: Record<number, Asset> = {}
          assets.forEach(a => { map[a.id] = a })
          setAssetMap(prev => ({ ...prev, ...map }))
        }).catch(() => {})
      }
    } catch { /* handled */ } finally { setLoading(false) }
  }, [search, filterStatus, filterPriority, page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [search, filterStatus, filterPriority])

  // ── Asset search for new-request modal ────────────────────────────────────
  useEffect(() => {
    if (!assetSearch.trim() || !createOpen) { setAssetOptions([]); return }
    assetService
      .list({ search: assetSearch, active_only: true, page_size: 10 })
      .then(r => setAssetOptions(r.items.filter(a => !a.is_shared)))
      .catch(() => {})
  }, [assetSearch, createOpen])

  // ── Create ────────────────────────────────────────────────────────────────

  function openCreate() {
    setForm({ asset_id: 0, issue_title: '', issue_description: '', priority: 'MEDIUM' })
    setAssetSearch(''); setAssetOptions([]); setCreateError(null); setCreateOpen(true)
  }

  async function handleCreate() {
    if (!form.asset_id)              { setCreateError('Select an asset.'); return }
    if (!form.issue_title.trim())    { setCreateError('Issue title is required.'); return }
    if (!form.issue_description.trim()) { setCreateError('Description is required.'); return }
    setCreating(true); setCreateError(null)
    try {
      const req = await maintenanceService.create(form)
      setCreateOpen(false)
      void fetchList()
      navigate(`/maintenance/${req.id}`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to raise request.')
    } finally { setCreating(false) }
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: Column<MaintenanceRequest>[] = [
    {
      key: 'asset', header: 'Asset',
      render: r => {
        const a = assetMap[r.asset_id]
        return a ? (
          <div>
            <p className="font-medium text-gray-900">{a.name}</p>
            <p className="text-xs font-mono text-primary-600">{a.asset_tag}</p>
          </div>
        ) : <span className="text-gray-400">#{r.asset_id}</span>
      },
    },
    { key: 'title', header: 'Issue', render: r => (
      <button onClick={() => navigate(`/maintenance/${r.id}`)}
        className="text-left font-medium text-gray-800 hover:text-primary-600 hover:underline">
        {r.issue_title}
      </button>
    )},
    {
      key: 'priority', header: 'Priority',
      render: r => <Badge variant={PRIORITY_BADGE[r.priority]}>{MAINTENANCE_PRIORITY_LABELS[r.priority]}</Badge>,
    },
    {
      key: 'status', header: 'Status',
      render: r => <Badge variant={STATUS_BADGE[r.status]}>{MAINTENANCE_STATUS_LABELS[r.status]}</Badge>,
    },
    { key: 'technician', header: 'Technician', render: r => <span className="text-gray-600">{r.technician_name ?? '—'}</span> },
    { key: 'created', header: 'Raised', render: r => <span className="text-gray-500 text-sm">{formatDate(r.created_at)}</span> },
    { key: 'actions', header: '', className: 'text-right',
      render: r => <Button size="sm" variant="ghost" onClick={() => navigate(`/maintenance/${r.id}`)}>Details</Button>,
    },
  ]

  const statusOptions   = MAINTENANCE_STATUSES.map(s => ({ value: s, label: MAINTENANCE_STATUS_LABELS[s] }))
  const priorityOptions = MAINTENANCE_PRIORITIES.map(p => ({ value: p, label: MAINTENANCE_PRIORITY_LABELS[p] }))
  const priorityFormOpts = MAINTENANCE_PRIORITIES.map(p => ({ value: p, label: MAINTENANCE_PRIORITY_LABELS[p] }))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Maintenance Requests</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} request{total !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate}>+ Raise Request</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-56"><Input placeholder="Search issue or technician…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="w-44"><Select value={filterStatus} onChange={e => setFilterStatus(e.target.value as MaintenanceStatus | '')} options={statusOptions} placeholder="All statuses" /></div>
        <div className="w-36"><Select value={filterPriority} onChange={e => setFilterPriority(e.target.value as MaintenancePriority | '')} options={priorityOptions} placeholder="All priorities" /></div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table columns={columns} data={items} loading={loading} keyExtractor={r => r.id} emptyMessage="No maintenance requests found." />
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={15} onPageChange={setPage} />
      </div>

      {/* New Request Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Raise Maintenance Request" maxWidth="lg">
        <div className="space-y-4">
          {createError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{createError}</p>}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Search Asset *</label>
            <Input placeholder="Type asset tag or name…" value={assetSearch}
              onChange={e => { setAssetSearch(e.target.value); setForm(f => ({ ...f, asset_id: 0 })) }} />
            {assetOptions.length > 0 && form.asset_id === 0 && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                {assetOptions.map(a => (
                  <button key={a.id} type="button"
                    onClick={() => { setForm(f => ({ ...f, asset_id: a.id })); setAssetSearch(`${a.asset_tag} — ${a.name}`); setAssetOptions([]) }}
                    className="w-full px-3 py-2 text-left hover:bg-primary-50">
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.asset_tag} · {a.location ?? 'No location'}</p>
                  </button>
                ))}
              </div>
            )}
            {form.asset_id > 0 && <p className="mt-1 text-xs text-green-600">✓ Asset selected (ID: {form.asset_id})</p>}
          </div>

          <Input label="Issue Title *" value={form.issue_title} onChange={e => setForm(f => ({ ...f, issue_title: e.target.value }))} placeholder="Brief description of the issue" />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description *</label>
            <textarea rows={3} value={form.issue_description} onChange={e => setForm(f => ({ ...f, issue_description: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Detailed description of the fault or issue…" />
          </div>
          <Select label="Priority" value={form.priority ?? 'MEDIUM'} onChange={e => setForm(f => ({ ...f, priority: e.target.value as MaintenancePriority }))} options={priorityFormOpts} />
          <Input label="Attachment URL" value={form.attachment_url ?? ''} onChange={e => setForm(f => ({ ...f, attachment_url: e.target.value || null }))} placeholder="https://… (optional)" />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
          <Button onClick={handleCreate} isLoading={creating}>Submit Request</Button>
        </div>
      </Modal>
    </div>
  )
}
