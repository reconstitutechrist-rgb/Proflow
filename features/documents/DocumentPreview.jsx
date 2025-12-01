
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  X,
  ExternalLink,
  Maximize2,
  FileImage,
  FolderPlus,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye, // New import for tab icon
  Clock, // New import for tab icon
  MessageSquare // New import for tab icon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import LinkDocumentToAssignmentDialog from "@/components/dialogs/LinkDocumentToAssignmentDialog";
import AISummaryButton from "@/features/ai/AISummaryButton";
import DocumentVersionHistory from "@/features/documents/DocumentVersionHistory";
import DocumentComments from "@/features/documents/DocumentComments";

import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { validateWorkspaceAccess } from "@/lib/CrossWorkspaceValidator";
import { db } from "@/api/db";


export default function DocumentPreview({
  document,
  assignments = [],
  onClose,
  onUpdate,
  currentUser, // Preserved as per "preserving all other features"
  onDelete // New prop from outline
}) {
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  // Removed showDetails state as tabs will handle this
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [pdfViewMode, setPdfViewMode] = useState('google'); // 'google' or 'error'
  const [pdfLoading, setPdfLoading] = useState(true);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [activeTab, setActiveTab] = useState("preview"); // New state for active tab

  // NEW STATES FOR EDITING/SAVING functionality referenced by handleSaveChanges
  const [editedDocument, setEditedDocument] = useState(document);
  const [isSaving, setIsSaving] = useState(false); // Renamed setSaving to setIsSaving for convention

  // NEW HOOK FOR WORKSPACE SCOPING
  const { currentWorkspaceId } = useWorkspace();

  // Combined useEffect for state resets and workspace validation
  useEffect(() => {
    // Reset preview related states for new document or on document change
    setPdfLoading(true);
    setPdfViewMode('google');
    setLoadAttempts(0);
    setImageLoadError(false);
    setActiveTab("preview"); // Reset to preview tab on document change

    // Initialize editedDocument when the document prop changes
    // This also implicitly handles `loadDocumentData()` from the outline for the editable state
    if (document) {
      setEditedDocument(document);
    } else {
      setEditedDocument(null);
    }

    // Workspace access validation from outline
    if (document && currentWorkspaceId) {
      if (!validateWorkspaceAccess(document, currentWorkspaceId)) {
        toast.error("You don't have access to this document.");
        onClose();
        return; // Stop further processing if access is denied
      }
      // The outline included a `loadDocumentData()` call here.
      // With `setEditedDocument(document)` above, the initial data is loaded.
      // If `loadDocumentData` was meant to re-fetch document data from an API,
      // that specific logic would go here. As it's not provided, we rely on the prop.
    }
  }, [document, currentWorkspaceId, onClose]); // Added currentWorkspaceId and onClose to dependencies

  useEffect(() => {
    // Set a timeout to handle stuck loading states
    if (pdfLoading && pdfViewMode === 'google') {
      const timeout = setTimeout(() => {
        console.log("PDF loading timeout");
        setPdfLoading(false);
        if (loadAttempts < 1) {
          setLoadAttempts(prev => prev + 1);
          setPdfLoading(true);
        } else {
          setPdfViewMode('error');
        }
      }, 15000); // 15 second timeout

      return () => clearTimeout(timeout);
    }
  }, [pdfLoading, pdfViewMode, loadAttempts]);

  // Loading state while currentUser loads
  if (currentUser === undefined) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading preview...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  // NEW FUNCTION from outline - handleSaveChanges
  const handleSaveChanges = async () => {
    if (!editedDocument) return;

    // Validate workspace hasn't changed (document cannot be moved between workspaces via this save)
    if (editedDocument.workspace_id !== currentWorkspaceId) {
      toast.error("Cannot change document's workspace. Please ensure the document belongs to the current workspace.");
      return;
    }

    try {
      setIsSaving(true);
      // Using db client for entity operations
      await db.entities.Document.update(editedDocument.id, editedDocument);
      toast.success("Document updated successfully!");
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Failed to update document.");
    } finally {
      setIsSaving(false);
    }
  };


  const getFileTypeInfo = () => {
    const fileType = (document.file_type || '').toLowerCase();
    const fileName = (document.file_name || '').toLowerCase();
    const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : '';

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'];
    if (fileType.startsWith('image/') || imageExtensions.includes(fileExtension)) {
      return {
        type: 'image',
        canPreview: true,
        icon: FileImage
      };
    }

    if (fileType === 'application/pdf' || fileExtension === 'pdf') {
      return {
        type: 'pdf',
        canPreview: true,
        icon: FileText
      };
    }

    const textExtensions = ['txt', 'md', 'csv', 'json', 'xml', 'log'];
    if (fileType.startsWith('text/') || textExtensions.includes(fileExtension)) {
      return {
        type: 'text',
        canPreview: false,
        icon: FileText
      };
    }

    const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    if (officeExtensions.includes(fileExtension)) {
      return {
        type: 'office',
        canPreview: false,
        icon: FileText
      };
    }

    return {
      type: 'unknown',
      canPreview: false,
      icon: FileText
    };
  };

  const fileInfo = getFileTypeInfo();

  const handleLinkSuccess = () => {
    setIsLinkDialogOpen(false);
    if (onUpdate) {
      onUpdate();
    }
  };

  const handleDownload = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Force download using fetch and blob
    fetch(document.file_url)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = document.file_name || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Download failed:', error);
        // Fallback to simple download
        const link = document.createElement('a');
        link.href = document.file_url;
        link.download = document.file_name || 'download';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
  };

  const handleOpenInNewTab = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    window.open(document.file_url, '_blank', 'noopener,noreferrer');
  };

  const handleRetryPDF = () => {
    setPdfLoading(true);
    setLoadAttempts(0);
    setPdfViewMode('google');
  };

  const renderDocumentContent = () => {
    if (!fileInfo.canPreview) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
          <div className="text-center p-8 max-w-md">
            <fileInfo.icon className="w-20 h-20 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {document.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {fileInfo.type === 'text' && 'Text files cannot be previewed for security reasons. '}
              {fileInfo.type === 'office' && 'Office documents cannot be previewed directly. '}
              {fileInfo.type === 'unknown' && 'This file type cannot be previewed in the browser. '}
              Click below to open or download the file.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button onClick={handleOpenInNewTab} size="lg">
                <ExternalLink className="w-5 h-5 mr-2" />
                Open in New Tab
              </Button>
              <Button onClick={handleDownload} variant="outline" size="lg">
                <Download className="w-5 h-5 mr-2" />
                Download File
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (fileInfo.type === 'image') {
      if (imageLoadError) {
        return (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
            <div className="text-center p-8">
              <AlertTriangle className="w-16 h-16 mx-auto text-red-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">Failed to load image</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleOpenInNewTab}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Original
                </Button>
                <Button variant="outline" onClick={() => setImageLoadError(false)}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="h-full w-full overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-center min-h-full p-4">
            <img
              src={document.file_url}
              alt={document.title}
              className="max-w-full h-auto object-contain rounded-lg shadow-lg"
              onError={() => setImageLoadError(true)}
              onLoad={() => setImageLoadError(false)}
              loading="lazy"
            />
          </div>
        </div>
      );
    }

    if (fileInfo.type === 'pdf') {
      if (pdfViewMode === 'error') {
        return (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
            <div className="text-center p-8 max-w-lg">
              <AlertTriangle className="w-16 h-16 mx-auto text-orange-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                PDF Preview Unavailable
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This PDF couldn't be displayed in the preview. This might be due to browser restrictions, file permissions, or CORS policies.
                You can still access the file using the options below.
              </p>
              <div className="flex gap-3 justify-center flex-wrap mb-4">
                <Button onClick={handleOpenInNewTab} size="lg">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Open in New Tab
                </Button>
                <Button onClick={handleDownload} variant="outline" size="lg">
                  <Download className="w-5 h-5 mr-2" />
                  Download PDF
                </Button>
              </div>
              <Button onClick={handleRetryPDF} variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        );
      }

      // Only use Google Docs Viewer - it's the most reliable
      const googleDocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(document.file_url)}&embedded=true`;

      return (
        <div className="h-full w-full bg-gray-100 dark:bg-gray-900 flex flex-col">
          {/* View mode indicator */}
          <div className="flex-shrink-0 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Google Docs Viewer
              </Badge>
              {pdfLoading && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading PDF...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInNewTab}
                className="text-xs"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open in New Tab
              </Button>
            </div>
          </div>

          {/* PDF Viewer - Now with proper scrolling */}
          <div className="flex-1 relative" style={{ minHeight: 0 }}>
            {pdfLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-10">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">Loading PDF...</p>
                  <p className="text-xs text-gray-500">Using Google Docs Viewer</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPdfViewMode('error')}
                    className="mt-4 text-xs"
                  >
                    Having trouble? Click here
                  </Button>
                </div>
              </div>
            )}
            <iframe
              key={`${document.id}-google-${loadAttempts}`}
              src={googleDocsViewerUrl}
              className="w-full h-full border-0"
              style={{
                minHeight: '100%',
                overflow: 'auto'
              }}
              title={document.title}
              onError={() => {
                console.error("PDF iframe error");
                setPdfLoading(false);
                if (loadAttempts < 1) {
                  setTimeout(() => {
                    setLoadAttempts(prev => prev + 1);
                    setPdfLoading(true);
                  }, 1000);
                } else {
                  setPdfViewMode('error');
                }
              }}
              onLoad={() => {
                console.log("PDF iframe loaded successfully");
                setTimeout(() => {
                  setPdfLoading(false);
                }, 500);
              }}
            />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full"> {/* Changed root div to flex column */}
      {/* Header - Fixed */}
      <div className="flex items-start justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30"> {/* Updated header styling */}
        <div className="flex-1 min-w-0 mr-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{document.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{document.file_name}</p>
          {/* AI Summary and Link to Assignment buttons moved here */}
          <div className="mt-2 flex items-center gap-2">
            {document.ai_analysis?.analysis_status === 'completed' && document.ai_analysis?.summary && (
              <AISummaryButton
                document={document}
                content={document.ai_analysis.summary + '\n\nKey Points:\n' + (document.ai_analysis.key_points || []).join('\n')}
                type="document"
                title={`Summary: ${document.title}`}
                variant="default"
                size="sm"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLinkDialogOpen(true)}
              className="text-xs"
            >
              <FolderPlus className="w-3 h-3 mr-1" />
              Link to Assignment
            </Button>
            {/* If there was a UI to trigger `handleSaveChanges`, it would go here. E.g.: */}
            {/*
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="text-xs"
            >
              {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              Save Changes
            </Button>
            */}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsFullscreenPreview(true);
            }}
            title="Fullscreen View"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            title="Download File"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>

          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-white dark:bg-gray-900">
        <div className="flex items-center gap-1 px-6">
          <Button
            variant={activeTab === "preview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("preview")}
            className="rounded-b-none"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            variant={activeTab === "details" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("details")}
            className="rounded-b-none"
          >
            <FileText className="w-4 h-4 mr-2" />
            Details
          </Button>
          <Button
            variant={activeTab === "versions" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("versions")}
            className="rounded-b-none"
          >
            <Clock className="w-4 h-4 mr-2" />
            Versions ({(document.version_history?.length || 0) + 1})
          </Button>
          {currentUser && (
            <Button
              variant={activeTab === "comments" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("comments")}
              className="rounded-b-none"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Comments
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {activeTab === "preview" && (
          <div className="h-full">
            {renderDocumentContent()}
          </div>
        )}

        {activeTab === "details" && (
          <ScrollArea className="h-full">
            <div className="space-y-6 max-w-4xl p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium block mb-1">File Size:</span>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {document.file_size ? `${(document.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium block mb-1">File Type:</span>
                  <div className="font-semibold text-gray-900 dark:text-white">{document.file_type || 'Unknown'}</div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium block mb-1">Created:</span>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {document.created_date ? new Date(document.created_date).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium block mb-1">Created By:</span>
                  <div className="font-semibold text-gray-900 dark:text-white truncate">{document.created_by || 'Unknown'}</div>
                </div>
              </div>

              {document.description && (
                <div className="pt-4">
                  <span className="text-gray-500 dark:text-gray-400 font-medium text-sm block mb-2">Description:</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{document.description}</p>
                </div>
              )}

              {document.assigned_to_assignments && document.assigned_to_assignments.length > 0 && (
                <div className="pt-4">
                  <span className="text-gray-500 dark:text-gray-400 font-medium text-sm block mb-2">Linked Assignments:</span>
                  <div className="flex flex-wrap gap-2">
                    {document.assigned_to_assignments.map(assignmentId => {
                      const assignment = assignments.find(a => a.id === assignmentId);
                      return (
                        <span
                          key={assignmentId}
                          className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${
                            assignment
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {assignment ? assignment.name : 'Unknown Assignment'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {activeTab === "versions" && (
          <div className="max-w-4xl mx-auto p-6">
            {currentUser ? (
              <DocumentVersionHistory
                document={document}
                onUpdate={onUpdate}
                currentUser={currentUser}
              />
            ) : (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">Loading version history...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "comments" && currentUser && (
          <div className="max-w-4xl mx-auto p-6">
            <DocumentComments
              document={document}
              currentUser={currentUser}
              assignments={assignments}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <LinkDocumentToAssignmentDialog
        document={document}
        assignments={assignments}
        isOpen={isLinkDialogOpen}
        onClose={() => setIsLinkDialogOpen(false)}
        onSuccess={handleLinkSuccess}
      />

      <Dialog open={isFullscreenPreview} onOpenChange={setIsFullscreenPreview}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="truncate pr-4">{document.title}</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsFullscreenPreview(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            {renderDocumentContent()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
