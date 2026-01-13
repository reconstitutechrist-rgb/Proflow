import { useState, useEffect, useCallback } from 'react';
import { db } from '@/api/db';
import { Document } from '@/api/entities';
import { Assignment } from '@/api/entities';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import DocumentLibraryNew from '@/components/documents/DocumentLibraryNew';

export default function DocumentsHub() {
  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  // Data
  const [documents, setDocuments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  // Load data
  const loadData = useCallback(async () => {
    if (!currentWorkspaceId) return;

    try {
      setLoading(true);

      const [
        workspaceAssignments,
        allAssignmentsList,
        workspaceProjects,
        allProjectsList,
        workspaceDocuments,
        allDocumentsList,
        user,
      ] = await Promise.all([
        Assignment.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
        Assignment.list('-updated_date', 100),
        db.entities.Project.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
        db.entities.Project.list('-updated_date', 100),
        Document.filter({ workspace_id: currentWorkspaceId }, '-created_date'),
        Document.list('-created_date', 200),
        db.auth.me(),
      ]);

      // Consolidate assignments
      const legacyAssignments = (allAssignmentsList || []).filter((a) => !a.workspace_id);
      const combinedAssignments = [...(workspaceAssignments || []), ...legacyAssignments];
      const uniqueAssignments = combinedAssignments.filter(
        (assignment, index, self) => index === self.findIndex((a) => a.id === assignment.id)
      );
      setAssignments(uniqueAssignments);

      // Consolidate projects
      const legacyProjects = (allProjectsList || []).filter((p) => !p.workspace_id);
      const combinedProjects = [...(workspaceProjects || []), ...legacyProjects];
      const uniqueProjects = combinedProjects.filter(
        (project, index, self) => index === self.findIndex((p) => p.id === project.id)
      );
      setProjects(uniqueProjects);

      // Consolidate documents - include legacy documents without workspace_id
      const legacyDocuments = (allDocumentsList || []).filter((d) => !d.workspace_id);
      const combinedDocuments = [...(workspaceDocuments || []), ...legacyDocuments];
      const uniqueDocuments = combinedDocuments.filter(
        (doc, index, self) => index === self.findIndex((d) => d.id === doc.id)
      );

      setDocuments(uniqueDocuments);
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (currentWorkspaceId && !workspaceLoading) {
      loadData();
    }
  }, [currentWorkspaceId, workspaceLoading, loadData]);

  const handleDeleteDocument = (e, doc) => {
    e.stopPropagation();
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;
    try {
      await Document.delete(documentToDelete.id);
      toast.success('Document deleted');
      loadData();
    } catch {
      toast.error('Failed to delete document');
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <DocumentLibraryNew
          documents={documents}
          projects={projects}
          assignments={assignments}
          currentUser={currentUser}
          onDeleteDocument={handleDeleteDocument}
          onRefresh={loadData}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.title}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
