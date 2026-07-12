/**
 * CategoriesTab — CRUD interface for asset categories.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Badge, Button, ConfirmDialog, Input, Modal,
  Pagination, Table,
} from '@/components/ui'
import type { Column } from '@/components/ui/Table'
import { categoryService } from '@/services/category.service'
import type { AssetCategory, CategoryCreate, CategoryUpdate } from '@/types'

const EMPTY_FORM: CategoryCreate = { name: '', description: '', custom_fields: null }

export default function CategoriesTab() {
  const [items, setItems]           = useState<AssetCategory[]>([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(false)

  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState<AssetCategory | null>(null)
  const [form, setForm]             = useState<CategoryCreate>(EMPTY_FORM)
  const [customFieldsRaw, setCustomFieldsRaw] = useState('')
  const [customFieldsError, setCustomFieldsError] = useState('')
  const [formError, setFormError]   = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)

  const [confirmOpen, setConfirmOpen]     = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<AssetCategory | null>(null)
  const [confirming, setConfirming]       = useState(false)

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await categoryService.list({ search: search || undefined, page, page_size: 15 })
      setItems(res.items)
      setTotal(res.total)
      setTotalPages(res.total_pages)
    } catch { /* handled by interceptor */ } finally { setLoading(false) }
  }, [search, page])

  useEffect(() => { void fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [search])

  // ── modal helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setCustomFieldsRaw('')
    setCustomFieldsError('')
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(cat: AssetCategory) {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description ?? '', custom_fields: cat.custom_fields })
    setCustomFieldsRaw(cat.custom_fields ? JSON.stringify(cat.custom_fields, null, 2) : '')
    setCustomFieldsError('')
    setFormError(null)
    setModalOpen(true)
  }

  function parseCustomFields(): Record<string, unknown> | null {
    if (!customFieldsRaw.trim()) return null
    try {
      const parsed = JSON.parse(customFieldsRaw)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
      setCustomFieldsError('')
      return parsed as Record<string, unknown>
    } catch {
      setCustomFieldsError('Must be a valid JSON object, e.g. {"warranty": 24}')
      return undefined as unknown as null
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Category name is required.'); return }
    const cf = parseCustomFields()
    if (customFieldsError) return
    setSaving(true); setFormError(null)
    try {
      const payload = { name: form.name, description: form.description || null, custom_fields: cf }
      if (editing) {
        await categoryService.update(editing.id, payload as CategoryUpdate)
      } else {
        await categoryService.create(payload as CategoryCreate)
      }
      setModalOpen(false); setEditing(null)
      void fetchList()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.')
    } finally { setSaving(false) }
  }

  // ── confirm status ────────────────────────────────────────────────────────

  async function handleStatusConfirm() {
    if (!confirmTarget) return
    setConfirming(true)
    try {
      await categoryService.setStatus(confirmTarget.id, !confirmTarget.is_active)
      setConfirmOpen(false); setConfirmTarget(null)
      void fetchList()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed.')
    } finally { setConfirming(false) }
  }

  // ── columns ───────────────────────────────────────────────────────────────

  const columns: Column<AssetCategory>[] = [
    { key: 'name',    header: 'Name',        render: (c) => <span className="font-medium text-gray-900">{c.name}</span> },
    { key: 'desc',    header: 'Description', render: (c) => <span className="text-gray-500">{c.description ?? '—'}</span> },
    {
      key: 'cf',
      header: 'Custom Fields',
      render: (c) => c.custom_fields
        ? <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{JSON.stringify(c.custom_fields)}</code>
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <Badge variant={c.is_active ? 'green' : 'gray'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (c) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Edit</Button>
          <Button size="sm" variant={c.is_active ? 'danger' : 'secondary'} onClick={() => { setConfirmTarget(c); setConfirmOpen(true) }}>
            {c.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ]

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-64">
          <Input placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openCreate}>+ New Category</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table columns={columns} data={items} loading={loading} keyExtractor={(c) => c.id} emptyMessage="No categories found." />
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={15} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={editing ? 'Edit Category' : 'New Category'} maxWidth="lg">
        <div className="space-y-4">
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
          <Input id="cat-name" label="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Laptops" />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Optional description" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Custom Fields <span className="text-xs font-normal text-gray-400">(JSON object)</span>
            </label>
            <textarea rows={3} value={customFieldsRaw} onChange={(e) => { setCustomFieldsRaw(e.target.value); setCustomFieldsError('') }}
              className={`block w-full rounded-lg border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 ${customFieldsError ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'}`}
              placeholder={'{\n  "warranty_months": 24\n}'} />
            {customFieldsError && <p className="mt-1 text-xs text-red-600">{customFieldsError}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => { setModalOpen(false); setEditing(null) }} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} isLoading={saving}>{editing ? 'Save Changes' : 'Create'}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTarget?.is_active ? 'Deactivate Category' : 'Activate Category'}
        message={`${confirmTarget?.is_active ? 'Deactivate' : 'Activate'} "${confirmTarget?.name}"?`}
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
        variant={confirmTarget?.is_active ? 'danger' : 'primary'}
        loading={confirming}
        onConfirm={handleStatusConfirm}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null) }}
      />
    </div>
  )
}