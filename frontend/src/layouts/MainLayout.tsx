/**
 * Main authenticated ERP layout.
 * Responsive: sidebar collapses to icon-only on desktop, overlays on mobile.
 */

import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import { toTitleCase } from '@/utils'
import { cn } from '@/utils'

function derivePageTitle(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0]
  if (!segment) return 'Dashboard'
  return toTitleCase(segment.replace(/-/g, ' '))
}

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const location = useLocation()
  const pageTitle = derivePageTitle(location.pathname)

  // Detect mobile breakpoint
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) setSidebarOpen(false)
      else setSidebarOpen(true)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [location.pathname, isMobile])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'z-40 flex-shrink-0 transition-all duration-300',
          isMobile
            ? cn('fixed inset-y-0 left-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full')
            : 'relative',
        )}
      >
        <Sidebar isOpen={sidebarOpen} />
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          pageTitle={pageTitle}
        />

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
