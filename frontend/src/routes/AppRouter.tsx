/**
 * Application router.
 *
 * Route groups:
 *   Public  — AuthLayout  (/login, /signup)
 *   Private — MainLayout  wrapped by ProtectedRoute (all app pages)
 */

import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { MainLayout, AuthLayout } from '@/layouts'
import ProtectedRoute from './ProtectedRoute'

import {
  DashboardPage,
  LoginPage,
  NotFoundPage,
  PlaceholderPage,
  SignupPage,
} from '@/pages'

function PageLoader() {
  return (
    <div className="flex h-40 items-center justify-center" role="status" aria-label="Loading page">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Public — unauthenticated only ───────────────────────── */}
          <Route element={<AuthLayout />}>
            <Route path="/login"  element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          {/* ── Protected — requires valid JWT ──────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route index element={<DashboardPage />} />

              {/* Module placeholders — swap for real pages as built */}
              <Route path="assets"        element={<PlaceholderPage module="assets" />} />
              <Route path="employees"     element={<PlaceholderPage module="employees" />} />
              <Route path="departments"   element={<PlaceholderPage module="departments" />} />
              <Route path="categories"    element={<PlaceholderPage module="categories" />} />
              <Route path="allocations"   element={<PlaceholderPage module="allocations" />} />
              <Route path="bookings"      element={<PlaceholderPage module="bookings" />} />
              <Route path="maintenance"   element={<PlaceholderPage module="maintenance" />} />
              <Route path="audits"        element={<PlaceholderPage module="audits" />} />
              <Route path="reports"       element={<PlaceholderPage module="reports" />} />
              <Route path="notifications" element={<PlaceholderPage module="notifications" />} />
              <Route path="activity-logs" element={<PlaceholderPage module="activity logs" />} />
            </Route>
          </Route>

          {/* ── Error pages ─────────────────────────────────────────── */}
          <Route path="/403" element={<NotFoundPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*"    element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
