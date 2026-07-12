/**
 * AllocationsPage — allocate assets to employees, return them, view history.
 * Write access: ADMIN / ASSET_MANAGER.
 * Read access: all authenticated users.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Badge, Button, Input, Modal,
  Pagination, Select, Spinner, Table,
} from '@/components/ui'
import type { Column } from '@/components/ui/Table'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { allocationService } from '@/services/allocation.service'
import { assetService } from '@/services/asset.service'
import { employeeService } from '@/services/employee.service'
import type {
  AllocateRequest, AllocationStatus, AssetAllocation, Employee,
} from '@/types'
import { ALLOCATION_STATUSES, ALLOCATION_STATUS_LABELS } from '@/types'
import { formatDate } from '@/utils'

// ── Badge variant map ─────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<AllocationStatus, 'green' | 'gray' | 'red'> = {
  ACTIVE:   'green',
  RETURNED: 'gray',
  OVERDUE:  'red',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AllocationsPage() {
  useDocumentTitle('Allocations')
  const { user } = useAuth()
  const canWrite = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER'

  // ── List state ────────────────────────────────────────────────────────────
  const [items, setItems]           = useState<AssetAllocation[]>([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [filterStatus, setFilterStatus] = useState<AllocationStatus | ''>('')

  // ── Employee lookup map (for table display) ───────────────────────────────
  const [empMap, setEmpMap] = useState<Record<number, string>>({})

  // ── Allocate modal state ──────────────────────────────────────────────────
  const [allocModal, setAllocModal] = useState(false)
  const [allocForm, setAllocForm]   = useState<AllocateRequest>({ asset_id: 0, employee_id: 0 })

  // Asset live-search
  const [assetSearch, setAssetSearch]     = useState('')
  const [assetOptions, setAssetOptions]   = useState<{ value: number; label: string }[]>([])

  // Employee live-search
  const [empSearch, setEmpSearch]         = useState('')
  const [empOptions, setEmpOptions]       = useState<Employee[]>([])
  const [empSearching, setEmpSearching]   = useState(false)
  const [selectedEmpName, setSelectedEmpName] = useState('')

  const [allocError, setAllocError]   = useState<string | null>(null)
  const [allocSaving, setAllocSaving] = useState(false)

  // ── Return dialog ─────────────────────────────────────────────────────────
  const [returnOpen, setReturnOpen]     = useState(false)
  const [returnTarget, setReturnTarget] = useState<AssetAllocation | null>(null)
  const [returnNotes, setReturnNotes]   = useState('')
  const [returning, setReturning]       = useState(false)

  // ── Fetch allocation list ─────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await allocationService.list({
        status: (filterStatus as AllocationStatus) || undefined,
        page,
        page_size: 15,
      })
      setItems(res.items)
      setTotal(res.total)
      setTotalPages(res.total_pages)

      // Build employee lookup from the results + any already cached
      const ids = [...new Set(res.items.flatMap(a => [a.employee_id, a.allocated_by]))]
      const missing = ids.filter(id => !empMap[id])
      if (missing.length > 0) {
        employeeService.list({ page_size: 200 }).then(r => {
          const map: Record<number, string> = {}
          r.items.forEach(e => { map[e.id] = e.full_name })
          setEmpMap(prev => ({ ...prev, ...map }))
        }).catch(() => {})
      }
    } catch { /* handled by interceptor */ } finally { setLoading(false) }
  }, [filterStatus, page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [filterStatus])

  // Load all employees once for the lookup map on mount
  useEffect(() => {
    employeeService.list({ page_size: 200 }).then(r => {
      const map: Record<number, string> = {}
      r.items.forEach(e => { map[e.id] = e.full_name })
      setEmpMap(map)
    }).catch(() => {})
  }, [])

  // ── Asset live-search ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!assetSearch.trim()) { setAssetOptions([]); return }
    assetService
      .list({ search: assetSearch, status: 'AVAILABLE', page_size: 10 })
      .then(r => setAssetOptions(r.items.map(a => ({ value: a.id, label: `${a.asset_tag} — ${a.name}` }))))
      .catch(() => {})
  }, [assetSearch])

  // ── Employee live-search (runs when modal is open) ────────────────────────
  useEffect(() => {
    if (!allocModal) return
    setEmpSearching(true)
    employeeService
      .list({ search: empSearch.trim() || undefined, page_size: 20 })
      .then(r => setEmpOptions(r.items))
      .catch(() => {})
      .finally(() => setEmpSearching(false))
  }, [empSearch, allocModal])

  // ── Open allocate modal ───────────────────────────────────────────────────

  function openAllocModal() {
    setAllocForm({ asset_id: 0, employee_id: 0 })
    setAssetSearch('')
    setAssetOptions([])
    setEmpSearch('')
    setEmpOptions([])
    setSelectedEmpName('')
    setAllocError(null)
    setAllocModal(true)
  }

  // ── Allocate ──────────────────────────────────────────────────────────────

  async function handleAllocate() {
    if (!allocForm.asset_id)    { setAllocError('Please select an asset.'); return }
    if (!allocForm.employee_id) { setAllocError('Please select an employee.'); return }
    setAllocSaving(true); setAllocError(null)
    try {
      await allocationService.allocate(allocForm)
      setAllocModal(false)
      void fetchList()
    } catch (err) {
      setAllocError(err instanceof Error ? err.message : 'Allocation failed.')
    } finally { setAllocSaving(false) }
  }

  // ── Return ────────────────────────────────────────────────────────────────

  async function handleReturn() {
    if (!returnTarget) return
    setReturning(true)
    try {
      await allocationService.returnAsset(returnTarget.id, { condition_notes: returnNotes || null })
      setReturnOpen(false); setReturnTarget(null); setReturnNotes('')
      void fetchList()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Return failed.')
    } finally { setReturning(false) }
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: Column<AssetAllocation>[] = [
    {
      key: 'asset', header: 'Asset',
      render: a => <span className="font-mono text-xs font-semibold text-primary-700">#{a.asset_id}</span>,
    },
    {
      key: 'employee', header: 'Employee',
      render: a => <span className="font-medium text-gray-900">{empMap[a.employee_id] ?? `Employee #${a.employee_id}`}</span>,
    },
    {
      key: 'allocated_by', header: 'Allocated By',
      render: a => <span className="text-gray-600">{empMap[a.allocated_by] ?? `#${a.allocated_by}`}</span>,
    },
    {
      key: 'allocated', header: 'Allocated Date',
      render: a => <span className="text-gray-600">{formatDate(a.allocated_at)}</span>,
    },
    {
      key: 'expected', header: 'Expected Return',
      render: a => a.expected_return_date
        ? <span className={a.status === 'OVERDUE' ? 'font-semibold text-red-600' : 'text-gray-600'}>{formatDate(a.expected_return_date)}</span>
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'returned', header: 'Returned',
      render: a => a.returned_at
        ? <span className="text-gray-600">{formatDate(a.returned_at)}</span>
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'status', header: 'Status',
      render: a => <Badge variant={STATUS_VARIANT[a.status]}>{ALLOCATION_STATUS_LABELS[a.status]}</Badge>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: a => canWrite && (a.status === 'ACTIVE' || a.status === 'OVERDUE') ? (
        <Button size="sm" variant="secondary" onClick={() => { setReturnTarget(a); setReturnNotes(''); setReturnOpen(true) }}>
          Return
        </Button>
      ) : null,
    },
  ]

  const statusOptions = ALLOCATION_STATUSES.map(s => ({ value: s, label: ALLOCATION_STATUS_LABELS[s] }))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Allocations</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} record{total !== 1 ? 's' : ''}</p>
        </div>
        {canWrite && <Button onClick={openAllocModal}>+ Allocate Asset</Button>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <Select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as AllocationStatus | '')}
            options={statusOptions}
            placeholder="All statuses"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table columns={columns} data={items} loading={loading} keyExtractor={a => a.id} emptyMessage="No allocations found." />
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={15} onPageChange={setPage} />
      </div>

      {/* ── Allocate Modal ──────────────────────────────────────────────── */}
      <Modal open={allocModal} onClose={() => setAllocModal(false)} title="Allocate Asset" maxWidth="md">
        <div className="space-y-4">
          {allocError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{allocError}</p>
          )}

          {/* Asset search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Search Available Asset *
            </label>
            <Input
              placeholder="Type asset tag or name…"
              value={assetSearch}
              onChange={e => { setAssetSearch(e.target.value); setAllocForm(f => ({ ...f, asset_id: 0 })) }}
            />
            {assetOptions.length > 0 && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                {assetOptions.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => {
                      setAllocForm(f => ({ ...f, asset_id: opt.value }))
                      setAssetSearch(opt.label)
                      setAssetOptions([])
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-primary-50 ${allocForm.asset_id === opt.value ? 'bg-primary-50 font-semibold text-primary-700' : 'text-gray-700'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {allocForm.asset_id > 0 && (
              <p className="mt-1 text-xs text-green-600">✓ Asset selected (ID: {allocForm.asset_id})</p>
            )}
          </div>

          {/* Employee live-search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Search Employee *
            </label>
            <div className="relative">
              <Input
                placeholder="Type employee name or email…"
                value={empSearch}
                onChange={e => { setEmpSearch(e.target.value); setAllocForm(f => ({ ...f, employee_id: 0 })); setSelectedEmpName('') }}
              />
              {empSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
            {empOptions.length > 0 && allocForm.employee_id === 0 && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                {empOptions.map(emp => (
                  <button key={emp.id} type="button"
                    onClick={() => {
                      setAllocForm(f => ({ ...f, employee_id: emp.id }))
                      setSelectedEmpName(emp.full_name)
                      setEmpSearch(emp.full_name)
                      setEmpOptions([])
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-primary-50"
                  >
                    <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
                    <p className="text-xs text-gray-400">{emp.email} — {emp.role}</p>
                  </button>
                ))}
              </div>
            )}
            {empOptions.length === 0 && empSearch.length > 0 && !empSearching && allocForm.employee_id === 0 && (
              <p className="mt-1 text-xs text-gray-400">No employees found — try a different search.</p>
            )}
            {allocForm.employee_id > 0 && (
              <p className="mt-1 text-xs text-green-600">✓ {selectedEmpName} selected</p>
            )}
          </div>

          <Input
            label="Expected Return Date"
            type="date"
            value={allocForm.expected_return_date ?? ''}
            onChange={e => setAllocForm(f => ({ ...f, expected_return_date: e.target.value || null }))}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              rows={2}
              value={allocForm.condition_notes ?? ''}
              onChange={e => setAllocForm(f => ({ ...f, condition_notes: e.target.value || null }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                         focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Optional notes about asset condition"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setAllocModal(false)} disabled={allocSaving}>Cancel</Button>
          <Button onClick={handleAllocate} isLoading={allocSaving}>Allocate</Button>
        </div>
      </Modal>

      {/* ── Return Dialog ───────────────────────────────────────────────── */}
      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Return Asset" maxWidth="sm">
        <p className="mb-4 text-sm text-gray-600">
          Confirm return of allocation <strong>#{returnTarget?.id}</strong>
          {returnTarget && empMap[returnTarget.employee_id] && (
            <> from <strong>{empMap[returnTarget.employee_id]}</strong></>
          )}
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Condition Notes</label>
          <textarea
            rows={3}
            value={returnNotes}
            onChange={e => setReturnNotes(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                       focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Describe asset condition at return (optional)"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setReturnOpen(false)} disabled={returning}>Cancel</Button>
          <Button onClick={handleReturn} isLoading={returning}>Confirm Return</Button>
        </div>
      </Modal>
    </div>
  )
}
