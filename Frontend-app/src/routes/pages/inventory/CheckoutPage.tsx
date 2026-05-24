import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, ArrowLeft, Plus, Package, ChevronDown, ChevronRight } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner'
import { CheckoutCart, CartItem } from '@/components/inventory/CheckoutCart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/authStore'
import { useScanCode, useCreateCheckout } from '@/hooks/useCheckout'
import { useItems } from '@/hooks/useItems'
import { useLots } from '@/hooks/useLots'
import { useUIStore } from '@/stores/uiStore'
import { ItemLot, Item } from '@/types/inventory'
import { selectMostAppropriateLots } from '@/lib/lotSelection'
import { inventoryApi } from '@/api/inventory'

function LotRow({
  lot,
  onAdd,
}: {
  lot: ItemLot
  onAdd: (lot: ItemLot) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-2 text-sm">
      <div className="min-w-0">
        <p className="font-medium truncate">{lot.item_name || lot.lot_code}</p>
        <p className="text-xs text-muted-foreground">
          On hand: {lot.quantity_on_hand} | Out: {lot.quantity_out}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 shrink-0 min-h-9 lg:min-h-7"
        disabled={lot.quantity_on_hand <= 0}
        onClick={() => onAdd(lot)}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add
      </Button>
    </div>
  )
}

function ItemWithLots({
  item,
  onAddLot,
  onQuickAdd,
}: {
  item: Item
  onAddLot: (lot: ItemLot) => void
  onQuickAdd?: (item: Item, lots: ItemLot[]) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { data: lots, isLoading } = useLots(expanded ? item.id : null)

  const availableLots = lots?.filter((l) => l.quantity_on_hand > 0) ?? []
  const hasAvailableLots = availableLots.length > 0

  const handleQuickAdd = () => {
    if (onQuickAdd && lots) {
      onQuickAdd(item, lots)
    }
  }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between w-full p-3">
        <button
          className="flex items-center gap-3 min-w-0 flex-1 text-left hover:bg-accent/50 transition-colors p-2 -m-2 rounded-md"
          onClick={() => setExpanded((v) => !v)}
        >
          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.name}</p>
            {item.total_stocks !== undefined && (
              <p className="text-xs text-muted-foreground">Available: {item.total_stocks}</p>
            )}
            {item.description && !item.sku && (
              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
            )}
          </div>
        </button>
        
        <div className="flex items-center gap-2 shrink-0">
          {onQuickAdd && hasAvailableLots && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 shrink-0 min-h-9 lg:min-h-7"
              onClick={handleQuickAdd}
              title="Quick add (uses FIFO lot selection)"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Quick Add
            </Button>
          )}
          <div className="w-8 flex justify-center">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {isLoading ? (
            <Skeleton className="h-10" />
          ) : availableLots.length > 0 ? (
            availableLots.map((lot) => (
              <LotRow key={lot.id} lot={lot} onAdd={onAddLot} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-1">No available lots</p>
          )}
        </div>
      )}
    </div>
  )
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  // All authenticated users can create checkout requests
  const canCheckout = !!user

  const addToast = useUIStore((state) => state.addToast)
  const [cart, setCart] = useState<CartItem[]>([])
  const [itemSearch, setItemSearch] = useState('')

  const scanCode = useScanCode()
  const createCheckout = useCreateCheckout()

  const { data: items, isLoading: itemsLoading } = useItems({
    type: 'quantifiable',
    status: 'active',
    search: itemSearch || undefined,
  })

  const addLotToCart = useCallback(
    (lot: ItemLot) => {
      setCart((prev) => {
        const existing = prev.find((c) => c.lot.id === lot.id)
        if (existing) {
          if (existing.quantity >= lot.quantity_on_hand) {
            addToast({ message: 'Maximum available quantity reached', type: 'warning' })
            return prev
          }
          return prev.map((c) =>
            c.lot.id === lot.id ? { ...c, quantity: c.quantity + 1 } : c
          )
        }
        return [...prev, { lot, quantity: 1 }]
      })
      addToast({ message: `Added ${lot.item_name || lot.lot_code}`, type: 'success' })
    },
    [addToast]
  )

