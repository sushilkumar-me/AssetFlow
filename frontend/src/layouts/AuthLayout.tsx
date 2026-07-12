/**
 * Auth layout — centered card container for login / register pages.
 */

import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700 p-4">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white font-bold text-primary-700 text-xl shadow-md">
            A
          </div>
          <h1 className="text-2xl font-bold text-white">AssetFlow</h1>
          <p className="mt-1 text-sm text-primary-200">
            Enterprise Asset &amp; Resource Management
          </p>
        </div>

        {/* Page content (login form, etc.) */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
