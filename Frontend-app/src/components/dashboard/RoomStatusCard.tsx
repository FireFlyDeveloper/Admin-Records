import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, CheckCircle, AlertTriangle } from 'lucide-react'
import { RoomStatus } from '@/api/dashboard'

interface RoomStatusCardProps {
  rooms: RoomStatus[] | undefined
  isLoading: boolean
}

export function RoomStatusCard({ rooms, isLoading }: RoomStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Room Status</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : rooms && rooms.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {rooms.map((room) => (
              <div key={room.roomId} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{room.roomName}</p>
                    <p className="text-xs text-muted-foreground">{room.itemCount} items</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>{room.presentCount}</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{room.missingCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MapPin className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No rooms configured</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
