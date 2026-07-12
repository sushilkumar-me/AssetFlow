/**
 * DepartmentsTab — CRUD interface for departments.
 * Accessible only to ADMIN users (enforced by OrganizationPage).
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Badge, Button, ConfirmDialog, Input, Modal,
  Pagination, Select, Table,
} from '@/components/ui'
import type { Column } from '@/components/ui/Table'
import { departmentService } from '@/services/department.service'
import type { Department, DepartmentCreate, DepartmentUpdate } from '@/types'

// ── helpers ───────────────────────────────────────────────────────────────────

const EMPTY_FORM: DepartmentCreate = {
  name: '',
  description: '',
  parent_department_id: null,
  department_head_id: null,
}

// ── component ─────────────────────────────────────────────────────────────────

export default function DepartmentsTab() {
  // List state
  const [items, setItems]         = useState<Department[]>([])
  const [total, setTotal]         = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(false)

  // All active depts for parent dropdown
  const [activeDepts, setActiveDepts] = useState<Department[]>([])

  // Modal state
  const [modalOpen, setModalOpen]     = useState(false)
  const [editing, setEditing]         = useState<Department | null>(null)
  const [form, setForm]               = useState<DepartmentCreate>(EMPTY_FORM)
  const [formError, setFormError]     = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen]   = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<Department | null>(null)
  const [confirming, setConfirming]     = useState(false)

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await departmentService.list({ search: search || undefined, page, page_size: 15 })
      setItems(res.items)
      setTotal(res.total)
      setTotalPages(res.total_pages)
    } catch {
      // error handled by axios interceptor
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { void fetchList() }, [fetchList])

  useEffect(() => {
    departmentService.listActive().then(setActiveDepts).catch(() => {})
  }, [])

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1) }, [search])

  // ── modal helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(dept: Department) {
    setEditing(dept)
    setForm({
      name: dept.name,
      description: dept.description ?? '',
      parent_department_id: dept.parent_department_id,
      department_head_id: dept.department_head_id,
    })
    setFormError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Department name is required.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        const payload: DepartmentUpdate = {
          name: form.name,
          description: form.description || null,
          parent_department_id: form.parent_department_id ?? null,
          department_head_id: form.department_head_id ?? null,
        }
        await departmentService.update(editing.id, payload)
      } else {
        await departmentService.create(form)
      }
      closeModal()
      void fetchList()
      departmentService.listActive().then(setActiveDepts).catch(() => {})
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  // ── status toggle ─────────────────────────────────────────────────────────

  function askStatusChange(dept: Department) {
    setConfirmTarget(dept)
    setConfirmOpen(true)
  }

  async function handleStatusConfirm() {
    if (!confirmTarget) return
    setConfirming(true)
    try {
      await departmentService.setStatus(confirmTarget.id, !confirmTarget.is_active)
      setConfirmOpen(false)
      setConfirmTarget(null)
      void fetchList()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setConfirming(false)
    }
  }

  // ── table columns ─────────────────────────────────────────────────────────

  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (d) => <span className="font-medium text-gray-900">{d.name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (d) => <span className="text-gray-500">{d.description ?? '—'}</span>,
    },
    {
      key: 'parent',
      header: 'Parent',
      render: (d) => {
        if (!d.parent_department_id) return <span className="text-gray-400">—</span>
        const parent = activeDepts.find((p) => p.id === d.parent_department_id)
        return <span className="text-gray-600">{parent?.name ?? `#${d.parent_department_id}`}</span>
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <Badge variant={d.is_active ? 'green' : 'gray'}>
          {d.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (d) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => openEdit(d)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant={d.is_active ? 'danger' : 'secondary'}
            onClick={() => askStatusChange(d)}
          >
            {d.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ]

  // ── parent department options (exclude self when editing) ─────────────────

  const parentOptions = activeDepts
    .filter((d) => !editing || d.id !== editing.id)
    .map((d) => ({ value: d.id, label: d.name }))

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search departments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openCreate}>+ New Department</Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table
          columns={columns}
          data={items}
          loading={loading}
          keyExtractor={(d) => d.id}
          emptyMessage="No departments found."
        />
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={15}
          onPageChange={setPage}
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Department' : 'New Department'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}
          <Input
            id="dept-name"
            label="Name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Engineering"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                         placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Optional description"
            />
          </div>
          <Select
            id="dept-parent"
            label="Parent Department"
            value={form.parent_department_id ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                parent_department_id: e.target.value ? Number(e.target.value) : null,
              }))
            }
            options={parentOptions}
            placeholder="— None —"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} isLoading={saving}>{editing ? 'Save Changes' : 'Create'}</Button>
        </div>
      </Modal>

      {/* Confirm status change */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmTarget?.is_active ? 'Deactivate Department' : 'Activate Department'}
        message={
          confirmTarget?.is_active
            ? `Deactivate "${confirmTarget.name}"? Active employees must be reassigned first.`
            : `Activate "${confirmTarget?.name}"?`
        }
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
        variant={confirmTarget?.is_active ? 'danger' : 'primary'}
        loading={confirming}
        onConfirm={handleStatusConfirm}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null) }}
      />
    </div>
  )
}
