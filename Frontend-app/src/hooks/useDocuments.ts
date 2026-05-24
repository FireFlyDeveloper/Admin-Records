import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '@/api/documents'
import api from '@/api/client'
import { useUIStore } from '@/stores/uiStore'

export function useDocuments(folderId: string | null) {
  return useQuery({
    queryKey: ['documents', folderId],
    queryFn: () =>
      folderId
        ? documentsApi.getFolderDocuments(folderId).then((res) => res.data)
        : documentsApi.getAllDocuments().then((res) => res.data),
    enabled: true,
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useUploadDocuments() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: async ({
      folderId,
      files,
      conflict,
      onProgress,
    }: {
      folderId: string | null
      files: File[]
      conflict?: 'replace' | 'rename' | 'skip'
      onProgress?: (filename: string, progress: number) => void
    }) => {
      // Use batch endpoint for multiple files
      if (files.length > 1) {
        const formData = new FormData()
        if (folderId) {
          formData.append('folderId', folderId)
        }
        files.forEach((file) => {
          formData.append('files', file)
        })
        
        const response = await api.post('/documents/upload/batch', formData, {
          params: conflict ? { conflict } : {},
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              // For batch, we'll send progress for all files combined
              onProgress(`Uploading ${files.length} files`, progress)
            }
          },
        })
        return response.data
      } else {
        // Single file upload
        const formData = new FormData()
        if (folderId) {
          formData.append('folderId', folderId)
        }
        formData.append('file', files[0])
        
        const response = await api.post('/documents/upload', formData, {
          params: conflict ? { conflict } : {},
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              onProgress(files[0].name, progress)
            }
          },
        })
        return response.data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      addToast({
        message: 'Document(s) uploaded successfully',
        type: 'success',
      })
    },
    onError: (error: any) => {
      addToast({
        message: error?.response?.data?.message || 'Failed to upload document(s)',
        type: 'error',
      })
    },
  })
}

export function useDocumentActivity(documentId: string) {
  return useQuery({
    queryKey: ['document-activity', documentId],
    queryFn: () => documentsApi.getDocumentActivity(documentId).then((res) => res.data),
    enabled: !!documentId,
  })
}

export function useDownloadDocument() {
  const addToast = useUIStore((state) => state.addToast)
  
  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await documentsApi.downloadDocument(documentId)
      return response.data
    },
    onError: (error: any) => {
      addToast({
        message: error?.response?.data?.message || 'Failed to download document',
        type: 'error',
      })
    },
  })
}

export function useCheckDocumentExists() {
  return useMutation({
    mutationFn: async (data: { folderId: string | null; filename: string }) => {
      const response = await documentsApi.checkDocumentExists(data.folderId, data.filename)
      return response.data
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await documentsApi.deleteDocument(documentId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      addToast({
        message: 'Document deleted successfully',
        type: 'success',
      })
    },
    onError: (error: any) => {
      addToast({
        message: error?.response?.data?.message || 'Failed to delete document',
        type: 'error',
      })
    },
  })
}
