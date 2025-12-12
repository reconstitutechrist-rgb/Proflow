import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Eye,
  Download,
  Upload,
  X,
  Plus,
  Folder,
  FolderOpen,
  Search,
  List,
  LayoutGrid,
  ChevronRight,
  Target,
  FileUp,
  Trash2,
  MoreVertical,
  FolderKanban,
  RotateCcw,
  Archive,
  FolderInput,
  Edit3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DocumentUploader from '@/features/documents/DocumentUploader';
import FolderStructure from '@/components/common/FolderStructure';
import ProjectAssignmentStructure from '@/components/common/ProjectAssignmentStructure';
import DocumentViewToggle from '@/components/common/DocumentViewToggle';
import OutdatedDocumentBadge from '@/components/documents/OutdatedDocumentBadge';
import DocumentRestoreDialog from '@/features/documents/DocumentRestoreDialog';
import MoveToFolderDialog from '@/components/dialogs/MoveToFolderDialog';
import DocumentPreview from '@/features/documents/DocumentPreview';
import { OUTDATED_FOLDER } from '@/hooks';

export default function DocumentLibrary({
  documents,
  projects,
  assignments,
  currentUser,
  onEditDocument,
  onDeleteDocument,
  onCreateDocument,
  onRefresh,
}) {
  // Local UI State
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState('all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [sidebarViewMode, setSidebarViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('proflow_document_view_mode') || 'folders';
    }
    return 'folders';
  });
  const [projectAssignmentFilter, setProjectAssignmentFilter] = useState({
    type: null, // 'project' | 'assignment' | 'unlinked'
    id: null,
  });
  const [selectedFolderPath, setSelectedFolderPath] = useState(null);
  const [restoreDialogDoc, setRestoreDialogDoc] = useState(null); // NEW: Document to restore
  const [showOutdated, setShowOutdated] = useState(false); // NEW: Toggle to show outdated docs
  const [moveDialogDoc, setMoveDialogDoc] = useState(null); // Document to move to folder
  const [previewDoc, setPreviewDoc] = useState(null); // Document to preview

  // Persist sidebar view mode
  useEffect(() => {
    localStorage.setItem('proflow_document_view_mode', sidebarViewMode);
  }, [sidebarViewMode]);

  // Helper to get project name by ID
  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || null;
  };

  // Check if viewing the Outdated folder
  const isViewingOutdatedFolder = selectedFolderPath === OUTDATED_FOLDER;

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    if (doc.document_type === 'folder_placeholder') return false;

    // NEW: Handle outdated documents filter
    // Show outdated docs only when viewing the Outdated folder or when showOutdated is true
    if (doc.is_outdated && !isViewingOutdatedFolder && !showOutdated) {
      return false;
    }
    // When viewing Outdated folder, only show outdated docs
    if (isViewingOutdatedFolder && !doc.is_outdated) {
      return false;
    }

    const matchesSearch =
      !searchQuery ||
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAssignment =
      selectedAssignmentFilter === 'all' ||
      (selectedAssignmentFilter === 'unassigned' &&
        (!doc.assigned_to_assignments || doc.assigned_to_assignments.length === 0)) ||
      doc.assigned_to_assignments?.includes(selectedAssignmentFilter);
    const matchesProject =
      selectedProjectFilter === 'all' ||
      (selectedProjectFilter === 'unassigned' && !doc.assigned_to_project) ||
      doc.assigned_to_project === selectedProjectFilter;
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;

    // Sidebar filter: Folder path filter (when in folders view)
    // Skip folder path check when viewing Outdated folder (docs have different original paths)
    const matchesFolderPath =
      isViewingOutdatedFolder ||
      !selectedFolderPath ||
      sidebarViewMode !== 'folders' ||
      (doc.folder_path || '/') === selectedFolderPath ||
      (doc.folder_path || '/').startsWith(selectedFolderPath + '/');

    // Sidebar filter: Project/Assignment filter (when in projects view)
    let matchesSidebarFilter = true;
    if (sidebarViewMode === 'projects' && projectAssignmentFilter.type) {
      if (projectAssignmentFilter.type === 'project') {
        matchesSidebarFilter = doc.assigned_to_project === projectAssignmentFilter.id;
      } else if (projectAssignmentFilter.type === 'assignment') {
        matchesSidebarFilter = doc.assigned_to_assignments?.includes(projectAssignmentFilter.id);
      } else if (projectAssignmentFilter.type === 'unlinked') {
        matchesSidebarFilter =
          !doc.assigned_to_project &&
          (!doc.assigned_to_assignments || doc.assigned_to_assignments.length === 0);
      }
    }

    return (
      matchesSearch &&
      matchesAssignment &&
      matchesProject &&
      matchesType &&
      matchesFolderPath &&
      matchesSidebarFilter
    );
  });

  const handleUploadComplete = () => {
    setIsUploadOpen(false);
    if (onRefresh) onRefresh();
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 border-r bg-gray-50 dark:bg-gray-900/50 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-white dark:bg-gray-900">
          <DocumentViewToggle
            value={sidebarViewMode}
            onChange={(v) => {
              setSidebarViewMode(v);
              // Clear filters when switching views
              setSelectedFolderPath(null);
              setProjectAssignmentFilter({ type: null, id: null });
            }}
          />
        </div>
        <div className="flex-1 overflow-auto p-4">
          {sidebarViewMode === 'folders' ? (
            <FolderStructure
              documents={documents}
              onFolderSelect={(path) => setSelectedFolderPath(path)}
              onRefresh={onRefresh}
            />
          ) : (
            <ProjectAssignmentStructure
              documents={documents}
              projects={projects}
              assignments={assignments}
              selectedItem={projectAssignmentFilter}
              onItemSelect={(type, id) => setProjectAssignmentFilter({ type, id })}
            />
          )}
        </div>
        {/* Clear Filter Button */}
        {(selectedFolderPath || projectAssignmentFilter.type) && (
          <div className="p-4 border-t bg-white dark:bg-gray-900">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setSelectedFolderPath(null);
                setProjectAssignmentFilter({ type: null, id: null });
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Clear Filter
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Active Filter Indicator */}
        {(selectedFolderPath || projectAssignmentFilter.type) && (
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              {sidebarViewMode === 'folders' && selectedFolderPath && (
                <>
                  <Folder className="w-3 h-3 mr-2" />
                  {selectedFolderPath === '/' ? 'Root' : selectedFolderPath.split('/').pop()}
                </>
              )}
              {sidebarViewMode === 'projects' && projectAssignmentFilter.type === 'project' && (
                <>
                  <FolderKanban className="w-3 h-3 mr-2" />
                  {projects.find((p) => p.id === projectAssignmentFilter.id)?.name || 'Project'}
                </>
              )}
              {sidebarViewMode === 'projects' && projectAssignmentFilter.type === 'assignment' && (
                <>
                  <Target className="w-3 h-3 mr-2" />
                  {assignments.find((a) => a.id === projectAssignmentFilter.id)?.title ||
                    assignments.find((a) => a.id === projectAssignmentFilter.id)?.name ||
                    'Assignment'}
                </>
              )}
              {sidebarViewMode === 'projects' && projectAssignmentFilter.type === 'unlinked' && (
                <>
                  <FileText className="w-3 h-3 mr-2" />
                  Unlinked Documents
                </>
              )}
            </Badge>
            <span className="text-sm text-gray-500">
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="unassigned">No Project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedAssignmentFilter} onValueChange={setSelectedAssignmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Assignments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignments</SelectItem>
              <SelectItem value="unassigned">No Assignment</SelectItem>
              {assignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name || a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="specification">Specification</SelectItem>
              <SelectItem value="report">Report</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? (
              <List className="w-4 h-4" />
            ) : (
              <LayoutGrid className="w-4 h-4" />
            )}
          </Button>
          <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>

        {/* Documents Grid/List */}
        <ScrollArea className="flex-1">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No documents found
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Try adjusting filters or create a new document
              </p>
              <Button onClick={onCreateDocument} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create Document
              </Button>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-2'
              }
            >
              <AnimatePresence mode="popLayout">
                {filteredDocuments.map((doc) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Card
                      className="cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all group relative"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <CardContent
                        className={viewMode === 'grid' ? 'p-4' : 'p-3 flex items-center gap-4'}
                      >
                        {/* Grid view layout */}
                        {viewMode === 'grid' && (
                          <>
                            <div className="flex items-start justify-between mb-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-gray-500" />
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditDocument(doc);
                                    }}
                                  >
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    Edit in Studio
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewDoc(doc);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Quick Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMoveDialogDoc(doc);
                                    }}
                                  >
                                    <FolderInput className="w-4 h-4 mr-2" />
                                    Move to Folder
                                  </DropdownMenuItem>
                                  {doc.is_outdated && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRestoreDialogDoc(doc);
                                        }}
                                        className="text-green-600 focus:text-green-600"
                                      >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Restore
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => onDeleteDocument(e, doc)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                  {doc.title}
                                </h3>
                                {doc.is_outdated && (
                                  <OutdatedDocumentBadge document={doc} size="small" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <p className="text-xs text-gray-500">
                                  {new Date(doc.created_date).toLocaleDateString()}
                                </p>
                                {doc.assigned_to_project &&
                                  getProjectName(doc.assigned_to_project) && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs px-1.5 py-0 h-5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                    >
                                      <FolderKanban className="w-3 h-3 mr-1" />
                                      {getProjectName(doc.assigned_to_project)}
                                    </Badge>
                                  )}
                              </div>
                            </div>
                          </>
                        )}
                        {/* List view layout */}
                        {viewMode === 'list' && (
                          <>
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                  {doc.title}
                                </h3>
                                {doc.is_outdated && (
                                  <OutdatedDocumentBadge document={doc} size="small" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <p className="text-xs text-gray-500">
                                  {new Date(doc.created_date).toLocaleDateString()}
                                </p>
                                {doc.assigned_to_project &&
                                  getProjectName(doc.assigned_to_project) && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs px-1.5 py-0 h-5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                    >
                                      <FolderKanban className="w-3 h-3 mr-1" />
                                      {getProjectName(doc.assigned_to_project)}
                                    </Badge>
                                  )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditDocument(doc);
                                  }}
                                >
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  Edit in Studio
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewDoc(doc);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Quick Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMoveDialogDoc(doc);
                                  }}
                                >
                                  <FolderInput className="w-4 h-4 mr-2" />
                                  Move to Folder
                                </DropdownMenuItem>
                                {doc.is_outdated && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRestoreDialogDoc(doc);
                                      }}
                                      className="text-green-600 focus:text-green-600"
                                    >
                                      <RotateCcw className="w-4 h-4 mr-2" />
                                      Restore
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => onDeleteDocument(e, doc)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </div>

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

      {/* Restore Document Dialog */}
      <DocumentRestoreDialog
        document={restoreDialogDoc}
        isOpen={!!restoreDialogDoc}
        onClose={() => setRestoreDialogDoc(null)}
        onSuccess={() => {
          setRestoreDialogDoc(null);
          if (onRefresh) onRefresh();
        }}
      />

      {/* Move to Folder Dialog */}
      <MoveToFolderDialog
        document={moveDialogDoc}
        documents={documents}
        isOpen={!!moveDialogDoc}
        onClose={() => setMoveDialogDoc(null)}
        onSuccess={() => {
          setMoveDialogDoc(null);
          if (onRefresh) onRefresh();
        }}
      />

      {/* Document Preview Dialog */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
            <DocumentPreview
              document={previewDoc}
              assignments={assignments}
              currentUser={currentUser}
              onClose={() => setPreviewDoc(null)}
              onUpdate={onRefresh}
              onDelete={(e, doc) => {
                setPreviewDoc(null);
                onDeleteDocument(e, doc);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
