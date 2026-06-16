import { useQuery } from '@tanstack/react-query'
import { reportsApi, ReportFilters } from '@/api/reports'

export function useInventoryMovementReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ['report-inventory-movement', filters],
    queryFn: () => reportsApi.getInventoryMovement(filters).then((res) => res.data),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useRequestsReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ['report-requests', filters],
    queryFn: () => reportsApi.getCheckoutHistory(filters).then((res) => res.data),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useMissingHistoryReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ['report-missing-history', filters],
    queryFn: () => reportsApi.getMissingHistory(filters).then((res) => res.data),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useDeviceHealthReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ['report-device-health', filters],
    queryFn: () => reportsApi.getDeviceHealth(filters).then((res) => res.data),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })
}
