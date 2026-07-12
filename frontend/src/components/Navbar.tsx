/**
 * Top navigation bar component.
 * Placeholder — search, notifications, and user menu will be wired up with auth.
 */

interface NavbarProps {
  onToggleSidebar?: () => void
  pageTitle?: string
}

export default function Navbar({ onToggleSidebar, pageTitle = 'Dashboard' }: NavbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      {/* Left: toggle + breadcrumb */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Toggle sidebar"
        >
          {/* Hamburger icon */}
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-800">{pageTitle}</h1>
      </div>

      {/* Right: user actions placeholder */}
      <div className="flex items-center gap-3">
        {/* Notification bell placeholder */}
        <button
          type="button"
          className="relative rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        </button>

        {/* User avatar placeholder */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-white"
          title="User menu — coming soon"
          role="img"
          aria-label="User avatar"
        >
          U
        </div>
      </div>
    </header>
  )
}
