import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { useDocumentOutdating } from '@/hooks';
import { toast } from 'sonner';
import { Loader2, RotateCcw, FolderOpen, AlertTriangle, FileText } from 'lucide-react';
import { db } from '@/api/db';

/**
 * Dialog for restoring an outdated document back to active status
 */
export default function DocumentRestoreDialog({ document, isOpen, onClose, onSuccess }) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [replacementDoc, setReplacementDoc] = useState(null);

  const { currentWorkspaceId } = useWorkspace();
  const { restoreDocument } = useDocumentOutdating(currentWorkspaceId);

  // Fetch replacement document info if available
  useEffect(() => {
    const fetchReplacement = async () => {
      if (document?.replaced_by && isOpen) {
        try {
          const replacement = await db.entities.Document.get(document.replaced_by);
          setReplacementDoc(replacement);
        } catch (error) {
          console.error('Error fetching replacement document:', error);
          setReplacementDoc(null);
        }
      } else {
        setReplacementDoc(null);
      }
    };

    fetchReplacement();
  }, [document?.replaced_by, isOpen]);

  const handleRestore = async () => {
    if (!document) {
      toast.error('No document selected');
      return;
    }

    if (!currentWorkspaceId) {
      toast.error('No workspace selected');
      return;
    }

    // Security check
    if (document.workspace_id !== currentWorkspaceId) {
      toast.error('Cannot restore documents from other workspaces');
      return;
    }

    try {
      setIsRestoring(true);

      const result = await restoreDocument(document.id);

      if (result.success) {
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Error restoring document:', error);
      toast.error('Failed to restore document');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleClose = () => {
    if (!isRestoring) {
      onClose();
    }
  };

  if (!document) return null;

  const originalFolder = document.outdated_from_folder || '/';
  const folderDisplay = originalFolder === '/' ? 'Root folder' : originalFolder;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-green-600" />
            Restore Document
          </DialogTitle>
          <DialogDescription>
            Restore this document from outdated status and make it active again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document info */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">{document.title}</p>
              {document.replacement_reason && (
                <p className="text-sm text-muted-foreground">{document.replacement_reason}</p>
              )}
            </div>
          </div>

          {/* Original folder info */}
          <div className="flex items-center gap-2 text-sm">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Will be restored to:</span>
            <span className="font-medium">{folderDisplay}</span>
          </div>

          {/* Replacement document warning */}
          {replacementDoc && (
            <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <span className="font-medium">Note:</span> This document was replaced by{' '}
                <span className="font-medium">&quot;{replacementDoc.title}&quot;</span>. Both
                documents will be active after restoration.
              </AlertDescription>
            </Alert>
          )}

          {/* AI context warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Restoring this document will include it in AI context for the Ask AI feature again.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isRestoring}>
            Cancel
          </Button>
          <Button
            onClick={handleRestore}
            disabled={isRestoring}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isRestoring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore Document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
