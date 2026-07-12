/**
 * Sidebar navigation — shows only the items relevant to the user's role.
 * Each item appears exactly once per role (no duplicates).
 */

import { NavLink } from 'react-router-dom'
import { cn } from '@/utils'
import { useAuth } from '@/context/AuthContext'
import type { NavItem, UserRole } from '@/types'

interface RoleNavItem extends NavItem {
  roles: UserRole[]
}

const NAV_ITEMS: RoleNavItem[] = [
  // ── All roles ────────────────────────────────────────────────────────────
  {
    label: 'Dashboard',
    path: '/',
    roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'],
  },

  // ── Assets ────────────────────────────────────────────────────────────────
  {
    label: 'Assets',
    path: '/assets',
    roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'],
  },

  // ── Allocations (managers only) ───────────────────────────────────────────
  {
    label: 'Allocations',
    path: '/allocations',
    roles: ['ADMIN', 'ASSET_MANAGER'],
  },
  {
    label: 'Alloc. History',
    path: '/allocations/history',
    roles: ['ADMIN', 'ASSET_MANAGER'],
  },

  // ── Transfers ─────────────────────────────────────────────────────────────
  {
    label: 'Transfers',
    path: '/transfers',
    roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'],
  },

  // ── Bookings ──────────────────────────────────────────────────────────────
  {
    label: 'Bookings',
    path: '/bookings',
    roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'],
  },
  {
    label: 'Booking Calendar',
    path: '/bookings/calendar',
    roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'],
  },

  // ── Maintenance ───────────────────────────────────────────────────────────
  {
    label: 'Maintenance',
    path: '/maintenance',
    roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'],
  },

  // ── Audits ────────────────────────────────────────────────────────────────
  {
    label: 'Audits',
    path: '/audits',
    roles: ['ADMIN', 'ASSET_MANAGER'],
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  {
    label: 'Reports',
    path: '/reports',
    roles: ['ADMIN', 'ASSET_MANAGER'],
  },

  // ── Organization (admin only) ─────────────────────────────────────────────
  {
    label: 'Organization Setup',
    path: '/organization',
    roles: ['ADMIN'],
  },
  {
    label: 'Categories',
    path: '/categories',
    roles: ['ADMIN', 'ASSET_MANAGER'],
  },
  {
    label: 'Employee Directory',
    path: '/employees',
    roles: ['ADMIN'],
  },
  {
    label: 'Departments',
    path: '/departments',
    roles: ['ADMIN'],
  },

  // ── Dept Head extras ─────────────────────────────────────────────────────
  {
    label: 'My Department',
    path: '/departments',
    roles: ['DEPARTMENT_HEAD'],
  },
  {
    label: 'Team Members',
    path: '/employees',
    roles: ['DEPARTMENT_HEAD'],
  },

  // ── Notifications & Logs ─────────────────────────────────────────────────
  {
    label: 'Notifications',
    path: '/notifications',
    roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'],
  },
  {
    label: 'Activity Logs',
    path: '/activity-logs',
    roles: ['ADMIN'],
  },
]

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN:           'bg-red-100 text-red-700',
  ASSET_MANAGER:   'bg-blue-100 text-blue-700',
  DEPARTMENT_HEAD: 'bg-purple-100 text-purple-700',
  EMPLOYEE:        'bg-green-100 text-green-700',
}

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN:           'Admin',
  ASSET_MANAGER:   'Asset Manager',
  DEPARTMENT_HEAD: 'Dept. Head',
  EMPLOYEE:        'Employee',
}

interface SidebarProps {
  isOpen?: boolean
}

export default function Sidebar({ isOpen = true }: SidebarProps) {
  const { user, logout } = useAuth()
  const role = user?.role ?? 'EMPLOYEE'

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role))

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-sidebar-bg text-sidebar-text transition-all duration-300',
        isOpen ? 'w-64' : 'w-16',
      )}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-700 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 font-bold text-white">
          A
        </div>
        {isOpen && (
          <span className="text-lg font-semibold text-white">AssetFlow</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4" aria-label="Sidebar navigation">
        <ul role="list" className="space-y-1 px-2">
          {visibleItems.map(item => (
            <li key={`${item.path}-${item.label}`}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                title={!isOpen ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-active text-white'
                      : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
                    !isOpen && 'justify-center',
                  )
                }
              >
                <span className="h-4 w-4 shrink-0 rounded bg-current opacity-60" aria-hidden="true" />
                {isOpen && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User footer */}
      {isOpen && user && (
        <div className="shrink-0 border-t border-slate-700 p-4">
          <div className="mb-2 truncate text-sm font-medium text-white">{user.full_name}</div>
          <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', ROLE_BADGE[role])}>
            {ROLE_LABEL[role]}
          </span>
          <button
            onClick={() => logout()}
            className="mt-3 w-full rounded-md px-3 py-1.5 text-left text-xs text-slate-400
                       hover:bg-slate-700 hover:text-white transition-colors focus:outline-none
                       focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Sign out
          </button>
        </div>
      )}

      {!isOpen && (
        <div className="shrink-0 border-t border-slate-700 p-3 text-center">
          <span className="text-[10px] text-slate-500">v{import.meta.env.VITE_APP_VERSION ?? '1.0'}</span>
        </div>
      )}
    </aside>
  )
}
