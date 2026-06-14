import { useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useAuditLogs } from '@/hooks/useAudit'
import { exportToExcel } from '@/lib/export'
import { FileDown, Search, RotateCcw } from 'lucide-react'

const actions = ['create', 'update', 'delete', 'request', 'return', 'upload', 'download']

export function AuditLogPage() {
  const [action, setAction] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const limit = 25

  const filters = {
    ...(action ? { action } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    page,
    limit,
  }

  const { data, isLoading } = useAuditLogs(filters)
  const logs = data?.logs || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  const handleReset = () => {
    setAction('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const handleExportExcel = () => {
    exportToExcel(
      logs.map((l) => ({
        action: l.action,
        actor: l.actorName,
        dateTime: new Date(l.createdAt).toLocaleString(),
      })),
      `audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`,
      {
        action: 'Action',
        actor: 'Actor',
        dateTime: 'Date/Time',
      },
      'Audit Logs'
    )
  }

  return (
    <PageShell
      title="Audit Logs"
      description="Track all system activity and changes"
      actions={
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileDown className="h-4 w-4 mr-2" />
            Download Report (.xlsx)
          </Button>
        </div>
      }
    >
      {/* Filters */}
      <Card>
        <CardContent className="p-3 lg:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Action</label>
              <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }}>
                <option value="">All</option>
                {actions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" className="w-full" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs lg:text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-2 lg:px-4 py-2 lg:py-3 font-medium">Action</th>
                <th className="text-left px-2 lg:px-4 py-2 lg:py-3 font-medium">Actor</th>
                <th className="text-left px-2 lg:px-4 py-2 lg:py-3 font-medium">Date/Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-2 lg:px-4 py-2 lg:py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3"><Skeleton className="h-4 w-24" /></td>
                  </tr>
                ))
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-2 lg:px-4 py-2 lg:py-3">
                      <span className="capitalize font-medium">{log.action}</span>
                    </td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-muted-foreground">{log.actorName}</td>
                    <td className="px-2 lg:px-4 py-2 lg:py-3 text-muted-foreground text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-2 lg:px-4 py-8 lg:py-12 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No audit logs found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex-col sm:flex-row items-center justify-between gap-3 px-2 sm:px-0">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-xs sm:text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  )
}
