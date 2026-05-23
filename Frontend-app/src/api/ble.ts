import api from './client'
import {
  Room,
  BleDevice,
  BleTag,
  ItemPresence,
  ItemPresenceDetail,
  CreateRoomInput,
  UpdateRoomInput,
  CreateDeviceInput,
  UpdateDeviceInput,
  CreateTagInput,
  UpdateTagInput,
  AssignTagInput,
} from '@/types/ble'

export const bleApi = {
  // Rooms
  getRooms: () => api.get<{ rooms: Room[] }>('/ble/rooms'),

  createRoom: (data: CreateRoomInput) =>
    api.post<{ room: Room }>('/ble/rooms', data),

  updateRoom: (id: string, data: UpdateRoomInput) =>
    api.patch<{ room: Room }>(`/ble/rooms/${id}`, data),

  deleteRoom: (id: string) => api.delete(`/ble/rooms/${id}`),

  // Devices
  getDevices: () => api.get<{ devices: BleDevice[] }>('/ble/devices'),

  createDevice: (data: CreateDeviceInput) =>
    api.post<{ device: BleDevice }>('/ble/devices', data),

  updateDevice: (id: string, data: UpdateDeviceInput) =>
    api.patch<{ device: BleDevice }>(`/ble/devices/${id}`, data),

  deleteDevice: (id: string) => api.delete(`/ble/devices/${id}`),

  // Tags
  getTags: () => api.get<{ tags: BleTag[] }>('/ble/tags'),

  createTag: (data: CreateTagInput) =>
    api.post<{ tag: BleTag }>('/ble/tags', data),

  updateTag: (id: string, data: UpdateTagInput) =>
    api.patch<{ tag: BleTag }>(`/ble/tags/${id}`, data),

  assignTag: (id: string, data: AssignTagInput) =>
    api.patch<{ tag: BleTag }>(`/ble/tags/${id}/assign`, data),

  unassignTag: (id: string) =>
    api.patch<{ tag: BleTag }>(`/ble/tags/${id}/unassign`),

  deleteTag: (id: string) => api.delete(`/ble/tags/${id}`),

  // Presence
  getPresence: () => api.get<{ presence: ItemPresence[] }>('/ble/presence'),

  getPresenceDetail: (itemId: string) =>
    api.get<ItemPresenceDetail>(`/ble/presence/${itemId}`),
}
