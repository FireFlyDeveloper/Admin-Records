import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/api/inventory'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { CheckoutInput, ReturnInput } from '@/types/inventory'

export function useCheckouts(filters?: { status?: string; user_id?: string; item_id?: string }) {
  return useQuery({
    queryKey: ['checkouts', filters],
    queryFn: () => inventoryApi.getCheckouts(filters).then((res) => res.data.transactions),
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useCheckout(id: string | null) {
  return useQuery({
    queryKey: ['checkout', id],
    queryFn: () => inventoryApi.getCheckout(id!).then((res) => res.data),
    enabled: !!id,
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useCreateCheckout() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)
  const user = useAuthStore((state) => state.user)
  const isAdminOrStaff = user?.roles?.includes('admin') || user?.roles?.includes('staff')

  return useMutation({
    mutationFn: (data: CheckoutInput) =>
      inventoryApi.createCheckout(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkouts'] })
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      const msg = isAdminOrStaff
        ? 'Checkout completed successfully'
        : 'Checkout request submitted for approval'
      addToast({ message: msg, type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Checkout failed', type: 'error' })
    },
  })
}

export function useApproveCheckout() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (id: string) => inventoryApi.approveCheckout(id).then((res) => res.data.transaction),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['checkouts'] })
      queryClient.invalidateQueries({ queryKey: ['checkout', id] })
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      addToast({ message: 'Checkout approved', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Approval failed', type: 'error' })
    },
  })
}

export function useRejectCheckout() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (id: string) => inventoryApi.rejectCheckout(id).then((res) => res.data.transaction),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['checkouts'] })
      queryClient.invalidateQueries({ queryKey: ['checkout', id] })
      addToast({ message: 'Checkout rejected', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Rejection failed', type: 'error' })
    },
  })
}

export function useReturnCheckout() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReturnInput }) =>
      inventoryApi.returnCheckout(id, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['checkouts'] })
      queryClient.invalidateQueries({ queryKey: ['checkout', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      addToast({ message: 'Return processed successfully', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Return failed', type: 'error' })
    },
  })
}

export function useCancelCheckout() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (id: string) => inventoryApi.cancelCheckout(id).then((res) => res.data.transaction),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['checkouts'] })
      queryClient.invalidateQueries({ queryKey: ['checkout', id] })
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      addToast({ message: 'Checkout cancelled', type: 'success' })
    },
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Cancel failed', type: 'error' })
    },
  })
}

export function useScanCode() {
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (code: string) => inventoryApi.scanCode(code).then((res) => res.data),
    onError: (err: any) => {
      addToast({ message: err?.response?.data?.error || 'Scan failed', type: 'error' })
    },
  })
}
