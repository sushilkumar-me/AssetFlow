/**
 * BookingCalendarPage — resource-grouped visual timeline of bookings.
 *
 * Layout:
 *   - Date range selector (week navigator)
 *   - One row per shared asset
 *   - Booking blocks rendered proportionally on a 24-hour timeline per day
 *   - Day | Week view toggle
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Spinner } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { bookingService } from '@/services/booking.service'
import type { BookingStatus, CalendarResponse, ResourceBooking } from '@/types'
import { BOOKING_STATUS_LABELS } from '@/types'
import { cn } from '@/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<BookingStatus, string> = {
  UPCOMING:  'bg-green-400 text-white',
  ONGOING:   'bg-blue-500 text-white',
  COMPLETED: 'bg-gray-300 text-gray-700',
  CANCELLED: 'bg-red-300 text-white',
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(0,0,0,0); return r
}
function endOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(23,59,59,999); return r
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function startOfWeek(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  r.setDate(r.getDate() - day)
  r.setHours(0,0,0,0)
  return r
}
function formatDay(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
function toISOLocal(d: Date): string {
  return d.toISOString()
}

// ── Block positioning ─────────────────────────────────────────────────────────

function getBlockStyle(booking: ResourceBooking, dayStart: Date, dayEnd: Date): React.CSSProperties | null {
  const s = new Date(booking.start_datetime).getTime()
  const e = new Date(booking.end_datetime).getTime()
  const ds = dayStart.getTime()
  const de = dayEnd.getTime() + 1
  const duration = de - ds

  const clampedStart = Math.max(s, ds)
  const clampedEnd   = Math.min(e, de)
  if (clampedEnd <= clampedStart) return null

  const left  = ((clampedStart - ds) / duration) * 100
  const width = ((clampedEnd - clampedStart) / duration) * 100
  return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BookingCalendarPage() {
  useDocumentTitle('Booking Calendar')

  type ViewMode = 'day' | 'week'
  const [view, setView]           = useState<ViewMode>('week')
  const [anchor, setAnchor]       = useState(() => startOfWeek(new Date()))
  const [calendar, setCalendar]   = useState<CalendarResponse | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [tooltip, setTooltip]     = useState<ResourceBooking | null>(null)

  // ── Compute visible days ──────────────────────────────────────────────────

  const days = useMemo<Date[]>(() => {
    if (view === 'day') return [anchor]
    return Array.from({ length: 7 }, (_, i) => addDays(anchor, i))
  }, [view, anchor])

  // ── Fetch calendar data ───────────────────────────────────────────────────

  useEffect(() => {
    const from = toISOLocal(startOfDay(days[0]))
    const to   = toISOLocal(endOfDay(days[days.length - 1]))
    setLoading(true); setError(null)
    bookingService
      .getCalendar(from, to)
      .then(setCalendar)
      .catch(() => setError('Failed to load calendar. Please try again.'))
      .finally(() => setLoading(false))
  }, [days])

  // ── Navigation ────────────────────────────────────────────────────────────

  function prev() {
    setAnchor(d => view === 'day' ? addDays(d, -1) : addDays(d, -7))
  }
  function next() {
    setAnchor(d => view === 'day' ? addDays(d, 1) : addDays(d, 7))
  }
  function goToday() {
    setAnchor(view === 'day' ? startOfDay(new Date()) : startOfWeek(new Date()))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Booking Calendar</h1>
          <p className="mt-0.5 text-sm text-gray-500">Shared resource availability</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/bookings"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            List View
          </Link>
          <button
            onClick={goToday}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Today
          </button>
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            {(['day', 'week'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => {
                setView(v)
                setAnchor(v === 'week' ? startOfWeek(anchor) : startOfDay(anchor))
              }}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  view === v ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={prev} className="rounded-lg border border-gray-300 px-2 py-1.5 text-gray-600 hover:bg-gray-50">‹</button>
          <button onClick={next} className="rounded-lg border border-gray-300 px-2 py-1.5 text-gray-600 hover:bg-gray-50">›</button>
        </div>
      </div>

      {/* Date range label */}
      <p className="text-sm font-medium text-gray-700">
        {formatDay(days[0])}
        {days.length > 1 && ` — ${formatDay(days[days.length - 1])}`}
      </p>

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
      {!loading && !error && calendar && calendar.entries.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center text-gray-400">
          No shared resource bookings in this period.
          <br />
          <Link to="/bookings" className="mt-2 inline-block text-primary-600 hover:underline text-sm">
            + Create a booking
          </Link>
        </div>
      )}

      {/* Calendar grid */}
      {!loading && !error && calendar && calendar.entries.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Day headers */}
          <div className={cn('grid border-b border-gray-200', days.length > 1 ? `grid-cols-[10rem_repeat(${days.length},1fr)]` : 'grid-cols-[10rem_1fr]')}>
            <div className="border-r border-gray-200 p-3 text-xs font-semibold uppercase text-gray-400">
              Resource
            </div>
            {days.map((d, i) => (
              <div key={i} className={cn(
                'p-3 text-center text-xs font-semibold',
                d.toDateString() === new Date().toDateString() ? 'bg-primary-50 text-primary-700' : 'text-gray-500',
                i < days.length - 1 && 'border-r border-gray-200',
              )}>
                {formatDay(d)}
              </div>
            ))}
          </div>

          {/* Resource rows */}
          {calendar.entries.map((entry) => (
            <div
              key={entry.asset_id}
              className={cn(
                'grid border-b border-gray-100 last:border-0',
                days.length > 1 ? `grid-cols-[10rem_repeat(${days.length},1fr)]` : 'grid-cols-[10rem_1fr]',
              )}
            >
              {/* Resource label */}
              <div className="flex flex-col justify-center border-r border-gray-200 px-3 py-2">
                <p className="text-sm font-semibold text-gray-800 truncate">{entry.asset_name}</p>
                <p className="text-xs font-mono text-primary-600">{entry.asset_tag}</p>
                {entry.location && <p className="text-xs text-gray-400 truncate">{entry.location}</p>}
              </div>

              {/* Day cells */}
              {days.map((day, di) => {
                const dayStart = startOfDay(day)
                const dayEnd   = endOfDay(day)
                const dayBookings = entry.bookings.filter(b => {
                  const s = new Date(b.start_datetime)
                  const e = new Date(b.end_datetime)
                  return s < dayEnd && e > dayStart
                })

                return (
                  <div
                    key={di}
                    className={cn(
                      'relative h-14',
                      di < days.length - 1 && 'border-r border-gray-200',
                    )}
                  >
                    {/* Hour grid lines (subtle) */}
                    <div className="absolute inset-0 flex">
                      {[0,1,2,3].map(q => (
                        <div key={q} className="flex-1 border-r border-gray-100 last:border-0" />
                      ))}
                    </div>

                    {/* Booking blocks */}
                    {dayBookings.map(b => {
                      const style = getBlockStyle(b, dayStart, dayEnd)
                      if (!style) return null
                      return (
                        <div
                          key={b.id}
                          style={style}
                          className={cn(
                            'absolute top-1 bottom-1 rounded-sm px-1 text-xs leading-tight cursor-pointer overflow-hidden',
                            STATUS_COLOR[b.status],
                          )}
                          onClick={() => setTooltip(tooltip?.id === b.id ? null : b)}
                          title={`${b.title} (${BOOKING_STATUS_LABELS[b.status]})`}
                        >
                          <span className="truncate font-medium">{b.title}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 border-t border-gray-100 px-4 py-3">
            {(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'] as BookingStatus[]).map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={cn('h-3 w-3 rounded-sm', STATUS_COLOR[s])} />
                <span className="text-xs text-gray-500">{BOOKING_STATUS_LABELS[s]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking tooltip / detail panel */}
      {tooltip && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{tooltip.title}</span>
                <Badge variant={
                  tooltip.status === 'UPCOMING' ? 'green' :
                  tooltip.status === 'ONGOING'  ? 'blue' :
                  tooltip.status === 'CANCELLED'? 'red'  : 'gray'
                }>
                  {BOOKING_STATUS_LABELS[tooltip.status]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {new Date(tooltip.start_datetime).toLocaleString()} –{' '}
                {new Date(tooltip.end_datetime).toLocaleString()}
              </p>
              {tooltip.purpose && <p className="mt-1 text-sm text-gray-600">{tooltip.purpose}</p>}
              {tooltip.remarks && <p className="mt-1 text-xs text-gray-400 italic">{tooltip.remarks}</p>}
            </div>
            <button
              onClick={() => setTooltip(null)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
