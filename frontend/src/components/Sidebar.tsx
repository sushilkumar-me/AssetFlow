/**
 * Sidebar navigation component.
 * Placeholder — full module links will be added as pages are implemented.
 */

import { NavLink } from 'react-router-dom'
import { cn } from '@/utils'
import type { NavItem } from '@/types'

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     path: '/' },
  { label: 'Assets',        path: '/assets' },
  { label: 'Employees',     path: '/employees' },
  { label: 'Departments',   path: '/departments' },
  { label: 'Categories',    path: '/categories' },
  { label: 'Allocations',   path: '/allocations' },
  { label: 'Bookings',      path: '/bookings' },
  { label: 'Maintenance',   path: '/maintenance' },
  { label: 'Audits',        path: '/audits' },
  { label: 'Reports',       path: '/reports' },
  { label: 'Notifications', path: '/notifications' },
  { label: 'Activity Logs', path: '/activity-logs' },
]

interface SidebarProps {
  isOpen?: boolean
}

export default function Sidebar({ isOpen = true }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-sidebar-bg text-sidebar-text transition-all duration-300',
        isOpen ? 'w-64' : 'w-16',
      )}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-700 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 font-bold text-white">
          A
        </div>
        {isOpen && (
          <span className="text-lg font-semibold text-white">AssetFlow</span>
        )}
      </div>

      {/* Navigation links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul role="list" className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-active text-white'
                      : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
                  )
                }
              >
                {/* Icon placeholder — replace with actual icons when icon library is added */}
                <span className="h-4 w-4 shrink-0 rounded bg-current opacity-60" aria-hidden="true" />
                {isOpen && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 p-4">
        {isOpen && (
          <p className="text-xs text-slate-500">
            AssetFlow v{import.meta.env.VITE_APP_VERSION ?? '0.1.0'}
          </p>
        )}
      </div>
    </aside>
  )
}
