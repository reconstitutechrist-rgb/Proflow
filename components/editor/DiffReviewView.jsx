import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Check,
  CheckCheck,
  X,
  XCircle,
  ArrowLeft,
  GripVertical,
  FileText,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import ChangeItem from './ChangeItem';
import { useDocumentDiff } from '@/hooks/useDocumentDiff';
import { getContentWithHighlight } from '@/utils/diffUtils';

/**
 * DiffReviewView - Side-by-side diff comparison with change controls
 * Shows original content vs suggested changes with accept/reject functionality
 */
export default function DiffReviewView({
  originalContent,
  changes = [],
  title = '',
  onApply,
  onClose,
}) {
  const [selectedChangeId, setSelectedChangeId] = useState(null);
  const {
    previewContent,
    appliedChanges,
    rejectedChanges,
    acceptChange,
    rejectChange,
    acceptAll,
    rejectAll,
    getFinalContent,
    isAccepted,
    isRejected,
    stats,
  } = useDocumentDiff(originalContent, changes);

  const handleApply = () => {
    const finalContent = getFinalContent();
    onApply(finalContent);
  };

  // Get highlighted content for preview
  const getHighlightedPreview = () => {
    let content = originalContent;

    // Apply all accepted changes
    changes.forEach((change) => {
      if (appliedChanges.has(change.id)) {
        content = content.replace(
          change.originalText,
          `<span class="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1 rounded">${change.suggestedText}</span>`
        );
      } else if (rejectedChanges.has(change.id)) {
        // Show rejected as strikethrough
        content = content.replace(
          change.originalText,
          `<span class="bg-gray-100 dark:bg-gray-800">${change.originalText}</span>`
        );
      } else if (change.id === selectedChangeId) {
        // Highlight selected change
        content = content.replace(
          change.originalText,
          `<span class="bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400 px-1 rounded">${change.originalText}</span>`
        );
      }
    });

    return DOMPurify.sanitize(content);
  };

  if (changes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Changes Suggested
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          The AI review didn't find any issues that need addressing.
        </p>
        <Button onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Editor
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Review Suggested Changes
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {title && `"${title}" • `}
                {stats.total} suggestions found
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="flex items-center gap-3 text-sm">
              <Badge
                variant="outline"
                className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
              >
                <Check className="w-3 h-3 mr-1" />
                {stats.accepted} accepted
              </Badge>
              <Badge
                variant="outline"
                className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
              >
                <X className="w-3 h-3 mr-1" />
                {stats.rejected} rejected
              </Badge>
              <Badge
                variant="outline"
                className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {stats.pending} pending
              </Badge>
            </div>

            {/* Batch actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={acceptAll}
                className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/30"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Accept All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={rejectAll}
                className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content - Split view */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Original content */}
          <Panel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col border-r border-gray-200 dark:border-gray-700">
              <div className="flex-shrink-0 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  Original
                </span>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6">
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(originalContent) }}
                  />
                </div>
              </ScrollArea>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 bg-gray-200 dark:bg-gray-700 hover:bg-indigo-300 dark:hover:bg-indigo-700 transition-colors cursor-col-resize flex items-center justify-center">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </PanelResizeHandle>

          {/* Preview with changes */}
          <Panel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  Preview with Changes
                </span>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6">
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: getHighlightedPreview() }}
                  />
                </div>
              </ScrollArea>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Changes list */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Individual Changes
          </span>
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-4 space-y-3">
            {changes.map((change) => (
              <div
                key={change.id}
                className={`cursor-pointer transition-all ${
                  selectedChangeId === change.id
                    ? 'ring-2 ring-indigo-500 ring-offset-2 rounded-lg'
                    : ''
                }`}
                onClick={() =>
                  setSelectedChangeId(change.id === selectedChangeId ? null : change.id)
                }
              >
                <ChangeItem
                  change={change}
                  isAccepted={isAccepted(change.id)}
                  isRejected={isRejected(change.id)}
                  onAccept={acceptChange}
                  onReject={rejectChange}
                  compact
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <span>Review changes before applying. Only accepted changes will be applied.</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={stats.accepted === 0}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply {stats.accepted} Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
