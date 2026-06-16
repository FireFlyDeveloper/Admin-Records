import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ShoppingCart,
  ArrowLeft,
  Plus,
  Package,
  User,
  CheckCircle,
  Mail,
  BookOpen,
  Hash,
  Loader2,
  X,
  ChevronUp,
  ChevronDown,
  PartyPopper,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/api/inventory'
import { useUIStore } from '@/stores/uiStore'
import { ItemLot, Item } from '@/types/inventory'
import { selectMostAppropriateLots } from '@/lib/lotSelection'

// ── Sub-components ─────────────────────────────────────────────────

interface CartItem {
  lot: ItemLot
  quantity: number
}

function ItemRow({
  item,
  cart,
  onAddToCart,
}: {
  item: Item
  cart: CartItem[]
  onAddToCart: (item: Item, lots: ItemLot[], qty: number) => void
}) {
  const { data: lots, isLoading } = useQuery({
    queryKey: ['public-lots', item.id],
    queryFn: () =>
      inventoryApi.getPublicLots(item.id).then((res) => res.data.lots),
    staleTime: 60 * 1000,
  })

  const [qty, setQty] = useState(1)
  const availableLots = lots?.filter((l) => l.quantity_on_hand > 0) ?? []
  const totalAvailable = availableLots.reduce((s, l) => s + l.quantity_on_hand, 0)

  // Count how many of this item are already in cart
  const itemLotIds = new Set(lots?.map((l) => l.id) ?? [])
  const inCartQty = cart
    .filter((c) => itemLotIds.has(c.lot.id))
    .reduce((s, c) => s + c.quantity, 0)
  const remaining = totalAvailable - inCartQty

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{item.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {item.total_stocks !== undefined && <span className="font-medium">Total: {item.total_stocks}</span>}
              {isLoading ? (
                <span>Loading stock...</span>
              ) : (
                <span>Avail: <strong>{remaining}</strong></span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Input
            type="number"
            min={1}
            max={Math.max(0, remaining)}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(remaining, parseInt(e.target.value) || 1)))}
            className="w-14 h-9 text-center text-sm"
            disabled={remaining <= 0 || isLoading}
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 shrink-0"
            disabled={remaining <= 0 || isLoading || qty < 1}
            onClick={() => {
              if (lots) {
                onAddToCart(item, lots, qty)
                setQty(1)
              }
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Student info form ──────────────────────────────────────────────

interface StudentInfo {
  srcode: string
  email: string
  name: string
  course: string
}

function StudentInfoForm({
  value,
  onChange,
}: {
  value: StudentInfo
  onChange: (v: StudentInfo) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-2">
          <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          Student ID (SR-Code)
        </label>
        <Input
          placeholder="e.g. SR-24-00001"
          value={value.srcode}
          onChange={(e) => onChange({ ...value, srcode: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          Email
        </label>
        <Input
          type="email"
          placeholder="student@school.edu"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          Full Name
        </label>
        <Input
          placeholder="Juan Dela Cruz"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          Course / Program
        </label>
        <Input
          placeholder="e.g. BS Computer Science"
          value={value.course}
          onChange={(e) => onChange({ ...value, course: e.target.value })}
        />
      </div>
    </div>
  )
}

// ── Mobile Cart Drawer ─────────────────────────────────────────────

function MobileCartDrawer({
  cart,
  open,
  onToggle,
  onRemove,
  onProceed,
}: {
  cart: CartItem[]
  open: boolean
  onToggle: () => void
  onRemove: (lotId: string) => void
  onProceed: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [open])

  return (
    <div ref={panelRef} className="lg:hidden">
      {/* Fixed bottom bar */}
      {!open && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-between px-4 py-3 active:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span className="text-sm font-medium">Cart</span>
              {cart.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-[11px] font-bold text-primary-foreground px-1.5">
                  {cart.reduce((s, c) => s + c.quantity, 0)}
                </span>
              )}
            </div>
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Inline cart panel */}
      {open && (
        <div className="border rounded-lg bg-card">
          <div className="flex items-center justify-between px-3 py-2.5 border-b">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-sm font-medium">
                Cart ({cart.reduce((s, c) => s + c.quantity, 0)} items)
              </span>
            </div>
            <button
              onClick={onToggle}
              className="p-1 -mr-1 rounded-md hover:bg-muted transition-colors"
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="p-3 space-y-2 max-h-[40vh] overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Cart is empty
              </p>
            ) : (
              cart.map((c) => (
                <div
                  key={c.lot.id}
                  className="flex items-center gap-2 rounded-lg border p-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.lot.item_name || c.lot.lot_code}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {c.quantity}
                    </p>
                  </div>
                  <button
                    className="h-7 w-7 rounded-md flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => onRemove(c.lot.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-3 pt-0">
            <Button
              className="w-full"
              onClick={onProceed}
              disabled={cart.length === 0}
            >
              Proceed to Info
            </Button>
          </div>
        </div>
      )}

      {/* Spacer for fixed bottom bar */}
      {!open && cart.length > 0 && <div className="h-14" />}
    </div>
  )
}

// ── Desktop Cart Sidebar ───────────────────────────────────────────

function DesktopCartSidebar({
  cart,
  onRemove,
  onProceed,
}: {
  cart: CartItem[]
  onRemove: (lotId: string) => void
  onProceed: () => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Cart ({cart.reduce((s, c) => s + c.quantity, 0)})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cart.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Add items from the list to get started
          </p>
        ) : (
          <>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {cart.map((c) => (
                <div
                  key={c.lot.id}
                  className="flex items-center gap-2 rounded-lg border p-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.lot.item_name || c.lot.lot_code}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {c.quantity}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => onRemove(c.lot.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              className="w-full"
              onClick={onProceed}
              disabled={cart.length === 0}
            >
              Proceed to Info
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Step indicator ──────────────────────────────────────────────────

function StepIndicator({ step }: { step: 'browse' | 'info' | 'review' | 'submitted' }) {
  const steps = ['browse', 'info', 'review'] as const
  const labels = ['Browse', 'Info', 'Submit']
  const currentIndex = steps.indexOf(step as typeof steps[number])

  return (
    <div className="flex items-center gap-1.5 mb-5 text-sm">
      {steps.map((s, i) => {
        const completedIndex = currentIndex > i
        const active = step === s
        return (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : completedIndex
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {completedIndex ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`hidden sm:inline ${active ? 'font-medium' : 'text-muted-foreground'}`}
            >
              {labels[i]}
            </span>
            {i < 2 && <span className="text-muted-foreground mx-0.5 hidden sm:inline">→</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── Main page component ────────────────────────────────────────────

type Step = 'browse' | 'info' | 'review' | 'submitted'

export function PublicBorrowPage() {
  const addToast = useUIStore((state) => state.addToast)
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('browse')
  const [itemSearch, setItemSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [scanPending, setScanPending] = useState(false)
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    srcode: '',
    email: '',
    name: '',
    course: '',
  })

  // Fetch quantifiable items via public endpoint
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['public-items', itemSearch],
    queryFn: () =>
      inventoryApi
        .getPublicItems({ search: itemSearch || undefined })
        .then((res) => res.data.items),
    staleTime: 60 * 1000,
  })

  const addToCart = useCallback(
    (item: Item, lots: ItemLot[], qty: number) => {
      const originalLotsById = new Map(lots.map((lot) => [lot.id, lot]))
      const inCartByLot = new Map(cart.map((cartItem) => [cartItem.lot.id, cartItem.quantity]))

      const available = lots
        .map((lot) => ({
          ...lot,
          quantity_on_hand: Math.max(0, lot.quantity_on_hand - (inCartByLot.get(lot.id) ?? 0)),
        }))
        .filter((lot) => lot.quantity_on_hand > 0)

      if (available.length === 0) {
        addToast({ message: `No remaining stock available for ${item.name}`, type: 'warning' })
        return
      }

      // Use intelligent lot selection (FIFO by default - expiring soonest first)
      // against remaining per-lot availability, not raw lot stock.
      const selections = selectMostAppropriateLots(qty, available)

      // Calculate how much we actually added
      const addedQuantity = selections.reduce((sum, sel) => sum + sel.quantity, 0)

      if (addedQuantity < qty) {
        addToast({ message: `Only ${addedQuantity} of ${qty} available for ${item.name}`, type: 'warning' })
      } else if (addedQuantity > 0) {
        addToast({ message: `Added ${addedQuantity} of ${item.name} to cart`, type: 'success' })
      }

      setCart((prev) => {
        const next = [...prev]
        for (const sel of selections) {
          const originalLot = originalLotsById.get(sel.lot.id) ?? sel.lot
          const index = next.findIndex((c) => c.lot.id === sel.lot.id)
          if (index >= 0) {
            next[index] = {
              ...next[index],
              lot: originalLot,
              quantity: Math.min(next[index].quantity + sel.quantity, originalLot.quantity_on_hand),
            }
          } else {
            next.push({ lot: originalLot, quantity: Math.min(sel.quantity, originalLot.quantity_on_hand) })
          }
        }
        return next
      })
    },
    [addToast, cart]
  )

  // Barcode/QR scan handler — public flow has no auth, so we resolve the
  // code against the already-loaded public items + their lots. Match order
  // mirrors the backend `scanCode()`: lot_code → sku → name (prefix).
  const handleScan = useCallback(
    async (code: string) => {
      const trimmed = code.trim()
      if (!trimmed) return

      setScanPending(true)
      try {
        // If we don't have items loaded yet, fetch a wide list to search.
        const baseItems = items && items.length > 0
          ? items
          : (await inventoryApi.getPublicItems({}).then((r) => r.data.items))

        // Try SKU exact match first
        let match = baseItems.find(
          (it) => it.sku && it.sku.toLowerCase() === trimmed.toLowerCase()
        )
        // Then name prefix (case-insensitive)
        if (!match) {
          match = baseItems.find(
            (it) => it.name.toLowerCase().startsWith(trimmed.toLowerCase())
          )
        }
        // Then exact name (case-insensitive)
        if (!match) {
          match = baseItems.find(
            (it) => it.name.toLowerCase() === trimmed.toLowerCase()
          )
        }

        if (!match) {
          addToast({ message: `No item found for "${trimmed}"`, type: 'warning' })
          return
        }

        // Fetch lots for the matched item and add 1 to the cart
        const lotsResponse = await queryClient.fetchQuery({
          queryKey: ['public-lots', match.id],
          queryFn: () => inventoryApi.getPublicLots(match!.id).then((r) => r.data.lots),
          staleTime: 60 * 1000,
        })

        if (!lotsResponse || lotsResponse.length === 0) {
          addToast({ message: `${match.name} has no available lots`, type: 'warning' })
          return
        }

        addToCart(match, lotsResponse, 1)
      } catch (err: any) {
        addToast({
          message: err?.response?.data?.error || err?.message || 'Scan failed',
          type: 'error',
        })
      } finally {
        setScanPending(false)
      }
    },
    [items, addToast, addToCart, queryClient]
  )

  const removeFromCart = useCallback((lotId: string) => {
    setCart((prev) => prev.filter((c) => c.lot.id !== lotId))
  }, [])

  
  
  const borrowMutation = useMutation({
    mutationFn: () =>
      inventoryApi.publicBorrow({
        srcode: studentInfo.srcode,
        email: studentInfo.email,
        name: studentInfo.name,
        course: studentInfo.course,
        lines: cart.map((c) => ({ lot_id: c.lot.id, quantity: c.quantity })),
      }),
    onSuccess: () => {
      setStep('submitted')
    },
    onError: (err: any) => {
      addToast({
        message: err?.response?.data?.error || 'Failed to submit request',
        type: 'error',
      })
    },
  })

  const proceedToInfo = useCallback(() => {
    setStep('info')
    setMobileCartOpen(false)
  }, [])

  // ── Step 1: Browse ─────────────────────────────────────────────

  if (step === 'browse') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Borrowing System
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Browse available items and submit a borrow request
            </p>
          </div>

          <StepIndicator step={step} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              <Card>
                <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                  <CardTitle className="text-sm sm:text-base">Available Items</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 sm:px-6 space-y-3">
                                    <BarcodeScanner
                    onScan={handleScan}
                    isLoading={scanPending}
                    label="Scan barcode or QR"
                    className="h-10 px-3 flex items-center gap-2 shrink-0 w-full sm:w-auto"
                  />

                  <Input
                    placeholder="Search items..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                  />

                  {itemsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 sm:h-14" />
                      ))}
                    </div>
                  ) : items && items.length > 0 ? (
                    <div className="space-y-2 max-h-[50vh] sm:max-h-[500px] overflow-y-auto pr-1">
                      {items.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          cart={cart}
                          onAddToCart={addToCart}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground">
                      <Package className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs sm:text-sm">No items available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Desktop sidebar cart */}
            <div className="hidden lg:block">
              <DesktopCartSidebar
                cart={cart}
                onRemove={removeFromCart}
                onProceed={proceedToInfo}
              />
            </div>
          </div>

          {/* Mobile cart drawer */}
          <MobileCartDrawer
            cart={cart}
            open={mobileCartOpen}
            onToggle={() => setMobileCartOpen((v) => !v)}
            onRemove={removeFromCart}
            onProceed={proceedToInfo}
          />
        </div>
      </div>
    )
  }

  // ── Step 2: Student Info ───────────────────────────────────────

  if (step === 'info') {
    const isInfoValid =
      studentInfo.srcode.trim() &&
      studentInfo.email.trim() &&
      studentInfo.name.trim() &&
      studentInfo.course.trim()

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 sm:mb-4 -ml-2"
            onClick={() => setStep('browse')}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-0.5">
            Your Information
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
            Provide your student details so staff can process your request
          </p>

          <StepIndicator step={step} />

          <Card>
            <CardContent className="p-4 sm:p-6">
              <StudentInfoForm
                value={studentInfo}
                onChange={setStudentInfo}
              />
            </CardContent>
          </Card>

          <div className="flex justify-between mt-4 sm:mt-6">
            <Button variant="outline" onClick={() => setStep('browse')}>
              Back
            </Button>
            <Button
              onClick={() => borrowMutation.mutate()}
              disabled={!isInfoValid || borrowMutation.isPending}
            >
              {borrowMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: Review & Submit ────────────────────────────────────

  if (step === 'submitted') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="animate-bounce mb-6">
            <PartyPopper className="h-16 w-16 mx-auto text-primary" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Request Submitted! 🎉
          </h1>

          <p className="text-muted-foreground mb-2">
            Thank you, <strong>{studentInfo.name}</strong>!
          </p>

          <p className="text-sm text-muted-foreground mb-6">
            Your borrow request has been submitted for staff approval.
            You will receive an email notification at{' '}
            <strong>{studentInfo.email}</strong> once it's processed.
          </p>

          <div className="rounded-lg border bg-card p-4 mb-6 text-left text-sm space-y-1.5">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">SR-Code</span>
              <span className="font-medium text-right">{studentInfo.srcode}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Items</span>
              <span className="font-medium text-right">{cart.reduce((s, c) => s + c.quantity, 0)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Status</span>
              <span className="font-medium text-green-600">Pending Approval</span>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => {
              setCart([])
              setMobileCartOpen(false)
              setStudentInfo({ srcode: '', email: '', name: '', course: '' })
              setStep('browse')
            }}
          >
            Submit Another Request
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 sm:mb-4 -ml-2"
          onClick={() => setStep('info')}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-0.5">
          Review & Submit
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
          Please double-check your information before submitting
        </p>

        <StepIndicator step={step} />

        <div className="space-y-4 sm:space-y-6">
          {/* Student Info Summary */}
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-4 pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base">Student Details</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">SR-Code</span>
                <span className="font-medium text-right truncate">{studentInfo.srcode}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Email</span>
                <span className="font-medium text-right truncate">{studentInfo.email}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Name</span>
                <span className="font-medium text-right truncate">{studentInfo.name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Course</span>
                <span className="font-medium text-right truncate">{studentInfo.course}</span>
              </div>
            </CardContent>
          </Card>

          {/* Items Summary */}
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-4 pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base">
                Items ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 space-y-2">
              {cart.map((c) => (
                <div
                  key={c.lot.id}
                  className="flex items-center justify-between rounded-lg border p-2.5 sm:p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.lot.item_name || c.lot.lot_code}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {c.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            disabled={borrowMutation.isPending}
            onClick={() => borrowMutation.mutate()}
          >
            {borrowMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Borrow Request'
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground pb-4 sm:pb-0">
            Your request will be submitted for staff approval.
            You may use the same SR-Code and email to track your requests.
          </p>
        </div>
      </div>
    </div>
  )
}
