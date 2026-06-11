import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Filter, QrCode, ShoppingCart, ArrowRight, Minus, Trash2, X, User } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { ItemCard } from '@/components/inventory/ItemCard'
import { ItemForm } from '@/components/inventory/ItemForm'
import { CameraBarcodeScanner } from '@/components/inventory/CameraBarcodeScanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useItems, useCreateItem } from '@/hooks/useItems'
import { useScanCode } from '@/hooks/useCheckout'
import { useRooms } from '@/hooks/useBLE'
import { CreateItemInput, UpdateItemInput, ItemLot } from '@/types/inventory'

interface CartItem {
  lot: ItemLot
  quantity: number
}

export function InventoryListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((state) => state.user)
  const isAdminOrStaff = user?.roles?.includes('admin') || user?.roles?.includes('staff')

  // Initialize filters from URL params with validation
  const initialType = searchParams.get('type') || ''
  const initialExpiration = searchParams.get('expiration') || ''
  const initialRoom = searchParams.get('room') || ''
  
  // Clear incompatible filters on initialization
  const validatedExpiration = initialType === 'trackable' ? '' : initialExpiration
  const validatedRoom = initialType === 'quantifiable' ? '' : initialRoom
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [typeFilter, setTypeFilter] = useState(initialType)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [roomFilter, setRoomFilter] = useState(validatedRoom)
  const [expirationFilter, setExpirationFilter] = useState(validatedExpiration)
  const [showForm, setShowForm] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (typeFilter) params.set('type', typeFilter)
    if (statusFilter) params.set('status', statusFilter)
    if (roomFilter) params.set('room', roomFilter)
    if (expirationFilter) params.set('expiration', expirationFilter)
    setSearchParams(params, { replace: true })
  }, [search, typeFilter, statusFilter, roomFilter, expirationFilter, setSearchParams])

  const { data: items, isLoading } = useItems({
    search: search || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    room: roomFilter || undefined,
    expiration: expirationFilter || undefined,
  })

  const { data: rooms } = useRooms()
  const createItem = useCreateItem()
  const addToast = useUIStore((state) => state.addToast)
  const scanCode = useScanCode()

  const handleTypeChange = (value: string) => {
    setTypeFilter(value)
    if (value === 'quantifiable') {
      setRoomFilter('')
    }
    if (value === 'trackable') {
      setExpirationFilter('')
    }
  }

  const handleExpirationChange = (value: string) => {
    if (typeFilter === 'trackable') {
      // Don't allow expiration filter for trackable items
      setExpirationFilter('')
    } else {
      setExpirationFilter(value)
    }
  }

  const handleRoomChange = (value: string) => {
    if (typeFilter === 'quantifiable') {
      // Don't allow room filter for quantifiable items
      setRoomFilter('')
    } else {
      setRoomFilter(value)
    }
  }

  const handleCreate = (data: CreateItemInput | UpdateItemInput) => {
    createItem.mutate(data as CreateItemInput, {
      onSuccess: () => setShowForm(false),
    })
  }

  const addToCart = useCallback((lot: ItemLot) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.lot.id === lot.id)
      if (existing) {
        // Check if adding one more would exceed available stock
        const newQuantity = existing.quantity + 1
        if (newQuantity > lot.quantity_on_hand) {
          addToast({ message: `Cannot add more than ${lot.quantity_on_hand} of ${lot.item_name || lot.lot_code} (limited by stock)`, type: 'warning' })
          return prev // Return unchanged cart
        }
        return prev.map((c) => 
          c.lot.id === lot.id 
            ? { ...c, quantity: newQuantity }
            : c
        )
      } else {
        // First time adding - check stock is available
        if (lot.quantity_on_hand <= 0) {
          addToast({ message: `${lot.item_name || lot.lot_code} is out of stock`, type: 'warning' })
          return prev // Return unchanged cart
        }
        return [...prev, { lot, quantity: 1 }]
      }
    })
    addToast({ message: `Added ${lot.item_name || lot.lot_code} to cart`, type: 'success' })
  }, [addToast])

  const handleUpdateQuantity = useCallback((lotId: string, quantity: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.lot.id === lotId) {
        // Validate quantity doesn't exceed available stock
        if (quantity > c.lot.quantity_on_hand) {
          addToast({ message: `Cannot request more than ${c.lot.quantity_on_hand} of ${c.lot.item_name || c.lot.lot_code}`, type: 'warning' })
          return c // Return unchanged
        }
        if (quantity < 1) {
          return c // Don't allow quantity below 1
        }
        return { ...c, quantity }
      }
      return c
    }))
  }, [addToast])

  const handleRemove = useCallback((lotId: string) => {
    setCart((prev) => prev.filter((c) => c.lot.id !== lotId))
  }, [])

  const handleScan = (result: string) => {
    // Try to scan as barcode/lot code first
    scanCode.mutate(result, {
      onSuccess: (scanResult) => {
        if (scanResult.type === 'lot' && scanResult.lot) {
          const lot = scanResult.lot
          if (lot.quantity_on_hand <= 0) {
            addToast({ message: 'This lot is out of stock', type: 'warning' })
          } else {
            addToCart(lot)
            setShowCart(true) // Show cart after adding
          }
        } else if (scanResult.type === 'item' && scanResult.item) {
          // If it's an item (not lot), add to search instead
          addToast({ 
            message: `Scanned item: ${scanResult.item.name}. Showing item in search results.`, 
            type: 'info' 
          })
          setSearch(scanResult.item.sku || scanResult.item.name)
        }
        setShowScanner(false)
      },
      onError: () => {
        // If scan fails, treat as regular search text
        console.log('Scan failed, treating as search text:', result)
        setSearch(result)
        setShowScanner(false)
      }
    })
  }

  const clearCart = () => {
    setCart([])
    addToast({ message: 'Cart cleared', type: 'info' })
  }

  const goToCheckout = () => {
    navigate('/checkout', { state: { cart } })
  }

  const goToPublicBorrow = () => {
    navigate('/borrow', { state: { cart } })
  }

  // Show room filter when type is trackable or no type selected
  const showRoomFilter = typeFilter === 'trackable' || typeFilter === ''
  // Show expiration filter when type is quantifiable or no type selected
  const showExpirationFilter = typeFilter === 'quantifiable' || typeFilter === ''

  return (
    <PageShell
      title="Inventory"
      description="Manage trackable and quantifiable items"
      actions={
        <div className="flex gap-2">
          {/* Cart button */}
          {cart.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCart(!showCart)}
              className="flex items-center gap-1 relative"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Cart</span>
              <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                {cart.length}
              </Badge>
            </Button>
          )}
          
          {/* Desktop scanner button */}
          <div className="hidden sm:block">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1"
            >
              <QrCode className="h-4 w-4" />
              <span>Scan</span>
            </Button>
          </div>
          
          {/* Mobile scanner button - only show on mobile */}
          <div className="block sm:hidden">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1"
            >
              <QrCode className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Scan</span>
            </Button>
          </div>
          {isAdminOrStaff && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>
      }
    >
      {/* Filters - Grid layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
        <div className="relative sm:col-span-2 lg:col-span-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Mobile scanner button in search area */}
          <div className="block sm:hidden">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setShowScanner(true)}
              title="Scan barcode"
              className="h-10 w-10"
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Select value={typeFilter} onChange={(e) => handleTypeChange(e.target.value)}>
          <option value="">All Types</option>
          <option value="quantifiable">Quantifiable</option>
          <option value="trackable">Trackable</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </Select>
        {showExpirationFilter && (
          <Select value={expirationFilter} onChange={(e) => handleExpirationChange(e.target.value)}>
            <option value="">All Expirations</option>
            <option value="expired">Expired</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expiring_month">Expiring This Month</option>
            <option value="safe">Safe</option>
          </Select>
        )}
        {showRoomFilter && rooms && rooms.length > 0 && (
          <div className="sm:col-span-2 lg:col-span-1">
            <Select value={roomFilter} onChange={(e) => handleRoomChange(e.target.value)}>
              <option value="">All Rooms</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 sm:h-32" />
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => navigate(`/inventory/${item.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-muted-foreground">
          <Filter className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 opacity-50" />
          <p className="text-base sm:text-lg font-medium">No items found</p>
          <p className="text-xs sm:text-sm">Try adjusting your filters</p>
        </div>
      )}

      <ItemForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleCreate}
        isLoading={createItem.isPending}
      />

      <CameraBarcodeScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onScan={handleScan}
      />

      {/* Cart Sidebar */}
      {showCart && cart.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCart(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-background shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col h-full">
              <div className="border-b px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Request Cart</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCart(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {cart.length} item{cart.length !== 1 ? 's' : ''} ready for request
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {cart.map((item) => (
                  <div key={item.lot.id} className="flex items-center justify-between border-b py-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.lot.item_name || item.lot.lot_code}</p>
                      <p className="text-xs text-muted-foreground">{item.lot.lot_code}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleUpdateQuantity(item.lot.id, Math.max(1, item.quantity - 1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleUpdateQuantity(item.lot.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemove(item.lot.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Total items:</span>
                  <span className="font-medium">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCart}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Cart
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={goToCheckout}
                    className="flex-1"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Checkout
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={goToPublicBorrow}
                  className="w-full"
                >
                  <User className="h-4 w-4 mr-2" />
                  Public Borrow
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
