/**
 * Application router.
 * All routes are defined here in a single place for easy navigation management.
 */

import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { MainLayout, AuthLayout } from '@/layouts'

// Eagerly loaded pages
import { DashboardPage, LoginPage, NotFoundPage, PlaceholderPage } from '@/pages'

// Fallback while lazy chunks load
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
          {/* ── Auth routes ────────────────────────────────────────────── */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* ── Main app routes ────────────────────────────────────────── */}
          <Route element={<MainLayout />}>
            <Route index element={<DashboardPage />} />

            {/* Module placeholders — replace with real pages as built */}
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

          {/* ── Fallbacks ──────────────────────────────────────────────── */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*"    element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
