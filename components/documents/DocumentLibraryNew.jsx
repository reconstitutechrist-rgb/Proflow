import React, { useState, useCallback, useEffect } from 'react';
import { Search, List, LayoutGrid, Upload, X, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// Hooks
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { useDocumentActivity } from '@/hooks/useDocumentActivity';
import { useDocumentActions } from '@/hooks/useDocumentActions';
import { useDocumentFilters, QUICK_FILTERS } from '@/hooks/useDocumentFilters';

// Components
import DocumentSidebar from './DocumentSidebar';
import DocumentList from './DocumentList';
import DocumentPreviewPanel from './DocumentPreviewPanel';
import DocumentActivityPanel from './DocumentActivityPanel';

// Existing feature components
import DocumentUploader from '@/features/documents/DocumentUploader';
import DocumentPreview from '@/features/documents/DocumentPreview';
import DocumentRestoreDialog from '@/features/documents/DocumentRestoreDialog';
import MoveToFolderDialog from '@/components/dialogs/MoveToFolderDialog';

/**
 * DocumentLibraryNew - Main redesigned document library component
 * @param {Object} props
 * @param {Array} props.documents - All documents
 * @param {Array} props.projects - All projects
 * @param {Array} props.assignments - All assignments
 * @param {Object} props.currentUser - Current logged-in user
 * @param {Function} props.onDeleteDocument - Legacy delete handler (for permanent delete)
 * @param {Function} props.onRefresh - Callback to refresh document list
 */
export default function DocumentLibraryNew({
  documents = [],
  projects = [],
  assignments = [],
  currentUser,
  onDeleteDocument,
  onRefresh,
}) {
  const { currentWorkspaceId } = useWorkspace();

  // UI State
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('proflow_doc_view_mode') || 'grid';
    }
    return 'grid';
  });
  const [showActivityFilter, setShowActivityFilter] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('proflow_doc_dark_mode') === 'true';
    }
    return false;
  });

  // Dialog states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [fullPreviewDoc, setFullPreviewDoc] = useState(null);
  const [moveDialogDoc, setMoveDialogDoc] = useState(null);
  const [restoreDialogDoc, setRestoreDialogDoc] = useState(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState(null);
  const [permanentDeleteDoc, setPermanentDeleteDoc] = useState(null);
  const [restoreConfirmDoc, setRestoreConfirmDoc] = useState(null);

  // Initialize hooks
  const {
    activities,
    loading: activityLoading,
    logActivity,
    refreshActivities,
  } = useDocumentActivity({
    workspaceId: currentWorkspaceId,
    currentUser,
  });

  const {
    filters,
    setQuickFilter,
    setSelectedProject,
    setSelectedAssignment,
    setSearchQuery,
    clearFilters,
    filteredDocuments,
    documentCounts,
    hasActiveFilters,
    getProjectDocumentCount,
    getAssignmentDocumentCount,
  } = useDocumentFilters({
    documents,
    workspaceId: currentWorkspaceId,
  });

  const {
    toggleStar,
    softDeleteDocument,
    restoreDocument,
    permanentDeleteDocument,
    logDownload,
    isStarring,
    isDeleting,
    isRestoring,
  } = useDocumentActions({
    workspaceId: currentWorkspaceId,
    currentUser,
    onRefresh: () => {
      if (onRefresh) onRefresh();
      refreshActivities();
    },
    logActivity,
  });

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('proflow_doc_view_mode', viewMode);
  }, [viewMode]);

  // Persist dark mode
  useEffect(() => {
    localStorage.setItem('proflow_doc_dark_mode', String(darkMode));
  }, [darkMode]);

  // Clear selected doc when filters change
  useEffect(() => {
    setSelectedDoc(null);
  }, [filters.quickFilter, filters.selectedProject, filters.selectedAssignment]);

  // Handlers
  const handleThemeToggle = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const handleNewDocument = useCallback(() => {
    setIsUploadOpen(true);
  }, []);

  const handleUploadComplete = useCallback(() => {
    setIsUploadOpen(false);
    if (onRefresh) onRefresh();
    refreshActivities();
  }, [onRefresh, refreshActivities]);

  const handleSelectDoc = useCallback((doc) => {
    setSelectedDoc(doc);
  }, []);

  const handleOpenFullPreview = useCallback((doc) => {
    setFullPreviewDoc(doc);
  }, []);

  const handleStarDoc = useCallback(
    async (doc) => {
      await toggleStar(doc);
    },
    [toggleStar]
  );

  const handleDeleteDoc = useCallback((doc) => {
    setDeleteConfirmDoc(doc);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmDoc) return;
    await softDeleteDocument(deleteConfirmDoc);
    setDeleteConfirmDoc(null);
    if (selectedDoc?.id === deleteConfirmDoc.id) {
      setSelectedDoc(null);
    }
  }, [deleteConfirmDoc, softDeleteDocument, selectedDoc]);

  const handleRestoreDoc = useCallback((doc) => {
    setRestoreConfirmDoc(doc);
  }, []);

  const handleConfirmRestore = useCallback(async () => {
    if (!restoreConfirmDoc) return;
    await restoreDocument(restoreConfirmDoc);
    setRestoreConfirmDoc(null);
    if (selectedDoc?.id === restoreConfirmDoc.id) {
      setSelectedDoc(null);
    }
  }, [restoreConfirmDoc, restoreDocument, selectedDoc]);

  const handleMoveDoc = useCallback((doc) => {
    setMoveDialogDoc(doc);
  }, []);

  const handleDownloadDoc = useCallback(
    async (doc) => {
      if (!doc?.file_url) {
        toast.error('No file available to download');
        return;
      }

      // Force download using fetch and blob
      try {
        const response = await fetch(doc.file_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.file_name || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        await logDownload(doc);
      } catch (error) {
        console.error('Download failed:', error);
        toast.error('Download failed');
      }
    },
    [logDownload]
  );

  const handlePermanentDelete = useCallback((doc) => {
    setPermanentDeleteDoc(doc);
  }, []);

  const handleConfirmPermanentDelete = useCallback(async () => {
    if (!permanentDeleteDoc) return;
    await permanentDeleteDocument(permanentDeleteDoc);
    setPermanentDeleteDoc(null);
    if (selectedDoc?.id === permanentDeleteDoc.id) {
      setSelectedDoc(null);
    }
  }, [permanentDeleteDoc, permanentDeleteDocument, selectedDoc]);

  const isViewingTrash = filters.quickFilter === QUICK_FILTERS.TRASH;

  return (
    <div className={cn('h-full flex', darkMode ? 'bg-[#0F0F10]' : 'bg-gray-50')}>
      {/* Sidebar */}
      <DocumentSidebar
        documents={documents}
        projects={projects}
        assignments={assignments}
        filters={filters}
        documentCounts={documentCounts}
        onQuickFilterChange={setQuickFilter}
        onProjectSelect={setSelectedProject}
        onAssignmentSelect={setSelectedAssignment}
        darkMode={darkMode}
        onThemeToggle={handleThemeToggle}
        onNewDocument={handleNewDocument}
        getProjectDocumentCount={getProjectDocumentCount}
        getAssignmentDocumentCount={getAssignmentDocumentCount}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className={cn(
            'flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b',
            darkMode ? 'border-white/10 bg-[#0F0F10]' : 'border-gray-200 bg-white'
          )}
        >
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
                darkMode ? 'text-gray-500' : 'text-gray-400'
              )}
            />
            <Input
              placeholder="Search documents..."
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'pl-10',
                darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500' : ''
              )}
            />
          </div>

          {/* Filter indicator */}
          {hasActiveFilters && (
            <Badge
              variant="secondary"
              className={cn(
                'cursor-pointer',
                darkMode ? 'bg-white/10 text-gray-300 hover:bg-white/20' : ''
              )}
              onClick={clearFilters}
            >
              <X className="w-3 h-3 mr-1" />
              Clear filters
            </Badge>
          )}

          {/* View mode toggle */}
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className={cn('h-9 w-9', darkMode && viewMode !== 'grid' ? 'hover:bg-white/10' : '')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className={cn('h-9 w-9', darkMode && viewMode !== 'list' ? 'hover:bg-white/10' : '')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Upload button */}
          <Button onClick={handleNewDocument}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </header>

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Document list */}
          <div className="flex-1 overflow-hidden">
            <DocumentList
              documents={filteredDocuments}
              viewMode={viewMode}
              selectedDoc={selectedDoc}
              onSelectDoc={handleSelectDoc}
              onStarDoc={handleStarDoc}
              onDeleteDoc={isViewingTrash ? handlePermanentDelete : handleDeleteDoc}
              onMoveDoc={handleMoveDoc}
              onRestoreDoc={handleRestoreDoc}
              onOpenDoc={handleOpenFullPreview}
              projects={projects}
              darkMode={darkMode}
              isTrash={isViewingTrash}
            />
          </div>

          {/* Third column - Preview Panel (when doc selected) or Activity Panel (default) */}
          {selectedDoc ? (
            <DocumentPreviewPanel
              document={selectedDoc}
              projects={projects}
              assignments={assignments}
              onClose={() => setSelectedDoc(null)}
              onOpen={() => handleOpenFullPreview(selectedDoc)}
              onStar={() => handleStarDoc(selectedDoc)}
              onDelete={() =>
                isViewingTrash ? handlePermanentDelete(selectedDoc) : handleDeleteDoc(selectedDoc)
              }
              onDownload={() => handleDownloadDoc(selectedDoc)}
              onMove={() => handleMoveDoc(selectedDoc)}
              darkMode={darkMode}
            />
          ) : (
            <DocumentActivityPanel
              activities={activities}
              currentUserEmail={currentUser?.email}
              showOnlyMine={showActivityFilter}
              onToggleFilter={setShowActivityFilter}
              loading={activityLoading}
              darkMode={darkMode}
            />
          )}
        </div>
      </main>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <DocumentUploader
            assignments={assignments}
            projects={projects}
            currentUser={currentUser}
            selectedFolderPath="/"
            onUploadComplete={handleUploadComplete}
            existingDocuments={documents}
          />
        </DialogContent>
      </Dialog>

      {/* Full Preview Modal */}
      {fullPreviewDoc && (
        <Dialog open={!!fullPreviewDoc} onOpenChange={() => setFullPreviewDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
            <DocumentPreview
              document={fullPreviewDoc}
              assignments={assignments}
              currentUser={currentUser}
              onClose={() => setFullPreviewDoc(null)}
              onUpdate={() => {
                if (onRefresh) onRefresh();
                refreshActivities();
              }}
              onDelete={(e, doc) => {
                setFullPreviewDoc(null);
                handleDeleteDoc(doc);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Move to Folder Dialog */}
      <MoveToFolderDialog
        document={moveDialogDoc}
        documents={documents}
        isOpen={!!moveDialogDoc}
        onClose={() => setMoveDialogDoc(null)}
        onSuccess={() => {
          setMoveDialogDoc(null);
          if (onRefresh) onRefresh();
          refreshActivities();
        }}
      />

      {/* Restore Dialog (for outdated docs) */}
      <DocumentRestoreDialog
        document={restoreDialogDoc}
        isOpen={!!restoreDialogDoc}
        onClose={() => setRestoreDialogDoc(null)}
        onSuccess={() => {
          setRestoreDialogDoc(null);
          if (onRefresh) onRefresh();
          refreshActivities();
        }}
      />

      {/* Soft Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmDoc} onOpenChange={() => setDeleteConfirmDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteConfirmDoc?.title}" will be moved to trash. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={!!permanentDeleteDoc} onOpenChange={() => setPermanentDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete?</AlertDialogTitle>
            <AlertDialogDescription>
              "{permanentDeleteDoc?.title}" will be permanently deleted. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPermanentDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore from Trash Confirmation */}
      <AlertDialog open={!!restoreConfirmDoc} onOpenChange={() => setRestoreConfirmDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Document?</AlertDialogTitle>
            <AlertDialogDescription>
              "{restoreConfirmDoc?.title}" will be restored from trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore} disabled={isRestoring}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
