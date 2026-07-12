/**
 * ActivityLogsPage — searchable, filterable timeline of system events.
 * Admin sees all; employees see only their own.
 */

import { useCallback, useEffect, useState } from 'react'
import { Input, Pagination, Select, Spinner, Table } from '@/components/ui'
import type { Column } from '@/components/ui/Table'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { activityService } from '@/services/activity.service'
import type { ActivityLog } from '@/types'
import { formatDate } from '@/utils'
import { cn } from '@/utils'

// ── Entity type colour dots ───────────────────────────────────────────────────

const ENTITY_COLOUR: Record<string, string> = {
  asset:       'bg-blue-400',
  allocation:  'bg-green-400',
  transfer:    'bg-orange-400',
  booking:     'bg-indigo-400',
  maintenance: 'bg-yellow-400',
  audit:       'bg-teal-400',
  user:        'bg-purple-400',
  auth:        'bg-gray-400',
}

function dotColour(entity: string | null): string {
  if (!entity) return 'bg-gray-300'
  const key = entity.toLowerCase().split('_')[0]
  return ENTITY_COLOUR[key] ?? 'bg-gray-300'
}

type ViewMode = 'timeline' | 'table'

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivityLogsPage() {
  useDocumentTitle('Activity Logs')

  const [view, setView]             = useState<ViewMode>('timeline')
  const [items, setItems]           = useState<ActivityLog[]>([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [searchAction, setSearchAction]   = useState('')
  const [filterEntity, setFilterEntity]   = useState('')

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await activityService.list({
        action:      searchAction || undefined,
        entity_type: filterEntity || undefined,
        page, page_size: 30,
      })
      setItems(res.items)
      setTotal(res.total)
      setTotalPages(res.total_pages)
    } catch { /* handled */ } finally { setLoading(false) }
  }, [searchAction, filterEntity, page])

  useEffect(() => { void fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [searchAction, filterEntity])

  // ── Table columns ─────────────────────────────────────────────────────────

  const columns: Column<ActivityLog>[] = [
    {
      key: 'action', header: 'Action',
      render: l => (
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', dotColour(l.entity_type))} />
          <span className="font-medium text-gray-800">{l.action}</span>
        </div>
      ),
    },
    { key: 'desc',   header: 'Description',  render: l => <span className="text-gray-600 text-sm">{l.description}</span> },
    { key: 'entity', header: 'Entity',        render: l => <span className="text-gray-500">{l.entity_type ? `${l.entity_type} #${l.entity_id}` : '—'}</span> },
    { key: 'user',   header: 'User',          render: l => <span className="text-gray-500">{l.user_id ? `#${l.user_id}` : 'System'}</span> },
    { key: 'date',   header: 'Date',          render: l => <span className="text-gray-400 text-sm">{formatDate(l.created_at)}</span> },
  ]

  const entityOptions = [
    { value: 'asset',       label: 'Asset' },
    { value: 'allocation',  label: 'Allocation' },
    { value: 'transfer',    label: 'Transfer' },
    { value: 'booking',     label: 'Booking' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'audit',       label: 'Audit' },
    { value: 'user',        label: 'User' },
    { value: 'auth',        label: 'Auth' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Activity Logs</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} event{total !== 1 ? 's' : ''}</p>
        </div>
        {/* View toggle */}
        <div className="flex overflow-hidden rounded-lg border border-gray-300">
          {(['timeline', 'table'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors capitalize',
                view === v ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50',
              )}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-56">
          <Input placeholder="Search action…" value={searchAction} onChange={e => setSearchAction(e.target.value)} />
        </div>
        <div className="w-44">
          <Select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} options={entityOptions} placeholder="All entities" />
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Spinner size="lg" /></div>
      ) : view === 'timeline' ? (
        /* ── Timeline view ──────────────────────────────────────────── */
        <div className="relative">
          <div className="absolute left-3 top-0 h-full w-0.5 bg-gray-200" />
          <ul className="space-y-4 pl-10">
            {items.length === 0 ? (
              <li className="text-gray-400">No activity found.</li>
            ) : items.map(l => (
              <li key={l.id} className="relative">
                <span className={cn('absolute -left-7 mt-1.5 h-3 w-3 rounded-full border-2 border-white', dotColour(l.entity_type))} />
                <div className="rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-800">{l.action}</span>
                    <span className="text-xs text-gray-400">{formatDate(l.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600">{l.description}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                    {l.entity_type && <span>{l.entity_type} #{l.entity_id}</span>}
                    {l.user_id && <span>User #{l.user_id}</span>}
                    {l.ip_address && <span>{l.ip_address}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        /* ── Table view ─────────────────────────────────────────────── */
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table columns={columns} data={items} loading={false} keyExtractor={l => l.id} emptyMessage="No activity found." />
        </div>
      )}

      {/* Pagination */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={30} onPageChange={setPage} />
      </div>
    </div>
  )
}
