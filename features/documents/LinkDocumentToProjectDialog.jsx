import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link, FolderOpen, Loader2 } from 'lucide-react';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';
import { storeProjectDocument, deleteProjectDocumentChunks } from '@/api/projectBrain';

export default function LinkDocumentToProjectDialog({ document, isOpen, onClose, onLinked }) {
  const [selectedProject, setSelectedProject] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const { currentWorkspaceId } = useWorkspace();

  // Effect to reset state when dialog opens and load projects
  useEffect(() => {
    if (isOpen) {
      setSelectedProject(document?.assigned_to_project || null);
      setIsUpdating(false);

      if (currentWorkspaceId) {
        loadProjects();
      }
    }
  }, [isOpen, currentWorkspaceId, document?.id]);

  const loadProjects = async () => {
    if (!currentWorkspaceId) {
      console.warn('No currentWorkspaceId available to load projects.');
      return;
    }

    setLoadingProjects(true);
    try {
      const projectsData = await db.entities.Project.filter(
        {
          workspace_id: currentWorkspaceId,
        },
        '-updated_date'
      );
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  if (!document) {
    return null;
  }

  const handleLink = async () => {
    setIsUpdating(true);

    try {
      await db.entities.Document.update(document.id, {
        assigned_to_project: selectedProject || null,
      });

      const projectName = selectedProject
        ? projects.find((p) => p.id === selectedProject)?.name || 'project'
        : null;

      // Handle Project Brain indexing based on link/unlink action
      if (selectedProject) {
        // Index document in Project Brain when linking to a project (non-blocking)
        // Use extracted_text if available, otherwise use description as fallback
        const documentContent = document.extracted_text || document.description || '';
        if (documentContent) {
          storeProjectDocument(selectedProject, currentWorkspaceId, {
            documentId: document.id,
            documentName: document.title,
            content: documentContent,
            contentHash: null,
          }).catch((err) => console.warn('Failed to index linked document in project brain:', err));
        }
        toast.success(`Document linked to "${projectName}"`);
      } else {
        // When unlinking, delete indexed chunks from old project (non-blocking)
        if (document.assigned_to_project) {
          deleteProjectDocumentChunks(document.id, document.assigned_to_project).catch((err) =>
            console.warn('Failed to remove document from project brain:', err)
          );
        }
        toast.success('Document unlinked from project');
      }

      setTimeout(() => {
        onLinked?.();
        onClose();
      }, 300);
    } catch (error) {
      console.error('Error linking document:', error);
      toast.error(error.message || 'Failed to link document');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
      setSelectedProject(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-purple-600" />
            Link Document to Project
          </DialogTitle>
          <DialogDescription>
            Associate "{document.title}" with a project for better organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Project</label>
            <Select
              value={selectedProject || 'none'}
              onValueChange={(value) => setSelectedProject(value === 'none' ? null : value)}
              disabled={isUpdating || loadingProjects}
            >
              <SelectTrigger>
                {loadingProjects ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading projects...
                  </div>
                ) : (
                  <SelectValue placeholder="Choose a project..." />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project</SelectItem>
                {projects.length === 0 && !loadingProjects && (
                  <SelectItem value="no-available" disabled>
                    No projects available in this workspace.
                  </SelectItem>
                )}
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{project.name}</span>
                      {document.assigned_to_project === project.id && (
                        <Badge variant="secondary" className="ml-2">
                          Current
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={isUpdating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Link className="w-4 h-4 mr-2" />
                {selectedProject ? 'Link to Project' : 'Remove Link'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
