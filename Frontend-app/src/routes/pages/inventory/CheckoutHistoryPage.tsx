import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, XCircle, Package, CheckCircle, AlertCircle, Hourglass, Ban, ThumbsUp, ThumbsDown } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select } from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'
import { useCheckouts, useCheckout, useReturnCheckout, useCancelCheckout, useApproveCheckout, useRejectCheckout } from '@/hooks/useCheckout'
import { CheckoutStatus, ReturnLine } from '@/types/inventory'
import { cn } from '@/lib/utils'

const statusConfig: Record<CheckoutStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending_approval: { label: 'Pending Approval', icon: <Hourglass className="h-3 w-3" />, color: 'bg-yellow-100 text-yellow-800' },
  open: { label: 'Approved', icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-100 text-green-800' },
  partially_returned: { label: 'Partially Returned', icon: <AlertCircle className="h-3 w-3" />, color: 'bg-amber-100 text-amber-800' },
  closed: { label: 'Closed', icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', icon: <XCircle className="h-3 w-3" />, color: 'bg-gray-100 text-gray-800' },
  rejected: { label: 'Rejected', icon: <Ban className="h-3 w-3" />, color: 'bg-red-100 text-red-800' },
}

interface ParsedNotes {
  name?: string
  email?: string
  srcode?: string
  course?: string
}

function parseNotes(notes: string | null | undefined): ParsedNotes | null {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    if (parsed.name || parsed.email || parsed.srcode || parsed.course) {
      return parsed
    }
  } catch {
    // Not JSON
  }
  return null
}

function isStudentBorrow(parsedNotes: ParsedNotes | null): boolean {
  return !!(parsedNotes?.srcode)
}

