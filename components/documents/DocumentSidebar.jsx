import React, { useMemo } from 'react';
import { Plus, Moon, Sun, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import QuickFilters from './QuickFilters';
import ProjectTree from './ProjectTree';
import StorageIndicator from './StorageIndicator';

/**
 * DocumentSidebar - Left sidebar with navigation, filters, and project tree
 * @param {Object} props
 * @param {Array} props.documents - All documents
 * @param {Array} props.projects - All projects
 * @param {Array} props.assignments - All assignments
 * @param {Object} props.filters - Current filter state
 * @param {Object} props.documentCounts - Document counts for quick filters
 * @param {Function} props.onQuickFilterChange - Callback when quick filter changes
 * @param {Function} props.onProjectSelect - Callback when project selected
 * @param {Function} props.onAssignmentSelect - Callback when assignment selected
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 * @param {Function} props.onThemeToggle - Callback to toggle theme
 * @param {Function} props.onNewDocument - Callback to create new document
 * @param {Function} props.getProjectDocumentCount - Function to get doc count for project
 * @param {Function} props.getAssignmentDocumentCount - Function to get doc count for assignment
 */
export default function DocumentSidebar({
  documents = [],
  projects = [],
  assignments = [],
  filters,
  documentCounts = {},
  onQuickFilterChange,
  onProjectSelect,
  onAssignmentSelect,
  darkMode = false,
  onThemeToggle,
  onNewDocument,
  getProjectDocumentCount,
  getAssignmentDocumentCount,
}) {
  // Calculate total storage used
  const storageUsed = useMemo(() => {
    return documents.reduce((total, doc) => {
      return total + (doc.file_size || 0);
    }, 0);
  }, [documents]);

  return (
    <div
      className={cn(
        'w-64 flex-shrink-0 flex flex-col border-r h-full',
        darkMode ? 'bg-[#0A0A0B] border-white/10' : 'bg-white border-gray-200'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-4 border-b',
          darkMode ? 'border-white/10' : 'border-gray-200'
        )}
      >
        <div className="flex items-center gap-2">
          <FileText className={cn('w-5 h-5', darkMode ? 'text-indigo-400' : 'text-indigo-600')} />
          <h2 className={cn('font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>
            Documents
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onThemeToggle}
          className={cn(
            'h-8 w-8',
            darkMode
              ? 'text-gray-400 hover:text-white hover:bg-white/10'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      {/* New Document Button */}
      <div className="px-3 py-3">
        <Button
          onClick={onNewDocument}
          className={cn(
            'w-full justify-start gap-2',
            darkMode
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          )}
        >
          <Plus className="w-4 h-4" />
          New Document
        </Button>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2">
          {/* Quick Filters */}
          <QuickFilters
            activeFilter={filters.quickFilter}
            counts={documentCounts}
            onFilterChange={onQuickFilterChange}
            darkMode={darkMode}
          />

          {/* Divider */}
          <div className={cn('my-4 border-t', darkMode ? 'border-white/10' : 'border-gray-200')} />

          {/* Project Tree */}
          <ProjectTree
            projects={projects}
            assignments={assignments}
            documents={documents}
            selectedProject={filters.selectedProject}
            selectedAssignment={filters.selectedAssignment}
            onProjectSelect={onProjectSelect}
            onAssignmentSelect={onAssignmentSelect}
            darkMode={darkMode}
            getProjectDocumentCount={getProjectDocumentCount}
            getAssignmentDocumentCount={getAssignmentDocumentCount}
          />
        </div>
      </ScrollArea>

      {/* Storage Indicator */}
      <StorageIndicator
        usedBytes={storageUsed}
        totalBytes={10 * 1024 * 1024 * 1024} // 10 GB default
        darkMode={darkMode}
      />
    </div>
  );
}
