/**
 * BookingsPage — list, create, cancel and reschedule resource bookings.
 * All authenticated users can create bookings for shared assets.
 * Employees see only their own; Managers/Admins see all.
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
import { bookingService } from '@/services/booking.service'
import { assetService } from '@/services/asset.service'
import type {
  Asset, BookingCreate, BookingReschedule,
  BookingStatus, ResourceBooking,
} from '@/types'
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS } from '@/types'
import { formatDate as _formatDate } from '@/utils'

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<BookingStatus, 'green' | 'blue' | 'gray' | 'red'> = {
  UPCOMING:  'green',
  ONGOING:   'blue',
  COMPLETED: 'gray',
  CANCELLED: 'red',
}

// ── Date/time helper ──────────────────────────────────────────────────────────

function toLocalInput(iso: string): string {
  // Convert ISO UTC string → local datetime-local input value (YYYY-MM-DDTHH:mm)
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToISO(value: string): string {
  // Convert datetime-local input value → ISO string with local timezone offset
  if (!value) return ''
  return new Date(value).toISOString()
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Empty form ────────────────────────────────────────────────────────────────

const EMPTY_FORM: BookingCreate = {
  asset_id: 0,
  title: '',
  purpose: '',
  start_datetime: '',
  end_datetime: '',
  remarks: '',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  useDocumentTitle('Bookings')
  const { } = useAuth()  // auth context available for future role-based actions
  const navigate = useNavigate()
  // ── List state ────────────────────────────────────────────────────────────
  const [items, setItems]           = useState<ResourceBooking[]>([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [filterStatus, setFilterStatus] = useState<BookingStatus | ''>('')

  // ── Shared resource lookup ────────────────────────────────────────────────
  const [assetMap, setAssetMap] = useState<Record<number, Asset>>({})
  const [assetSearch, setAssetSearch] = useState('')
  const [assetOptions, setAssetOptions] = useState<Asset[]>([])

  // ── Create modal ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm]             = useState<BookingCreate>(EMPTY_FORM)
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating]       = useState(false)

  // ── Reschedule modal ──────────────────────────────────────────────────────
  const [reschedTarget, setReschedTarget] = useState<ResourceBooking | null>(null)
  const [reschedForm, setReschedForm] = useState<BookingReschedule>({ start_datetime: '', end_datetime: '' })
  const [reschedError, setReschedError]   = useState<string | null>(null)
  const [rescheduling, setRescheduling]   = useState(false)

  // ── Cancel confirm ────────────────────────────────────────────────────────
  const [cancelTarget, setCancelTarget]   = useState<ResourceBooking | null>(null)
  const [cancelling, setCancelling]       = useState(false)

  // ── Fetch list ────────────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await bookingService.list({
        status: (filterStatus as BookingStatus) || undefined,
        page,
        page_size: 15,
      })
      setItems(res.items)
      setTotal(res.total)
      setTotalPages(res.total_pages)

      // Populate asset lookup map for new IDs
      const ids = [...new Set(res.items.map(b => b.asset_id))]
      const missing = ids.filter(id => !assetMap[id])
      if (missing.length > 0) {
        Promise.all(missing.map(id => assetService.getById(id))).then(assets => {
          const map: Record<number, Asset> = {}
          assets.forEach(a => { map[a.id] = a })
          setAssetMap(prev => ({ ...prev, ...map }))
        }).catch(() => {})
      }
    } catch { /* handled */ } finally { setLoading(false) }
  }, [filterStatus, page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [filterStatus])

  // ── Shared-asset live search for booking form ─────────────────────────────
  useEffect(() => {
    if (!assetSearch.trim() || !createOpen) { setAssetOptions([]); return }
    assetService
      .list({ search: assetSearch, active_only: true, page_size: 10 })
      .then(r => setAssetOptions(r.items.filter(a => a.is_shared)))
      .catch(() => {})
  }, [assetSearch, createOpen])

  // ── Create ────────────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM)
    setAssetSearch('')
    setAssetOptions([])
    setCreateError(null)
    setCreateOpen(true)
  }

  async function handleCreate() {
    if (!form.asset_id)          { setCreateError('Select a shared resource.'); return }
    if (!form.title.trim())      { setCreateError('Title is required.'); return }
    if (!form.start_datetime)    { setCreateError('Start date/time is required.'); return }
    if (!form.end_datetime)      { setCreateError('End date/time is required.'); return }
    setCreating(true); setCreateError(null)
    try {
      await bookingService.create({
        ...form,
        purpose: form.purpose || null,
        remarks: form.remarks  || null,
      })
      setCreateOpen(false)
      void fetchList()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Booking failed.')
    } finally { setCreating(false) }
  }

  // ── Reschedule ────────────────────────────────────────────────────────────

  function openReschedule(b: ResourceBooking) {
    setReschedTarget(b)
    setReschedForm({
      start_datetime: toLocalInput(b.start_datetime),
      end_datetime:   toLocalInput(b.end_datetime),
      remarks: b.remarks ?? '',
    })
    setReschedError(null)
  }

  async function handleReschedule() {
    if (!reschedTarget) return
    setRescheduling(true); setReschedError(null)
    try {
      await bookingService.reschedule(reschedTarget.id, {
        start_datetime: localInputToISO(reschedForm.start_datetime),
        end_datetime:   localInputToISO(reschedForm.end_datetime),
        remarks:        reschedForm.remarks || null,
      })
      setReschedTarget(null)
      void fetchList()
    } catch (err) {
      setReschedError(err instanceof Error ? err.message : 'Reschedule failed.')
    } finally { setRescheduling(false) }
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  async function handleCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await bookingService.cancel(cancelTarget.id)
      setCancelTarget(null)
      void fetchList()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cancel failed.')
    } finally { setCancelling(false) }
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: Column<ResourceBooking>[] = [
    {
      key: 'resource', header: 'Resource',
      render: b => {
        const a = assetMap[b.asset_id]
        return a ? (
          <div>
            <p className="font-medium text-gray-900">{a.name}</p>
            <p className="text-xs font-mono text-primary-600">{a.asset_tag}</p>
          </div>
        ) : <span className="text-gray-400">#{b.asset_id}</span>
      },
    },
    { key: 'title', header: 'Title', render: b => <span className="font-medium text-gray-800">{b.title}</span> },
    { key: 'start', header: 'Start', render: b => <span className="text-sm text-gray-600">{formatDateTime(b.start_datetime)}</span> },
    { key: 'end',   header: 'End',   render: b => <span className="text-sm text-gray-600">{formatDateTime(b.end_datetime)}</span> },
    {
      key: 'status', header: 'Status',
      render: b => <Badge variant={STATUS_BADGE[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: b => (
        <div className="flex justify-end gap-1.5">
          {b.status === 'UPCOMING' && (
            <>
              <Button size="sm" variant="ghost" onClick={() => openReschedule(b)}>Reschedule</Button>
              <Button size="sm" variant="danger" onClick={() => setCancelTarget(b)}>Cancel</Button>
            </>
          )}
        </div>
      ),
    },
  ]

  const statusOptions = BOOKING_STATUSES.map(s => ({ value: s, label: BOOKING_STATUS_LABELS[s] }))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Resource Bookings</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} booking{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/bookings/calendar')}>
            Calendar View
          </Button>
          <Button onClick={openCreate}>+ New Booking</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <Select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as BookingStatus | '')}
            options={statusOptions}
            placeholder="All statuses"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table columns={columns} data={items} loading={loading} keyExtractor={b => b.id} emptyMessage="No bookings found." />
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={15} onPageChange={setPage} />
      </div>

      {/* ── Create Booking Modal ────────────────────────────────────────── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Resource Booking" maxWidth="lg">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {createError && (
            <p className="col-span-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{createError}</p>
          )}

          {/* Shared resource search */}
          <div className="col-span-full">
            <label className="mb-1 block text-sm font-medium text-gray-700">Shared Resource *</label>
            <Input
              placeholder="Type resource name (meeting room, projector…)"
              value={assetSearch}
              onChange={e => { setAssetSearch(e.target.value); setForm(f => ({ ...f, asset_id: 0 })) }}
            />
            {assetOptions.length > 0 && form.asset_id === 0 && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                {assetOptions.map(a => (
                  <button key={a.id} type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, asset_id: a.id }))
                      setAssetSearch(`${a.asset_tag} — ${a.name}`)
                      setAssetOptions([])
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-primary-50"
                  >
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.asset_tag}{a.location ? ` · ${a.location}` : ''}</p>
                  </button>
                ))}
              </div>
            )}
            {assetOptions.length === 0 && assetSearch.length > 2 && form.asset_id === 0 && (
              <p className="mt-1 text-xs text-gray-400">No shared resources found. Make sure the asset has "Shared Resource" enabled.</p>
            )}
            {form.asset_id > 0 && (
              <p className="mt-1 text-xs text-green-600">✓ Resource selected (ID: {form.asset_id})</p>
            )}
          </div>

          <Input
            label="Title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Q3 Planning Meeting"
            className="col-span-full"
          />

          <Input
            label="Start Date & Time *"
            type="datetime-local"
            value={form.start_datetime}
            onChange={e => setForm(f => ({ ...f, start_datetime: e.target.value }))}
          />
          <Input
            label="End Date & Time *"
            type="datetime-local"
            value={form.end_datetime}
            onChange={e => setForm(f => ({ ...f, end_datetime: e.target.value }))}
          />

          <div className="col-span-full">
            <label className="mb-1 block text-sm font-medium text-gray-700">Purpose</label>
            <textarea
              rows={2}
              value={form.purpose ?? ''}
              onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                         focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Brief description of the purpose"
            />
          </div>

          <Input
            label="Remarks"
            value={form.remarks ?? ''}
            onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
            placeholder="Any additional notes"
            className="col-span-full"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
          <Button onClick={handleCreate} isLoading={creating}>Book Resource</Button>
        </div>
      </Modal>

      {/* ── Reschedule Modal ────────────────────────────────────────────── */}
      <Modal
        open={!!reschedTarget}
        onClose={() => setReschedTarget(null)}
        title="Reschedule Booking"
        maxWidth="sm"
      >
        <p className="mb-4 text-sm text-gray-600">
          Rescheduling: <strong>{reschedTarget?.title}</strong>
        </p>
        {reschedError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{reschedError}</p>
        )}
        <div className="space-y-3">
          <Input
            label="New Start Date & Time *"
            type="datetime-local"
            value={reschedForm.start_datetime}
            onChange={e => setReschedForm(f => ({ ...f, start_datetime: e.target.value }))}
          />
          <Input
            label="New End Date & Time *"
            type="datetime-local"
            value={reschedForm.end_datetime}
            onChange={e => setReschedForm(f => ({ ...f, end_datetime: e.target.value }))}
          />
          <Input
            label="Remarks"
            value={reschedForm.remarks ?? ''}
            onChange={e => setReschedForm(f => ({ ...f, remarks: e.target.value }))}
            placeholder="Reason for rescheduling"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setReschedTarget(null)} disabled={rescheduling}>Cancel</Button>
          <Button onClick={handleReschedule} isLoading={rescheduling}>Confirm Reschedule</Button>
        </div>
      </Modal>

      {/* ── Cancel Confirm ──────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Booking"
        message={`Cancel booking "${cancelTarget?.title}"? This cannot be undone.`}
        confirmLabel="Cancel Booking"
        variant="danger"
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  )
}
