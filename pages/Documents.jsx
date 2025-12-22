import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, List, LayoutGrid, FileText, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { createPageUrl } from '@/lib/utils';

import DocumentUploader from '@/features/documents/DocumentUploader';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');

  const MAX_RETRIES = 3;
  const retryTimeoutRef = useRef(null); // Ref to store the timeout ID for rate limit retries

  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();
  const navigate = useNavigate();

  const loadDocuments = useCallback(
    async (currentRetry = 0) => {
      if (!currentWorkspaceId) return;

      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      try {
        setLoading(true);

        const user = await db.auth.me();
        setCurrentUser(user);

        // Longer delays with exponential backoff for internal calls
        const baseDelay = 500; // Increased base delay
        const delay = baseDelay * Math.pow(2, currentRetry);
        await new Promise((resolve) => setTimeout(resolve, delay));

        const assignmentsData = await db.entities.Assignment.filter({
          workspace_id: currentWorkspaceId,
        });
        setAssignments(assignmentsData || []);

        await new Promise((resolve) => setTimeout(resolve, delay));

        // Fetch projects for current workspace AND legacy projects without workspace_id
        const [workspaceProjects, allProjects] = await Promise.all([
          db.entities.Project.filter({ workspace_id: currentWorkspaceId }),
          db.entities.Project.list('-updated_date', 100),
        ]);

        // Include legacy projects that don't have a workspace_id set
        const legacyProjects = (allProjects || []).filter((p) => !p.workspace_id);
        const combinedProjects = [...(workspaceProjects || []), ...legacyProjects];

        // Remove duplicates (in case any project appears in both)
        const uniqueProjects = combinedProjects.filter(
          (project, index, self) => index === self.findIndex((p) => p.id === project.id)
        );

        setProjects(uniqueProjects);

        await new Promise((resolve) => setTimeout(resolve, delay));

        // Fetch documents for current workspace AND legacy documents without workspace_id
        const [workspaceDocs, allDocs] = await Promise.all([
          db.entities.Document.filter({ workspace_id: currentWorkspaceId }, '-created_date'),
          db.entities.Document.list('-created_date', 200),
        ]);

        // Include legacy documents that don't have a workspace_id set
        const legacyDocs = (allDocs || []).filter((d) => !d.workspace_id);
        const combinedDocs = [...(workspaceDocs || []), ...legacyDocs];

        // Remove duplicates
        const uniqueDocs = combinedDocs.filter(
          (doc, index, self) => index === self.findIndex((d) => d.id === doc.id)
        );

        setDocuments(uniqueDocs);
      } catch (error) {
        console.error('Error loading data:', error);

        if (error.message && error.message.includes('Rate limit')) {
          if (currentRetry < MAX_RETRIES) {
            const retryDelay = 5000 * Math.pow(2, currentRetry); // 5s, 10s, 20s
            toast.error(`Rate limit reached. Retrying in ${retryDelay / 1000} seconds...`, {
              duration: retryDelay,
            });

            retryTimeoutRef.current = setTimeout(() => {
              // No need to update retryAttempt state here as currentRetry handles the recursion
              loadDocuments(currentRetry + 1);
            }, retryDelay);
          } else {
            toast.error('Rate limit exceeded. Please refresh the page manually.', {
              duration: 10000,
              action: {
                label: 'Refresh',
                onClick: () => window.location.reload(),
              },
            });
          }
        } else {
          // Provide helpful error message with context
          const errorMessage = error.message?.includes('network')
            ? 'Network error. Check your internet connection and try again.'
            : error.message?.includes('permission') || error.message?.includes('access')
              ? 'You may not have permission to view these documents. Contact your workspace admin.'
              : 'Failed to load documents. Please try refreshing the page.';

          toast.error(errorMessage, {
            duration: 5000,
            action: {
              label: 'Retry',
              onClick: () => loadDocuments(0),
            },
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [currentWorkspaceId]
  );

  useEffect(() => {
    if (currentWorkspaceId && !workspaceLoading) {
      loadDocuments(0); // Start with 0 retries
    }

    // Cleanup function to clear any pending timeouts when the component unmounts
    // or currentWorkspaceId changes.
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [currentWorkspaceId, workspaceLoading, loadDocuments]); // Depend on workspace change and loading state

  const handleUploadComplete = () => {
    setIsUploadOpen(false);
    loadDocuments(0); // Reload documents after upload, starting retry count at 0
    toast.success('Document(s) uploaded successfully');
  };

  const handleDocumentClick = (doc) => {
    setSelectedDocument(doc);
  };

  const handleEditDocument = (doc) => {
    navigate(`${createPageUrl('DocumentsHub')}?tab=studio&id=${doc.id}`);
  };

  const getAssignmentNames = (assignmentIds) => {
    if (!assignmentIds || assignmentIds.length === 0) return 'Unassigned';
    const names = assignmentIds.map((id) => {
      const assignment = assignments.find((a) => a.id === id);
      return assignment ? assignment.name : 'Unknown Assignment';
    });
    return names.join(', ');
  };

  const getProjectName = (projectId) => {
    if (!projectId) return 'No Project';
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const filteredDocuments = documents
    .filter((doc) => {
      if (doc.document_type === 'folder_placeholder') return false;

      const matchesSearch =
        searchQuery === '' ||
        doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAssignment =
        selectedAssignment === 'all' ||
        (selectedAssignment === 'unassigned' &&
          (!doc.assigned_to_assignments || doc.assigned_to_assignments.length === 0)) ||
        (doc.assigned_to_assignments && doc.assigned_to_assignments.includes(selectedAssignment));

      const matchesProject =
        selectedProject === 'all' ||
        (selectedProject === 'no-project' && !doc.assigned_to_project) ||
        doc.assigned_to_project === selectedProject;

      const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;

      return matchesSearch && matchesAssignment && matchesProject && matchesType;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_date);
      const dateB = new Date(b.created_date);
      return dateB.getTime() - dateA.getTime();
    });

  return (
    <div className="h-full flex flex-col p-6 sm:p-8 md:p-10">
      <div className="flex-shrink-0 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-light text-gray-900 dark:text-white tracking-tight">
              Documents
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {loading
                ? 'Loading...'
                : `${filteredDocuments.length} ${
                    filteredDocuments.length === 1 ? 'document' : 'documents'
                  }`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="border-gray-200 dark:border-gray-800"
            >
              {viewMode === 'grid' ? (
                <List className="w-4 h-4" />
              ) : (
                <LayoutGrid className="w-4 h-4" />
              )}
            </Button>
            <Button
              onClick={() => setIsUploadOpen(true)}
              className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-200 dark:border-gray-800 focus:border-gray-400 dark:focus:border-gray-600 transition-colors bg-white dark:bg-gray-900"
            />
          </div>

          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full sm:w-[160px] border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="no-project">No Project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
            <SelectTrigger className="w-full sm:w-[180px] border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <SelectValue placeholder="All Assignments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignments</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {assignments.map((assignment) => (
                <SelectItem key={assignment.id} value={assignment.id}>
                  {assignment.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px] border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="specification">Specification</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="report">Report</SelectItem>
              <SelectItem value="presentation">Presentation</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-6 sm:-mx-8 md:-mx-10 px-6 sm:px-8 md:px-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No documents found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery ||
              typeFilter !== 'all' ||
              selectedAssignment !== 'all' ||
              selectedProject !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by uploading your first document'}
            </p>
            {!(
              searchQuery ||
              typeFilter !== 'all' ||
              selectedAssignment !== 'all' ||
              selectedProject !== 'all'
            ) && (
              <Button
                onClick={() => setIsUploadOpen(true)}
                variant="outline"
                className="border-gray-300 dark:border-gray-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6'
                : 'space-y-3 pb-6'
            }
          >
            <AnimatePresence mode="popLayout">
              {filteredDocuments.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  layout
                >
                  {viewMode === 'grid' ? (
                    <Card
                      className="group cursor-pointer border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-900 h-full flex flex-col justify-between"
                      onClick={() => handleDocumentClick(doc)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                        </div>

                        <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors line-clamp-2 mb-2">
                          {doc.title}
                        </h3>

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(doc.created_date).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card
                      className="group cursor-pointer border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-900"
                      onClick={() => handleDocumentClick(doc)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors truncate">
                              {doc.title}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(doc.created_date).toLocaleDateString()}
                            </p>
                          </div>

                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Dialog open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          {selectedDocument && (
            <div className="flex flex-col">
              <DialogHeader className="pb-4 border-b">
                <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedDocument.title}
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-2">
                  <FileText className="w-4 h-4" />
                  <span>{selectedDocument.document_type || 'General'}</span>
                  <span>&bull;</span>
                  <span>{new Date(selectedDocument.created_date).toLocaleDateString()}</span>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {selectedDocument.description && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                      Description
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      {selectedDocument.description}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">
                    Document Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">File Name:</p>
                      <p className="text-gray-900 dark:text-white">{selectedDocument.file_name}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Type:</p>
                      <p className="text-gray-900 dark:text-white">
                        {selectedDocument.document_type || 'General'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Project:</p>
                      <p className="text-gray-900 dark:text-white">
                        {getProjectName(selectedDocument.assigned_to_project)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Assignment:</p>
                      <p className="text-gray-900 dark:text-white">
                        {getAssignmentNames(selectedDocument.assigned_to_assignments)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Created By:</p>
                      <p className="text-gray-900 dark:text-white">
                        {selectedDocument.created_by || 'N/A'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-medium text-gray-600 dark:text-gray-400">Last Modified:</p>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(
                          selectedDocument.updated_date || selectedDocument.created_date
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleEditDocument(selectedDocument)}
                    className="flex-1"
                  >
                    Edit Document
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedDocument(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
    </div>
  );
}
