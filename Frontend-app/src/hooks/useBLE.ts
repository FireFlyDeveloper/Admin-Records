import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bleApi } from '@/api/ble'
import { useUIStore } from '@/stores/uiStore'
import {
  CreateRoomInput,
  UpdateRoomInput,
  CreateDeviceInput,
  UpdateDeviceInput,
  CreateTagInput,
  UpdateTagInput,
  AssignTagInput,
} from '@/types/ble'

// Rooms
export function useRooms() {
  return useQuery({
    queryKey: ['ble-rooms'],
    queryFn: async () => {
      try {
        return await bleApi.getRooms().then((res) => res.data.rooms)
      } catch (error) {
        console.error('Failed to fetch rooms:', error)
        return []
      }
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    retry: 2,
  })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (data: CreateRoomInput) =>
      bleApi.createRoom(data).then((res) => res.data.room),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-rooms'] })
      addToast({ message: 'Room created successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to create room', type: 'error' })
    },
  })
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoomInput }) =>
      bleApi.updateRoom(id, data).then((res) => res.data.room),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-rooms'] })
      addToast({ message: 'Room updated successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to update room', type: 'error' })
    },
  })
}

export function useDeleteRoom() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (id: string) => bleApi.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-rooms'] })
      addToast({ message: 'Room deleted', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to delete room', type: 'error' })
    },
  })
}

// Devices
export function useDevices() {
  return useQuery({
    queryKey: ['ble-devices'],
    queryFn: async () => {
      try {
        return await bleApi.getDevices().then((res) => res.data.devices)
      } catch (error) {
        console.error('Failed to fetch devices:', error)
        return []
      }
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    retry: 2,
  })
}

export function useCreateDevice() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (data: CreateDeviceInput) =>
      bleApi.createDevice(data).then((res) => res.data.device),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-devices'] })
      addToast({ message: 'Device registered successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to register device', type: 'error' })
    },
  })
}

export function useUpdateDevice() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeviceInput }) =>
      bleApi.updateDevice(id, data).then((res) => res.data.device),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-devices'] })
      addToast({ message: 'Device updated successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to update device', type: 'error' })
    },
  })
}

export function useDeleteDevice() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (id: string) => bleApi.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-devices'] })
      addToast({ message: 'Device deleted', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to delete device', type: 'error' })
    },
  })
}

// Tags
export function useBleTags() {
  return useQuery({
    queryKey: ['ble-tags'],
    queryFn: () => bleApi.getTags().then((res) => res.data.tags),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useCreateBleTag() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (data: CreateTagInput) =>
      bleApi.createTag(data).then((res) => res.data.tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-tags'] })
      addToast({ message: 'Tag registered successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to register tag', type: 'error' })
    },
  })
}

export function useUpdateBleTag() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTagInput }) =>
      bleApi.updateTag(id, data).then((res) => res.data.tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-tags'] })
      addToast({ message: 'Tag updated successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to update tag', type: 'error' })
    },
  })
}

export function useAssignBleTag() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignTagInput }) =>
      bleApi.assignTag(id, data).then((res) => res.data.tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-tags'] })
      addToast({ message: 'Tag assigned successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to assign tag', type: 'error' })
    },
  })
}

export function useUnassignBleTag() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (id: string) => bleApi.unassignTag(id).then((res) => res.data.tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-tags'] })
      addToast({ message: 'Tag unassigned successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to unassign tag', type: 'error' })
    },
  })
}

export function useDeleteBleTag() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (id: string) => bleApi.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ble-tags'] })
      addToast({ message: 'Tag deleted', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to delete tag', type: 'error' })
    },
  })
}

// Presence
export function usePresence() {
  return useQuery({
    queryKey: ['ble-presence'],
    queryFn: () => bleApi.getPresence().then((res) => res.data.presence),
    staleTime: 15 * 1000,
    refetchInterval: 10 * 1000,
  })
}

export function usePresenceDetail(itemId: string | null) {
  return useQuery({
    queryKey: ['ble-presence', itemId],
    queryFn: () => bleApi.getPresenceDetail(itemId!).then((res) => res.data),
    enabled: !!itemId,
    staleTime: 15 * 1000,
    refetchInterval: 10 * 1000,
  })
}
