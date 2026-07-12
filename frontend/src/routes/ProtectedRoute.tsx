/**
 * ProtectedRoute — guards any route that requires authentication.
 *
 * While the auth state is bootstrapping (isLoading=true), renders a spinner
 * so the user isn't flashed to /login before the /me call resolves.
 * Once resolved, unauthenticated users are redirected to /login with the
 * original location saved so they can be sent back after login.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  /** If provided, only users with one of these roles can access the route. */
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  // Still bootstrapping — show a full-page spinner to avoid flicker
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <span
          className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  // Not logged in — redirect to login, preserving intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Logged in but wrong role
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
