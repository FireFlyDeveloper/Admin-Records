import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/api/inventory'
import { useUIStore } from '@/stores/uiStore'
import { CreateItemInput, UpdateItemInput, Item } from '@/types/inventory'

export function useItems(filters?: { type?: string; category?: string; status?: string; search?: string; room?: string; expiration?: string }) {
  return useQuery({
    queryKey: ['items', filters],
    queryFn: () => inventoryApi.getItems(filters).then((res) => res.data.items),
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useItem(id: string | null) {
  return useQuery({
    queryKey: ['item', id],
    queryFn: () => inventoryApi.getItem(id!).then((res) => res.data.item),
    enabled: !!id,
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (data: CreateItemInput) =>
      inventoryApi.createItem(data).then((res) => res.data.item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      addToast({ message: 'Item created successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to create item', type: 'error' })
    },
  })
}

export function useUpdateItem() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateItemInput }) =>
      inventoryApi.updateItem(id, data).then((res) => res.data.item),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['item', variables.id] })
      addToast({ message: 'Item updated successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Failed to update item', type: 'error' })
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (id: string) => inventoryApi.deleteItem(id),
    // Optimistic update: remove the item from every cached `['items', ...]`
    // list immediately so the UI updates without waiting for the round trip.
    // Then invalidate to refetch and confirm the server state.
    onMutate: async (id: string) => {
      // Cancel any in-flight refetches so they don't clobber the optimistic update
      await queryClient.cancelQueries({ queryKey: ['items'] })

      // Snapshot all matching `['items', ...]` caches so we can roll back on error
      const previousSnapshots = queryClient.getQueriesData<Item[]>({ queryKey: ['items'] })

      // Remove the item from each cached list
      queryClient.setQueriesData<Item[]>({ queryKey: ['items'] }, (old) =>
        Array.isArray(old) ? old.filter((it) => it.id !== id) : old
      )

      // Also clear the single-item cache so the detail page refetches fresh
      queryClient.removeQueries({ queryKey: ['item', id] })

      return { previousSnapshots }
    },
    onError: (err: any, _id, context) => {
      // Roll back optimistic update on failure
      if (context?.previousSnapshots) {
        for (const [key, data] of context.previousSnapshots) {
          queryClient.setQueryData(key, data)
        }
      }
      addToast({ message: err?.response?.data?.error || 'Failed to delete item', type: 'error' })
    },
    onSuccess: () => {
      addToast({ message: 'Item deleted', type: 'success' })
    },
    onSettled: () => {
      // Always refetch to make sure the cache matches server truth
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}
