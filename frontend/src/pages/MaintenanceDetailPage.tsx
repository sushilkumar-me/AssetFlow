/**
 * MaintenanceDetailPage — full detail view with timeline and all action dialogs.
 * Route: /maintenance/:id
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Input, Modal, Spinner } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { maintenanceService } from '@/services/maintenance.service'
import { assetService } from '@/services/asset.service'
import type {
  Asset,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceStatus,
} from '@/types'
import {
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUS_LABELS,
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

const PRIORITY_BADGE: Record<MaintenancePriority, 'gray' | 'yellow' | 'red'> = {
  LOW: 'gray', MEDIUM: 'yellow', HIGH: 'red', CRITICAL: 'red',
}

// ── Timeline step ─────────────────────────────────────────────────────────────

interface TimelineStep {
  label: string
  status: MaintenanceStatus
  date?: string | null
  detail?: string | null
}

function buildTimeline(req: MaintenanceRequest): TimelineStep[] {
  const steps: TimelineStep[] = [
    { label: 'Request Raised',       status: 'PENDING',             date: req.created_at },
    { label: 'Approved',             status: 'APPROVED',            date: req.approved_at,  detail: req.approval_remarks },
    { label: 'Technician Assigned',  status: 'TECHNICIAN_ASSIGNED', detail: req.technician_name },
    { label: 'Work In Progress',     status: 'IN_PROGRESS' },
    { label: 'Resolved',             status: 'RESOLVED',            date: req.resolved_at,  detail: req.resolution_notes },
  ]

  if (req.status === 'REJECTED') {
    return [
      { label: 'Request Raised', status: 'PENDING',  date: req.created_at },
      { label: 'Rejected',       status: 'REJECTED', date: req.approved_at, detail: req.approval_remarks },
    ]
  }

  const order: MaintenanceStatus[] = [
    'PENDING', 'APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED',
  ]
  const currentIdx = order.indexOf(req.status)
  return steps.map((s, i) => ({ ...s, active: i <= currentIdx })) as TimelineStep[]
}

function stepDot(status: MaintenanceStatus, req: MaintenanceRequest) {
  const order = ['PENDING', 'APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED']
  const currentIdx = order.indexOf(req.status)
  const stepIdx    = order.indexOf(status)
  if (req.status === 'REJECTED') {
    return status === 'PENDING' || status === 'REJECTED' ? 'bg-primary-500' : 'bg-gray-200'
  }
  if (stepIdx <= currentIdx) return 'bg-primary-500'
  return 'bg-gray-200'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER'

  const [req, setReq]           = useState<MaintenanceRequest | null>(null)
  const [asset, setAsset]       = useState<Asset | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  useDocumentTitle(req ? `Maintenance #${req.id}` : 'Maintenance Detail')

  // ── Approve dialog ────────────────────────────────────────────────────────
  const [approveOpen, setApproveOpen]   = useState(false)
  const [approveRemarks, setApproveRemarks] = useState('')
  const [approving, setApproving]       = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)

  // ── Reject dialog ─────────────────────────────────────────────────────────
  const [rejectOpen, setRejectOpen]     = useState(false)
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [rejecting, setRejecting]       = useState(false)
  const [rejectError, setRejectError]   = useState<string | null>(null)

  // ── Assign dialog ─────────────────────────────────────────────────────────
  const [assignOpen, setAssignOpen]     = useState(false)
  const [techName, setTechName]         = useState('')
  const [assigning, setAssigning]       = useState(false)
  const [assignError, setAssignError]   = useState<string | null>(null)

  // ── Resolve dialog ────────────────────────────────────────────────────────
  const [resolveOpen, setResolveOpen]   = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolving, setResolving]       = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  // ── Start work ────────────────────────────────────────────────────────────
  const [starting, setStarting] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchReq() {
    if (!id) return
    try {
      const r = await maintenanceService.getById(Number(id))
      setReq(r)
      const a = await assetService.getById(r.asset_id)
      setAsset(a)
    } catch { setNotFound(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { void fetchReq() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleApprove() {
    if (!req) return
    setApproving(true); setApproveError(null)
    try {
      const r = await maintenanceService.approve(req.id, { approval_remarks: approveRemarks || null })
      setReq(r); setApproveOpen(false)
    } catch (err) { setApproveError(err instanceof Error ? err.message : 'Failed.') }
    finally { setApproving(false) }
  }

  async function handleReject() {
    if (!req || !rejectRemarks.trim()) { setRejectError('Reason is required.'); return }
    setRejecting(true); setRejectError(null)
    try {
      const r = await maintenanceService.reject(req.id, { approval_remarks: rejectRemarks })
      setReq(r); setRejectOpen(false)
    } catch (err) { setRejectError(err instanceof Error ? err.message : 'Failed.') }
    finally { setRejecting(false) }
  }

  async function handleAssign() {
    if (!req || !techName.trim()) { setAssignError('Technician name is required.'); return }
    setAssigning(true); setAssignError(null)
    try {
      const r = await maintenanceService.assignTechnician(req.id, { technician_name: techName })
      setReq(r); setAssignOpen(false)
    } catch (err) { setAssignError(err instanceof Error ? err.message : 'Failed.') }
    finally { setAssigning(false) }
  }

  async function handleStart() {
    if (!req) return
    setStarting(true)
    try {
      const r = await maintenanceService.startWork(req.id)
      setReq(r)
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed.') }
    finally { setStarting(false) }
  }

  async function handleResolve() {
    if (!req || !resolutionNotes.trim()) { setResolveError('Resolution notes are required.'); return }
    setResolving(true); setResolveError(null)
    try {
      const r = await maintenanceService.resolve(req.id, { resolution_notes: resolutionNotes })
      setReq(r); setResolveOpen(false)
    } catch (err) { setResolveError(err instanceof Error ? err.message : 'Failed.') }
    finally { setResolving(false) }
  }

  // ── Loading / not found ───────────────────────────────────────────────────

  if (loading) return (
    <div className="flex h-60 items-center justify-center"><Spinner size="lg" /></div>
  )
  if (notFound || !req) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-4xl font-bold text-gray-300">404</p>
      <p className="mt-2 text-lg font-semibold text-gray-700">Request not found</p>
      <Button className="mt-6" variant="secondary" onClick={() => navigate('/maintenance')}>Back</Button>
    </div>
  )

  const timeline = buildTimeline(req)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate('/maintenance')} className="hover:text-primary-600 hover:underline">Maintenance</button>
          <span>/</span>
          <span className="font-medium text-gray-900">#{req.id}</span>
        </div>
        {/* Action buttons for managers */}
        {isManager && (
          <div className="flex flex-wrap gap-2">
            {req.status === 'PENDING' && <>
              <Button size="sm" variant="primary"   onClick={() => { setApproveRemarks(''); setApproveError(null); setApproveOpen(true) }}>Approve</Button>
              <Button size="sm" variant="danger"    onClick={() => { setRejectRemarks('');  setRejectError(null);  setRejectOpen(true)  }}>Reject</Button>
            </>}
            {req.status === 'APPROVED' &&
              <Button size="sm" variant="secondary" onClick={() => { setTechName(''); setAssignError(null); setAssignOpen(true) }}>Assign Technician</Button>}
            {req.status === 'TECHNICIAN_ASSIGNED' &&
              <Button size="sm" variant="secondary" onClick={handleStart} isLoading={starting}>Start Work</Button>}
            {(req.status === 'TECHNICIAN_ASSIGNED' || req.status === 'IN_PROGRESS') &&
              <Button size="sm" variant="primary" onClick={() => { setResolutionNotes(''); setResolveError(null); setResolveOpen(true) }}>Resolve</Button>}
          </div>
        )}
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_BADGE[req.status]}>{MAINTENANCE_STATUS_LABELS[req.status]}</Badge>
              <Badge variant={PRIORITY_BADGE[req.priority]}>{MAINTENANCE_PRIORITY_LABELS[req.priority]}</Badge>
            </div>
            <h1 className="mt-2 text-xl font-bold text-gray-900">{req.issue_title}</h1>
            {asset && (
              <p className="mt-1 text-sm text-gray-500">
                Asset: <span className="font-mono text-primary-600">{asset.asset_tag}</span> — {asset.name}
              </p>
            )}
          </div>
          <p className="text-sm text-gray-400">Raised {formatDate(req.created_at)}</p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 divide-gray-100 px-6 py-4 lg:grid-cols-2 lg:divide-x">
          <div className="py-2 lg:pr-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Issue Details</h2>
            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{req.issue_description}</p>
            {req.attachment_url && (
              <a href={req.attachment_url} target="_blank" rel="noreferrer"
                className="mt-2 inline-block text-sm text-primary-600 hover:underline">
                View attachment →
              </a>
            )}
          </div>
          <div className="py-2 lg:pl-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Workflow Info</h2>
            <dl className="space-y-2 text-sm">
              {req.technician_name  && <div className="flex justify-between"><dt className="text-gray-400">Technician</dt><dd className="font-medium">{req.technician_name}</dd></div>}
              {req.approved_by     && <div className="flex justify-between"><dt className="text-gray-400">Actioned By</dt><dd className="font-medium">#{req.approved_by}</dd></div>}
              {req.approved_at     && <div className="flex justify-between"><dt className="text-gray-400">Approved At</dt><dd>{formatDate(req.approved_at)}</dd></div>}
              {req.resolved_at     && <div className="flex justify-between"><dt className="text-gray-400">Resolved At</dt><dd>{formatDate(req.resolved_at)}</dd></div>}
              {req.approval_remarks && (
                <div><dt className="text-gray-400">Remarks</dt><dd className="mt-0.5 text-gray-700 italic">{req.approval_remarks}</dd></div>
              )}
              {req.resolution_notes && (
                <div><dt className="text-gray-400">Resolution Notes</dt><dd className="mt-0.5 text-gray-700">{req.resolution_notes}</dd></div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-gray-400">Status Timeline</h2>
        <div className="relative">
          <div className="absolute left-[9px] top-2 h-[calc(100%-1rem)] w-0.5 bg-gray-200" aria-hidden="true" />
          <ul className="space-y-6 pl-8">
            {timeline.map((step, i) => (
              <li key={i} className="relative">
                <span className={`absolute -left-[23px] mt-1 h-[10px] w-[10px] rounded-full border-2 border-white ${stepDot(step.status, req)}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{step.label}</p>
                  {step.date && <p className="text-xs text-gray-400">{formatDate(step.date)}</p>}
                  {step.detail && <p className="mt-0.5 text-xs text-gray-500 italic">{step.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Approve Dialog ──────────────────────────────────────────────── */}
      <Modal open={approveOpen} onClose={() => setApproveOpen(false)} title="Approve Maintenance Request" maxWidth="sm">
        {approveError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{approveError}</p>}
        <p className="mb-4 text-sm text-gray-600">Approving will set asset status to <strong>Under Maintenance</strong>.</p>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Remarks (optional)</label>
          <textarea rows={2} value={approveRemarks} onChange={e => setApproveRemarks(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setApproveOpen(false)} disabled={approving}>Cancel</Button>
          <Button onClick={handleApprove} isLoading={approving}>Approve</Button>
        </div>
      </Modal>

      {/* ── Reject Dialog ───────────────────────────────────────────────── */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Maintenance Request" maxWidth="sm">
        {rejectError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{rejectError}</p>}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Reason for Rejection *</label>
          <textarea rows={3} value={rejectRemarks} onChange={e => setRejectRemarks(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Explain why this request is being rejected…" />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setRejectOpen(false)} disabled={rejecting}>Cancel</Button>
          <Button variant="danger" onClick={handleReject} isLoading={rejecting}>Reject</Button>
        </div>
      </Modal>

      {/* ── Assign Technician Dialog ────────────────────────────────────── */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Technician" maxWidth="sm">
        {assignError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{assignError}</p>}
        <Input label="Technician Name *" value={techName} onChange={e => setTechName(e.target.value)} placeholder="Full name of the assigned technician" />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setAssignOpen(false)} disabled={assigning}>Cancel</Button>
          <Button onClick={handleAssign} isLoading={assigning}>Assign</Button>
        </div>
      </Modal>

      {/* ── Resolve Dialog ──────────────────────────────────────────────── */}
      <Modal open={resolveOpen} onClose={() => setResolveOpen(false)} title="Resolve Maintenance Request" maxWidth="sm">
        {resolveError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{resolveError}</p>}
        <p className="mb-4 text-sm text-gray-600">Resolving will set asset status back to <strong>Available</strong>.</p>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Resolution Notes *</label>
          <textarea rows={4} value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Describe what was done to fix the issue…" />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setResolveOpen(false)} disabled={resolving}>Cancel</Button>
          <Button onClick={handleResolve} isLoading={resolving}>Mark Resolved</Button>
        </div>
      </Modal>
    </div>
  )
}
