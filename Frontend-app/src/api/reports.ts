import api from './client'

export interface InventoryMovementEntry {
  date: string
  checkouts: number
  returns: number
}

export interface CheckoutHistoryEntry {
  id: string
  checkedOutBy: string
  processedBy: string | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  itemCount: number
}

export interface MissingItemEntry {
  itemId: string
  itemName: string
  roomId: string | null
  roomName: string | null
  status: string
  lastSeen: string | null
  detectedAt: string
}

export interface DeviceHealthEntry {
  deviceId: string
  deviceName: string
  roomName: string | null
  status: string
  lastSeen: string | null
  uptimePercent: number | null
}

export interface ReportFilters {
  startDate?: string
  endDate?: string
}

export const reportsApi = {
  getInventoryMovement: (filters?: ReportFilters) =>
    api.get<{ data: InventoryMovementEntry[] }>('/reports/inventory-movement', { params: filters }).then((r) => ({ data: r.data.data })),

  getCheckoutHistory: (filters?: ReportFilters) =>
    api.get<{ data: CheckoutHistoryEntry[] }>('/reports/checkout-history', { params: filters }).then((r) => ({ data: r.data.data })),

  getMissingHistory: (filters?: ReportFilters) =>
    api.get<{ data: MissingItemEntry[] }>('/reports/missing-history', { params: filters }).then((r) => ({ data: r.data.data })),

  getDeviceHealth: (filters?: ReportFilters) =>
    api.get<{ data: DeviceHealthEntry[] }>('/reports/device-health', { params: filters }).then((r) => ({ data: r.data.data })),
}
