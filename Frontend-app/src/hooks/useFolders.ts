import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '@/api/documents'
import { useUIStore } from '@/stores/uiStore'
import { CreateFolderInput, UpdateFolderInput } from '@/types/document'

export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: () => documentsApi.getFolders().then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useFolder(id: string | null) {
  return useQuery({
    queryKey: ['folder', id],
    queryFn: () => documentsApi.getFolder(id!).then((res) => res.data),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (data: CreateFolderInput) =>
      documentsApi.createFolder(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] })
      addToast({ message: 'Folder created', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to create folder', type: 'error' })
    },
  })
}

export function useUpdateFolder() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFolderInput }) =>
      documentsApi.updateFolder(id, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] })
      queryClient.invalidateQueries({ queryKey: ['folder-path'] })
      queryClient.invalidateQueries({ queryKey: ['folder', variables.id] })
      addToast({ message: 'Folder updated', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to update folder', type: 'error' })
    },
  })
}

export function useDeleteFolder() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (id: string) => documentsApi.deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] })
      queryClient.invalidateQueries({ queryKey: ['folder-path'] })
      addToast({ message: 'Folder deleted', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to delete folder', type: 'error' })
    },
  })
}
