/**
 * OrganizationPage — Admin-only tabbed interface for:
 *   1. Department Management
 *   2. Asset Category Management
 *   3. Employee Directory
 *
 * Non-admin users are redirected to /403 by ProtectedRoute before reaching here.
 */

import { useState } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/utils'
import { DepartmentsTab, CategoriesTab, EmployeesTab } from './organization'

// ── Tab definition ────────────────────────────────────────────────────────────

type TabId = 'departments' | 'categories' | 'employees'

interface Tab {
  id: TabId
  label: string
}

const TABS: Tab[] = [
  { id: 'departments', label: 'Departments' },
  { id: 'categories',  label: 'Asset Categories' },
  { id: 'employees',   label: 'Employee Directory' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrganizationPage() {
  useDocumentTitle('Organization Setup')
  const [activeTab, setActiveTab] = useState<TabId>('departments')

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Organization Setup</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage departments, asset categories, and the employee directory.
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1" aria-label="Organization tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'departments' && <DepartmentsTab />}
        {activeTab === 'categories'  && <CategoriesTab />}
        {activeTab === 'employees'   && <EmployeesTab />}
      </div>
    </div>
  )
}
