/**
 * AllocationHistoryPage — full timeline of allocations and transfers for an asset.
 * Any authenticated user can view. Accessed via /allocations/history?asset=<id>
 * or linked from the asset detail page.
 */

import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Badge, Input, Spinner } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { allocationService } from '@/services/allocation.service'
import { transferService } from '@/services/transfer.service'
import { assetService } from '@/services/asset.service'
import { employeeService } from '@/services/employee.service'
import type {
  AllocationStatus, Asset, AssetAllocation, Employee,
  TransferRequest, TransferStatus,
} from '@/types'
import {
  ALLOCATION_STATUS_LABELS,
  TRANSFER_STATUS_LABELS,
} from '@/types'
import { formatDate } from '@/utils'

// ── Badge variants ────────────────────────────────────────────────────────────

const ALLOC_BADGE: Record<AllocationStatus, 'green' | 'gray' | 'red'> = {
  ACTIVE: 'green', RETURNED: 'gray', OVERDUE: 'red',
}
const TRANSFER_BADGE: Record<TransferStatus, 'yellow' | 'green' | 'red'> = {
  PENDING: 'yellow', APPROVED: 'green', REJECTED: 'red',
}

// ── Timeline event union ──────────────────────────────────────────────────────

type TimelineEvent =
  | { kind: 'allocation'; ts: string; data: AssetAllocation }
  | { kind: 'transfer';   ts: string; data: TransferRequest }

// ── Component ─────────────────────────────────────────────────────────────────

export default function AllocationHistoryPage() {
  useDocumentTitle('Allocation History')

  const [searchParams, setSearchParams] = useSearchParams()
  const [assetIdInput, setAssetIdInput] = useState(searchParams.get('asset') ?? '')
  const [resolvedAssetId, setResolvedAssetId] = useState<number | null>(
    searchParams.get('asset') ? Number(searchParams.get('asset')) : null
  )

  const [asset, setAsset]       = useState<Asset | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // ── Load employee lookup once ─────────────────────────────────────────────
  useEffect(() => {
    employeeService.list({ page_size: 200 }).then(r => setEmployees(r.items)).catch(() => {})
  }, [])

  // ── Load history when asset id is set ────────────────────────────────────
  useEffect(() => {
    if (!resolvedAssetId) return
    setLoading(true); setError(null); setAsset(null); setTimeline([])

    Promise.all([
      assetService.getById(resolvedAssetId),
      allocationService.getAssetHistory(resolvedAssetId),
      transferService.list({ asset_id: resolvedAssetId, page_size: 100 }),
    ])
      .then(([assetData, allocations, transfers]) => {
        setAsset(assetData)

        const events: TimelineEvent[] = [
          ...allocations.map(a => ({ kind: 'allocation' as const, ts: a.allocated_at, data: a })),
          ...transfers.items.map(t => ({ kind: 'transfer' as const, ts: t.requested_at, data: t })),
        ]
        events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
        setTimeline(events)
      })
      .catch(() => setError('Failed to load history. Check the asset ID.'))
      .finally(() => setLoading(false))
  }, [resolvedAssetId])

  // ── Lookup helpers ────────────────────────────────────────────────────────
  const empMap = Object.fromEntries(employees.map(e => [e.id, e.full_name]))

  function handleSearch() {
    const id = Number(assetIdInput)
    if (!id) return
    setResolvedAssetId(id)
    setSearchParams({ asset: String(id) })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Allocation History</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Full timeline of allocations and transfers for an asset
        </p>
      </div>

      {/* Asset ID search */}
      <div className="flex gap-3">
        <div className="w-64">
          <Input
            placeholder="Enter Asset ID (number)"
            value={assetIdInput}
            onChange={e => setAssetIdInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button
          onClick={handleSearch}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          Load History
        </button>
      </div>

      {/* Asset info banner */}
      {asset && (
        <div className="rounded-xl border border-primary-100 bg-primary-50 px-5 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-sm font-bold text-primary-700">{asset.asset_tag}</span>
            <span className="text-base font-semibold text-gray-900">{asset.name}</span>
            <Link to={`/assets/${asset.id}`} className="text-xs text-primary-600 hover:underline">
              View asset →
            </Link>
          </div>
        </div>
      )}

      {/* Loading / error */}
      {loading && (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Empty state */}
      {!loading && !error && resolvedAssetId && timeline.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center text-gray-400">
          No allocation or transfer history found for this asset.
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 h-full w-0.5 bg-gray-200" aria-hidden="true" />

          <ul className="space-y-6 pl-14">
            {timeline.map((event, idx) => (
              <li key={idx} className="relative">
                {/* Dot */}
                <span
                  className={`absolute -left-9 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${
                    event.kind === 'allocation' ? 'bg-primary-500' : 'bg-amber-400'
                  }`}
                />

                {/* Card */}
                <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                  {event.kind === 'allocation' ? (
                    <AllocationEventCard alloc={event.data} empMap={empMap} />
                  ) : (
                    <TransferEventCard transfer={event.data} empMap={empMap} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AllocationEventCard({
  alloc, empMap,
}: {
  alloc: AssetAllocation
  empMap: Record<number, string>
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">Allocation</span>
          <Badge variant={ALLOC_BADGE[alloc.status]}>{ALLOCATION_STATUS_LABELS[alloc.status]}</Badge>
        </div>
        <span className="text-xs text-gray-400">{formatDate(alloc.allocated_at)}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
        <Row label="Allocated To">{empMap[alloc.employee_id] ?? `#${alloc.employee_id}`}</Row>
        <Row label="Allocated By">{empMap[alloc.allocated_by] ?? `#${alloc.allocated_by}`}</Row>
        {alloc.expected_return_date && <Row label="Expected Return">{formatDate(alloc.expected_return_date)}</Row>}
        {alloc.returned_at         && <Row label="Returned">{formatDate(alloc.returned_at)}</Row>}
        {alloc.condition_notes     && <Row label="Condition Notes" className="col-span-full">{alloc.condition_notes}</Row>}
      </dl>
    </div>
  )
}

function TransferEventCard({
  transfer, empMap,
}: {
  transfer: TransferRequest
  empMap: Record<number, string>
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Transfer</span>
          <Badge variant={TRANSFER_BADGE[transfer.status]}>{TRANSFER_STATUS_LABELS[transfer.status]}</Badge>
        </div>
        <span className="text-xs text-gray-400">{formatDate(transfer.requested_at)}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
        <Row label="From">{empMap[transfer.from_employee_id] ?? `#${transfer.from_employee_id}`}</Row>
        <Row label="To">  {empMap[transfer.to_employee_id]   ?? `#${transfer.to_employee_id}`}</Row>
        <Row label="Requested By">{empMap[transfer.requested_by] ?? `#${transfer.requested_by}`}</Row>
        {transfer.approved_by  && <Row label="Actioned By">{empMap[transfer.approved_by] ?? `#${transfer.approved_by}`}</Row>}
        {transfer.approved_at  && <Row label="Actioned At">{formatDate(transfer.approved_at)}</Row>}
        {transfer.remarks      && <Row label="Remarks" className="col-span-full">{transfer.remarks}</Row>}
      </dl>
    </div>
  )
}

function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-800">{children}</dd>
    </div>
  )
}
