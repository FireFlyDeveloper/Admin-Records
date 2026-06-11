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
      // Upload multiple files one request at a time. A single huge multipart
      // batch can exceed nginx/CDN request limits and surface as 502, while
      // preserving the same multi-file UX and per-file progress.
      if (files.length > 1) {
        const results = []
        for (const file of files) {
          const formData = new FormData()
          if (folderId) {
            formData.append('folderId', folderId)
          }
          formData.append('file', file)

          const response = await api.post('/documents/upload', formData, {
            params: conflict ? { conflict } : {},
            timeout: 300000,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total && onProgress) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                onProgress(file.name, progress)
              }
            },
          })
          results.push({ success: true, file: file.name, document: response.data.document })
        }
        return { success: true, results }
      } else {
        // Single file upload
        const formData = new FormData()
        if (folderId) {
          formData.append('folderId', folderId)
        }
        formData.append('file', files[0])
        
        const response = await api.post('/documents/upload', formData, {
          params: conflict ? { conflict } : {},
          timeout: 300000,
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

export function useCheckDuplicate() {
  return useMutation({
    mutationFn: async (data: { folderId: string | null; filename: string }) => {
      const response = await documentsApi.checkDuplicate(data.folderId, data.filename)
      return response
    },
  })
}

export function useSearchDocuments(searchQuery: string, enabled = true) {
  return useQuery({
    queryKey: ['documents-search', searchQuery],
    queryFn: () => documentsApi.searchDocuments(searchQuery).then((res) => res.data),
    enabled: enabled && !!searchQuery,
  })
}

export function useRenameDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await documentsApi.renameDocument(id, name)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

// Alias for backward compatibility
export function useCheckDocumentExists() {
  return useCheckDuplicate()
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
