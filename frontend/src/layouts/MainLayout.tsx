/**
 * Main authenticated ERP layout.
 * Renders a collapsible sidebar + top navbar + scrollable content area.
 */

import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import { toTitleCase } from '@/utils'

function derivePageTitle(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0]
  if (!segment) return 'Dashboard'
  return toTitleCase(segment.replace(/-/g, ' '))
}

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const pageTitle = derivePageTitle(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          pageTitle={pageTitle}
        />

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-6"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