export function CheckoutHistoryPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isAdminOrStaff = user?.roles?.includes('admin') || user?.roles?.includes('staff')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedCheckoutId, setSelectedCheckoutId] = useState<string | null>(null)
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({})

  const { data: checkouts, isLoading } = useCheckouts({
    status: statusFilter || undefined,
  })

  const { data: checkoutDetail } = useCheckout(selectedCheckoutId)
  const returnCheckout = useReturnCheckout()
  const cancelCheckout = useCancelCheckout()
  const approveCheckout = useApproveCheckout()
  const rejectCheckout = useRejectCheckout()

  // Generate request number based on position in the list
  const getRequestNumber = (index: number) => index + 1

  const handleReturn = (checkoutId: string) => {
    if (!checkoutDetail) return
    const lines: ReturnLine[] = checkoutDetail.items
      .filter((item) => {
        const qty = returnQuantities[item.id] || 0
        return qty > 0
      })
      .map((item) => ({
        checkout_item_id: item.id,
        quantity: returnQuantities[item.id],
      }))

    if (lines.length === 0) return

    returnCheckout.mutate({ id: checkoutId, data: { lines } }, {
      onSuccess: () => {
        setReturnQuantities({})
        setSelectedCheckoutId(null)
      },
    })
  }

  const canReturn = (status: CheckoutStatus) => status === 'open' || status === 'partially_returned'
  const canCancel = (status: CheckoutStatus) => status === 'open' || status === 'pending_approval'
  const canApprove = (status: CheckoutStatus) => status === 'pending_approval'

  function renderBorrowerInfo(notes: string | null | undefined) {
    const parsedNotes = parseNotes(notes)
    
    // Student borrow - show full details
    if (isStudentBorrow(parsedNotes)) {
      return (
        <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <p><span className="font-medium text-foreground/80">Time Requested:</span> {notes ? new Date(JSON.parse(notes).created_at || Date.now()).toLocaleString() : 'N/A'}</p>
            <p><span className="font-medium text-foreground/80">Time Returned:</span> {notes ? (JSON.parse(notes).returned_at ? new Date(JSON.parse(notes).returned_at).toLocaleString() : 'N/A') : 'N/A'}</p>
            <p><span className="font-medium text-foreground/80">Requested By:</span> {parsedNotes?.name || 'N/A'}</p>
            <p><span className="font-medium text-foreground/80">Email:</span> {parsedNotes?.email || 'N/A'}</p>
            <p><span className="font-medium text-foreground/80">Item Borrowed:</span> {notes ? (JSON.parse(notes).item_name || 'N/A') : 'N/A'}</p>
            <p><span className="font-medium text-foreground/80">SR-Code:</span> {parsedNotes?.srcode || 'N/A'}</p>
            <p><span className="font-medium text-foreground/80">Program:</span> {parsedNotes?.course || 'N/A'}</p>
          </div>
        </div>
      )
    }
    
    // Admin/Staff borrow - show minimal info
    return (
      <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <p><span className="font-medium text-foreground/80">Time Requested:</span> {notes ? (JSON.parse(notes).created_at ? new Date(JSON.parse(notes).created_at).toLocaleString() : new Date().toLocaleString()) : new Date().toLocaleString()}</p>
          <p><span className="font-medium text-foreground/80">Time Returned:</span> {notes ? (JSON.parse(notes).returned_at ? new Date(JSON.parse(notes).returned_at).toLocaleString() : 'N/A') : 'N/A'}</p>
          <p><span className="font-medium text-foreground/80">Requested By:</span> {parsedNotes?.name || 'N/A'}</p>
          <p><span className="font-medium text-foreground/80">Item Borrowed:</span> {notes ? (JSON.parse(notes).item_name || 'N/A') : 'N/A'}</p>
        </div>
      </div>
    )
  }

  return (
    <PageShell title="Request History" description="View and manage requests">
      <Button variant="ghost" size="sm" className="mb-1 sm:mb-2" onClick={() => navigate('/inventory')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Inventory
      </Button>

      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="open">Approved</option>
          <option value="partially_returned">Partially Returned</option>
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2 sm:space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 sm:h-20" />
          ))}
        </div>
      ) : checkouts && checkouts.length > 0 ? (
        <div className="space-y-2 sm:space-y-3">
          {checkouts.map((txn, index) => {
            const status = statusConfig[txn.status];
            const isSelected = selectedCheckoutId === txn.id
            
            return (
              <Card
                key={txn.id}
                className={cn(
                  isSelected && 'border-primary',
                  'cursor-pointer transition-colors hover:border-muted-foreground/30',
                )}
                onClick={() => { if (!isSelected) setSelectedCheckoutId(txn.id) }}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Request #{getRequestNumber(index)}</span>
                        <Badge variant="outline" className={cn('text-xs flex items-center gap-1', status.color)}>
                          {status.icon}
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(txn.created_at).toLocaleString()}
                      </p>
                      {txn.checked_out_by_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Requested by: {txn.checked_out_by_name}
                        </p>
                      )}
                      {renderBorrowerInfo(txn.notes)}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      {isAdminOrStaff && canApprove(txn.status) && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={(e) => { e.stopPropagation(); approveCheckout.mutate(txn.id); }}
                            disabled={approveCheckout.isPending}
                          >
                            <ThumbsUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); rejectCheckout.mutate(txn.id); }}
                            disabled={rejectCheckout.isPending}
                          >
                            <ThumbsDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {canReturn(txn.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCheckoutId(isSelected ? null : txn.id)
                            setReturnQuantities({})
                          }}
                        >
                          <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                          Return
                        </Button>
                      )}
                      {/* Students can cancel their own pending requests; admin/staff can cancel any open/pending */}
                      {(canCancel(txn.status) && (!isAdminOrStaff ? txn.checked_out_by === user?.id : true)) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); cancelCheckout.mutate(txn.id); }}
                          disabled={cancelCheckout.isPending}
                        >
                          <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Checkout Items Summary (read-only) */}
                  {isSelected && checkoutDetail && (
                    <div className="mt-4 border-t pt-4 space-y-2">
                      <h4 className="text-sm font-semibold">Items</h4>
                      {checkoutDetail.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg border p-2 sm:p-3">
                          <div>
                            <p className="text-sm font-medium">{item.item_name}</p>
                            <p className="text-xs text-muted-foreground">Lot: {item.lot_code}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p>Checked out: {item.quantity_out}</p>
                            <p className="text-xs text-muted-foreground">Returned: {item.quantity_returned}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Return Panel */}
                  {isSelected && checkoutDetail && (
                    <div className="mt-4 border-t pt-4 space-y-2 sm:space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <h4 className="text-sm font-semibold">Select items to return</h4>
                        <Button
                          variant="outline" size="sm" className="h-7 text-xs"
                          onClick={(e) => { e.stopPropagation();
                            const all: Record<string, number> = {}
                            checkoutDetail.items.forEach((i: any) => {
                              all[i.id] = i.quantity_out - i.quantity_returned
                            })
                            setReturnQuantities(all)
                          }}
                        >
                          Return All
                        </Button>
                      </div>

                      {checkoutDetail.items.map((item) => {
                        const remaining = item.quantity_out - item.quantity_returned
                        if (remaining <= 0) return null
                        const returnQty = returnQuantities[item.id] || 0
                        return (
                          <div key={item.id} className="flex items-center justify-between rounded-lg border p-2 sm:p-3">
                            <div>
                              <p className="text-sm font-medium">{item.item_name}</p>
                              <p className="text-xs text-muted-foreground">{item.lot_code}</p>
                              <p className="text-xs text-muted-foreground">
                                Checked out: {item.quantity_out} · Already returned: {item.quantity_returned} · Remaining: {remaining}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={remaining}
                                value={returnQty}
                                onChange={(e) =>
                                  setReturnQuantities((prev) => ({
                                    ...prev,
                                    [item.id]: Math.min(remaining, Math.max(0, Number(e.target.value))),
                                  }))
                                }
                                className="w-14 h-7 sm:w-16 sm:h-8 rounded-md border border-input bg-background px-1 sm:px-2 text-xs sm:text-sm text-center"
                              />
                            </div>
                          </div>
                        )
                      })}
                      <div className="flex justify-end gap-2 mt-3 border-t pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setSelectedCheckoutId(null); setReturnQuantities({}); }}
                        >
                          Close Details
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleReturn(txn.id); }}
                          disabled={returnCheckout.isPending || Object.values(returnQuantities).every((v) => v <= 0)}
                        >
                          {returnCheckout.isPending ? 'Processing...' : 'Confirm Return'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-muted-foreground">
          <Package className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 opacity-50" />
          <p className="text-base sm:text-lg font-medium">No requests found</p>
        </div>
      )}
    </PageShell>
  )
}