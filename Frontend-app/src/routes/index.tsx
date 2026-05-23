import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './layout'
import { ProtectedRoute } from './protectedRoute'
import { LoginPage } from './pages/LoginPage'
import { PublicBorrowPage } from './pages/PublicBorrowPage'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentManagerPage } from './pages/documents/DocumentManagerPage'
import {
  InventoryListPage,
  ItemDetailPage,
  CheckoutPage,
  CheckoutHistoryPage,
} from './pages/inventory'
import { TrackingDashboardPage } from './pages/ble'
import { UsersPage } from './pages/admin'
import { AuditLogPage } from './pages/audit'
import { ReportsPage } from './pages/reports'
import { TestScannerPage } from './pages/test/TestScannerPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/borrow',
    element: <PublicBorrowPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'documents',
        element: <DocumentManagerPage />,
      },
      {
        path: 'inventory',
        children: [
          {
            index: true,
            element: <InventoryListPage />,
          },
          {
            path: ':id',
            element: <ItemDetailPage />,
          },
          {
            path: 'checkout',
            element: (
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <CheckoutPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'checkouts',
            element: (
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <CheckoutHistoryPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: 'ble-tracking',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <TrackingDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'audit-logs',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <AuditLogPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <ReportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: <Navigate to="/admin/users" replace />,
      },
      {
        path: 'admin/users',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'test/scanner',
        element: <TestScannerPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
