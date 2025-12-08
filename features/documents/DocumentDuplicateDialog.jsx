import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';
import { Loader2, Copy } from 'lucide-react';
import { db } from '@/api/db';

export default function DocumentDuplicateDialog({ document, isOpen, onClose, onSuccess }) {
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicating, setDuplicating] = useState(false);

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (document && isOpen) {
      setDuplicateName(`${document.title} (Copy)`);
    }
  }, [document, isOpen]);

  const handleDuplicate = async () => {
    if (!duplicateName.trim()) {
      toast.error('Please enter a name for the duplicate');
      return;
    }

    if (!currentWorkspaceId) {
      toast.error('No workspace selected');
      return;
    }

    // CRITICAL SECURITY CHECK: Validate original document is in current workspace
    if (document.workspace_id !== currentWorkspaceId) {
      toast.error('Cannot duplicate documents from other workspaces');
      console.error('Security violation: Attempted cross-workspace duplication', {
        documentWorkspace: document.workspace_id,
        currentWorkspace: currentWorkspaceId,
      });
      return;
    }

    try {
      setDuplicating(true);

      // Create duplicate with explicit workspace_id
      const duplicateData = {
        ...document,
        // Remove auto-generated fields
        id: undefined,
        created_date: undefined,
        updated_date: undefined,
        created_by: undefined,

        // Set new values
        title: duplicateName,
        workspace_id: currentWorkspaceId, // CRITICAL: Explicitly set workspace_id

        // Clear version history and analysis for fresh start
        version: '1.0',
        version_history: [],
        ai_analysis: {
          ...document.ai_analysis,
          analysis_status: 'pending',
        },

        // Clear embedding cache to force regeneration
        embedding_cache: undefined,
      };

      const newDocument = await db.entities.Document.create(duplicateData);

      toast.success(`Document duplicated successfully as "${duplicateName}"`);
      onClose();
      if (onSuccess) onSuccess(newDocument);
    } catch (error) {
      console.error('Error duplicating document:', error);
      toast.error('Failed to duplicate document');
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Document</DialogTitle>
          <DialogDescription>
            Create a copy of "{document?.title}" in the current workspace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="duplicate-name">New Document Name</Label>
            <Input
              id="duplicate-name"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="Enter name for duplicate..."
            />
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>The duplicate will include:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Document content and metadata</li>
              <li>Tags and categories</li>
              <li>Assignment associations</li>
            </ul>
            <p className="mt-2">Version history and AI analysis will be reset.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={duplicating}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={duplicating}>
            {duplicating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
