/**
 * DocumentControlPanel Component
 *
 * Main container for the AI Document Control feature.
 * Manages the workflow: upload → analyze → preview → apply → complete
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Upload,
  FileText,
  ChevronUp,
  ChevronDown,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  FileUp,
  FolderInput,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDocumentControl } from '@/hooks/useDocumentControl';
import { CONTROL_STEPS } from './documentControlTypes';
import AnalysisProgress from './AnalysisProgress';
import ChangePreviewCard from './ChangePreviewCard';

// Supported file types
const SUPPORTED_TYPES = ['text/plain', 'text/markdown', 'application/json', 'application/pdf'];
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json', '.pdf'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function DocumentControlPanel({
  projectId,
  workspaceId,
  userId,
  assignments = [],
  tasks = [],
}) {
  const fileInputRef = useRef(null);
  const [linkToAssignment, setLinkToAssignment] = useState(false);
  const [linkToTask, setLinkToTask] = useState(false);

  const {
    state,
    isExpanded,
    currentStep,
    uploadedFile,
    analysisProgress,
    analysisStatus,
    expandedDocuments,
    error,
    toggleExpanded,
    setUploadedFile,
    setLinkedAssignment,
    setLinkedTask,
    startAnalysis,
    cancelAnalysis,
    approveChange,
    rejectChange,
    editChange,
    approveAllForDocument,
    rejectAllForDocument,
    approveAll,
    rejectAll,
    toggleDocumentExpanded,
    applyChanges,
    skipAndSave,
    reset,
    getChangesByDocument,
    getSummary,
  } = useDocumentControl(projectId, workspaceId, userId);

  // Reset local state when workflow resets to upload step
  useEffect(() => {
    if (currentStep === CONTROL_STEPS.UPLOAD) {
      setLinkToAssignment(false);
      setLinkToTask(false);
    }
  }, [currentStep]);

  // Handle file selection
  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      if (!SUPPORTED_TYPES.includes(file.type) && !SUPPORTED_EXTENSIONS.includes(extension)) {
        toast.error(`Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error('File too large. Maximum size is 50MB.');
        return;
      }

      setUploadedFile(file);
      toast.success(`Selected: ${file.name}`);
    },
    [setUploadedFile]
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files?.[0];
      if (file) {
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (!SUPPORTED_TYPES.includes(file.type) && !SUPPORTED_EXTENSIONS.includes(extension)) {
          toast.error(`Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
          return;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error('File too large. Maximum size is 50MB.');
          return;
        }
        setUploadedFile(file);
        toast.success(`Selected: ${file.name}`);
      }
    },
    [setUploadedFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Get summary stats
  const summary = getSummary();
  const changesByDocument = getChangesByDocument();

  // Render content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case CONTROL_STEPS.UPLOAD:
        return (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                'hover:border-primary hover:bg-primary/5 cursor-pointer',
                uploadedFile && 'border-green-500 bg-green-50'
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={SUPPORTED_EXTENSIONS.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />

              {uploadedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-10 h-10 text-green-600" />
                  <div className="font-medium">{uploadedFile.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-muted-foreground" />
                  <div className="font-medium">Drop file here or click to browse</div>
                  <div className="text-sm text-muted-foreground">
                    Supports: PDF, TXT, MD, JSON (max 50MB)
                  </div>
                </div>
              )}
            </div>

            {/* Link options */}
            {(assignments.length > 0 || tasks.length > 0) && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Link to:</div>

                {assignments.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="linkAssignment"
                      checked={linkToAssignment}
                      onCheckedChange={(checked) => {
                        setLinkToAssignment(checked);
                        if (!checked) setLinkedAssignment(null);
                      }}
                    />
                    <Label htmlFor="linkAssignment" className="text-sm">
                      Assignment
                    </Label>
                    {linkToAssignment && (
                      <Select
                        value={state.linkedAssignment || ''}
                        onValueChange={(value) => setLinkedAssignment(value || null)}
                      >
                        <SelectTrigger className="w-[200px] h-8">
                          <SelectValue placeholder="Select assignment" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignments.map((assignment) => (
                            <SelectItem key={assignment.id} value={assignment.id}>
                              {assignment.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {tasks.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="linkTask"
                      checked={linkToTask}
                      onCheckedChange={(checked) => {
                        setLinkToTask(checked);
                        if (!checked) setLinkedTask(null);
                      }}
                    />
                    <Label htmlFor="linkTask" className="text-sm">
                      Task
                    </Label>
                    {linkToTask && (
                      <Select
                        value={state.linkedTask || ''}
                        onValueChange={(value) => setLinkedTask(value || null)}
                      >
                        <SelectTrigger className="w-[200px] h-8">
                          <SelectValue placeholder="Select task" />
                        </SelectTrigger>
                        <SelectContent>
                          {tasks.map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Analyze button */}
            <div className="flex justify-end">
              <Button onClick={startAnalysis} disabled={!uploadedFile} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Analyze & Compare
              </Button>
            </div>
          </div>
        );

      case CONTROL_STEPS.ANALYZING:
        return (
          <div className="space-y-4">
            <AnalysisProgress
              progress={analysisProgress}
              status={analysisStatus}
              currentStep={currentStep}
            />
            <div className="flex justify-end">
              <Button variant="outline" onClick={cancelAnalysis}>
                Cancel
              </Button>
            </div>
          </div>
        );

      case CONTROL_STEPS.PREVIEW:
        if (changesByDocument.length === 0) {
          return (
            <div className="space-y-4">
              <Alert>
                <FileUp className="w-4 h-4" />
                <AlertTitle>No matching documents found</AlertTitle>
                <AlertDescription>
                  The uploaded document didn't match any existing project documents. It will be
                  saved to the Miscellaneous folder for future reference.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={reset}>
                  Upload Different File
                </Button>
                <Button onClick={skipAndSave}>
                  <FolderInput className="w-4 h-4 mr-2" />
                  Save to Miscellaneous
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="font-medium">{summary.totalDocuments}</span>{' '}
                  <span className="text-muted-foreground">documents</span>
                </div>
                <div>
                  <span className="font-medium">{summary.total}</span>{' '}
                  <span className="text-muted-foreground">changes</span>
                </div>
                {summary.approved > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {summary.approved} approved
                  </Badge>
                )}
                {summary.rejected > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-700">
                    {summary.rejected} rejected
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={approveAll}>
                  Approve All
                </Button>
                <Button variant="outline" size="sm" onClick={rejectAll}>
                  Reject All
                </Button>
              </div>
            </div>

            {/* Changes by document */}
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {changesByDocument.map((doc) => (
                  <ChangePreviewCard
                    key={doc.documentId}
                    documentId={doc.documentId}
                    documentTitle={doc.documentTitle}
                    changes={doc.changes}
                    isExpanded={expandedDocuments.has(doc.documentId)}
                    onToggleExpand={toggleDocumentExpanded}
                    onApproveChange={approveChange}
                    onRejectChange={rejectChange}
                    onEditChange={editChange}
                    onApproveAll={approveAllForDocument}
                    onRejectAll={rejectAllForDocument}
                  />
                ))}
              </div>
            </ScrollArea>

            {/* Actions */}
            <Separator />
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={skipAndSave}>
                  Skip & Save Document
                </Button>
                <Button onClick={applyChanges} disabled={summary.approved === 0} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Apply {summary.approved} Changes
                </Button>
              </div>
            </div>
          </div>
        );

      case CONTROL_STEPS.APPLYING:
        return (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-lg font-medium">{analysisStatus}</div>
          </div>
        );

      case CONTROL_STEPS.COMPLETE:
        return (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertTitle className="text-green-800">Changes Applied Successfully</AlertTitle>
              <AlertDescription className="text-green-700">
                {analysisStatus}
                {state.savedDocumentId && (
                  <div className="mt-2">
                    The uploaded document has been saved to the Miscellaneous folder.
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {/* Applied changes summary */}
            {state.appliedChanges.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Updated documents:</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {state.appliedChanges
                    .filter((r) => r.success)
                    .map((result) => (
                      <li key={result.documentId} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        {result.documentTitle} - {result.changesApplied} changes (v
                        {result.newVersion})
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2">
              {state.appliedChanges.some((r) => r.success) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const firstSuccess = state.appliedChanges.find((r) => r.success);
                    if (firstSuccess) {
                      window.location.href = `/documents?highlight=${firstSuccess.documentId}`;
                    }
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Updated Documents
                </Button>
              )}
              <Button variant="outline" onClick={reset}>
                Upload Another
              </Button>
              <Button onClick={toggleExpanded}>Done</Button>
            </div>
          </div>
        );

      case CONTROL_STEPS.ERROR:
        return (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                Try Again
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border-2">
      <Collapsible open={isExpanded} onOpenChange={toggleExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-5 h-5 text-primary" />
                Document Control
                {currentStep !== CONTROL_STEPS.UPLOAD && (
                  <Badge variant="secondary" className="ml-2">
                    {currentStep === CONTROL_STEPS.ANALYZING && 'Analyzing...'}
                    {currentStep === CONTROL_STEPS.PREVIEW && `${summary.total} changes found`}
                    {currentStep === CONTROL_STEPS.APPLYING && 'Applying...'}
                    {currentStep === CONTROL_STEPS.COMPLETE && 'Complete'}
                    {currentStep === CONTROL_STEPS.ERROR && 'Error'}
                  </Badge>
                )}
              </CardTitle>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            {!isExpanded && (
              <p className="text-sm text-muted-foreground">
                Upload a document to find and update related project files
              </p>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">{renderStepContent()}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
