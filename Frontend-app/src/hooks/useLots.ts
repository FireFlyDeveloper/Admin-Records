import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/api/inventory'
import { useUIStore } from '@/stores/uiStore'
import { CreateLotInput, UpdateLotInput } from '@/types/inventory'

export function useLots(itemId: string | null) {
  return useQuery({
    queryKey: ['lots', itemId],
    queryFn: () => inventoryApi.getLots(itemId!).then((res) => res.data.lots),
    enabled: !!itemId,
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useCreateLot() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: CreateLotInput }) =>
      inventoryApi.createLot(itemId, data).then((res) => res.data.lot),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lots', variables.itemId] })
      queryClient.invalidateQueries({ queryKey: ['item', variables.itemId] })
      addToast({ message: 'Lot created successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to create lot', type: 'error' })
    },
  })
}

export function useUpdateLot() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ lotId, data }: { lotId: string; data: UpdateLotInput }) =>
      inventoryApi.updateLot(lotId, data).then((res) => res.data.lot),
    onSuccess: (lot) => {
      // Invalidate the lots query for the item
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      addToast({ message: 'Lot updated successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to update lot', type: 'error' })
    },
  })
}
