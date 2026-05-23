import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '@/api/documents'
import { useUIStore } from '@/stores/uiStore'

export function useDocumentPermissions(documentId: string | null) {
  return useQuery({
    queryKey: ['document-permissions', documentId],
    queryFn: () =>
      documentsApi.getDocumentPermissions(documentId!),
    enabled: !!documentId,
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useAddDocumentPermission() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string
      data: { userId?: string; role?: string; level: 'viewer' | 'editor' | 'manager' }
    }) => documentsApi.addDocumentPermission(documentId, data).then((res) => res.data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['document-permissions', variables.documentId],
      })
      addToast({
        message: (result as any).created === false ? 'Permission updated' : 'Permission added',
        type: 'success',
      })
    },
    onError: () => {
      addToast({ message: 'Failed to add permission', type: 'error' })
    },
  })
}

export function useRemoveDocumentPermission() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({
      documentId,
      permissionId,
    }: {
      documentId: string
      permissionId: string
    }) => documentsApi.removeDocumentPermission(documentId, permissionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['document-permissions', variables.documentId],
      })
      addToast({ message: 'Permission removed', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to remove permission', type: 'error' })
    },
  })
}

export function useFolderPermissions(folderId: string | null) {
  return useQuery({
    queryKey: ['folder-permissions', folderId],
    queryFn: () =>
      documentsApi.getFolderPermissions(folderId!).then((res) => res.data),
    enabled: !!folderId,
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useAddFolderPermission() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({
      folderId,
      data,
    }: {
      folderId: string
      data: { userId?: string; role?: string; level: 'viewer' | 'editor' | 'manager' }
    }) => documentsApi.addFolderPermission(folderId, data).then((res) => res.data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['folder-permissions', variables.folderId],
      })
      addToast({
        message: (result as any).created === false ? 'Permission updated' : 'Permission added',
        type: 'success',
      })
    },
    onError: () => {
      addToast({ message: 'Failed to add permission', type: 'error' })
    },
  })
}

export function useRemoveFolderPermission() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({
      folderId,
      permissionId,
    }: {
      folderId: string
      permissionId: string
    }) => documentsApi.removeFolderPermission(folderId, permissionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['folder-permissions', variables.folderId],
      })
      addToast({ message: 'Permission removed', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to remove permission', type: 'error' })
    },
  })
}
