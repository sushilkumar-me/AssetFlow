/**
 * AssetDetailPage — read-only detail view for a single asset.
 * All authenticated users can view. Edit actions visible to ADMIN / ASSET_MANAGER.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Modal, Select, Spinner } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { assetService } from '@/services/asset.service'
import { categoryService } from '@/services/category.service'
import { departmentService } from '@/services/department.service'
import type { Asset, AssetCategory, AssetStatus, Department } from '@/types'
import {
  ASSET_CONDITION_LABELS,
  ASSET_STATUS_LABELS,
  ASSET_STATUSES,
} from '@/types'
import { formatDate } from '@/utils'

// ── Status badge colours ──────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  AssetStatus,
  'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'
> = {
  AVAILABLE:         'green',
  ALLOCATED:         'blue',
  RESERVED:          'yellow',
  UNDER_MAINTENANCE: 'purple',
  LOST:              'red',
  RETIRED:           'gray',
  DISPOSED:          'gray',
}

// ── Helper: detail row ────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between py-3 border-b border-gray-100 last:border-0">
      <dt className="min-w-[10rem] text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 sm:text-right">{children}</dd>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER'

  const [asset, setAsset]         = useState<Asset | null>(null)
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)

  const [categories, setCategories]   = useState<AssetCategory[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  // Status change modal
  const [statusModal, setStatusModal]     = useState(false)
  const [newStatus, setNewStatus]         = useState<AssetStatus>('AVAILABLE')
  const [savingStatus, setSavingStatus]   = useState(false)
  const [statusError, setStatusError]     = useState<string | null>(null)

  useDocumentTitle(asset ? `${asset.asset_tag} — ${asset.name}` : 'Asset Detail')

  // ── Fetch asset ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return
    setLoading(true)
    assetService
      .getById(Number(id))
      .then(a => { setAsset(a); setNewStatus(a.status) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    categoryService.list({ active_only: false, page_size: 200 }).then(r => setCategories(r.items)).catch(() => {})
    departmentService.listActive().then(setDepartments).catch(() => {})
  }, [])

  // ── Status change ─────────────────────────────────────────────────────────

  async function handleStatusSave() {
    if (!asset) return
    setSavingStatus(true); setStatusError(null)
    try {
      const updated = await assetService.updateStatus(asset.id, newStatus)
      setAsset(updated)
      setStatusModal(false)
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update status.')
    } finally { setSavingStatus(false) }
  }

  // ── Lookup helpers ────────────────────────────────────────────────────────

  const catName  = asset ? (categories.find(c => c.id === asset.category_id)?.name ?? `#${asset.category_id}`) : '—'
  const deptName = asset?.department_id
    ? (departments.find(d => d.id === asset.department_id)?.name ?? `#${asset.department_id}`)
    : 'Unassigned'

  const statusOptions = ASSET_STATUSES.map(s => ({ value: s, label: ASSET_STATUS_LABELS[s] }))

  // ── Loading / not found states ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (notFound || !asset) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-4xl font-bold text-gray-300">404</p>
        <p className="mt-2 text-lg font-semibold text-gray-700">Asset not found</p>
        <Button className="mt-6" variant="secondary" onClick={() => navigate('/assets')}>
          Back to Assets
        </Button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Breadcrumb + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate('/assets')} className="hover:text-primary-600 hover:underline">
            Assets
          </button>
          <span>/</span>
          <span className="font-medium text-gray-900">{asset.asset_tag}</span>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => { setNewStatus(asset.status); setStatusModal(true) }}
            >
              Change Status
            </Button>
          </div>
        )}
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-primary-50 px-3 py-1 font-mono text-sm font-bold text-primary-700">
                {asset.asset_tag}
              </span>
              <Badge variant={STATUS_VARIANT[asset.status]}>
                {ASSET_STATUS_LABELS[asset.status]}
              </Badge>
              {!asset.is_active && (
                <Badge variant="red">Deleted</Badge>
              )}
              {asset.is_shared && (
                <Badge variant="yellow">Shared</Badge>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{asset.name}</h1>
          </div>

          {/* Photo placeholder / real photo */}
          {asset.photo_url ? (
            <img
              src={asset.photo_url}
              alt={asset.name}
              className="h-24 w-24 rounded-xl object-cover border border-gray-200"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2
                             border-dashed border-gray-200 bg-gray-50 text-gray-300">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25
                     2.25 0 013.182 0l2.909 2.909M3 20.25h18A.75.75 0 0021.75 19.5V4.5A.75.75 0
                     0021 3.75H3A.75.75 0 002.25 4.5v15a.75.75 0 00.75.75z" />
              </svg>
            </div>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 divide-y divide-gray-100 px-6 py-2 lg:grid-cols-2 lg:divide-y-0 lg:divide-x">
          {/* Left column */}
          <div className="py-4 lg:pr-8">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Classification
            </h2>
            <dl>
              <Row label="Category">{catName}</Row>
              <Row label="Department">{deptName}</Row>
              <Row label="Condition">{ASSET_CONDITION_LABELS[asset.condition]}</Row>
              <Row label="Location">{asset.location ?? '—'}</Row>
              <Row label="Serial Number">{asset.serial_number ?? '—'}</Row>
            </dl>
          </div>

          {/* Right column */}
          <div className="py-4 lg:pl-8">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Acquisition
            </h2>
            <dl>
              <Row label="Acquisition Date">
                {asset.acquisition_date ? formatDate(asset.acquisition_date) : '—'}
              </Row>
              <Row label="Acquisition Cost">
                {asset.acquisition_cost
                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                      Number(asset.acquisition_cost),
                    )
                  : '—'}
              </Row>
              <Row label="Shared Resource">{asset.is_shared ? 'Yes' : 'No'}</Row>
              <Row label="Registered">
                {formatDate(asset.created_at)}
              </Row>
              <Row label="Last Updated">
                {formatDate(asset.updated_at)}
              </Row>
            </dl>
          </div>
        </div>

        {/* Description */}
        {asset.description && (
          <div className="border-t border-gray-100 px-6 py-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Description
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {asset.description}
            </p>
          </div>
        )}
      </div>

      {/* Status change modal */}
      <Modal
        open={statusModal}
        onClose={() => { setStatusModal(false); setStatusError(null) }}
        title="Change Asset Status"
        maxWidth="sm"
      >
        {statusError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{statusError}</p>
        )}
        <p className="mb-4 text-sm text-gray-600">
          Current status:{' '}
          <Badge variant={STATUS_VARIANT[asset.status]}>
            {ASSET_STATUS_LABELS[asset.status]}
          </Badge>
        </p>
        <Select
          label="New Status"
          value={newStatus}
          onChange={e => setNewStatus(e.target.value as AssetStatus)}
          options={statusOptions}
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => { setStatusModal(false); setStatusError(null) }}
            disabled={savingStatus}
          >
            Cancel
          </Button>
          <Button onClick={handleStatusSave} isLoading={savingStatus}>
            Update Status
          </Button>
        </div>
      </Modal>
    </div>
  )
}
