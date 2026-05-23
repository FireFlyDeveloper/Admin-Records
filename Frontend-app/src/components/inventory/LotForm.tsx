import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { CreateLotInput } from '@/types/inventory'

interface LotFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateLotInput) => void
  isLoading?: boolean
}

export function LotForm({ open, onOpenChange, onSubmit, isLoading }: LotFormProps) {
  const [lotCode, setLotCode] = useState('')
  const [quantity, setQuantity] = useState('')
  const [purchasedAt, setPurchasedAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const qty = Number(quantity)
    if (!lotCode.trim() || !qty || qty <= 0) return

    onSubmit({
      lot_code: lotCode.trim(),
      quantity_total: qty,
      purchased_at: purchasedAt || undefined,
      expires_at: expiresAt || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Lot</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lotCode">Lot Code</Label>
            <Input id="lotCode" value={lotCode} onChange={(e) => setLotCode(e.target.value)} placeholder="e.g. LOT-2024-001" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity Total</Label>
            <Input id="quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasedAt">Purchased At</Label>
              <Input id="purchasedAt" type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At</Label>
              <Input id="expiresAt" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !lotCode.trim() || !quantity}>
              {isLoading ? 'Creating...' : 'Create Lot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
