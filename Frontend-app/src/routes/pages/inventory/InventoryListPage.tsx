import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Filter, QrCode } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { ItemCard } from '@/components/inventory/ItemCard'
import { ItemForm } from '@/components/inventory/ItemForm'
import { CameraBarcodeScanner } from '@/components/inventory/CameraBarcodeScanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/authStore'
import { useItems, useCreateItem } from '@/hooks/useItems'
import { useRooms } from '@/hooks/useBLE'
import { CreateItemInput, UpdateItemInput } from '@/types/inventory'

export function InventoryListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((state) => state.user)
  const isAdminOrStaff = user?.roles?.includes('admin') || user?.roles?.includes('staff')

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [roomFilter, setRoomFilter] = useState(searchParams.get('room') || '')
  const [expirationFilter, setExpirationFilter] = useState(searchParams.get('expiration') || '')
  const [showForm, setShowForm] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (typeFilter) params.set('type', typeFilter)
    if (categoryFilter) params.set('category', categoryFilter)
    if (statusFilter) params.set('status', statusFilter)
    if (roomFilter) params.set('room', roomFilter)
    if (expirationFilter) params.set('expiration', expirationFilter)
    setSearchParams(params, { replace: true })
  }, [search, typeFilter, categoryFilter, statusFilter, roomFilter, expirationFilter, setSearchParams])

  const { data: items, isLoading } = useItems({
    search: search || undefined,
    type: typeFilter || undefined,
    category: categoryFilter || undefined,
    status: statusFilter || undefined,
    room: roomFilter || undefined,
    expiration: expirationFilter || undefined,
  })

  const { data: rooms } = useRooms()
  const createItem = useCreateItem()

  const handleCreate = (data: CreateItemInput | UpdateItemInput) => {
    createItem.mutate(data as CreateItemInput, {
      onSuccess: () => setShowForm(false),
    })
  }

  const handleScan = (result: string) => {
    console.log('Barcode scanned:', result);
    // Set the search to the scanned result
    setSearch(result);
    // Close the scanner
    setShowScanner(false);
  };

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
        <Select value={typeFilter} onChange={(e) => { 
          setTypeFilter(e.target.value); 
          if (e.target.value === 'quantifiable') setRoomFilter('');
          if (e.target.value === 'trackable') setExpirationFilter('');
        }}>
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
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Furniture">Furniture</option>
          <option value="Lab Equipment">Lab Equipment</option>
          <option value="Office Supplies">Office Supplies</option>
          <option value="Tools">Tools</option>
          <option value="Books">Books</option>
          <option value="Software">Software</option>
          <option value="Other">Other</option>
        </Select>
        {showExpirationFilter && (
          <Select value={expirationFilter} onChange={(e) => setExpirationFilter(e.target.value)}>
            <option value="">All Expirations</option>
            <option value="expired">Expired</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expiring_month">Expiring This Month</option>
            <option value="safe">Safe</option>
          </Select>
        )}
        {showRoomFilter && rooms && rooms.length > 0 && (
          <div className="sm:col-span-2 lg:col-span-1">
            <Select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
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
    </PageShell>
  )
}
