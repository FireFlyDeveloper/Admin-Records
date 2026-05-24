import { CheckoutStatus } from '@/types/inventory'

/**
 * Maps backend status values to frontend CheckoutStatus
 * Backend uses old status names: pending_approval, open, partially_returned, closed, cancelled, rejected
 * Frontend uses new status names: pending, approved, borrowed, returned, cancelled, rejected
 */
export function mapBackendStatusToFrontend(backendStatus: string): CheckoutStatus {
  switch (backendStatus) {
    case 'pending_approval':
      return 'pending'
    case 'open':
      return 'approved'
    case 'partially_returned':
      return 'borrowed'
    case 'closed':
      return 'returned'
    case 'cancelled':
      return 'cancelled'
    case 'rejected':
      return 'rejected'
    default:
      // If it's already a new status, return it
      if (['pending', 'approved', 'borrowed', 'returned', 'cancelled', 'rejected'].includes(backendStatus)) {
        return backendStatus as CheckoutStatus
      }
      return 'pending' // Default fallback
  }
}

/**
 * Maps frontend CheckoutStatus to backend status values
 */
export function mapFrontendStatusToBackend(frontendStatus: CheckoutStatus): string {
  switch (frontendStatus) {
    case 'pending':
      return 'pending_approval'
    case 'approved':
      return 'open'
    case 'borrowed':
      return 'partially_returned'
    case 'returned':
      return 'closed'
    case 'cancelled':
      return 'cancelled'
    case 'rejected':
      return 'rejected'
  }
}

/**
 * Helper to check if a status string is a valid CheckoutStatus
 */
export function isValidCheckoutStatus(status: string): status is CheckoutStatus {
  return ['pending', 'approved', 'borrowed', 'returned', 'cancelled', 'rejected'].includes(status)
}