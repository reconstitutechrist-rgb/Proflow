import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Save, Loader2, Sparkles, LayoutList, Users, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import RichTextEditor from '@/components/editor/RichTextEditor';

import EditorPreviewSplit, { VIEW_MODES } from '@/components/editor/EditorPreviewSplit';
import LivePreview from '@/components/editor/LivePreview';
import DiffReviewView from '@/components/editor/DiffReviewView';
import EnhancedAIReviewPanel from '@/features/ai/EnhancedAIReviewPanel';
import AIDocumentStructurer from '@/features/ai/AIDocumentStructurer';
import AudienceRewriter from '@/features/ai/AudienceRewriter';

/**
 * DocumentReviewModal - Full-page modal for reviewing and finalizing documents
 *
 * Features:
 * - Edit/Preview/Split view modes
 * - AI Smart Review with actionable changes
 * - Document structure analysis
 * - Audience rewriter
 * - Diff review for accepting/rejecting changes
 */
export default function DocumentReviewModal({
  isOpen,
  onClose,
  initialContent,
  initialTitle,
  initialDescription,
  onSave,
  isSaving = false,
  // Optional context for AI tools
  selectedAssignment,
  selectedTask,
  assignments = [],
  tasks = [],
  referenceDocumentUrls = [],
}) {
  // Local state for editing within the modal
  const [content, setContent] = useState(initialContent || '');
  const [title, setTitle] = useState(initialTitle || '');
  const [description, setDescription] = useState(initialDescription || '');

  // View mode state
  const [viewMode, setViewMode] = useState(VIEW_MODES.SPLIT);

  // Active review tab
  const [activeTab, setActiveTab] = useState('smart-review');

  // Diff review state
  const [pendingChanges, setPendingChanges] = useState([]);
  const [showDiffReview, setShowDiffReview] = useState(false);

  // Sync with initial values when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setContent(initialContent || '');
      setTitle(initialTitle || '');
      setDescription(initialDescription || '');
      setViewMode(VIEW_MODES.SPLIT);
      setPendingChanges([]);
      setShowDiffReview(false);
    }
  }, [isOpen, initialContent, initialTitle, initialDescription]);

  // Handler for when AI generates actionable changes
  const handleChangesGenerated = useCallback((changes) => {
    setPendingChanges(changes);
    setShowDiffReview(true);
  }, []);

  // Handler for applying accepted changes from diff review
  const handleApplyChanges = useCallback((finalContent) => {
    setContent(finalContent);
    setShowDiffReview(false);
    setPendingChanges([]);
    toast.success('Changes applied successfully');
  }, []);

  // Handler for canceling diff review
  const handleCancelDiffReview = useCallback(() => {
    setShowDiffReview(false);
    setPendingChanges([]);
  }, []);

  // Handler for inserting content (used by AudienceRewriter)
  const handleInsertContent = useCallback((newContent) => {
    setContent((prev) => prev + (prev ? '\n\n' : '') + newContent);
    toast.success('Content inserted');
  }, []);

  // Save and close
  const handleSave = async () => {
    if (onSave) {
      await onSave({
        content,
        title,
        description,
      });
    }
  };

  // Back to editing - pass changes back
  const handleBackToEditing = () => {
    // Pass the current state back to the parent
    if (onClose) {
      onClose({
        content,
        title,
        description,
        hasChanges:
          content !== initialContent ||
          title !== initialTitle ||
          description !== initialDescription,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => handleBackToEditing()}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 gap-0 rounded-none border-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Review & Finalize
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {title || 'Untitled Document'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleBackToEditing} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Editing
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Document
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Editor/Preview Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <EditorPreviewSplit
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              editorContent={
                <div className="max-w-4xl mx-auto space-y-4 p-6">
                  <Input
                    placeholder="Document title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <Textarea
                    placeholder="Brief description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-20"
                  />
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm min-h-[400px]">
                    <RichTextEditor
                      value={content}
                      onChange={setContent}
                      placeholder="Start writing..."
                      minHeight="400px"
                    />
                  </div>
                </div>
              }
              previewContent={
                <LivePreview content={content} title={title} description={description} />
              }
            />
          </div>

          {/* Review Sidebar */}
          <div className="w-[380px] border-l bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="w-full grid grid-cols-3 border-b rounded-none flex-shrink-0">
                <TabsTrigger value="smart-review" className="gap-1">
                  <Sparkles className="w-3 h-3" />
                  Review
                </TabsTrigger>
                <TabsTrigger value="structure" className="gap-1">
                  <LayoutList className="w-3 h-3" />
                  Structure
                </TabsTrigger>
                <TabsTrigger value="audience" className="gap-1">
                  <Users className="w-3 h-3" />
                  Audience
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto p-4">
                <TabsContent value="smart-review" className="mt-0">
                  <EnhancedAIReviewPanel
                    content={content}
                    title={title}
                    description={description}
                    selectedAssignment={selectedAssignment}
                    selectedTask={selectedTask}
                    assignments={assignments}
                    tasks={tasks}
                    referenceDocumentUrls={referenceDocumentUrls}
                    onChangesGenerated={handleChangesGenerated}
                  />
                </TabsContent>

                <TabsContent value="structure" className="mt-0">
                  <AIDocumentStructurer
                    content={content}
                    title={title}
                    description={description}
                    onChangesGenerated={handleChangesGenerated}
                  />
                </TabsContent>

                <TabsContent value="audience" className="mt-0">
                  <AudienceRewriter initialText={content} onApplyRewrite={handleInsertContent} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Diff Review Dialog */}
        <Dialog open={showDiffReview} onOpenChange={setShowDiffReview}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                Review Suggested Changes
              </DialogTitle>
            </DialogHeader>
            <DiffReviewView
              originalContent={content}
              changes={pendingChanges}
              onApply={handleApplyChanges}
              onCancel={handleCancelDiffReview}
            />
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
