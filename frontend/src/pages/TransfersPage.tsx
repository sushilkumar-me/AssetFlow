/**
 * TransfersPage — create, view, approve, and reject transfer requests.
 * Tabs: Pending | Approved | Rejected
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Badge, Button, Input, Modal, Pagination,
  Spinner, Table,
} from '@/components/ui'
import type { Column } from '@/components/ui/Table'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { transferService } from '@/services/transfer.service'
import { assetService } from '@/services/asset.service'
import { employeeService } from '@/services/employee.service'
import type {
  Employee, TransferCreateRequest, TransferRequest, TransferStatus,
} from '@/types'
import { TRANSFER_STATUS_LABELS } from '@/types'
import { cn, formatDate } from '@/utils'

// ── Badge variant ─────────────────────────────────────────────────────────────

const BADGE: Record<TransferStatus, 'yellow' | 'green' | 'red'> = {
  PENDING:  'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
}

type TabId = 'PENDING' | 'APPROVED' | 'REJECTED'

// ── Component ─────────────────────────────────────────────────────────────────

export default function TransfersPage() {
  useDocumentTitle('Transfers')
  const { user } = useAuth()

  const canApprove  = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER' || user?.role === 'DEPARTMENT_HEAD'
  const canRequest  = true  // all authenticated users

  const [tab, setTab]               = useState<TabId>('PENDING')
  const [items, setItems]           = useState<TransferRequest[]>([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)

  // Lookup data — used for table display (from/to names)
  const [employees, setEmployees] = useState<Employee[]>([])

  // ── Create modal ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<TransferCreateRequest>({ asset_id: 0, to_employee_id: 0 })
  const [assetSearch, setAssetSearch] = useState('')
  const [assetOptions, setAssetOptions] = useState<{ value: number; label: string }[]>([])

  // Employee live-search for "Transfer To" field
  const [toEmpSearch, setToEmpSearch]           = useState('')
  const [toEmpOptions, setToEmpOptions]         = useState<Employee[]>([])
  const [toEmpSearching, setToEmpSearching]     = useState(false)
  const [selectedToEmpName, setSelectedToEmpName] = useState('')

  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating]       = useState(false)

  // ── Action modal (approve / reject) ──────────────────────────────────────
  const [actionTarget, setActionTarget] = useState<TransferRequest | null>(null)
  const [actionType, setActionType]     = useState<'approve' | 'reject'>('approve')
  const [actionRemarks, setActionRemarks] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await transferService.list({ status: tab, page, page_size: 15 })
      setItems(res.items)
      setTotal(res.total)
      setTotalPages(res.total_pages)
    } catch { /* handled */ } finally { setLoading(false) }
  }, [tab, page])

  useEffect(() => { void fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [tab])

  useEffect(() => {
    employeeService.list({ page_size: 200 }).then(r => setEmployees(r.items)).catch(() => {})
  }, [])

  // Employee live-search for "Transfer To" (runs when modal open)
  useEffect(() => {
    if (!createOpen) return
    setToEmpSearching(true)
    employeeService
      .list({ search: toEmpSearch.trim() || undefined, page_size: 20 })
      .then(r => setToEmpOptions(r.items))
      .catch(() => {})
      .finally(() => setToEmpSearching(false))
  }, [toEmpSearch, createOpen])

  // Search allocated assets for create form
  useEffect(() => {
    if (!assetSearch.trim()) { setAssetOptions([]); return }
    assetService
      .list({ search: assetSearch, status: 'ALLOCATED', page_size: 10 })
      .then(r => setAssetOptions(r.items.map(a => ({ value: a.id, label: `${a.asset_tag} — ${a.name}` }))))
      .catch(() => {})
  }, [assetSearch])

  // ── Create transfer ───────────────────────────────────────────────────────

  async function handleCreate() {
    if (!createForm.asset_id)      { setCreateError('Select an asset.'); return }
    if (!createForm.to_employee_id){ setCreateError('Select target employee.'); return }
    setCreating(true); setCreateError(null)
    try {
      await transferService.create(createForm)
      setCreateOpen(false)
      setCreateForm({ asset_id: 0, to_employee_id: 0 })
      setAssetSearch('')
      if (tab === 'PENDING') void fetchList()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Request failed.')
    } finally { setCreating(false) }
  }

  // ── Approve / Reject ──────────────────────────────────────────────────────

  async function handleAction() {
    if (!actionTarget) return
    setActionLoading(true)
    try {
      if (actionType === 'approve') {
        await transferService.approve(actionTarget.id, { remarks: actionRemarks || null })
      } else {
        await transferService.reject(actionTarget.id, { remarks: actionRemarks || null })
      }
      setActionTarget(null)
      void fetchList()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed.')
    } finally { setActionLoading(false) }
  }

  // ── Lookup maps ───────────────────────────────────────────────────────────
  const empMap = Object.fromEntries(employees.map(e => [e.id, e.full_name]))

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: Column<TransferRequest>[] = [
    { key: 'id',     header: 'ID',   render: t => <span className="font-mono text-xs text-gray-500">#{t.id}</span> },
    { key: 'asset',  header: 'Asset', render: t => <span className="font-mono text-xs font-semibold text-primary-700">#{t.asset_id}</span> },
    { key: 'from',   header: 'From', render: t => <span className="text-gray-700">{empMap[t.from_employee_id] ?? `#${t.from_employee_id}`}</span> },
    { key: 'to',     header: 'To',   render: t => <span className="font-medium text-gray-900">{empMap[t.to_employee_id] ?? `#${t.to_employee_id}`}</span> },
    { key: 'reqby',  header: 'Requested By', render: t => <span className="text-gray-600">{empMap[t.requested_by] ?? `#${t.requested_by}`}</span> },
    { key: 'date',   header: 'Date',   render: t => <span className="text-gray-500">{formatDate(t.requested_at)}</span> },
    { key: 'status', header: 'Status', render: t => <Badge variant={BADGE[t.status]}>{TRANSFER_STATUS_LABELS[t.status]}</Badge> },
    {
      key: 'remarks', header: 'Remarks',
      render: t => t.remarks ? <span className="max-w-xs truncate text-sm text-gray-500">{t.remarks}</span> : <span className="text-gray-300">—</span>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: t => canApprove && t.status === 'PENDING' ? (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="primary" onClick={() => { setActionTarget(t); setActionType('approve'); setActionRemarks('') }}>Approve</Button>
          <Button size="sm" variant="danger"  onClick={() => { setActionTarget(t); setActionType('reject');  setActionRemarks('') }}>Reject</Button>
        </div>
      ) : null,
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transfer Requests</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage asset transfer requests</p>
        </div>
        {canRequest && (
          <Button onClick={() => { setCreateForm({ asset_id: 0, to_employee_id: 0 }); setAssetSearch(''); setCreateError(null); setCreateOpen(true) }}>
            + New Transfer Request
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {(['PENDING', 'APPROVED', 'REJECTED'] as TabId[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                tab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}>
              {TRANSFER_STATUS_LABELS[t]}
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table columns={columns} data={items} loading={loading} keyExtractor={t => t.id} emptyMessage={`No ${tab.toLowerCase()} transfer requests.`} />
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={15} onPageChange={setPage} />
      </div>

      {/* Create Transfer Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Transfer Request" maxWidth="md">
        <div className="space-y-4">
          {createError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{createError}</p>}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Search Allocated Asset *</label>
            <Input placeholder="Type asset tag or name…" value={assetSearch} onChange={e => setAssetSearch(e.target.value)} />
            {assetOptions.length > 0 && (
              <div className="mt-1 rounded-lg border border-gray-200 bg-white shadow-sm">
                {assetOptions.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => { setCreateForm(f => ({ ...f, asset_id: opt.value })); setAssetSearch(opt.label); setAssetOptions([]) }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-primary-50 ${createForm.asset_id === opt.value ? 'bg-primary-50 font-semibold text-primary-700' : 'text-gray-700'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {createForm.asset_id > 0 && <p className="mt-1 text-xs text-green-600">Asset #{createForm.asset_id} selected</p>}
          </div>

          {/* Transfer To — live search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Transfer To *</label>
            <div className="relative">
              <Input
                placeholder="Type employee name or email…"
                value={toEmpSearch}
                onChange={e => {
                  setToEmpSearch(e.target.value)
                  setCreateForm(f => ({ ...f, to_employee_id: 0 }))
                  setSelectedToEmpName('')
                }}
              />
              {toEmpSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
            {toEmpOptions.length > 0 && createForm.to_employee_id === 0 && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                {toEmpOptions.map(emp => (
                  <button key={emp.id} type="button"
                    onClick={() => {
                      setCreateForm(f => ({ ...f, to_employee_id: emp.id }))
                      setSelectedToEmpName(emp.full_name)
                      setToEmpSearch(emp.full_name)
                      setToEmpOptions([])
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-primary-50"
                  >
                    <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
                    <p className="text-xs text-gray-400">{emp.email} — {emp.role}</p>
                  </button>
                ))}
              </div>
            )}
            {toEmpOptions.length === 0 && toEmpSearch.length > 0 && !toEmpSearching && createForm.to_employee_id === 0 && (
              <p className="mt-1 text-xs text-gray-400">No employees found.</p>
            )}
            {createForm.to_employee_id > 0 && (
              <p className="mt-1 text-xs text-green-600">✓ {selectedToEmpName} selected</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Remarks</label>
            <textarea rows={2} value={createForm.remarks ?? ''} onChange={e => setCreateForm(f => ({ ...f, remarks: e.target.value || null }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Optional reason for transfer" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
          <Button onClick={handleCreate} isLoading={creating}>Submit Request</Button>
        </div>
      </Modal>

      {/* Approve / Reject Modal */}
      <Modal
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title={actionType === 'approve' ? 'Approve Transfer' : 'Reject Transfer'}
        maxWidth="sm"
      >
        <p className="mb-4 text-sm text-gray-600">
          {actionType === 'approve' ? 'Approve' : 'Reject'} transfer request{' '}
          <strong>#{actionTarget?.id}</strong>
          {actionType === 'approve' && (
            <span> — asset will be reallocated to <strong>{empMap[actionTarget?.to_employee_id ?? 0] ?? 'target employee'}</strong></span>
          )}?
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Remarks (optional)</label>
          <textarea rows={2} value={actionRemarks} onChange={e => setActionRemarks(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Add a note…" />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setActionTarget(null)} disabled={actionLoading}>Cancel</Button>
          <Button variant={actionType === 'approve' ? 'primary' : 'danger'} onClick={handleAction} isLoading={actionLoading}>
            {actionType === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
