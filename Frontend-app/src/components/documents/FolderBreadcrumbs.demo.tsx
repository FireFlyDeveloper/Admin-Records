import React from 'react'
import { FolderBreadcrumbs } from '@/components/documents/FolderBreadcrumbs'
import { Folder } from '@/types/document'

// Mock data for demonstration
const mockFolders: Folder[] = [
  { id: '1', name: 'Documents', parent_id: null, created_by: 'user1', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '2', name: 'Work', parent_id: '1', created_by: 'user1', created_at: '2024-01-02', updated_at: '2024-01-02' },
  { id: '3', name: 'Projects', parent_id: '2', created_by: 'user1', created_at: '2024-01-03', updated_at: '2024-01-03' },
  { id: '4', name: 'Q1 Reports', parent_id: '3', created_by: 'user1', created_at: '2024-01-04', updated_at: '2024-01-04' },
]

const longNameFolders: Folder[] = [
  { id: '5', name: 'This is a very long folder name that demonstrates truncation', parent_id: null, created_by: 'user1', created_at: '2024-01-01', updated_at: '2024-01-01' },
]

function DemoComponent() {
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>('4')
  
  const handleNavigate = (folderId: string | null) => {
    console.log('Navigating to:', folderId)
    setCurrentFolderId(folderId)
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">FolderBreadcrumbs Component Demo</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Example 1: Deep folder path</h3>
            <div className="p-4 border rounded-lg">
              <FolderBreadcrumbs
                path={mockFolders}
                currentFolderId={currentFolderId}
                onNavigate={handleNavigate}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Clicking any folder will log to console and update current folder
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">Example 2: Root folder (Home)</h3>
            <div className="p-4 border rounded-lg">
              <FolderBreadcrumbs
                path={[]}
                currentFolderId={null}
                onNavigate={handleNavigate}
              />
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Example 3: Long folder name (truncated)</h3>
            <div className="p-4 border rounded-lg">
              <FolderBreadcrumbs
                path={longNameFolders}
                currentFolderId={'5'}
                onNavigate={handleNavigate}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Hover over the truncated name to see the full folder name
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">Current State</h3>
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm">
                Current folder ID: <code className="bg-muted px-2 py-1 rounded">{currentFolderId || '(root)'}</code>
              </p>
              <p className="text-sm mt-2">
                Folder path: {mockFolders.filter(f => f.id === currentFolderId).map(f => f.name).join(' → ') || 'Root'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="font-medium mb-2">Component Features:</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Clickable breadcrumb path from root to current folder</li>
          <li>"Home" as root level (navigates to null)</li>
          <li>Current folder is visually highlighted (font-medium)</li>
          <li>Long folder names are truncated with hover tooltips</li>
          <li>Proper ARIA labels for accessibility</li>
          <li>Chevron separators between breadcrumbs</li>
          <li>Responsive design (Home text hidden on mobile)</li>
          <li>TypeScript type safety</li>
        </ul>
      </div>
    </div>
  )
}

export default DemoComponent