/**
 * Application router.
 *
 * Route groups:
 *   Public    — AuthLayout  (/login, /signup)
 *   Protected — MainLayout  wrapped by ProtectedRoute
 *   Admin     — sub-group requiring ADMIN role (/organization)
 */

import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { MainLayout, AuthLayout } from '@/layouts'
import ProtectedRoute from './ProtectedRoute'

import {
  AllocationsPage,
  AllocationHistoryPage,
  AssetDetailPage,
  AssetsPage,
  BookingCalendarPage,
  BookingsPage,
  DashboardPage,
  LoginPage,
  NotFoundPage,
  OrganizationPage,
  PlaceholderPage,
  SignupPage,
  TransfersPage,
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
          {/* ── Public ──────────────────────────────────────────────── */}
          <Route element={<AuthLayout />}>
            <Route path="/login"  element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          {/* ── Protected (any authenticated user) ──────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route index element={<DashboardPage />} />

              {/* ── Admin-only ─────────────────────────────────────── */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="organization" element={<OrganizationPage />} />
              </Route>

              {/* ── Asset module ───────────────────────────────────── */}
              <Route path="assets"     element={<AssetsPage />} />
              <Route path="assets/:id" element={<AssetDetailPage />} />

              {/* ── Allocation & Transfer module ───────────────────── */}
              <Route path="allocations"         element={<AllocationsPage />} />
              <Route path="allocations/history" element={<AllocationHistoryPage />} />
              <Route path="transfers"           element={<TransfersPage />} />

              {/* ── Booking module ─────────────────────────────────── */}
              <Route path="bookings"          element={<BookingsPage />} />
              <Route path="bookings/calendar" element={<BookingCalendarPage />} />

              {/* ── Module placeholders ────────────────────────────── */}
              <Route path="maintenance"   element={<PlaceholderPage module="maintenance" />} />
              <Route path="audits"        element={<PlaceholderPage module="audits" />} />
              <Route path="reports"       element={<PlaceholderPage module="reports" />} />
              <Route path="notifications" element={<PlaceholderPage module="notifications" />} />
              <Route path="activity-logs" element={<PlaceholderPage module="activity logs" />} />
              <Route path="departments"   element={<PlaceholderPage module="departments" />} />
              <Route path="categories"    element={<PlaceholderPage module="categories" />} />
              <Route path="employees"     element={<PlaceholderPage module="employees" />} />
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
