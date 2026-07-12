import { Link, useNavigate } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function ForbiddenPage() {
  useDocumentTitle('Access Denied')
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-5xl font-extrabold text-red-500">403</p>
      <h2 className="mt-3 text-2xl font-semibold text-gray-800">Access Denied</h2>
      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        You don't have permission to view this page. Contact your administrator if you believe this is an error.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Go Back
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
