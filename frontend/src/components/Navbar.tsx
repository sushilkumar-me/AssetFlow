/**
 * Top navigation bar — live unread notifications badge + user info.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { notificationService } from '@/services/notification.service'

interface NavbarProps {
  onToggleSidebar?: () => void
  pageTitle?: string
}

export default function Navbar({ onToggleSidebar, pageTitle = 'Dashboard' }: NavbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    notificationService.list()
      .then(r => setUnread(r.unread_count))
      .catch(() => {})
  }, [])

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Toggle sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-800">{pageTitle}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="relative rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* User avatar + name */}
        <div className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white"
            aria-hidden="true"
          >
            {initials}
          </div>
          {user && (
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-gray-800 leading-tight">{user.full_name}</p>
              <p className="text-[10px] text-gray-400 leading-tight capitalize">{user.role.toLowerCase().replace('_', ' ')}</p>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={() => logout()}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Sign out"
          title="Sign out"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
          </svg>
        </button>
      </div>
    </header>
  )
}
