import { useState } from 'react'
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ItemLot } from '@/types/inventory'

export interface CartItem {
  lot: ItemLot
  quantity: number
}

interface CheckoutCartProps {
  items: CartItem[]
  onUpdateQuantity: (lotId: string, quantity: number) => void
  onRemove: (lotId: string) => void
  onCheckout: (notes: string) => void
  isLoading?: boolean
}

export function CheckoutCart({ items, onUpdateQuantity, onRemove, onCheckout, isLoading }: CheckoutCartProps) {
  const [notes, setNotes] = useState('')

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center justify-center text-muted-foreground">
          <ShoppingCart className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">Your cart is empty</p>
          <p className="text-xs">Scan or add items to request</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Request Cart ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((cartItem) => (
          <div key={cartItem.lot.id} className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{cartItem.lot.item_name || cartItem.lot.lot_code}</p>
              <p className="text-xs text-muted-foreground">
                Available: {cartItem.lot.quantity_on_hand}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onUpdateQuantity(cartItem.lot.id, Math.max(1, cartItem.quantity - 1))}
                disabled={isLoading}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-sm font-medium">{cartItem.quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onUpdateQuantity(cartItem.lot.id, Math.min(cartItem.lot.quantity_on_hand, cartItem.quantity + 1))}
                disabled={isLoading || cartItem.quantity >= cartItem.lot.quantity_on_hand}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => onRemove(cartItem.lot.id)}
              disabled={isLoading}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}

        <div className="space-y-2">
          <label className="text-sm font-medium">Notes</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional request notes"
            disabled={isLoading}
          />
        </div>

        <Button
          className="w-full"
          onClick={() => onCheckout(notes)}
          disabled={isLoading || items.length === 0}
        >
          {isLoading ? 'Processing...' : items.length === 0 ? 'Cart is empty' : 'Submit Request'}
        </Button>
      </CardContent>
    </Card>
  )
}
