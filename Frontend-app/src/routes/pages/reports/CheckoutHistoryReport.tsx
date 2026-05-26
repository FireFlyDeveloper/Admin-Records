import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useCheckoutHistoryReport } from '@/hooks/useReports'
import { exportToExcel } from '@/lib/export'
import { FileDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  borrowed: 'bg-blue-100 text-blue-800',
  returned: 'bg-purple-100 text-purple-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

const statusLabels: Record<string, string> = {
  pending: 'pending',
  approved: 'approved',
  borrowed: 'borrowed',
  returned: 'returned',
  rejected: 'rejected',
  cancelled: 'cancelled',
}

export function CheckoutHistoryReport() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filters = {
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  }

  const { data, isLoading } = useCheckoutHistoryReport(filters)

  const handleExportExcel = () => {
    if (!data) return
    exportToExcel(
      data.map((d, index) => ({
        requestNumber: `Request #${d.requestNumber || index + 1}`,
        checkedOutBy: d.checkedOutBy,
        processedBy: d.processedBy || '',
        status: statusLabels[d.status] || d.status,
        itemCount: d.itemCount,
        dateTime: new Date(d.createdAt).toLocaleString(),
      })),
      `checkout-history-${new Date().toISOString().split('T')[0]}.xlsx`,
      {
        requestNumber: 'Request #',
        checkedOutBy: 'Checked Out By',
        processedBy: 'Processed By',
        status: 'Status',
        itemCount: 'Items',
        dateTime: 'Date/Time',
      },
      'Checkout History'
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1 block">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 sm:h-10 text-xs sm:text-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1 block">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 sm:h-10 text-xs sm:text-sm" />
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!data || data.length === 0} className="h-9 sm:h-10 text-xs px-2 sm:px-3">
                <FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Download Report (.xlsx)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base">Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-medium">Request #</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-medium">User</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-medium">Status</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-medium">Items</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-medium">Date/Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-2 sm:px-4 py-2 sm:py-3"><Skeleton className="h-3 sm:h-4 w-16 sm:w-20" /></td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3"><Skeleton className="h-3 sm:h-4 w-20 sm:w-24" /></td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3"><Skeleton className="h-3 sm:h-4 w-12 sm:w-16" /></td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3"><Skeleton className="h-3 sm:h-4 w-6 sm:w-8" /></td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3"><Skeleton className="h-3 sm:h-4 w-20 sm:w-28" /></td>
                  </tr>
                ))
              ) : data && data.length > 0 ? (
                data.map((row, index) => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium whitespace-nowrap">Request #{row.requestNumber || index + 1}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{row.checkedOutBy}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                      <Badge variant="outline" className={cn('text-[10px] sm:text-xs capitalize px-1.5 py-0 sm:px-2 sm:py-0.5', statusColors[row.status] || '')}>
                        {statusLabels[row.status] || row.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{row.itemCount}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-2 sm:px-4 py-8 sm:py-12 text-center text-muted-foreground">
                    <Search className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1 sm:mb-2 opacity-50" />
                    <p className="text-xs sm:text-sm">No checkout data for selected range</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
