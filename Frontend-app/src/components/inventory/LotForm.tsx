import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { CreateLotInput, UpdateLotInput, ItemLot } from '@/types/inventory'

interface LotFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateLotInput | UpdateLotInput) => void
  isLoading?: boolean
  lot?: ItemLot | null
  mode?: 'create' | 'edit'
}

export function LotForm({ open, onOpenChange, onSubmit, isLoading, lot, mode = 'create' }: LotFormProps) {
  const [lotCode, setLotCode] = useState('')
  const [quantity, setQuantity] = useState('')
  const [purchasedAt, setPurchasedAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [notes, setNotes] = useState('')

  // Reset form when opening or when lot changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && lot) {
        setLotCode(lot.lot_code)
        setQuantity(lot.quantity_total.toString())
        setPurchasedAt(lot.purchased_at || '')
        setExpiresAt(lot.expires_at || '')
        setNotes(lot.notes || '')
      } else {
        setLotCode('')
        setQuantity('')
        setPurchasedAt('')
        setExpiresAt('')
        setNotes('')
      }
    }
  }, [open, mode, lot])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const qty = Number(quantity)
    if (!lotCode.trim() || (!quantity && mode === 'create') || (qty <= 0 && mode === 'create')) return

    if (mode === 'create') {
      const createData: CreateLotInput = {
        lot_code: lotCode.trim(),
        quantity_total: qty,
        purchased_at: purchasedAt || undefined,
        expires_at: expiresAt || undefined,
        notes: notes.trim() || undefined,
      }
      onSubmit(createData)
    } else {
      const updateData: UpdateLotInput = {}
      if (lotCode.trim() !== (lot?.lot_code || '')) {
        updateData.lot_code = lotCode.trim()
      }
      if (quantity && qty > 0 && qty !== lot?.quantity_total) {
        updateData.quantity_total = qty
      }
      if (purchasedAt !== (lot?.purchased_at || '')) {
        updateData.purchased_at = purchasedAt || undefined
      }
      if (expiresAt !== (lot?.expires_at || '')) {
        updateData.expires_at = expiresAt || undefined
      }
      if (notes.trim() !== (lot?.notes || '')) {
        updateData.notes = notes.trim() || undefined
      }
      
      // Only submit if there are changes
      if (Object.keys(updateData).length > 0) {
        onSubmit(updateData)
      } else {
        onOpenChange(false)
      }
    }
  }

  const getTitle = () => {
    return mode === 'edit' ? 'Edit Lot' : 'Create Lot'
  }

  const getSubmitText = () => {
    if (isLoading) {
      return mode === 'edit' ? 'Updating...' : 'Creating...'
    }
    return mode === 'edit' ? 'Update Lot' : 'Create Lot'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lotCode">Lot Code</Label>
            <Input
              id="lotCode"
              value={lotCode}
              onChange={(e) => setLotCode(e.target.value)}
              placeholder="e.g. LOT-2024-001"
              required={mode === 'create'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity Total</Label>
            <Input
              id="quantity"
              type="number"
              min={mode === 'create' ? 1 : 0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              required={mode === 'create'}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasedAt">Purchased At</Label>
              <Input
                id="purchasedAt"
                type="date"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At</Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || (!lotCode.trim() && mode === 'create') || (!quantity && mode === 'create')}>
              {getSubmitText()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}