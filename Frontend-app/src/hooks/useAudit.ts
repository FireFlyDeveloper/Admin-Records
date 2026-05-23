import { useQuery } from '@tanstack/react-query'
import { auditApi, AuditLogFilters } from '@/api/audit'

export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditApi.getLogs(filters).then((res) => res.data),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useAuditSummary(groupBy?: 'entityType' | 'action') {
  return useQuery({
    queryKey: ['audit-summary', groupBy],
    queryFn: () => auditApi.getSummary({ groupBy }).then((res) => res.data),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })
}
