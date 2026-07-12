/**
 * NotificationsPage — list, mark read, and delete notifications.
 */

import { useEffect, useState } from 'react'
import { Badge, Button, Spinner } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { notificationService } from '@/services/notification.service'
import type { AppNotification } from '@/types'
import { formatDate } from '@/utils'

export default function NotificationsPage() {
  useDocumentTitle('Notifications')
  const [items, setItems]       = useState<AppNotification[]>([])
  const [unread, setUnread]     = useState(0)
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await notificationService.list()
      setItems(res.items)
      setUnread(res.unread_count)
    } catch { /* handled */ } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function handleMarkRead(id: number) {
    setActing(id)
    try {
      await notificationService.markRead(id)
      await load()
    } catch { /* handled */ } finally { setActing(null) }
  }

  async function handleMarkAll() {
    try {
      await notificationService.markAllRead()
      await load()
    } catch { /* handled */ }
  }

  async function handleDelete(id: number) {
    setActing(id)
    try {
      await notificationService.delete(id)
      await load()
    } catch { /* handled */ } finally { setActing(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          {unread > 0 && (
            <p className="mt-0.5 text-sm text-primary-600 font-medium">{unread} unread</p>
          )}
        </div>
        {unread > 0 && (
          <Button variant="secondary" size="sm" onClick={handleMarkAll}>
            Mark all as read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center text-gray-400">
          No notifications yet.
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {items.map(n => (
            <div key={n.id} className={`flex items-start gap-4 px-5 py-4 transition-colors ${!n.is_read ? 'bg-primary-50' : ''}`}>
              {/* Unread dot */}
              <div className="mt-1.5 h-2 w-2 shrink-0">
                {!n.is_read && <span className="block h-2 w-2 rounded-full bg-primary-500" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-gray-900 text-sm">{n.title}</p>
                  <Badge variant={n.is_read ? 'gray' : 'green'}>
                    {n.is_read ? 'Read' : 'Unread'}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDate(n.created_at)}</p>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 gap-2">
                {!n.is_read && (
                  <Button size="sm" variant="ghost"
                    isLoading={acting === n.id}
                    onClick={() => handleMarkRead(n.id)}>
                    Mark read
                  </Button>
                )}
                <Button size="sm" variant="danger"
                  isLoading={acting === n.id}
                  onClick={() => handleDelete(n.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
