import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { db } from '@/api/db';

export default function AudienceRewriter({ document, onRewriteComplete }) {
  const [rewriting, setRewriting] = useState(false);
  const [targetAudience, setTargetAudience] = useState('general');
  const [showDialog, setShowDialog] = useState(false); // This state is introduced but its opening logic is not provided in the outline

  const { currentWorkspaceId } = useWorkspace();

  const audienceOptions = useMemo(
    () => [
      // Use useMemo for constant data
      {
        value: 'general',
        label: 'General Audience',
        description: 'Clear and accessible to everyone',
      },
      {
        value: 'technical',
        label: 'Technical Experts',
        description: 'Detailed and technical language',
      },
      { value: 'executive', label: 'Executives', description: 'High-level and strategic' },
      { value: 'clients', label: 'Clients/Customers', description: 'Professional and persuasive' },
      { value: 'students', label: 'Students/Learners', description: 'Educational and explanatory' },
      { value: 'investors', label: 'Investors', description: 'Business-focused with ROI emphasis' },
    ],
    []
  );

  const handleRewrite = useCallback(async () => {
    if (!document || !currentWorkspaceId) {
      toast.error('No document or workspace selected.');
      return;
    }

    // CRITICAL: Validate document is in current workspace
    if (document.workspace_id !== currentWorkspaceId) {
      toast.error('Cannot rewrite documents from other workspaces');
      console.error('Security violation: Cross-workspace document rewrite attempt');
      return;
    }

    try {
      setRewriting(true);

      const strippedContent = (document.content || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const selectedOption = audienceOptions.find((opt) => opt.value === targetAudience);

      const prompt = `Rewrite this document for a specific target audience.

Original Document:
Title: ${document.title}
Content: ${strippedContent}

Target Audience: ${selectedOption?.label}
Requirements: ${selectedOption?.description}

Rewrite the content to be appropriate for this audience while maintaining the core information and message. Adjust the tone, complexity, and focus as needed.

Return the rewritten content as HTML with proper formatting.`;

      // Assuming db.integrations.Core.InvokeLLM is accessible
      const response = await db.integrations.Core.InvokeLLM({
        prompt: prompt,
      });

      if (!response || response.trim().length === 0) {
        throw new Error('AI returned an empty or invalid response.');
      }

      // CRITICAL: Update document while maintaining workspace_id
      // Assuming db.entities.Document.update is accessible
      await db.entities.Document.update(document.id, {
        content: response,
        workspace_id: currentWorkspaceId, // CRITICAL: Maintain workspace_id
        version: `${parseFloat(document.version || '1.0') + 0.1}`,
        version_history: [
          {
            version: document.version, // This should be the version *before* the current change
            content: document.content, // This should be the content *before* the current change
            created_date: new Date().toISOString(),
            created_by: document.created_by, // Assuming document has created_by
            change_notes: `Rewritten for ${selectedOption?.label} audience`,
          },
          ...(document.version_history || []),
        ],
      });

      toast.success(`Document rewritten for ${selectedOption?.label}`);
      setShowDialog(false); // This line implies a dialog might have been opened, but no opening logic is provided.

      if (onRewriteComplete) {
        onRewriteComplete(response); // Callback to notify parent of rewrite
      }
    } catch (error) {
      console.error('Error rewriting document:', error);
      toast.error('Failed to rewrite document: ' + (error.message || 'Unknown error'));
    } finally {
      setRewriting(false);
    }
  }, [document, currentWorkspaceId, targetAudience, audienceOptions, onRewriteComplete]);

  return (
    <div className="space-y-4">
      {/* Target Audience Selection */}
      <div>
        <label className="text-sm font-medium mb-2 block">Target Audience</label>
        <Select value={targetAudience} onValueChange={setTargetAudience} disabled={rewriting}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {audienceOptions.map((audience) => (
              <SelectItem key={audience.value} value={audience.value}>
                <div className="flex flex-col">
                  <div className="font-medium">{audience.label}</div>
                  <div className="text-xs text-gray-500">{audience.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleRewrite}
        disabled={rewriting || !document || !currentWorkspaceId}
        className="w-full"
      >
        {rewriting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Rewriting for{' '}
            {audienceOptions.find((opt) => opt.value === targetAudience)?.label || 'audience'}...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Rewrite for{' '}
            {audienceOptions.find((opt) => opt.value === targetAudience)?.label || 'Audience'}
          </>
        )}
      </Button>

      {/* Note: The outline implies removing all rewritten content display, history, export, preview, cost estimation, and custom instruction UIs.
          This component now only selects audience and triggers a full document rewrite via prop callback.
          The `showDialog` state was introduced in the outline but no corresponding UI or trigger for it was provided in `handleRewrite`.
          Hence, no dialog JSX is rendered here for `showDialog` as it would be dead code.
      */}
    </div>
  );
}
