import { Room, ItemPresence } from '@/types/ble'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoomGridProps {
  rooms: Room[]
  presence: ItemPresence[]
  onRoomClick?: (roomId: string) => void
}

export function RoomGrid({ rooms, presence, onRoomClick }: RoomGridProps) {
  const unassigned = presence.filter((p) => !p.room_id)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms.map((room) => {
          const roomPresence = presence.filter((p) => p.room_id === room.id)
          const presentCount = roomPresence.filter((p) => p.status === 'present').length
          const missingCount = roomPresence.filter((p) => p.status === 'missing').length
          const transportingCount = roomPresence.filter((p) => p.status === 'transporting').length

          return (
            <Card
              key={room.id}
              className={cn(
                'cursor-pointer hover:shadow-md transition-shadow',
                onRoomClick && 'hover:border-primary'
              )}
              onClick={() => onRoomClick?.(room.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {room.name}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {roomPresence.length} items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span>{presentCount} present</span>
                  </div>
                  {transportingCount > 0 && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span>{transportingCount} transporting</span>
                    </div>
                  )}
                  {missingCount > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span>{missingCount} missing</span>
                    </div>
                  )}
                </div>
                {room.description && (
                  <p className="text-xs text-muted-foreground mt-2 truncate">{room.description}</p>
                )}
              </CardContent>
            </Card>
          )
        })}

        {/* Unassigned card */}
        {unassigned.length > 0 && (
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Unassigned
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {unassigned.length} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  <span>{unassigned.filter((p) => p.status === 'present').length} present</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
