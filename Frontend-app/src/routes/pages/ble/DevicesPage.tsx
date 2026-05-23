import { useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { useDevices, useCreateDevice, useUpdateDevice, useDeleteDevice, useRooms } from '@/hooks/useBLE'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DeviceStatusCard } from '@/components/ble/DeviceStatusCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Cpu } from 'lucide-react'
import { BleDevice } from '@/types/ble'

export function DevicesPage() {
  const { data: devices, isLoading } = useDevices()
  const { data: rooms } = useRooms()
  const createDevice = useCreateDevice()
  const updateDevice = useUpdateDevice()
  const deleteDevice = useDeleteDevice()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<BleDevice | null>(null)
  const [deviceId, setDeviceId] = useState('')
  const [name, setName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [rssiRange, setRssiRange] = useState<number | ''>('')

  const openCreate = () => {
    setEditingDevice(null)
    setDeviceId('')
    setName('')
    setRoomId('')
    setRssiRange('')
    setDialogOpen(true)
  }

  const openEdit = (device: BleDevice) => {
    setEditingDevice(device)
    setDeviceId(device.device_id)
    setName(device.name)
    setRoomId(device.room_id || '')
    setRssiRange(device.rssi_range ?? '')
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deviceId.trim() || !name.trim()) return

    if (editingDevice) {
      updateDevice.mutate({
        id: editingDevice.id,
        data: {
          name,
          room_id: roomId || null,
          rssi_range: rssiRange !== '' ? Number(rssiRange) : undefined,
        },
      })
    } else {
      createDevice.mutate({
        device_id: deviceId,
        name,
        room_id: roomId || undefined,
        rssi_range: rssiRange !== '' ? Number(rssiRange) : undefined,
      })
    }
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this device?')) {
      deleteDevice.mutate(id)
    }
  }

  return (
    <PageShell
      title="BLE Devices"
      description="Manage BLE gateway devices"
      actions={
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="sm:inline">Register Device</span>
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 sm:h-40 w-full" />
          ))}
        </div>
      ) : !devices || devices.length === 0 ? (
        <div className="text-center py-8 sm:py-16 text-muted-foreground">
          <Cpu className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
          <p className="text-sm sm:text-base">No devices registered yet.</p>
          <Button variant="outline" className="mt-3 sm:mt-4 w-full sm:w-auto" onClick={openCreate}>
            Register your first device
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {devices.map((device) => (
            <div key={device.id} className="relative group">
              <div onClick={() => openEdit(device)}>
                <DeviceStatusCard device={device} />
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-xs sm:text-sm px-2 sm:px-3"
                onClick={() => handleDelete(device.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{editingDevice ? 'Edit Device' : 'Register Device'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="deviceId" className="text-sm sm:text-base">Device ID</Label>
              <Input
                id="deviceId"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="e.g. ble-gw-001"
                required
                disabled={!!editingDevice}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="name" className="text-sm sm:text-base">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lab A Gateway"
                required
                className="text-sm sm:text-base"
              />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="room" className="text-sm sm:text-base">Room</Label>
              <Select
                id="room"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="text-sm sm:text-base"
              >
                <option value="">Unassigned</option>
                {rooms?.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="rssi" className="text-sm sm:text-base">RSSI Range (dBm)</Label>
              <Input
                id="rssi"
                type="number"
                value={rssiRange}
                onChange={(e) => setRssiRange(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. -70"
                className="text-sm sm:text-base"
              />
              <p className="text-xs text-muted-foreground">Threshold for detecting presence in this room. Smaller rooms can use a higher value (e.g. -60).</p>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={createDevice.isPending || updateDevice.isPending} className="w-full sm:w-auto">
                {editingDevice ? 'Update' : 'Register'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
