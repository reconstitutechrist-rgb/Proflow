import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useAskAI, MEMORY_LIMITS } from '@/hooks/useAskAI';
import {
  AskAIHeader,
  AskAIDocumentSidebar,
  AskAIChatArea,
  AskAIDialogs,
} from '@/features/ai/askAI';

// Import enhancement components
import OnboardingTutorial from '@/components/OnboardingTutorial';
import SessionTemplates from '@/components/SessionTemplates';
import CostEstimator from '@/components/CostEstimator';
import QuickStartGuide from '@/components/QuickStartGuide';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';

export default function AskAIPage() {
  const {
    // State
    currentUser,
    assignments,
    projects,
    selectedAssignment,
    selectedProject,
    contextType,
    uploadedDocuments,
    messages,
    inputMessage,
    isProcessing,
    isUploading,
    currentSession,
    sessionModified,
    isSaveDialogOpen,
    sessionName,
    sessionDescription,
    useRAG,
    isProcessingEmbeddings,
    embeddingProgress,
    totalEmbeddingCost,
    sessions,
    loadingSessions,
    isSessionsSheetOpen,
    sessionSearchQuery,
    sessionSortBy,
    deleteConfirmSession,
    isLoadNewSessionDialogOpen,
    pendingSessionToLoad,
    isExportDialogOpen,
    exportFormat,
    isExporting,
    loading,
    showOnboardingTutorial,
    showQuickStartGuide,
    showKeyboardShortcuts,
    showSessionTemplates,
    showCostEstimator,
    costEstimatorData,

    // Refs
    messagesEndRef,
    fileInputRef,

    // Computed
    sortedSessions,
    showDocumentWarning,
    showMessageWarning,
    documentCapacityPercent,
    messageCapacityPercent,
    excludedMessageCount,
    excludedDocumentCount,
    docsWithEmbeddings,
    docsWithRealEmbeddings,
    docsWithSimulatedEmbeddings,
    docsWithSemanticChunking,

    // Setters
    setSelectedAssignment,
    setSelectedProject,
    setContextType,
    setInputMessage,
    setIsSaveDialogOpen,
    setSessionName,
    setSessionDescription,
    setUseRAG,
    setIsSessionsSheetOpen,
    setSessionSearchQuery,
    setSessionSortBy,
    setDeleteConfirmSession,
    setIsLoadNewSessionDialogOpen,
    setPendingSessionToLoad,
    setIsExportDialogOpen,
    setExportFormat,
    setShowOnboardingTutorial,
    setShowQuickStartGuide,
    setShowKeyboardShortcuts,
    setShowSessionTemplates,
    setShowCostEstimator,
    setCostEstimatorData,

    // Handlers
    handleLoadSession,
    handleDeleteSession,
    handleDeleteMessage,
    handleNewConversation,
    handleFileUpload,
    handleRemoveDocument,
    toggleDocumentInContext,
    toggleMessageInContext,
    handleSendMessage,
    handleSaveSession,
    handleExportSession,
    handleSessionTemplateSelect,
    handleSuggestedQuestion,
    handleDragDropFiles,
    confirmLoadSession,
  } = useAskAI();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && inputMessage.trim()) {
        e.preventDefault();
        handleSendMessage();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        fileInputRef.current?.click();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewConversation();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentSession) {
          handleSaveSession();
        } else {
          setIsSaveDialogOpen(true);
        }
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const activeElement = document.activeElement;
        const isInputField =
          activeElement &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable);
        if (!isInputField) {
          e.preventDefault();
          setShowKeyboardShortcuts(true);
        }
      }

      if (e.key === 'Escape') {
        setShowKeyboardShortcuts(false);
        setShowQuickStartGuide(false);
        setShowOnboardingTutorial(false);
        setShowSessionTemplates(false);
        setShowCostEstimator(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    inputMessage,
    currentSession,
    handleSendMessage,
    handleNewConversation,
    handleSaveSession,
    setIsSaveDialogOpen,
    setShowKeyboardShortcuts,
    setShowQuickStartGuide,
    setShowOnboardingTutorial,
    setShowSessionTemplates,
    setShowCostEstimator,
    fileInputRef,
  ]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <AskAIHeader
        useRAG={useRAG}
        setUseRAG={setUseRAG}
        isProcessing={isProcessing}
        isProcessingEmbeddings={isProcessingEmbeddings}
        docsWithRealEmbeddings={docsWithRealEmbeddings}
        totalEmbeddingCost={totalEmbeddingCost}
        messages={messages}
        sessions={sessions}
        sortedSessions={sortedSessions}
        loading={loading}
        loadingSessions={loadingSessions}
        isSessionsSheetOpen={isSessionsSheetOpen}
        setIsSessionsSheetOpen={setIsSessionsSheetOpen}
        sessionSearchQuery={sessionSearchQuery}
        setSessionSearchQuery={setSessionSearchQuery}
        sessionSortBy={sessionSortBy}
        setSessionSortBy={setSessionSortBy}
        currentSession={currentSession}
        sessionModified={sessionModified}
        uploadedDocuments={uploadedDocuments}
        setDeleteConfirmSession={setDeleteConfirmSession}
        handleLoadSession={handleLoadSession}
        setIsSaveDialogOpen={setIsSaveDialogOpen}
        setSessionName={setSessionName}
        setSessionDescription={setSessionDescription}
        handleNewConversation={handleNewConversation}
        setIsExportDialogOpen={setIsExportDialogOpen}
        setExportFormat={setExportFormat}
        setShowSessionTemplates={setShowSessionTemplates}
        setShowKeyboardShortcuts={setShowKeyboardShortcuts}
      />

      {/* Warnings */}
      {(showDocumentWarning || showMessageWarning) && (
        <Card className="mt-4 mx-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  High Capacity Usage
                </p>
                <div className="space-y-2 mt-2">
                  {showDocumentWarning && (
                    <div>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Documents: {uploadedDocuments.length}/{MEMORY_LIMITS.MAX_DOCUMENTS} (
                        {documentCapacityPercent.toFixed(0)}%)
                      </p>
                      <Progress value={documentCapacityPercent} className="h-1.5 mt-1" />
                    </div>
                  )}
                  {showMessageWarning && (
                    <div>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Messages: {messages.length}/{MEMORY_LIMITS.MAX_MESSAGES} (
                        {messageCapacityPercent.toFixed(0)}%)
                      </p>
                      <Progress value={messageCapacityPercent} className="h-1.5 mt-1" />
                    </div>
                  )}
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    May increase response time and API costs. Consider saving this session and
                    starting a new conversation.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content area */}
      <div className="flex-1 flex gap-6 min-h-0 p-4 pt-4">
        {/* Left Sidebar - Documents */}
        <AskAIDocumentSidebar
          uploadedDocuments={uploadedDocuments}
          assignments={assignments}
          projects={projects}
          selectedAssignment={selectedAssignment}
          selectedProject={selectedProject}
          contextType={contextType}
          setSelectedAssignment={setSelectedAssignment}
          setSelectedProject={setSelectedProject}
          setContextType={setContextType}
          isUploading={isUploading}
          isProcessingEmbeddings={isProcessingEmbeddings}
          embeddingProgress={embeddingProgress}
          useRAG={useRAG}
          docsWithEmbeddings={docsWithEmbeddings}
          docsWithRealEmbeddings={docsWithRealEmbeddings}
          docsWithSimulatedEmbeddings={docsWithSimulatedEmbeddings}
          docsWithSemanticChunking={docsWithSemanticChunking}
          excludedDocumentCount={excludedDocumentCount}
          documentCapacityPercent={documentCapacityPercent}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          handleRemoveDocument={handleRemoveDocument}
          toggleDocumentInContext={toggleDocumentInContext}
          handleDragDropFiles={handleDragDropFiles}
        />

        {/* Main Chat Area */}
        <AskAIChatArea
          messages={messages}
          currentUser={currentUser}
          currentSession={currentSession}
          sessionModified={sessionModified}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          isProcessing={isProcessing}
          isProcessingEmbeddings={isProcessingEmbeddings}
          uploadedDocuments={uploadedDocuments}
          excludedMessageCount={excludedMessageCount}
          useRAG={useRAG}
          messagesEndRef={messagesEndRef}
          toggleMessageInContext={toggleMessageInContext}
          handleDeleteMessage={handleDeleteMessage}
          handleSendMessage={handleSendMessage}
          handleSuggestedQuestion={handleSuggestedQuestion}
          setShowOnboardingTutorial={setShowOnboardingTutorial}
          setShowSessionTemplates={setShowSessionTemplates}
        />
      </div>

      {/* Dialogs */}
      <AskAIDialogs
        isSaveDialogOpen={isSaveDialogOpen}
        setIsSaveDialogOpen={setIsSaveDialogOpen}
        sessionName={sessionName}
        setSessionName={setSessionName}
        sessionDescription={sessionDescription}
        setSessionDescription={setSessionDescription}
        currentSession={currentSession}
        messages={messages}
        uploadedDocuments={uploadedDocuments}
        totalEmbeddingCost={totalEmbeddingCost}
        handleSaveSession={handleSaveSession}
        isExportDialogOpen={isExportDialogOpen}
        setIsExportDialogOpen={setIsExportDialogOpen}
        exportFormat={exportFormat}
        setExportFormat={setExportFormat}
        isExporting={isExporting}
        handleExportSession={handleExportSession}
        selectedProject={selectedProject}
        selectedAssignment={selectedAssignment}
        deleteConfirmSession={deleteConfirmSession}
        setDeleteConfirmSession={setDeleteConfirmSession}
        handleDeleteSession={handleDeleteSession}
        isLoadNewSessionDialogOpen={isLoadNewSessionDialogOpen}
        setIsLoadNewSessionDialogOpen={setIsLoadNewSessionDialogOpen}
        pendingSessionToLoad={pendingSessionToLoad}
        setPendingSessionToLoad={setPendingSessionToLoad}
        sessionModified={sessionModified}
        confirmLoadSession={confirmLoadSession}
      />

      {/* Enhancement Overlays */}
      {showQuickStartGuide && (
        <QuickStartGuide
          onClose={() => setShowQuickStartGuide(false)}
          onStartTutorial={() => {
            setShowQuickStartGuide(false);
            setShowOnboardingTutorial(true);
          }}
        />
      )}

      {showOnboardingTutorial && (
        <OnboardingTutorial
          onClose={() => setShowOnboardingTutorial(false)}
          onComplete={() => {
            setShowOnboardingTutorial(false);
            toast.success("Welcome to Ask AI! Let's get started.");
          }}
        />
      )}

      {showKeyboardShortcuts && (
        <KeyboardShortcuts
          isOpen={showKeyboardShortcuts}
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      )}

      {showSessionTemplates && (
        <SessionTemplates
          onSelectTemplate={handleSessionTemplateSelect}
          onClose={() => setShowSessionTemplates(false)}
        />
      )}

      {showCostEstimator && costEstimatorData && (
        <CostEstimator
          documents={costEstimatorData.documents}
          estimatedTokens={costEstimatorData.tokens}
          onConfirm={() => {
            setShowCostEstimator(false);
            costEstimatorData.onConfirm && costEstimatorData.onConfirm();
          }}
          onCancel={() => setShowCostEstimator(false)}
          operation={costEstimatorData.operation}
        />
      )}
    </div>
  );
}
