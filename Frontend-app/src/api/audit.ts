import api from './client'

export interface AuditLog {
  id: string
  entityType: string
  action: string
  actorId: string
  actorName: string
  entityId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AuditLogFilters {
  entityType?: string
  action?: string
  actorId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface AuditLogSummary {
  entityType?: string
  action?: string
  count: number
}

export const auditApi = {
  getLogs: (filters?: AuditLogFilters) =>
    api.get<{ logs: AuditLog[]; total: number }>('/audit-logs', { params: filters }).then((r) => ({ data: r.data })),

  getSummary: (params?: { groupBy?: 'entityType' | 'action' }) =>
    api.get<{ summary: AuditLogSummary[] }>('/audit-logs/summary', { params }).then((r) => ({ data: r.data.summary })),
}
