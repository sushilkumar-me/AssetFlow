/**
 * Application router — all modules wired.
 */

import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout, AuthLayout } from '@/layouts'
import ProtectedRoute from './ProtectedRoute'

import {
  ActivityLogsPage,
  AllocationsPage, AllocationHistoryPage,
  AssetDetailPage, AssetsPage,
  AuditDetailPage, AuditsPage,
  BookingCalendarPage, BookingsPage,
  DashboardPage,
  LoginPage,
  MaintenanceDetailPage, MaintenancePage,
  NotFoundPage,
  NotificationsPage,
  OrganizationPage,
  PlaceholderPage,
  ReportsPage,
  SignupPage,
  TransfersPage,
} from '@/pages'

function PageLoader() {
  return (
    <div className="flex h-40 items-center justify-center" role="status">
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

          {/* ── Protected ───────────────────────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route index element={<DashboardPage />} />

              {/* Admin-only */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="organization" element={<OrganizationPage />} />
              </Route>

              {/* Assets */}
              <Route path="assets"     element={<AssetsPage />} />
              <Route path="assets/:id" element={<AssetDetailPage />} />

              {/* Allocation & Transfer */}
              <Route path="allocations"         element={<AllocationsPage />} />
              <Route path="allocations/history" element={<AllocationHistoryPage />} />
              <Route path="transfers"           element={<TransfersPage />} />

              {/* Bookings */}
              <Route path="bookings"          element={<BookingsPage />} />
              <Route path="bookings/calendar" element={<BookingCalendarPage />} />

              {/* Maintenance */}
              <Route path="maintenance"     element={<MaintenancePage />} />
              <Route path="maintenance/:id" element={<MaintenanceDetailPage />} />

              {/* Audits */}
              <Route path="audits"     element={<AuditsPage />} />
              <Route path="audits/:id" element={<AuditDetailPage />} />

              {/* Reports */}
              <Route path="reports" element={<ReportsPage />} />

              {/* Notifications & Activity */}
              <Route path="notifications"  element={<NotificationsPage />} />
              <Route path="activity-logs"  element={<ActivityLogsPage />} />

              {/* Placeholders */}
              <Route path="reports"       element={<PlaceholderPage module="reports" />} />
              <Route path="departments"   element={<PlaceholderPage module="departments" />} />
              <Route path="categories"    element={<PlaceholderPage module="categories" />} />
              <Route path="employees"     element={<PlaceholderPage module="employees" />} />
            </Route>
          </Route>

          {/* Error pages */}
          <Route path="/403" element={<NotFoundPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*"    element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