const quickAddItem = useCallback(
    (item: Item, lots: ItemLot[], quantity = 1) => {
      const availableLots = lots.filter(l => l.quantity_on_hand > 0)
      if (availableLots.length === 0) {
        addToast({ message: `No available lots for ${item.name}`, type: 'warning' })
        return
      }

      // Use intelligent lot selection (FIFO - expiring soonest first)
      const selections = selectMostAppropriateLots(quantity, availableLots)
      
      if (selections.length === 0) {
        addToast({ message: `Unable to add ${quantity} of ${item.name}`, type: 'warning' })
        return
      }

      // Calculate total added
      const totalAdded = selections.reduce((sum, sel) => sum + sel.quantity, 0)
      
      setCart((prev) => {
        const next = [...prev]
        for (const selection of selections) {
          const existing = next.find((c) => c.lot.id === selection.lot.id)
          if (existing) {
            const newQuantity = existing.quantity + selection.quantity
            if (newQuantity > selection.lot.quantity_on_hand) {
              addToast({ message: `Cannot exceed available stock for ${selection.lot.item_name || selection.lot.lot_code}`, type: 'warning' })
              continue
            }
            existing.quantity = newQuantity
          } else {
            next.push(selection)
          }
        }
        return next
      })

      if (totalAdded > 0) {
        addToast({ message: `Added ${totalAdded} of ${item.name}`, type: 'success' })
      }
    },
    [addToast]
  )

  const handleScan = useCallback(
    (code: string) => {
      scanCode.mutate(code, {
        onSuccess: async (result) => {
          if (result.type === 'lot' && result.lot) {
            const lot = result.lot as ItemLot
            if (lot.quantity_on_hand <= 0) {
              addToast({ message: 'This lot is out of stock', type: 'warning' })
              return
            }
            addLotToCart(lot)
          } else if (result.type === 'item' && result.item) {
            // When an item is scanned, fetch its lots and automatically select the best one
            try {
              const lotsResponse = await inventoryApi.getLots(result.item.id)
              const lots = lotsResponse.data.lots
              const availableLots = lots.filter(l => l.quantity_on_hand > 0)
              
              if (availableLots.length === 0) {
                addToast({ 
                  message: `Item "${result.item.name}" has no available lots`, 
                  type: 'warning' 
                })
                return
              }
              
              // Use intelligent lot selection (FIFO - expiring soonest first)
              const selections = selectMostAppropriateLots(1, availableLots)
              
              if (selections.length === 0) {
                addToast({ 
                  message: `Could not add "${result.item.name}" - no suitable lots found`, 
                  type: 'warning' 
                })
                return
              }
              
              // Add the selected lot to cart
              const selectedLot = selections[0].lot
              addLotToCart(selectedLot)
              
              addToast({ 
                message: `Added "${result.item.name}" using lot ${selectedLot.lot_code} (intelligent selection)`, 
                type: 'success' 
              })
            } catch (error) {
              addToast({ 
                message: `Failed to fetch lots for "${result.item.name}"`, 
                type: 'error' 
              })
            }
          }
        },
      })
    },
    [scanCode, addToast, addLotToCart]
  )

  const handleUpdateQuantity = useCallback((lotId: string, quantity: number) => {
    setCart((prev) => prev.map((c) => (c.lot.id === lotId ? { ...c, quantity } : c)))
  }, [])

  const handleRemove = useCallback((lotId: string) => {
    setCart((prev) => prev.filter((c) => c.lot.id !== lotId))
  }, [])

  const handleCheckout = useCallback(
    (notes: string) => {
      if (cart.length === 0) return
      createCheckout.mutate(
        {
          lines: cart.map((c) => ({ lot_id: c.lot.id, quantity: c.quantity })),
          notes: notes || undefined,
        },
        {
          onSuccess: () => {
            setCart([])
            navigate('/inventory/checkouts')
          },
        }
      )
    },
    [cart, createCheckout, navigate]
  )

  if (!canCheckout) {
    return (
      <PageShell title="Request">
        <div className="flex flex-col items-center justify-center py-12 lg:py-20 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Request not available</p>
          <p className="text-sm">You do not have permission to request items.</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Request" description="Select items or scan barcodes to request">
      <Button variant="ghost" size="sm" className="w-full lg:w-auto mb-3 lg:mb-2 min-h-10 lg:min-h-8" onClick={() => navigate('/inventory')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Inventory
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Unified Barcode Scanner + Available Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Items</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 md:space-y-3">
              <BarcodeScanner
                onScan={handleScan}
                isLoading={scanCode.isPending}
                placeholder="Scan or enter barcode/QR..."
              />
              <Input
                placeholder="Search quantifiable items..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />

              {itemsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : items && items.length > 0 ? (
                <div className="space-y-2 max-h-[50vh] md:max-h-[500px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <ItemWithLots key={item.id} item={item} onAddLot={addLotToCart} onQuickAdd={quickAddItem} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No quantifiable items found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {cart.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Scanned Items</h3>
                <div className="space-y-2">
                  {cart.map((c) => (
                    <div key={c.lot.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{c.lot.item_name || c.lot.lot_code}</p>
                        <p className="text-xs text-muted-foreground">Qty: {c.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <CheckoutCart
            items={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemove}
            onCheckout={handleCheckout}
            isLoading={createCheckout.isPending}
          />
        </div>
      </div>
    </PageShell>
  )
}
