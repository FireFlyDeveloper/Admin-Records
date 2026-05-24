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
              onProgress('Batch upload', progress)
            }
          },
        })
        
        return response.data.results
      } else {
        // Single file - use original endpoint for backward compatibility
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
        
        return [{ success: true, file: files[0].name, data: response.data }]
      }
    },
    onSuccess: (results, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents', variables.folderId] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      
      const successCount = results.filter(r => r.success).length
      const errorCount = results.length - successCount
      
      if (successCount > 0) {
        addToast({
          type: 'success',
          title: successCount === 1 ? 'File uploaded successfully' : `${successCount} files uploaded successfully`,
          description: successCount === 1 ? `"${results.find(r => r.success)?.file}" has been uploaded.` : 'All files have been processed.',
        })
      }
      
      if (errorCount > 0) {
        addToast({
          type: 'error',
          title: `${errorCount} file${errorCount > 1 ? 's' : ''} failed to upload`,
          description: errorCount === 1 ? `"${results.find(r => !r.success)?.file}" failed to upload.` : 'Some files could not be uploaded.',
        })
      }
    },
    onError: (error, variables) => {
      addToast({
        type: 'error',
        title: 'Upload failed',
        description: variables.files.length === 1 
          ? `Failed to upload "${variables.files[0].name}"` 
          : 'Failed to upload files',
      })
    },
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({
      folderId,
      file,
      conflict,
      onProgress,
    }: {
      folderId: string | null
      file: File
      conflict?: 'replace' | 'duplicate'
      onProgress?: (progress: number) => void
    }) => {
      const formData = new FormData()
      if (folderId) {
        formData.append('folderId', folderId)
      }
      formData.append('file', file)
      return documentsApi.uploadDocument(folderId, file, conflict, onProgress)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['documents', variables.folderId],
      })
      addToast({ message: 'File uploaded successfully', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to upload file', type: 'error' })
    },
  })
}

export function useSearchDocuments(query: string) {
  return useQuery({
    queryKey: ['documents', 'search', query],
    queryFn: () =>
      documentsApi.searchDocuments(query).then((res) => res.data),
    enabled: query.length > 0,
  })
}

export function useCheckDuplicate() {
  return useMutation({
    mutationFn: ({ folderId, name }: { folderId: string | null; name: string }) =>
      documentsApi.checkDuplicate(folderId, name).then((res) => res.data),
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      addToast({ message: 'Document deleted successfully', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to delete document', type: 'error' })
    },
  })
}

export function useRenameDocument() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      documentsApi.renameDocument(id, name),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      addToast({ message: 'Document renamed successfully', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to rename document', type: 'error' })
    },
  })
}

export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: () => documentsApi.getFolders().then((res) => res.data),
  })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: string }) =>
      documentsApi.createFolder(name, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      addToast({ message: 'Folder created successfully', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to create folder', type: 'error' })
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