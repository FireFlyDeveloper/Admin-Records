import { useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from '@/hooks/useBLE'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react'
import { Room } from '@/types/ble'

export function RoomsPage() {
  const { data: rooms, isLoading } = useRooms()
  const createRoom = useCreateRoom()
  const updateRoom = useUpdateRoom()
  const deleteRoom = useDeleteRoom()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const openCreate = () => {
    setEditingRoom(null)
    setName('')
    setDescription('')
    setDialogOpen(true)
  }

  const openEdit = (room: Room) => {
    setEditingRoom(room)
    setName(room.name)
    setDescription(room.description || '')
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (editingRoom) {
      updateRoom.mutate({ id: editingRoom.id, data: { name, description: description || undefined } })
    } else {
      createRoom.mutate({ name, description: description || undefined })
    }
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this room?')) {
      deleteRoom.mutate(id)
    }
  }

  return (
    <PageShell
      title="Rooms"
      description="Manage BLE tracking rooms"
      actions={
        <>
          <Button onClick={openCreate} size="sm" className="md:hidden">
          <Plus className="h-4 w-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Add Room</span>
          <span className="sm:hidden">Add</span>
        </Button>
        <Button onClick={openCreate} size="default" className="hidden md:inline-flex">
          <Plus className="h-4 w-4 mr-2" />
          Add Room
        </Button>
          </>
      }
    >
      {isLoading ? (
        <div className="space-y-2 md:space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 md:h-20 w-full" />
          ))}
        </div>
      ) : !rooms || rooms.length === 0 ? (
        <div className="text-center py-10 md:py-16 text-muted-foreground">
          <MapPin className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
          <p>No rooms configured yet.</p>
          <Button variant="outline" className="mt-4 w-full sm:w-auto" onClick={openCreate}>
            Create your first room
          </Button>
        </div>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardContent className="flex items-center justify-between py-3 md:py-4 px-3 md:px-6">
                <div className="min-w-0 flex-1 mr-2">
                  <h3 className="font-medium text-sm md:text-base truncate">{room.name}</h3>
                  {room.description && (
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{room.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 md:gap-2 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(room)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(room.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Room' : 'Add Room'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lab A"
                required
              />
            </div>
            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={createRoom.isPending || updateRoom.isPending}>
                {editingRoom ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
