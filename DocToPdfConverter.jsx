import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
  FileType,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { db } from "@/api/db";

export default function DocToPdfConverter({ documentId }) {
  const [converting, setConverting] = useState(false);
  const [documentData, setDocumentData] = useState(null);
  const [loadingDocument, setLoadingDocument] = useState(true);
  const [documentError, setDocumentError] = useState(null);

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (documentId && currentWorkspaceId) {
      loadDocument();
    } else if (!documentId) {
      setLoadingDocument(false);
      setDocumentError("No document ID provided for conversion.");
      toast.error("Missing Document ID");
    } else if (!currentWorkspaceId) {
      setLoadingDocument(false);
      setDocumentError("Workspace not loaded. Cannot fetch document.");
      toast.error("Workspace Error");
    }
  }, [documentId, currentWorkspaceId]);

  const loadDocument = async () => {
    setLoadingDocument(true);
    setDocumentError(null);
    setDocumentData(null);
    try {
      const docs = await db.entities.Document.filter({
        workspace_id: currentWorkspaceId,
        id: documentId
      }, "-updated_date", 1);

      if (docs.length > 0) {
        // CRITICAL: Validate document is in current workspace
        if (docs[0].workspace_id !== currentWorkspaceId) {
          console.error("Security violation: Document not in current workspace");
          toast.error("Cannot access document from other workspaces");
          setDocumentData(null);
          return;
        }
        setDocumentData(docs[0]);
        toast.success(`Document "${docs[0].title}" loaded.`);
      } else {
        setDocumentError("Document not found or inaccessible.");
        toast.error("Document Not Found");
      }
    } catch (error) {
      console.error("Error loading document:", error);
      setDocumentError(error.message || "Failed to load document.");
      toast.error("Failed to Load Document");
    } finally {
      setLoadingDocument(false);
    }
  };

  const handleConvertToPdf = async () => {
    if (!documentData || !currentWorkspaceId) {
      toast.error("No document or workspace information available for conversion.");
      return;
    }

    // CRITICAL: Double-check workspace before conversion
    if (documentData.workspace_id !== currentWorkspaceId) {
      toast.error("Cannot convert documents from other workspaces");
      console.error("Security violation: Cross-workspace PDF conversion attempt");
      return;
    }

    setConverting(true);
    toast.info("Starting PDF conversion...");

    try {
      const response = await db.functions.invoke('convertDocToPdf', {
        documentId: documentData.id,
        workspaceId: currentWorkspaceId
      });

      if (response.data && response.data.success && response.data.pdfUrl) {
        const link = window.document.createElement('a');
        link.href = response.data.pdfUrl;
        link.download = response.data.filename || `${documentData.title}.pdf`;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);

        toast.success("PDF downloaded successfully!");
      } else {
        const errorMsg = response.data?.error || "PDF conversion failed: No valid PDF URL received.";
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error converting to PDF:", error);
      toast.error(`Conversion Failed: ${error.message || 'Unknown error'}`);
    } finally {
      setConverting(false);
    }
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <FileType className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle>Convert Document to PDF</CardTitle>
            <CardDescription>Convert an existing Word document to PDF format</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Service Status */}
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800 dark:text-green-200">
              <p className="font-medium">CloudConvert Service Active</p>
              <p className="text-xs mt-1">
                Automated conversion powered by CloudConvert API
              </p>
            </div>
          </div>
        </div>

        {/* Document Loading/Error State */}
        {loadingDocument && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-gray-600 dark:text-gray-400 animate-spin" />
            <p className="text-sm text-gray-800 dark:text-gray-200">Loading document...</p>
          </div>
        )}

        {documentError && !loadingDocument && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">Document Error</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">{documentError}</p>
            </div>
          </div>
        )}

        {/* Loaded Document Info */}
        {documentData && !loadingDocument && !documentError && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {documentData.title}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {documentData.file_name || `Document ID: ${documentData.id}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex gap-3">
          <Button
            onClick={handleConvertToPdf}
            disabled={!documentData || converting || loadingDocument || !!documentError || !currentWorkspaceId}
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            {converting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Convert & Download PDF
              </>
            )}
          </Button>
        </div>

        {/* Info Note */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            💡 <strong>Powered by CloudConvert:</strong> Fast, secure document conversion with high-quality output. Your files are processed securely and never stored permanently on conversion servers.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}