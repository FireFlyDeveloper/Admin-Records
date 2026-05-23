import { useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import {
  useRooms, usePresence, useDevices, useBleTags,
  useCreateRoom, useUpdateRoom, useDeleteRoom,
  useCreateDevice, useUpdateDevice, useDeleteDevice,
  useCreateBleTag, useUpdateBleTag, useDeleteBleTag,
  useAssignBleTag, useUnassignBleTag,
} from '@/hooks/useBLE'
import { useItems } from '@/hooks/useItems'
import { useWebSocketPresenceSync } from '@/hooks/useWebSocket'
import { AlertBanner } from '@/components/ble/AlertBanner'
import { ConnectionStatus } from '@/components/ble/ConnectionStatus'
import { ItemPresenceCard } from '@/components/ble/ItemPresenceCard'
import { DeviceStatusCard } from '@/components/ble/DeviceStatusCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bluetooth, MapPin, Package, Radio, Tag,
  Plus, Pencil, Trash2, Link2, Unlink,
} from 'lucide-react'
import { Room, BleDevice, BleTag } from '@/types/ble'

export function TrackingDashboardPage() {
  useWebSocketPresenceSync()

  // Data queries
  const { data: rooms, isLoading: roomsLoading } = useRooms()
  const { data: presence, isLoading: presenceLoading } = usePresence()
  const { data: devices, isLoading: devicesLoading } = useDevices()
  const { data: tags, isLoading: tagsLoading } = useBleTags()
  const { data: items } = useItems()

  // Room mutations
  const createRoom = useCreateRoom()
  const updateRoom = useUpdateRoom()
  const deleteRoom = useDeleteRoom()

  // Device mutations
  const createDevice = useCreateDevice()
  const updateDevice = useUpdateDevice()
  const deleteDevice = useDeleteDevice()

  // Tag mutations
  const createTag = useCreateBleTag()
  const updateTag = useUpdateBleTag()
  const deleteTag = useDeleteBleTag()
  const assignTag = useAssignBleTag()
  const unassignTag = useUnassignBleTag()

  // Tab state
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  // Room dialog
  const [roomDialogOpen, setRoomDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [roomName, setRoomName] = useState('')
  const [roomDescription, setRoomDescription] = useState('')

  // Device dialog
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<BleDevice | null>(null)
  const [deviceId, setDeviceId] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [deviceRoomId, setDeviceRoomId] = useState('')
  const [deviceRssi, setDeviceRssi] = useState<number | ''>('')

  // Tag dialog
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<BleTag | null>(null)
  const [tagId, setTagId] = useState('')
  const [tagName, setTagName] = useState('')

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assigningTag, setAssigningTag] = useState<BleTag | null>(null)
  const [selectedItemId, setSelectedItemId] = useState('')

  const isLoading = roomsLoading || presenceLoading || devicesLoading || tagsLoading

  // Stats
  const presentCount = presence?.filter((p) => p.status === 'present').length || 0
  const transportingCount = presence?.filter((p) => p.status === 'transporting').length || 0
  const missingCount = presence?.filter((p) => p.status === 'missing').length || 0
  const offlineDevices = devices?.filter((d) => d.status === 'offline').length || 0

  const filteredPresence = selectedRoomId
    ? presence?.filter((p) => p.room_id === selectedRoomId)
    : presence

  // ── Room dialog handlers ──
  const openRoomCreate = () => {
    setEditingRoom(null)
    setRoomName('')
    setRoomDescription('')
    setRoomDialogOpen(true)
  }

  const openRoomEdit = (room: Room) => {
    setEditingRoom(room)
    setRoomName(room.name)
    setRoomDescription(room.description || '')
    setRoomDialogOpen(true)
  }

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomName.trim()) return
    if (editingRoom) {
      updateRoom.mutate({ id: editingRoom.id, data: { name: roomName, description: roomDescription || undefined } })
    } else {
      createRoom.mutate({ name: roomName, description: roomDescription || undefined })
    }
    setRoomDialogOpen(false)
  }

  const handleRoomDelete = (id: string) => {
    if (confirm('Delete this room?')) deleteRoom.mutate(id)
  }

  // ── Device dialog handlers ──
  const openDeviceCreate = () => {
    setEditingDevice(null)
    setDeviceId('')
    setDeviceName('')
    setDeviceRoomId('')
    setDeviceRssi('')
    setDeviceDialogOpen(true)
  }

  const openDeviceEdit = (device: BleDevice) => {
    setEditingDevice(device)
    setDeviceId(device.device_id)
    setDeviceName(device.name)
    setDeviceRoomId(device.room_id || '')
    setDeviceRssi(device.rssi_range ?? '')
    setDeviceDialogOpen(true)
  }

  const handleDeviceSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deviceId.trim() || !deviceName.trim()) return
    if (editingDevice) {
      updateDevice.mutate({
        id: editingDevice.id,
        data: { name: deviceName, room_id: deviceRoomId || null, rssi_range: deviceRssi !== '' ? Number(deviceRssi) : undefined },
      })
    } else {
      createDevice.mutate({
        device_id: deviceId, name: deviceName,
        room_id: deviceRoomId || undefined,
        rssi_range: deviceRssi !== '' ? Number(deviceRssi) : undefined,
      })
    }
    setDeviceDialogOpen(false)
  }

  const handleDeviceDelete = (id: string) => {
    if (confirm('Delete this device?')) deleteDevice.mutate(id)
  }

  // ── Tag dialog handlers ──
  const openTagCreate = () => {
    setEditingTag(null)
    setTagId('')
    setTagName('')
    setTagDialogOpen(true)
  }

  const openTagEdit = (tag: BleTag) => {
    setEditingTag(tag)
    setTagId(tag.tag_id)
    setTagName(tag.name)
    setTagDialogOpen(true)
  }

  const handleTagSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagId.trim() || !tagName.trim()) return
    if (editingTag) {
      updateTag.mutate({ id: editingTag.id, data: { name: tagName } })
    } else {
      createTag.mutate({ tag_id: tagId, name: tagName })
    }
    setTagDialogOpen(false)
  }

  const handleTagDelete = (id: string) => {
    if (confirm('Delete this tag?')) deleteTag.mutate(id)
  }

  const openAssign = (tag: BleTag) => {
    setAssigningTag(tag)
    setSelectedItemId(tag.item_id || '')
    setAssignDialogOpen(true)
  }

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault()
    if (!assigningTag || !selectedItemId) return
    assignTag.mutate({ id: assigningTag.id, data: { item_id: selectedItemId } })
    setAssignDialogOpen(false)
  }

  const handleUnassign = (tag: BleTag) => {
    if (confirm(`Unassign "${tag.name}"?`)) unassignTag.mutate(tag.id)
  }

  const trackableItems = items?.filter((i) => i.item_type === 'trackable') || []

  return (
    <PageShell
      title="BLE Tracking"
      description="Real-time asset tracking via Bluetooth"
      actions={<ConnectionStatus />}
    >
      <AlertBanner />

      {isLoading ? (
        <div className="space-y-4 lg:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-20 sm:h-24 w-full" />))}
          </div>
          <Skeleton className="h-48 sm:h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-3 lg:space-y-6">
          {/* ── Stats bar ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-lg border bg-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
              <div className="h-9 sm:h-10 w-9 sm:w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Package className="h-4 sm:h-5 w-4 sm:w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{presentCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Items Present</p>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
              <div className="h-9 sm:h-10 w-9 sm:w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Bluetooth className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{transportingCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Transporting</p>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
              <div className="h-9 sm:h-10 w-9 sm:w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Bluetooth className="h-4 sm:h-5 w-4 sm:w-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{missingCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Missing</p>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
              <div className="h-9 sm:h-10 w-9 sm:w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Radio className="h-4 sm:h-5 w-4 sm:w-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{offlineDevices}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Offline</p>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="overflow-x-auto flex-nowrap w-full sm:w-auto">
              <TabsTrigger value="overview" className="whitespace-nowrap"><MapPin className="h-4 w-4 sm:mr-2" />Rooms</TabsTrigger>
              <TabsTrigger value="items" className="whitespace-nowrap"><Package className="h-4 w-4 sm:mr-2" />Items</TabsTrigger>
              <TabsTrigger value="devices" className="whitespace-nowrap"><Radio className="h-4 w-4 sm:mr-2" />Devices</TabsTrigger>
              <TabsTrigger value="tags" className="whitespace-nowrap"><Tag className="h-4 w-4 sm:mr-2" />Tags</TabsTrigger>
            </TabsList>

            {/* ═══ Rooms Tab ═══ */}
            {activeTab === 'overview' && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{rooms?.length || 0} room(s) configured</p>
                  <Button size="sm" onClick={openRoomCreate}><Plus className="h-4 w-4 mr-1" />Add Room</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {rooms?.map((room) => {
                    const rp = presence?.filter((p) => p.room_id === room.id) || []
                    return (
                      <Card key={room.id} className="group relative">
                        <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4">
                          {/* Hover actions - always visible on mobile for touch-friendly access */}
                          <div className="absolute top-2 right-2 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-7 sm:w-7" onClick={(e) => { e.stopPropagation(); openRoomEdit(room) }}>
                              <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleRoomDelete(room.id) }}>
                              <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            </Button>
                          </div>
                          {/* Clickable area → filter items */}
                          <div className="cursor-pointer" onClick={() => { setSelectedRoomId(room.id); setActiveTab('items') }}>
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="h-4 w-4 text-primary shrink-0" />
                              <h3 className="font-medium text-sm truncate">{room.name}</h3>
                              <Badge variant="secondary" className="text-xs ml-auto">{rp.length}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />{rp.filter(p => p.status === 'present').length} present</span>
                              {rp.filter(p => p.status === 'transporting').length > 0 && (
                                <span className="flex items-center gap-1 text-blue-600"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />{rp.filter(p => p.status === 'transporting').length} trans</span>
                              )}
                              {rp.filter(p => p.status === 'missing').length > 0 && (
                                <span className="flex items-center gap-1 text-red-600"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />{rp.filter(p => p.status === 'missing').length} miss</span>
                              )}
                            </div>
                            {room.description && <p className="text-xs text-muted-foreground mt-2 truncate">{room.description}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                  {(!rooms || rooms.length === 0) && (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground col-span-full">
                      <MapPin className="h-8 sm:h-10 w-8 sm:w-10 mx-auto mb-2 sm:mb-3 opacity-40" />
                      <p>No rooms yet.</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={openRoomCreate}>Create first room</Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ Items Tab ═══ */}
            {activeTab === 'items' && (
              <div className="mt-4 space-y-4">
                {selectedRoomId && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="cursor-pointer" onClick={() => setSelectedRoomId(null)}>
                      {rooms?.find((r) => r.id === selectedRoomId)?.name || 'Room'} <span className="ml-1 text-muted-foreground">×</span>
                    </Badge>
                    <span className="text-sm text-muted-foreground">{filteredPresence?.length || 0} items</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredPresence?.map((p) => (<ItemPresenceCard key={p.item_id} presence={p} />))}
                </div>
                {(!filteredPresence || filteredPresence.length === 0) && (
                  <div className="text-center py-10 sm:py-16 text-muted-foreground">
                    <Package className="h-8 sm:h-12 w-8 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                    <p>No items to display.</p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ Devices Tab ═══ */}
            {activeTab === 'devices' && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{devices?.length || 0} device(s) registered</p>
                  <Button size="sm" onClick={openDeviceCreate}><Plus className="h-4 w-4 mr-1" />Register Device</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {devices?.map((device) => (
                    <div key={device.id} className="relative group">
                      <div className="cursor-pointer" onClick={() => openDeviceEdit(device)}>
                        <DeviceStatusCard device={device} />
                      </div>
                      <Button
                        variant="destructive" size="sm"
                        className="absolute top-2 right-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-xs h-7 sm:h-auto"
                        onClick={(e) => { e.stopPropagation(); handleDeviceDelete(device.id) }}
                      >Delete</Button>
                    </div>
                  ))}
                  {(!devices || devices.length === 0) && (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground col-span-full">
                      <Radio className="h-8 sm:h-10 w-8 sm:w-10 mx-auto mb-2 sm:mb-3 opacity-40" />
                      <p>No devices registered.</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={openDeviceCreate}>Register first device</Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ Tags Tab ═══ */}
            {activeTab === 'tags' && (
              <div className="mt-4 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{tags?.length || 0} tag(s) registered</p>
                  <Button size="sm" onClick={openTagCreate}><Plus className="h-4 w-4 mr-1" />Register Tag</Button>
                </div>
                <div className="space-y-2">
                  {tags?.map((tag) => (
                    <Card key={tag.id}>
                      <CardContent className="flex items-center justify-between py-2 sm:py-3 gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm truncate">{tag.name}</h3>
                            <span className="text-xs text-muted-foreground font-mono truncate">{tag.tag_id}</span>
                          </div>
                          <div className="mt-1">
                            {tag.item_id ? (
                              <Badge className="text-xs bg-green-600 hover:bg-green-600"><Link2 className="h-3 w-3 mr-1" />{tag.item_name || 'Assigned'}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Unassigned</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {tag.item_id ? (
                            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8" onClick={() => handleUnassign(tag)} title="Unassign"><Unlink className="h-4 w-4 text-muted-foreground" /></Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8" onClick={() => openAssign(tag)} title="Assign"><Link2 className="h-4 w-4 text-muted-foreground" /></Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8" onClick={() => openTagEdit(tag)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8 text-destructive" onClick={() => handleTagDelete(tag.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!tags || tags.length === 0) && (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground">
                      <Tag className="h-8 sm:h-10 w-8 sm:w-10 mx-auto mb-2 sm:mb-3 opacity-40" />
                      <p>No tags registered.</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={openTagCreate}>Register first tag</Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Tabs>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          DIALOGS
      ═══════════════════════════════════════════ */}

      {/* Room dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRoom ? 'Edit Room' : 'Add Room'}</DialogTitle></DialogHeader>
          <form onSubmit={handleRoomSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rName">Name</Label>
              <Input id="rName" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. Lab A" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rDesc">Description</Label>
              <Input id="rDesc" value={roomDescription} onChange={(e) => setRoomDescription(e.target.value)} placeholder="Optional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRoomDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createRoom.isPending || updateRoom.isPending}>{editingRoom ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Device dialog */}
      <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingDevice ? 'Edit Device' : 'Register Device'}</DialogTitle></DialogHeader>
          <form onSubmit={handleDeviceSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dId">Device ID</Label>
              <Input id="dId" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="e.g. ble-gw-001" required disabled={!!editingDevice} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dName">Name</Label>
              <Input id="dName" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="e.g. Lab A Gateway" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dRoom">Room</Label>
              <Select id="dRoom" value={deviceRoomId} onChange={(e) => setDeviceRoomId(e.target.value)}>
                <option value="">Unassigned</option>
                {rooms?.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dRssi">RSSI Range (dBm)</Label>
              <Input id="dRssi" type="number" value={deviceRssi} onChange={(e) => setDeviceRssi(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. -70" />
              <p className="text-xs text-muted-foreground">Threshold for detecting presence in this room.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeviceDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createDevice.isPending || updateDevice.isPending}>{editingDevice ? 'Update' : 'Register'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tag dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTag ? 'Edit Tag' : 'Register Tag'}</DialogTitle></DialogHeader>
          <form onSubmit={handleTagSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tId">Tag ID</Label>
              <Input id="tId" value={tagId} onChange={(e) => setTagId(e.target.value)} placeholder="e.g. tag-001" required disabled={!!editingTag} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tName">Name</Label>
              <Input id="tName" value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="e.g. Projector Tag" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTagDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createTag.isPending || updateTag.isPending}>{editingTag ? 'Update' : 'Register'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Tag to Item</DialogTitle></DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aItem">Select Item</Label>
              <Select id="aItem" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} required>
                <option value="">Choose an item...</option>
                {trackableItems.map((item) => (<option key={item.id} value={item.id}>{item.name}</option>))}
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={assignTag.isPending}>Assign</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
