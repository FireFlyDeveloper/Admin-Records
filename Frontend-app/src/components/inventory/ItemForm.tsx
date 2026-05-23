import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Item, ItemType, ItemStatus, CreateItemInput, UpdateItemInput } from '@/types/inventory'

interface ItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateItemInput | UpdateItemInput) => void
  item?: Item | null
  isLoading?: boolean
}

export function ItemForm({ open, onOpenChange, onSubmit, item, isLoading }: ItemFormProps) {
  const [name, setName] = useState(item?.name || '')
  const [sku, setSku] = useState(item?.sku || '')
  const [category, setCategory] = useState(item?.category || '')
  const [description, setDescription] = useState(item?.description || '')
  const [itemType, setItemType] = useState<ItemType>(item?.item_type || 'quantifiable')
  const [status, setStatus] = useState<ItemStatus>(item?.status || 'active')

  const isEdit = !!item

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const data = isEdit
      ? { name: name.trim(), sku: sku.trim() || null, category: category.trim() || undefined, description: description.trim() || undefined, status }
      : { item_type: itemType, name: name.trim(), sku: sku.trim() || null, category: category.trim() || undefined, description: description.trim() || undefined, status }

    onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Item' : 'Create Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="itemType">Item Type</Label>
              <Select
                id="itemType"
                value={itemType}
                onChange={(e) => setItemType(e.target.value as ItemType)}
              >
                <option value="quantifiable">Quantifiable</option>
                <option value="trackable">Trackable</option>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. SKU-12345" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Electronics, Supplies" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as ItemStatus)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
