/**
 * AssetsPage — Asset directory with search, filters, pagination, and registration.
 * ADMIN / ASSET_MANAGER: create, edit, delete, change status.
 * All authenticated users: view.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge, Button, ConfirmDialog, Input, Modal,
  Pagination, Select, Table,
} from '@/components/ui'
import type { Column } from '@/components/ui/Table'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { assetService } from '@/services/asset.service'
import { categoryService } from '@/services/category.service'
import { departmentService } from '@/services/department.service'
import type {
  Asset, AssetCategory, AssetCondition, AssetCreate,
  AssetStatus, Department,
} from '@/types'
import {
  ASSET_CONDITION_LABELS, ASSET_CONDITIONS,
  ASSET_STATUS_LABELS, ASSET_STATUSES,
} from '@/types'
import { formatDate as _formatDate } from '@/utils'

// ── Status badge colour map ───────────────────────────────────────────────────

const STATUS_VARIANT: Record<AssetStatus, 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'> = {
  AVAILABLE:         'green',
  ALLOCATED:         'blue',
  RESERVED:          'yellow',
  UNDER_MAINTENANCE: 'purple',
  LOST:              'red',
  RETIRED:           'gray',
  DISPOSED:          'gray',
}

// ── Empty form ────────────────────────────────────────────────────────────────

const EMPTY_FORM: AssetCreate = {
  name: '',
  category_id: 0,
  serial_number: '',
  department_id: null,
  condition: 'NEW',
  location: '',
  acquisition_date: '',
  acquisition_cost: '',
  description: '',
  is_shared: false,
  photo_url: '',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AssetsPage() {
  useDocumentTitle('Assets')
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER'

  // ── List state ────────────────────────────────────────────────────────────
  const [items, setItems]           = useState<Asset[]>([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch]             = useState('')
  const [filterCategory, setFilterCategory] = useState<number | ''>('')
  const [filterDept, setFilterDept]     = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<AssetStatus | ''>('')
  const [filterShared, setFilterShared] = useState<string>('')
  const [sortBy, setSortBy]             = useState<string>('newest')

  // ── Dropdown data ─────────────────────────────────────────────────────────
  const [categories, setCategories]   = useState<AssetCategory[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  // ── Register modal ────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]           = useState<AssetCreate>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)

  // ── Status change modal ───────────────────────────────────────────────────
  const [statusModal, setStatusModal]   = useState(false)
  const [statusTarget, setStatusTarget] = useState<Asset | null>(null)
  const [newStatus, setNewStatus]       = useState<AssetStatus>('AVAILABLE')
  const [savingStatus, setSavingStatus] = useState(false)

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm]   = useState(false)
  const [deleteTarget, setDeleteTarget]     = useState<Asset | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await assetService.list({
        search:     search || undefined,
        category:   filterCategory || undefined,
        department: filterDept    || undefined,
        status:     (filterStatus as AssetStatus) || undefined,
        is_shared:  filterShared === 'true' ? true : filterShared === 'false' ? false : undefined,
        sort_by:    sortBy as 'newest' | 'oldest' | 'name' | 'category',
        page,
        page_size: 15,
      })
      setItems(res.items)
      setTotal(res.total)
      setTotalPages(res.total_pages)
    } catch { /* handled by interceptor */ } finally { setLoading(false) }
  }, [search, filterCategory, filterDept, filterStatus, filterShared, sortBy, page])

  useEffect(() => { void fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [search, filterCategory, filterDept, filterStatus, filterShared, sortBy])

  useEffect(() => {
    categoryService.list({ active_only: true, page_size: 100 }).then(r => setCategories(r.items)).catch(() => {})
    departmentService.listActive().then(setDepartments).catch(() => {})
  }, [])

  // ── Register asset ────────────────────────────────────────────────────────

  function openRegister() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function setField<K extends keyof AssetCreate>(key: K, value: AssetCreate[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleRegister() {
    if (!form.name.trim())   { setFormError('Asset name is required.'); return }
    if (!form.category_id)   { setFormError('Category is required.'); return }
    setSaving(true); setFormError(null)
    try {
      const payload: AssetCreate = {
        ...form,
        serial_number:    form.serial_number?.trim()    || null,
        location:         form.location?.trim()         || null,
        acquisition_date: form.acquisition_date?.trim() || null,
        acquisition_cost: form.acquisition_cost?.trim() || null,
        description:      form.description?.trim()      || null,
        photo_url:        form.photo_url?.trim()         || null,
        department_id:    form.department_id            || null,
      }
      await assetService.create(payload)
      setModalOpen(false)
      void fetchList()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed.')
    } finally { setSaving(false) }
  }

  // ── Status change ─────────────────────────────────────────────────────────

  async function handleStatusSave() {
    if (!statusTarget) return
    setSavingStatus(true)
    try {
      await assetService.updateStatus(statusTarget.id, newStatus)
      setStatusModal(false); setStatusTarget(null)
      void fetchList()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed.')
    } finally { setSavingStatus(false) }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setConfirmingDelete(true)
    try {
      await assetService.softDelete(deleteTarget.id)
      setDeleteConfirm(false); setDeleteTarget(null)
      void fetchList()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed.')
    } finally { setConfirmingDelete(false) }
  }

  // ── Lookup maps ───────────────────────────────────────────────────────────

  const catMap  = Object.fromEntries(categories.map(c => [c.id, c.name]))
  const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]))

  // ── Table columns ─────────────────────────────────────────────────────────

  const columns: Column<Asset>[] = [
    {
      key: 'tag', header: 'Asset Tag',
      render: a => (
        <span className="font-mono text-xs font-semibold text-primary-700 bg-primary-50
                          rounded px-2 py-0.5">{a.asset_tag}</span>
      ),
    },
    {
      key: 'name', header: 'Name',
      render: a => (
        <button
          onClick={() => navigate(`/assets/${a.id}`)}
          className="text-left font-medium text-gray-900 hover:text-primary-600 hover:underline"
        >
          {a.name}
        </button>
      ),
    },
    {
      key: 'category', header: 'Category',
      render: a => <span className="text-gray-600">{catMap[a.category_id] ?? `#${a.category_id}`}</span>,
    },
    {
      key: 'department', header: 'Department',
      render: a => <span className="text-gray-600">{a.department_id ? deptMap[a.department_id] ?? `#${a.department_id}` : '—'}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: a => (
        <Badge variant={STATUS_VARIANT[a.status]}>
          {ASSET_STATUS_LABELS[a.status]}
        </Badge>
      ),
    },
    {
      key: 'condition', header: 'Condition',
      render: a => <span className="text-sm text-gray-500">{ASSET_CONDITION_LABELS[a.condition]}</span>,
    },
    {
      key: 'location', header: 'Location',
      render: a => <span className="text-gray-500">{a.location ?? '—'}</span>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: a => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => navigate(`/assets/${a.id}`)}>View</Button>
          {canWrite && (
            <>
              <Button size="sm" variant="secondary" onClick={() => {
                setStatusTarget(a); setNewStatus(a.status); setStatusModal(true)
              }}>Status</Button>
              <Button size="sm" variant="danger" onClick={() => {
                setDeleteTarget(a); setDeleteConfirm(true)
              }}>Delete</Button>
            </>
          )}
        </div>
      ),
    },
  ]

  // ── Select options ────────────────────────────────────────────────────────

  const catOptions   = categories.map(c => ({ value: c.id, label: c.name }))
  const deptOptions  = departments.map(d => ({ value: d.id, label: d.name }))
  const statusOptions = ASSET_STATUSES.map(s => ({ value: s, label: ASSET_STATUS_LABELS[s] }))
  const condOptions   = ASSET_CONDITIONS.map(c => ({ value: c, label: ASSET_CONDITION_LABELS[c] }))
  const sortOptions   = [
    { value: 'newest',   label: 'Newest first' },
    { value: 'oldest',   label: 'Oldest first' },
    { value: 'name',     label: 'Name A–Z' },
    { value: 'category', label: 'Category' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Asset Directory</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} asset{total !== 1 ? 's' : ''} registered</p>
        </div>
        {canWrite && <Button onClick={openRegister}>+ Register Asset</Button>}
      </div>

      {/* Search + filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <Input
              placeholder="Search tag, name, serial, location…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value ? Number(e.target.value) : '')}
            options={catOptions}
            placeholder="All categories"
          />
          <Select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value ? Number(e.target.value) : '')}
            options={deptOptions}
            placeholder="All departments"
          />
          <Select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as AssetStatus | '')}
            options={statusOptions}
            placeholder="All statuses"
          />
          <div className="flex gap-2">
            <Select
              value={filterShared}
              onChange={e => setFilterShared(e.target.value)}
              options={[{ value: 'true', label: 'Shared' }, { value: 'false', label: 'Exclusive' }]}
              placeholder="Shared?"
              className="flex-1"
            />
            <Select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              options={sortOptions}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table
          columns={columns}
          data={items}
          loading={loading}
          keyExtractor={a => a.id}
          emptyMessage="No assets found. Register your first asset above."
        />
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={15} onPageChange={setPage} />
      </div>

      {/* ── Register Modal ──────────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Register New Asset" maxWidth="xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {formError && (
            <p className="col-span-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}
          <Input
            label="Asset Name *"
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="e.g. Dell Latitude 5520"
          />
          <Select
            label="Category *"
            value={form.category_id || ''}
            onChange={e => setField('category_id', Number(e.target.value))}
            options={catOptions}
            placeholder="— Select category —"
          />
          <Input
            label="Serial Number"
            value={form.serial_number ?? ''}
            onChange={e => setField('serial_number', e.target.value)}
            placeholder="Optional — must be unique"
          />
          <Select
            label="Department"
            value={form.department_id ?? ''}
            onChange={e => setField('department_id', e.target.value ? Number(e.target.value) : null)}
            options={deptOptions}
            placeholder="— Unassigned —"
          />
          <Select
            label="Condition"
            value={form.condition ?? 'NEW'}
            onChange={e => setField('condition', e.target.value as AssetCondition)}
            options={condOptions}
          />
          <Input
            label="Location"
            value={form.location ?? ''}
            onChange={e => setField('location', e.target.value)}
            placeholder="e.g. HQ Floor 3"
          />
          <Input
            label="Acquisition Date"
            type="date"
            value={form.acquisition_date ?? ''}
            onChange={e => setField('acquisition_date', e.target.value)}
          />
          <Input
            label="Acquisition Cost"
            type="number"
            min="0"
            step="0.01"
            value={form.acquisition_cost ?? ''}
            onChange={e => setField('acquisition_cost', e.target.value)}
            placeholder="0.00"
          />
          <div className="col-span-full">
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={2}
              value={form.description ?? ''}
              onChange={e => setField('description', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                         focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Optional notes"
            />
          </div>
          <Input
            label="Photo URL"
            value={form.photo_url ?? ''}
            onChange={e => setField('photo_url', e.target.value)}
            placeholder="https://…"
          />
          <div className="flex items-center gap-3 pt-5">
            <input
              id="is_shared"
              type="checkbox"
              checked={form.is_shared ?? false}
              onChange={e => setField('is_shared', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is_shared" className="text-sm font-medium text-gray-700">
              Shared resource (can be used by multiple employees)
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleRegister} isLoading={saving}>Register Asset</Button>
        </div>
      </Modal>

      {/* ── Status Change Modal ─────────────────────────────────────────── */}
      <Modal open={statusModal} onClose={() => { setStatusModal(false); setStatusTarget(null) }} title="Change Asset Status" maxWidth="sm">
        <p className="mb-4 text-sm text-gray-600">
          Updating status for <strong>{statusTarget?.name}</strong> ({statusTarget?.asset_tag})
        </p>
        <Select
          label="New Status"
          value={newStatus}
          onChange={e => setNewStatus(e.target.value as AssetStatus)}
          options={statusOptions}
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => { setStatusModal(false); setStatusTarget(null) }} disabled={savingStatus}>Cancel</Button>
          <Button onClick={handleStatusSave} isLoading={savingStatus}>Update Status</Button>
        </div>
      </Modal>

      {/* ── Delete Confirm ──────────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteConfirm}
        title="Delete Asset"
        message={`Soft-delete "${deleteTarget?.name}" (${deleteTarget?.asset_tag})? It will be hidden from the directory but not permanently removed.`}
        confirmLabel="Delete"
        variant="danger"
        loading={confirmingDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setDeleteConfirm(false); setDeleteTarget(null) }}
      />
    </div>
  )
}
