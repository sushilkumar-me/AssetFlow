import { Link, useNavigate } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function ServerErrorPage() {
  useDocumentTitle('Server Error')
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50">
        <svg className="h-10 w-10 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-5xl font-extrabold text-orange-500">500</p>
      <h2 className="mt-3 text-2xl font-semibold text-gray-800">Server Error</h2>
      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        Something went wrong on our end. The team has been notified. Please try again in a moment.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate(0)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Reload Page
        </button>
        <Link
          to="/"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
