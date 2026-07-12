/**
 * AuditDetailPage — manage a single audit cycle.
 * Tabs: Verification | Discrepancy Report
 * Admin actions: Assign Auditors, Close Cycle
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Badge, Button, Input, Modal, Select, Spinner, Table,
} from '@/components/ui'
import type { Column } from '@/components/ui/Table'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { auditService } from '@/services/audit.service'
import { assetService } from '@/services/asset.service'
import { employeeService } from '@/services/employee.service'
import type {
  Asset, AuditCycle, AuditCycleStatus, AuditRecord,
  DiscrepancyReport, Employee, VerificationStatus,
} from '@/types'
import {
  AUDIT_CYCLE_STATUS_LABELS, AUDIT_SCOPE_LABELS,
  VERIFICATION_STATUSES, VERIFICATION_STATUS_LABELS,
} from '@/types'
import { formatDate } from '@/utils'
import { cn } from '@/utils'

// ── Badge colours ─────────────────────────────────────────────────────────────

const CYCLE_BADGE: Record<AuditCycleStatus, 'green' | 'blue' | 'gray'> = {
  OPEN: 'green', IN_PROGRESS: 'blue', CLOSED: 'gray',
}
const VERIF_BADGE: Record<VerificationStatus, 'green' | 'red' | 'yellow'> = {
  VERIFIED: 'green', MISSING: 'red', DAMAGED: 'yellow',
}

type Tab = 'verify' | 'discrepancies'

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [cycle, setCycle]         = useState<AuditCycle | null>(null)
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [tab, setTab]             = useState<Tab>('verify')

  const [records, setRecords]         = useState<AuditRecord[]>([])
  const [discReport, setDiscReport]   = useState<DiscrepancyReport | null>(null)
  const [recordsLoading, setRecordsLoading] = useState(false)

  // Asset + employee lookup
  const [assetMap, setAssetMap]   = useState<Record<number, Asset>>({})
  const [empMap, setEmpMap]       = useState<Record<number, string>>({})

  useDocumentTitle(cycle ? `Audit: ${cycle.name}` : 'Audit Detail')

  // ── Assign Auditors ───────────────────────────────────────────────────────
  const [assignOpen, setAssignOpen]       = useState(false)
  const [allEmployees, setAllEmployees]   = useState<Employee[]>([])
  const [selectedAuditors, setSelectedAuditors] = useState<number[]>([])
  const [assigning, setAssigning]         = useState(false)
  const [assignError, setAssignError]     = useState<string | null>(null)

  // ── Verify Asset ──────────────────────────────────────────────────────────
  const [verifyOpen, setVerifyOpen]   = useState(false)
  const [verifyAssetSearch, setVerifyAssetSearch] = useState('')
  const [verifyAssetOptions, setVerifyAssetOptions] = useState<Asset[]>([])
  const [verifyForm, setVerifyForm]   = useState({ asset_id: 0, verification_status: 'VERIFIED' as VerificationStatus, remarks: '' })
  const [verifying, setVerifying]     = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  // ── Close ─────────────────────────────────────────────────────────────────
  const [closing, setClosing]         = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchCycle() {
    if (!id) return
    try {
      const c = await auditService.getById(Number(id))
      setCycle(c)
    } catch { setNotFound(true) }
    finally { setLoading(false) }
  }

  async function fetchRecords() {
    if (!id) return
    setRecordsLoading(true)
    try {
      const recs = await auditService.getRecords(Number(id))
      setRecords(recs)
      // Populate lookup maps
      const assetIds = [...new Set(recs.map(r => r.asset_id))]
      const missing = assetIds.filter(aid => !assetMap[aid])
      if (missing.length > 0) {
        Promise.all(missing.map(aid => assetService.getById(aid))).then(assets => {
          const m: Record<number, Asset> = {}
          assets.forEach(a => { m[a.id] = a })
          setAssetMap(prev => ({ ...prev, ...m }))
        }).catch(() => {})
      }
    } catch { /* handled */ } finally { setRecordsLoading(false) }
  }

  async function fetchDiscrepancies() {
    if (!id) return
    try {
      const report = await auditService.getDiscrepancies(Number(id))
      setDiscReport(report)
    } catch { /* handled */ }
  }

  useEffect(() => { void fetchCycle() }, [id]) // eslint-disable-line
  useEffect(() => { if (cycle) { void fetchRecords(); void fetchDiscrepancies() } }, [cycle?.id]) // eslint-disable-line
  useEffect(() => {
    employeeService.list({ page_size: 200 }).then(r => {
      const m: Record<number, string> = {}
      r.items.forEach(e => { m[e.id] = e.full_name })
      setEmpMap(m)
      setAllEmployees(r.items)
    }).catch(() => {})
  }, [])

  // ── Asset search for verify ───────────────────────────────────────────────
  useEffect(() => {
    if (!verifyAssetSearch.trim() || !verifyOpen) { setVerifyAssetOptions([]); return }
    assetService.list({ search: verifyAssetSearch, active_only: true, page_size: 10 }).then(r => setVerifyAssetOptions(r.items)).catch(() => {})
  }, [verifyAssetSearch, verifyOpen])

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleAssignAuditors() {
    if (!cycle) return
    setAssigning(true); setAssignError(null)
    try {
      const updated = await auditService.assignAuditors(cycle.id, selectedAuditors)
      setCycle(updated); setAssignOpen(false)
    } catch (err) { setAssignError(err instanceof Error ? err.message : 'Failed.') }
    finally { setAssigning(false) }
  }

  async function handleVerify() {
    if (!cycle) return
    if (!verifyForm.asset_id) { setVerifyError('Select an asset.'); return }
    setVerifying(true); setVerifyError(null)
    try {
      await auditService.verifyAsset(cycle.id, {
        asset_id: verifyForm.asset_id,
        verification_status: verifyForm.verification_status,
        remarks: verifyForm.remarks || null,
      })
      setVerifyOpen(false)
      setVerifyForm({ asset_id: 0, verification_status: 'VERIFIED', remarks: '' })
      setVerifyAssetSearch('')
      void fetchRecords()
      void fetchDiscrepancies()
      void fetchCycle()
    } catch (err) { setVerifyError(err instanceof Error ? err.message : 'Failed.') }
    finally { setVerifying(false) }
  }

  async function handleClose() {
    if (!cycle) return
    setClosing(true)
    try {
      const updated = await auditService.closeCycle(cycle.id)
      setCycle(updated)
      void fetchDiscrepancies()
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to close audit.') }
    finally { setClosing(false) }
  }

  // ── Record columns ────────────────────────────────────────────────────────

  const recColumns: Column<AuditRecord>[] = [
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
    {
      key: 'status', header: 'Result',
      render: r => <Badge variant={VERIF_BADGE[r.verification_status]}>{VERIFICATION_STATUS_LABELS[r.verification_status]}</Badge>,
    },
    { key: 'auditor', header: 'Auditor',  render: r => <span className="text-gray-600">{empMap[r.auditor_id] ?? `#${r.auditor_id}`}</span> },
    { key: 'remarks', header: 'Remarks',  render: r => <span className="text-sm text-gray-500 italic">{r.remarks ?? '—'}</span> },
    { key: 'date',    header: 'Verified', render: r => <span className="text-sm text-gray-500">{formatDate(r.verified_at)}</span> },
  ]

  const verifOptions = VERIFICATION_STATUSES.map(s => ({ value: s, label: VERIFICATION_STATUS_LABELS[s] }))
  const isClosed = cycle?.status === 'CLOSED'
  const canVerify = cycle && !isClosed && (isAdmin || (user && cycle.auditor_ids.includes(user.id)))

  // ── Loading / not found ───────────────────────────────────────────────────

  if (loading) return <div className="flex h-60 items-center justify-center"><Spinner size="lg" /></div>
  if (notFound || !cycle) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-4xl font-bold text-gray-300">404</p>
      <Button className="mt-6" variant="secondary" onClick={() => navigate('/audits')}>Back to Audits</Button>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Breadcrumb + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate('/audits')} className="hover:text-primary-600 hover:underline">Audits</button>
          <span>/</span>
          <span className="font-medium text-gray-900">{cycle.name}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && !isClosed && (
            <>
              <Button size="sm" variant="secondary" onClick={() => { setSelectedAuditors(cycle.auditor_ids); setAssignError(null); setAssignOpen(true) }}>
                Assign Auditors
              </Button>
              <Button size="sm" variant="danger" onClick={handleClose} isLoading={closing}>
                Close Audit
              </Button>
            </>
          )}
          {canVerify && (
            <Button size="sm" onClick={() => { setVerifyForm({ asset_id: 0, verification_status: 'VERIFIED', remarks: '' }); setVerifyAssetSearch(''); setVerifyError(null); setVerifyOpen(true) }}>
              + Verify Asset
            </Button>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={CYCLE_BADGE[cycle.status]}>{AUDIT_CYCLE_STATUS_LABELS[cycle.status]}</Badge>
              <span className="text-sm text-gray-500">{AUDIT_SCOPE_LABELS[cycle.scope_type]}</span>
            </div>
            <h1 className="mt-2 text-xl font-bold text-gray-900">{cycle.name}</h1>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>{formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}</p>
            <p className="mt-1">Auditors assigned: <strong>{cycle.auditor_ids.length}</strong></p>
            <p>Verifications: <strong>{records.length}</strong></p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {([['verify', 'Verification Records'], ['discrepancies', 'Discrepancy Report']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                tab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Verification tab ─────────────────────────────────────────────── */}
      {tab === 'verify' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table columns={recColumns} data={records} loading={recordsLoading} keyExtractor={r => r.id} emptyMessage="No assets verified yet." />
        </div>
      )}

      {/* ── Discrepancy tab ──────────────────────────────────────────────── */}
      {tab === 'discrepancies' && discReport && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total in Scope',  value: discReport.total_assets,   color: 'bg-gray-50 text-gray-700' },
              { label: 'Verified',        value: discReport.verified_count,  color: 'bg-green-50 text-green-700' },
              { label: 'Missing',         value: discReport.missing_count,   color: 'bg-red-50 text-red-700' },
              { label: 'Damaged',         value: discReport.damaged_count,   color: 'bg-yellow-50 text-yellow-700' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{s.label}</p>
                <p className="mt-1 text-3xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Discrepancy table */}
          {discReport.discrepancies.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-gray-400">
              No discrepancies found — all assets verified successfully.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Asset Tag', 'Asset Name', 'Status', 'Auditor', 'Remarks', 'Verified At'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {discReport.discrepancies.map(d => (
                    <tr key={d.asset_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-primary-700">{d.asset_tag}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{d.asset_name}</td>
                      <td className="px-4 py-3"><Badge variant={VERIF_BADGE[d.verification_status]}>{VERIFICATION_STATUS_LABELS[d.verification_status]}</Badge></td>
                      <td className="px-4 py-3 text-gray-600">{empMap[d.auditor_id] ?? `#${d.auditor_id}`}</td>
                      <td className="px-4 py-3 italic text-gray-500">{d.remarks ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(d.verified_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Assign Auditors Modal ────────────────────────────────────────── */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Auditors" maxWidth="md">
        {assignError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{assignError}</p>}
        <p className="mb-3 text-sm text-gray-600">Select employees to act as auditors for this cycle.</p>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
          {allEmployees.map(e => (
            <label key={e.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
              <input type="checkbox" checked={selectedAuditors.includes(e.id)}
                onChange={ev => setSelectedAuditors(prev =>
                  ev.target.checked ? [...prev, e.id] : prev.filter(id => id !== e.id)
                )}
                className="h-4 w-4 rounded border-gray-300 text-primary-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">{e.full_name}</p>
                <p className="text-xs text-gray-400">{e.email}</p>
              </div>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">{selectedAuditors.length} auditor(s) selected</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setAssignOpen(false)} disabled={assigning}>Cancel</Button>
          <Button onClick={handleAssignAuditors} isLoading={assigning}>Save Auditors</Button>
        </div>
      </Modal>

      {/* ── Verify Asset Modal ───────────────────────────────────────────── */}
      <Modal open={verifyOpen} onClose={() => setVerifyOpen(false)} title="Verify Asset" maxWidth="md">
        <div className="space-y-4">
          {verifyError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{verifyError}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Search Asset *</label>
            <Input placeholder="Type asset tag or name…" value={verifyAssetSearch}
              onChange={e => { setVerifyAssetSearch(e.target.value); setVerifyForm(f => ({ ...f, asset_id: 0 })) }} />
            {verifyAssetOptions.length > 0 && verifyForm.asset_id === 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                {verifyAssetOptions.map(a => (
                  <button key={a.id} type="button"
                    onClick={() => { setVerifyForm(f => ({ ...f, asset_id: a.id })); setVerifyAssetSearch(`${a.asset_tag} — ${a.name}`); setVerifyAssetOptions([]) }}
                    className="w-full px-3 py-2 text-left hover:bg-primary-50">
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.asset_tag}</p>
                  </button>
                ))}
              </div>
            )}
            {verifyForm.asset_id > 0 && <p className="mt-1 text-xs text-green-600">✓ Asset selected (ID: {verifyForm.asset_id})</p>}
          </div>
          <Select label="Verification Result *" value={verifyForm.verification_status}
            onChange={e => setVerifyForm(f => ({ ...f, verification_status: e.target.value as VerificationStatus }))}
            options={verifOptions} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Remarks</label>
            <textarea rows={2} value={verifyForm.remarks} onChange={e => setVerifyForm(f => ({ ...f, remarks: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Optional notes about the asset condition…" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setVerifyOpen(false)} disabled={verifying}>Cancel</Button>
          <Button onClick={handleVerify} isLoading={verifying}>Submit Verification</Button>
        </div>
      </Modal>
    </div>
  )
}
