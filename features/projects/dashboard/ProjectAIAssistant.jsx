import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Target, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Import AI hook and components
import { useAskAI, MEMORY_LIMITS } from '@/hooks/useAskAI';
import {
  AskAIHeader,
  AskAIDocumentSidebar,
  AskAIChatArea,
  AskAIDialogs,
} from '@/features/ai/askAI';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Enhancement components
import OnboardingTutorial from '@/components/OnboardingTutorial';
import SessionTemplates from '@/components/SessionTemplates';
import CostEstimator from '@/components/CostEstimator';
import QuickStartGuide from '@/components/QuickStartGuide';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';

export default function ProjectAIAssistant({
  project,
  assignments,
  tasks,
  documents,
  projectMemory,
  workspaceId,
  currentUser,
  onDataRefresh,
}) {
  const askAI = useAskAI();

  // Track if we've already set up the context for this project
  const contextSetRef = useRef(null);
  const docsLoadedRef = useRef(null);

  // Auto-set project context on mount or project change
  useEffect(() => {
    if (project && project.id !== contextSetRef.current) {
      askAI.setSelectedProject(project);
      askAI.setContextType('project');
      contextSetRef.current = project.id;
    }
  }, [project?.id]);

  // Auto-load linked documents when they change
  useEffect(() => {
    if (!documents || documents.length === 0) return;

    // Filter to documents with file URLs (actual files, not folders)
    const linkedDocs = documents.filter(
      (doc) => doc.document_type !== 'folder_placeholder' && doc.file_url
    );

    // Create a stable key for comparison
    const docsKey = linkedDocs
      .map((d) => d.id)
      .sort()
      .join(',');

    // Skip if we've already loaded these exact documents
    if (docsKey === docsLoadedRef.current) return;
    docsLoadedRef.current = docsKey;

    if (linkedDocs.length > 0) {
      askAI.addLinkedDocuments(linkedDocs);
    }
  }, [documents]);

  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-gray-900">
        {/* Header with Project Context Badge */}
        <div className="flex-shrink-0 border-b bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h2>
              {project && (
                <div className="flex items-center gap-2 mt-0.5">
                  <Target className="w-3 h-3 text-indigo-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    Context: {project.name}
                  </span>
                  {projectMemory && (
                    <Badge variant="outline" className="text-xs bg-indigo-50 dark:bg-indigo-900/30">
                      Memory Active
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AskAI Header (session controls, RAG toggle, etc.) */}
        <AskAIHeader
          useRAG={askAI.useRAG}
          setUseRAG={askAI.setUseRAG}
          isProcessing={askAI.isProcessing}
          isProcessingEmbeddings={askAI.isProcessingEmbeddings}
          docsWithRealEmbeddings={askAI.docsWithRealEmbeddings}
          totalEmbeddingCost={askAI.totalEmbeddingCost}
          messages={askAI.messages}
          sessions={askAI.sessions}
          sortedSessions={askAI.sortedSessions}
          loading={askAI.loading}
          loadingSessions={askAI.loadingSessions}
          isSessionsSheetOpen={askAI.isSessionsSheetOpen}
          setIsSessionsSheetOpen={askAI.setIsSessionsSheetOpen}
          sessionSearchQuery={askAI.sessionSearchQuery}
          setSessionSearchQuery={askAI.setSessionSearchQuery}
          sessionSortBy={askAI.sessionSortBy}
          setSessionSortBy={askAI.setSessionSortBy}
          currentSession={askAI.currentSession}
          sessionModified={askAI.sessionModified}
          uploadedDocuments={askAI.uploadedDocuments}
          setDeleteConfirmSession={askAI.setDeleteConfirmSession}
          handleLoadSession={askAI.handleLoadSession}
          setIsSaveDialogOpen={askAI.setIsSaveDialogOpen}
          setSessionName={askAI.setSessionName}
          setSessionDescription={askAI.setSessionDescription}
          handleNewConversation={askAI.handleNewConversation}
          setIsExportDialogOpen={askAI.setIsExportDialogOpen}
          setExportFormat={askAI.setExportFormat}
          setShowSessionTemplates={askAI.setShowSessionTemplates}
          setShowKeyboardShortcuts={askAI.setShowKeyboardShortcuts}
        />

        {/* Capacity Warnings */}
        {(askAI.showDocumentWarning || askAI.showMessageWarning) && (
          <Card className="mx-4 mt-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    High Capacity Usage
                  </p>
                  <div className="space-y-2 mt-2">
                    {askAI.showDocumentWarning && (
                      <div>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Documents: {askAI.uploadedDocuments.length}/{MEMORY_LIMITS.MAX_DOCUMENTS}{' '}
                          ({askAI.documentCapacityPercent.toFixed(0)}%)
                        </p>
                        <Progress value={askAI.documentCapacityPercent} className="h-1.5 mt-1" />
                      </div>
                    )}
                    {askAI.showMessageWarning && (
                      <div>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Messages: {askAI.messages.length}/{MEMORY_LIMITS.MAX_MESSAGES} (
                          {askAI.messageCapacityPercent.toFixed(0)}%)
                        </p>
                        <Progress value={askAI.messageCapacityPercent} className="h-1.5 mt-1" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex gap-4 min-h-0 p-4 overflow-hidden">
          {/* Left Sidebar - Documents */}
          <AskAIDocumentSidebar
            uploadedDocuments={askAI.uploadedDocuments}
            assignments={assignments}
            projects={project ? [project] : []}
            selectedAssignment={askAI.selectedAssignment}
            selectedProject={project}
            contextType="project"
            setSelectedAssignment={askAI.setSelectedAssignment}
            setSelectedProject={askAI.setSelectedProject}
            setContextType={askAI.setContextType}
            isUploading={askAI.isUploading}
            isProcessingEmbeddings={askAI.isProcessingEmbeddings}
            embeddingProgress={askAI.embeddingProgress}
            useRAG={askAI.useRAG}
            docsWithEmbeddings={askAI.docsWithEmbeddings}
            docsWithRealEmbeddings={askAI.docsWithRealEmbeddings}
            docsWithSimulatedEmbeddings={askAI.docsWithSimulatedEmbeddings}
            docsWithSemanticChunking={askAI.docsWithSemanticChunking}
            excludedDocumentCount={askAI.excludedDocumentCount}
            documentCapacityPercent={askAI.documentCapacityPercent}
            fileInputRef={askAI.fileInputRef}
            handleFileUpload={askAI.handleFileUpload}
            handleRemoveDocument={askAI.handleRemoveDocument}
            toggleDocumentInContext={askAI.toggleDocumentInContext}
            handleDragDropFiles={askAI.handleDragDropFiles}
          />

          {/* Main Chat Area */}
          <AskAIChatArea
            messages={askAI.messages}
            currentUser={currentUser}
            currentSession={askAI.currentSession}
            sessionModified={askAI.sessionModified}
            inputMessage={askAI.inputMessage}
            setInputMessage={askAI.setInputMessage}
            isProcessing={askAI.isProcessing}
            isProcessingEmbeddings={askAI.isProcessingEmbeddings}
            uploadedDocuments={askAI.uploadedDocuments}
            excludedMessageCount={askAI.excludedMessageCount}
            useRAG={askAI.useRAG}
            messagesEndRef={askAI.messagesEndRef}
            toggleMessageInContext={askAI.toggleMessageInContext}
            handleDeleteMessage={askAI.handleDeleteMessage}
            handleSendMessage={askAI.handleSendMessage}
            handleSuggestedQuestion={askAI.handleSuggestedQuestion}
            setShowOnboardingTutorial={askAI.setShowOnboardingTutorial}
            setShowSessionTemplates={askAI.setShowSessionTemplates}
          />
        </div>

        {/* Dialogs */}
        <AskAIDialogs
          isSaveDialogOpen={askAI.isSaveDialogOpen}
          setIsSaveDialogOpen={askAI.setIsSaveDialogOpen}
          sessionName={askAI.sessionName}
          setSessionName={askAI.setSessionName}
          sessionDescription={askAI.sessionDescription}
          setSessionDescription={askAI.setSessionDescription}
          currentSession={askAI.currentSession}
          messages={askAI.messages}
          uploadedDocuments={askAI.uploadedDocuments}
          totalEmbeddingCost={askAI.totalEmbeddingCost}
          handleSaveSession={askAI.handleSaveSession}
          isExportDialogOpen={askAI.isExportDialogOpen}
          setIsExportDialogOpen={askAI.setIsExportDialogOpen}
          exportFormat={askAI.exportFormat}
          setExportFormat={askAI.setExportFormat}
          isExporting={askAI.isExporting}
          handleExportSession={askAI.handleExportSession}
          selectedProject={project}
          selectedAssignment={askAI.selectedAssignment}
          deleteConfirmSession={askAI.deleteConfirmSession}
          setDeleteConfirmSession={askAI.setDeleteConfirmSession}
          handleDeleteSession={askAI.handleDeleteSession}
          isLoadNewSessionDialogOpen={askAI.isLoadNewSessionDialogOpen}
          setIsLoadNewSessionDialogOpen={askAI.setIsLoadNewSessionDialogOpen}
          pendingSessionToLoad={askAI.pendingSessionToLoad}
          setPendingSessionToLoad={askAI.setPendingSessionToLoad}
          sessionModified={askAI.sessionModified}
          confirmLoadSession={askAI.confirmLoadSession}
        />

        {/* Enhancement Overlays */}
        {askAI.showQuickStartGuide && (
          <QuickStartGuide
            onClose={() => askAI.setShowQuickStartGuide(false)}
            onStartTutorial={() => {
              askAI.setShowQuickStartGuide(false);
              askAI.setShowOnboardingTutorial(true);
            }}
          />
        )}

        {askAI.showOnboardingTutorial && (
          <OnboardingTutorial
            onClose={() => askAI.setShowOnboardingTutorial(false)}
            onComplete={() => {
              askAI.setShowOnboardingTutorial(false);
              toast.success('Welcome to AI Chat!');
            }}
          />
        )}

        {askAI.showKeyboardShortcuts && (
          <KeyboardShortcuts
            isOpen={askAI.showKeyboardShortcuts}
            onClose={() => askAI.setShowKeyboardShortcuts(false)}
          />
        )}

        {askAI.showSessionTemplates && (
          <SessionTemplates
            onSelectTemplate={askAI.handleSessionTemplateSelect}
            onClose={() => askAI.setShowSessionTemplates(false)}
          />
        )}

        {askAI.showCostEstimator && askAI.costEstimatorData && (
          <CostEstimator
            documents={askAI.costEstimatorData.documents}
            estimatedTokens={askAI.costEstimatorData.tokens}
            onConfirm={() => {
              askAI.setShowCostEstimator(false);
              askAI.costEstimatorData.onConfirm?.();
            }}
            onCancel={() => askAI.setShowCostEstimator(false)}
            operation={askAI.costEstimatorData.operation}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
