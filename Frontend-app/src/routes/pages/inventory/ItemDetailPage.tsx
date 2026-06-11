import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Box,
  Package,
  AlertTriangle,
  MapPin,
  Radio,
  History,
  Tag as TagIcon,
  X,
  ShoppingCart,
} from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { ItemForm } from '@/components/inventory/ItemForm'
import { LotForm } from '@/components/inventory/LotForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/authStore'
import { useItem, useUpdateItem, useDeleteItem } from '@/hooks/useItems'
import { useLots, useCreateLot, useUpdateLot, useDeleteLot } from '@/hooks/useLots'
import {
  usePresenceDetail,
  useBleTags,
  useAssignBleTag,
  useUnassignBleTag,
} from '@/hooks/useBLE'
import { useCheckouts, useCreateCheckout } from '@/hooks/useCheckout'
import { UpdateItemInput, CreateLotInput, UpdateLotInput, CheckoutLine } from '@/types/inventory'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
}

const presenceColors: Record<string, string> = {
  present: 'bg-green-100 text-green-800',
  missing: 'bg-red-100 text-red-800',
  inactive: 'bg-gray-100 text-gray-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  unknown: 'bg-blue-100 text-blue-800',
}

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isAdminOrStaff = user?.roles?.includes('admin') || user?.roles?.includes('staff')

  const [showEditForm, setShowEditForm] = useState(false)
  const [showLotForm, setShowLotForm] = useState(false)
  const [editingLot, setEditingLot] = useState<{ id: string; data: any } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [lotToDelete, setLotToDelete] = useState<{ id: string; code: string } | null>(null)
  const [checkoutLotId, setCheckoutLotId] = useState('')
  const [checkoutQty, setCheckoutQty] = useState('1')

  const { data: item, isLoading: itemLoading } = useItem(id || null)
  const { data: lots, isLoading: lotsLoading } = useLots(id || null)
  const { data: presence, isLoading: presenceLoading } = usePresenceDetail(
    id && item?.item_type === 'trackable' ? id : null
  )
  const { data: bleTags, isLoading: tagsLoading } = useBleTags()
  const assignTag = useAssignBleTag()
  const unassignTag = useUnassignBleTag()

  const { data: checkouts, isLoading: checkoutsLoading } = useCheckouts(
    item?.item_type === 'quantifiable' && id ? { item_id: id } : undefined
  )
  const createCheckout = useCreateCheckout()

  const assignedTag = bleTags?.find((t) => t.item_id === id)
  const unassignedTags = bleTags?.filter((t) => !t.item_id) || []

  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()
  const createLot = useCreateLot()
  const updateLot = useUpdateLot()
  const deleteLot = useDeleteLot()

  const handleUpdate = (data: UpdateItemInput) => {
    if (!id) return
    updateItem.mutate({ id, data }, { onSuccess: () => setShowEditForm(false) })
  }

  const handleDelete = () => {
    if (!id) return
    deleteItem.mutate(id, { onSuccess: () => navigate('/inventory') })
  }

  const handleAssignTag = (tagId: string) => {
    if (!id) return
    assignTag.mutate({ id: tagId, data: { item_id: id } })
  }

  const handleUnassignTag = () => {
    if (!assignedTag) return
    unassignTag.mutate(assignedTag.id)
  }

  const handleCreateLot = (data: CreateLotInput | UpdateLotInput) => {
    if (!id) return
    createLot.mutate({ itemId: id, data: data as CreateLotInput }, { onSuccess: () => setShowLotForm(false) })
  }

  const handleUpdateLot = (data: UpdateLotInput) => {
    if (!editingLot) return
    updateLot.mutate({ lotId: editingLot.id, data }, { 
      onSuccess: () => {
        setEditingLot(null)
        setShowLotForm(false)
      }
    })
  }

  const handleDeleteLot = () => {
    if (!id || !lotToDelete) return
    deleteLot.mutate(
      { lotId: lotToDelete.id, itemId: id },
      { onSuccess: () => setLotToDelete(null) }
    )
  }

  const handleCheckout = () => {
    if (!checkoutLotId || !checkoutQty) return
    const qty = parseInt(checkoutQty, 10)
    if (isNaN(qty) || qty <= 0) return
    const lines: CheckoutLine[] = [{ lot_id: checkoutLotId, quantity: qty }]
    createCheckout.mutate(
      { lines, notes: `Checkout from item detail: ${item?.name}` },
      {
        onSuccess: () => {
          setCheckoutLotId('')
          setCheckoutQty('1')
        },
      }
    )
  }

  if (itemLoading) {
    return (
      <PageShell title="Item Details">
        <Skeleton className="h-24 sm:h-40" />
        <Skeleton className="h-36 sm:h-60 mt-3 sm:mt-4" />
      </PageShell>
    )
  }

  if (!item) {
    return (
      <PageShell title="Item Not Found">
        <div className="flex flex-col items-center justify-center py-10 md:py-20 text-muted-foreground">
          <Package className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Item not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/inventory')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell
      title={item.name}
      description={item.description || undefined}
      actions={
        isAdminOrStaff && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEditForm(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )
      }
    >
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate('/inventory')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Item Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                {item.item_type === 'quantifiable' ? (
                  <Box className="h-6 w-6 text-primary" />
                ) : (
                  <Package className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold">{item.name}</h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                  <Badge variant="outline" className={cn('text-xs', statusColors[item.status])}>
                    {item.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground capitalize">{item.item_type}</span>
                  {item.category && (
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                  )}
                  {item.item_model && (
                    <span className="text-xs font-medium">Model: {item.item_model}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Presence & Tag Card (trackable only) */}
      {item.item_type === 'trackable' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Presence */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Live Location</CardTitle>
            </CardHeader>
            <CardContent>
              {presenceLoading ? (
                <Skeleton className="h-20" />
              ) : presence ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={cn('text-xs', presenceColors[presence.status] || presenceColors.unknown)}>
                      {presence.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Room</span>
                    <span className="text-sm font-medium">{presence.room_name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Seen</span>
                    <span className="text-sm">
                      {presence.last_seen
                        ? new Date(presence.last_seen).toLocaleString()
                        : 'Never'}
                    </span>
                  </div>
                  {presence.device_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Detected By</span>
                      <span className="text-sm font-medium">{presence.device_name}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Radio className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No presence data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tag Assignment */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <TagIcon className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">BLE Tag</CardTitle>
            </CardHeader>
            <CardContent>
              {tagsLoading ? (
                <Skeleton className="h-20" />
              ) : assignedTag ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Assigned Tag</span>
                    <span className="text-sm font-medium">{assignedTag.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tag ID</span>
                    <span className="text-sm font-mono">{assignedTag.tag_id}</span>
                  </div>
                  {isAdminOrStaff && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleUnassignTag}
                      disabled={unassignTag.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Unassign Tag
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">No tag assigned</p>
                  {isAdminOrStaff && unassignedTags.length > 0 && (
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) handleAssignTag(e.target.value)
                        e.target.value = ''
                      }}
                    >
                      <option value="" disabled>Assign a tag...</option>
                      {unassignedTags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name} ({tag.tag_id})
                        </option>
                      ))}
                    </select>
                  )}
                  {isAdminOrStaff && unassignedTags.length === 0 && (
                    <p className="text-xs text-muted-foreground">No unassigned tags available</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Movement History (trackable only) */}
      {item.item_type === 'trackable' && presence?.history && presence.history.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Movement History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-3">Room</th>
                    <th className="text-left py-2 px-3">Detected At</th>
                  </tr>
                </thead>
                <tbody>
                  {presence.history.map((entry, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2 px-3 font-medium">{entry.room_name}</td>
                      <td className="py-2 px-3">
                        {new Date(entry.detected_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lots Section (quantifiable only) */}
      {item.item_type === 'quantifiable' && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Lots</CardTitle>
              {isAdminOrStaff && (
                <Button size="sm" onClick={() => setShowLotForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lot
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {lotsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : lots && lots.length > 0 ? (
                <div className="space-y-2">
                  {lots.map((lot) => (
                    <div key={lot.id} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg border p-3">
                      <div className="min-w-0 w-full">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium break-words">{lot.lot_code}</p>
                            {lot.item_name && <p className="text-xs text-muted-foreground truncate">{lot.item_name}</p>}
                          </div>
                          {isAdminOrStaff && (
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                aria-label={`Edit lot ${lot.lot_code}`}
                                onClick={() => {
                                  setEditingLot({ id: lot.id, data: lot })
                                  setShowLotForm(true)
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                aria-label={`Delete lot ${lot.lot_code}`}
                                onClick={() => setLotToDelete({ id: lot.id, code: lot.lot_code })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {(lot.purchased_at || lot.expires_at) && (
                          <p className="text-xs text-muted-foreground mt-1 break-words">
                            {lot.purchased_at && `Purchased: ${new Date(lot.purchased_at).toLocaleDateString()}`}
                            {lot.purchased_at && lot.expires_at && ' · '}
                            {lot.expires_at && `Expires: ${new Date(lot.expires_at).toLocaleDateString()}`}
                          </p>
                        )}
                        {lot.notes && (
                          <p className="text-xs text-muted-foreground mt-1 break-words">{lot.notes}</p>
                        )}
                      </div>
                      <div className="w-full sm:w-auto sm:min-w-[220px] text-left sm:text-right">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span>Total: <strong>{lot.quantity_total}</strong></span>
                          <span>On Hand: <strong className="text-green-700">{lot.quantity_on_hand}</strong></span>
                          <span>Out: <strong className="text-amber-700">{lot.quantity_out}</strong></span>
                        </div>
                        {lot.quantity_on_hand === 0 && (
                          <div className="flex items-center justify-end gap-1 text-xs text-destructive mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            Out of stock
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No lots yet</p>
                  {isAdminOrStaff && <p className="text-xs">Add a lot to track quantities</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Checkout */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Quick Checkout</CardTitle>
            </CardHeader>
            <CardContent>
              {lots && lots.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Lot</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={checkoutLotId}
                      onChange={(e) => setCheckoutLotId(e.target.value)}
                    >
                      <option value="" disabled>Select a lot...</option>
                      {lots.map((lot) => (
                        <option key={lot.id} value={lot.id}>
                          {lot.item_name || lot.lot_code} (On Hand: {lot.quantity_on_hand})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-24 space-y-2">
                    <label className="text-sm font-medium">Qty</label>
                    <Input
                      type="number"
                      min={1}
                      value={checkoutQty}
                      onChange={(e) => setCheckoutQty(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleCheckout}
                    disabled={!checkoutLotId || !checkoutQty || createCheckout.isPending}
                    className="w-full sm:w-auto"
                  >
                    {createCheckout.isPending ? 'Checking out...' : 'Checkout'}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Add lots to enable checkout</p>
              )}
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <History className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {checkoutsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : checkouts && checkouts.length > 0 ? (
                <div className="space-y-2">
                  {checkouts.map((txn, index) => (
                    <div key={txn.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Request #{index + 1}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn('text-xs', statusColors[txn.status] || 'bg-gray-100')}>
                          {txn.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/checkout/${txn.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No transactions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Form */}
      <ItemForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        onSubmit={handleUpdate}
        item={item}
        isLoading={updateItem.isPending}
      />

      {/* Lot Form */}
      <LotForm
        open={showLotForm}
        onOpenChange={(open) => {
          setShowLotForm(open)
          if (!open) setEditingLot(null)
        }}
        onSubmit={editingLot ? handleUpdateLot : handleCreateLot}
        isLoading={editingLot ? updateLot.isPending : createLot.isPending}
        lot={lots?.find(l => l.id === editingLot?.id)}
        mode={editingLot ? 'edit' : 'create'}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative z-50 bg-background rounded-lg shadow-lg max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold">Delete Item</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Are you sure you want to delete <strong>{item.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteItem.isPending}>
                {deleteItem.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lot Delete Confirmation */}
      {lotToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setLotToDelete(null)} />
          <div className="relative z-50 bg-background rounded-lg shadow-lg max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold">Delete Lot</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Are you sure you want to delete lot <strong>{lotToDelete.code}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setLotToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteLot} disabled={deleteLot.isPending}>
                {deleteLot.isPending ? 'Deleting...' : 'Delete Lot'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
