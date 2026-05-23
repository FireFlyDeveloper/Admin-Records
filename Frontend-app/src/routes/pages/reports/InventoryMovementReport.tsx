import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useInventoryMovementReport } from '@/hooks/useReports'
import { exportToCSV, exportToJSON } from '@/lib/export'
import { FileDown, Search } from 'lucide-react'

export function InventoryMovementReport() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filters = {
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  }

  const { data, isLoading } = useInventoryMovementReport(filters)

  const handleExportCSV = () => {
    if (!data) return
    exportToCSV(
      data.map((d) => ({
        date: d.date,
        checkouts: d.checkouts,
        returns: d.returns,
      })),
      `inventory-movement-${new Date().toISOString().split('T')[0]}.csv`
    )
  }

  const handleExportJSON = () => {
    if (!data) return
    exportToJSON(data, `inventory-movement-${new Date().toISOString().split('T')[0]}.json`)
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Filters */}
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
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!data || data.length === 0} className="h-9 sm:h-10 text-xs px-2 sm:px-3">
                <FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={!data || data.length === 0} className="h-9 sm:h-10 text-xs px-2 sm:px-3">
                <FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                JSON
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base">Movement Data</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-medium">Date</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-medium">Checkouts</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-medium">Returns</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-2 sm:px-4 py-2 sm:py-3"><Skeleton className="h-3 sm:h-4 w-20 sm:w-24" /></td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3"><Skeleton className="h-3 sm:h-4 w-10 sm:w-12" /></td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3"><Skeleton className="h-3 sm:h-4 w-10 sm:w-12" /></td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3"><Skeleton className="h-3 sm:h-4 w-10 sm:w-12" /></td>
                  </tr>
                ))
              ) : data && data.length > 0 ? (
                data.map((row) => (
                  <tr key={row.date} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{row.date}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{row.checkouts}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{row.returns}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium whitespace-nowrap">{row.checkouts - row.returns}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-2 sm:px-4 py-8 sm:py-12 text-center text-muted-foreground">
                    <Search className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1 sm:mb-2 opacity-50" />
                    <p className="text-xs sm:text-sm">No data for selected range</p>
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
