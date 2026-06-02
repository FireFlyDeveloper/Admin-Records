import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FolderBreadcrumbs } from './FolderBreadcrumbs'
import { Folder } from '@/types/document'

// Mock folder data for testing
const mockFolders: Folder[] = [
  { id: '1', name: 'Root Folder', parent_id: null, created_by: 'user1', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '2', name: 'Subfolder 1', parent_id: '1', created_by: 'user1', created_at: '2024-01-02', updated_at: '2024-01-02' },
  { id: '3', name: 'Subfolder 2', parent_id: '2', created_by: 'user1', created_at: '2024-01-03', updated_at: '2024-01-03' },
]

describe('FolderBreadcrumbs', () => {
  it('renders home button when no path provided', () => {
    render(
      <FolderBreadcrumbs
        path={[]}
        currentFolderId={null}
        onNavigate={() => {}}
      />
    )
    
    expect(screen.getByLabelText('Navigate to all folders')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('renders full breadcrumb path', () => {
    render(
      <FolderBreadcrumbs
        path={mockFolders}
        currentFolderId={'3'}
        onNavigate={() => {}}
      />
    )
    
    // Should show Home button and all folder names
    expect(screen.getByLabelText('Navigate to all folders')).toBeInTheDocument()
    expect(screen.getByLabelText('Navigate to Root Folder folder')).toBeInTheDocument()
    expect(screen.getByLabelText('Navigate to Subfolder 1 folder')).toBeInTheDocument()
    expect(screen.getByLabelText('Navigate to Subfolder 2 folder')).toBeInTheDocument()
    
    // Should have chevron separators
    const chevrons = screen.getAllByRole('separator', { hidden: true })
    expect(chevrons).toHaveLength(3) // 3 chevrons for 3 folders
  })

  it('highlights current folder with different styling', () => {
    const { container } = render(
      <FolderBreadcrumbs
        path={mockFolders}
        currentFolderId={'2'}
        onNavigate={() => {}}
      />
    )
    
    // The current folder button should have font-medium class
    const currentFolderButton = screen.getByLabelText('Navigate to Subfolder 1 folder')
    expect(currentFolderButton).toHaveClass('font-medium')
  })

  it('calls onNavigate with correct folder id when clicked', () => {
    const mockOnNavigate = vitest.fn()
    
    render(
      <FolderBreadcrumbs
        path={mockFolders}
        currentFolderId={'3'}
        onNavigate={mockOnNavigate}
      />
    )
    
    const homeButton = screen.getByLabelText('Navigate to all folders')
    const folderButton = screen.getByLabelText('Navigate to Subfolder 1 folder')
    
    homeButton.click()
    folderButton.click()
    
    expect(mockOnNavigate).toHaveBeenCalledTimes(2)
    expect(mockOnNavigate).toHaveBeenCalledWith(null) // Home button
    expect(mockOnNavigate).toHaveBeenCalledWith('2') // Subfolder 1 button
  })

  it('truncates long folder names', () => {
    const longFolder: Folder[] = [
      { 
        id: '1', 
        name: 'This is a very long folder name that should be truncated', 
        parent_id: null, 
        created_by: 'user1', 
        created_at: '2024-01-01', 
        updated_at: '2024-01-01' 
      },
    ]
    
    render(
      <FolderBreadcrumbs
        path={longFolder}
        currentFolderId={'1'}
        onNavigate={() => {}}
      />
    )
    
    const button = screen.getByLabelText('Navigate to This is a very long folder name that should be truncated folder')
    // The button should have max width classes
    expect(button).toHaveClass('max-w-[150px]')
    expect(button).toHaveClass('sm:max-w-[200px]')
  })
})