/**
 * Sidebar navigation — shows only the items relevant to the user's role.
 *
 * Role visibility matrix:
 *   EMPLOYEE        — Dashboard, My Assets (bookings), Maintenance requests
 *   DEPARTMENT_HEAD — all EMPLOYEE items + Employees, Departments
 *   ASSET_MANAGER   — Assets, Allocations, Maintenance Approval, Categories
 *   ADMIN           — everything + Departments, Employees, Reports, Activity Logs, Audits
 */

import { NavLink } from 'react-router-dom'
import { cn } from '@/utils'
import { useAuth } from '@/context/AuthContext'
import type { NavItem, UserRole } from '@/types'

// ── Nav items with role visibility ───────────────────────────────────────────

interface RoleNavItem extends NavItem {
  roles: UserRole[]   // empty = visible to all authenticated users
}

const NAV_ITEMS: RoleNavItem[] = [
  // ── Common ──────────────────────────────────────────────────────────────
  {
    label: 'Dashboard',
    path: '/',
    roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'],
  },

  // ── Employee ─────────────────────────────────────────────────────────────
  {
    label: 'My Bookings',
    path: '/bookings',
    roles: ['EMPLOYEE', 'DEPARTMENT_HEAD'],
  },
  {
    label: 'Maintenance',
    path: '/maintenance',
    roles: ['EMPLOYEE', 'DEPARTMENT_HEAD'],
  },
  {
    label: 'Assets',
    path: '/assets',
    roles: ['EMPLOYEE', 'DEPARTMENT_HEAD'],
  },
  {
    label: 'Transfer Requests',
    path: '/transfers',
    roles: ['EMPLOYEE', 'DEPARTMENT_HEAD'],
  },

  // ── Department Head ───────────────────────────────────────────────────────
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

  // ── Asset Manager ────────────────────────────────────────────────────────
  {
    label: 'Assets',
    path: '/assets',
    roles: ['ASSET_MANAGER', 'ADMIN'],
  },
  {
    label: 'Allocations',
    path: '/allocations',
    roles: ['ASSET_MANAGER', 'ADMIN'],
  },
  {
    label: 'Transfers',
    path: '/transfers',
    roles: ['ASSET_MANAGER', 'ADMIN'],
  },
  {
    label: 'Alloc. History',
    path: '/allocations/history',
    roles: ['ASSET_MANAGER', 'ADMIN'],
  },
  {
    label: 'Categories',
    path: '/categories',
    roles: ['ASSET_MANAGER', 'ADMIN'],
  },
  {
    label: 'Maintenance Approval',
    path: '/maintenance',
    roles: ['ASSET_MANAGER', 'ADMIN'],
  },

  // ── Admin ────────────────────────────────────────────────────────────────
  {
    label: 'Organization Setup',
    path: '/organization',
    roles: ['ADMIN'],
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
  {
    label: 'Audits',
    path: '/audits',
    roles: ['ADMIN'],
  },
  {
    label: 'Reports',
    path: '/reports',
    roles: ['ADMIN', 'ASSET_MANAGER'],
  },
  {
    label: 'Notifications',
    path: '/notifications',
    roles: ['ADMIN', 'ASSET_MANAGER'],
  },
  {
    label: 'Activity Logs',
    path: '/activity-logs',
    roles: ['ADMIN'],
  },
]

// ── Role badge colours ────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen?: boolean
}

export default function Sidebar({ isOpen = true }: SidebarProps) {
  const { user, logout } = useAuth()
  const role = user?.role ?? 'EMPLOYEE'

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4" aria-label="Sidebar navigation">
        <ul role="list" className="space-y-1 px-2">
          {visibleItems.map((item) => (
            <li key={`${item.path}-${item.label}`}>
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
                <span className="h-4 w-4 shrink-0 rounded bg-current opacity-60" aria-hidden="true" />
                {isOpen && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User footer */}
      {isOpen && user && (
        <div className="border-t border-slate-700 p-4">
          <div className="mb-2 truncate text-sm font-medium text-white">{user.full_name}</div>
          <span
            className={cn(
              'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
              ROLE_BADGE[role],
            )}
          >
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
        <div className="border-t border-slate-700 p-3">
          <p className="text-xs text-slate-500">v{import.meta.env.VITE_APP_VERSION ?? '0.1.0'}</p>
        </div>
      )}
    </aside>
  )
}
