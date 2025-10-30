
import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { UploadFile } from "@/api/integrations"; // Keep this for clarity, though `base44.integrations.Core.UploadFile` will be used
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  File,
  RefreshCw,
  FileType, // NEW import
  Zap // NEW import
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox"; // NEW import
import { toast } from "sonner";
import { useWorkspace } from "../workspace/WorkspaceContext";

// File size limit: 100 MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024; // 20 MB
const MAX_RETRIES = 3;
const UPLOAD_TIMEOUT = 300000; // 5 minutes for large files

export default function DocumentUploader({
  assignments = [],
  currentUser,
  selectedFolderPath = "/",
  onUploadComplete,
  existingDocuments = [],
  // NEW PROPS from outline
  assignmentId,
  taskId,
  folder = "/", // New prop, will override selectedFolderPath for new uploads if provided
}) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({}); // Keep existing for multi-file UI

  const { currentWorkspaceId } = useWorkspace(); // ADDED: Get current workspace ID

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Check for oversized files
    const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      const fileList = oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`).join(', ');
      toast.error(`The following files exceed the ${MAX_FILE_SIZE / 1024 / 1024} MB limit: ${fileList}`);
      
      const validFiles = selectedFiles.filter(file => file.size <= MAX_FILE_SIZE);
      if (validFiles.length === 0) return;
      
      const newFiles = validFiles.map(file => {
        // Check if this file is updating an existing document
        const existingDoc = existingDocuments.find(doc => doc.file_name === file.name);
        const fileExtension = file.name.split('.').pop().toLowerCase(); // NEW: Get file extension
        const isConvertible = ['doc', 'docx', 'html', 'htm', 'txt', 'rtf', 'odt'].includes(fileExtension); // NEW: Check if convertible

        return {
          file,
          id: Math.random().toString(36).substr(2, 9),
          title: existingDoc ? existingDoc.title : file.name.replace(/\.[^/.]+$/, ""),
          description: existingDoc ? existingDoc.description : "",
          document_type: existingDoc ? existingDoc.document_type : "other",
          // Use assignmentId prop as default for new files if existingDoc doesn't have it
          assigned_to_assignments: existingDoc 
            ? existingDoc.assigned_to_assignments 
            : (assignmentId ? [assignmentId] : []),
          status: "pending",
          progress: 0,
          error: null,
          retryCount: 0,
          isLargeFile: file.size > LARGE_FILE_THRESHOLD,
          existingDocId: existingDoc ? existingDoc.id : null,
          currentVersion: existingDoc ? existingDoc.version : null,
          needsChangeNotes: !!existingDoc,
          changeNotes: "",
          // ADDED: selected_task_id
          selected_task_id: existingDoc ? existingDoc.selected_task_id : (taskId || null),
          // NEW: PDF Conversion options
          isConvertible: isConvertible,
          convertToPdf: false, // User choice, initially false
          converting: false, // Status for conversion process
          conversionError: null // Error message for conversion
        };
      });
      
      setFiles(prev => [...prev, ...newFiles]);
      
      if (validFiles.length > 0) {
        const updateCount = newFiles.filter(f => f.existingDocId).length;
        const convertibleCount = newFiles.filter(f => f.isConvertible).length; // NEW: count convertible
        if (updateCount > 0) {
          toast.info(`${updateCount} file(s) will update existing documents. ${oversizedFiles.length} file(s) were too large.`);
        } else {
          toast.info(`Added ${validFiles.length} file(s). ${convertibleCount} can be converted to PDF. ${oversizedFiles.length} file(s) were too large.`); // NEW: updated toast
        }
      }
      return;
    }
    
    // All files are valid
    const newFiles = selectedFiles.map(file => {
      const existingDoc = existingDocuments.find(doc => doc.file_name === file.name);
      const fileExtension = file.name.split('.').pop().toLowerCase(); // NEW: Get file extension
      const isConvertible = ['doc', 'docx', 'html', 'htm', 'txt', 'rtf', 'odt'].includes(fileExtension); // NEW: Check if convertible

      return {
        file,
        id: Math.random().toString(36).substr(2, 9),
        title: existingDoc ? existingDoc.title : file.name.replace(/\.[^/.]+$/, ""),
        description: existingDoc ? existingDoc.description : "",
        document_type: existingDoc ? existingDoc.document_type : "other",
        // Use assignmentId prop as default for new files if existingDoc doesn't have it
        assigned_to_assignments: existingDoc 
          ? existingDoc.assigned_to_assignments 
          : (assignmentId ? [assignmentId] : []),
        status: "pending",
        progress: 0,
        error: null,
        retryCount: 0,
        isLargeFile: file.size > LARGE_FILE_THRESHOLD,
        existingDocId: existingDoc ? existingDoc.id : null,
        currentVersion: existingDoc ? existingDoc.version : null,
        needsChangeNotes: !!existingDoc,
        changeNotes: "",
        // ADDED: selected_task_id
        selected_task_id: existingDoc ? existingDoc.selected_task_id : (taskId || null),
        // NEW: PDF Conversion options
        isConvertible: isConvertible,
        convertToPdf: false, // User choice, initially false
        converting: false, // Status for conversion process
        conversionError: null // Error message for conversion
      };
    });
    
    setFiles(prev => [...prev, ...newFiles]);
    
    const updateCount = newFiles.filter(f => f.existingDocId).length;
    const largeFiles = selectedFiles.filter(f => f.size > LARGE_FILE_THRESHOLD);
    const convertibleCount = newFiles.filter(f => f.isConvertible).length; // NEW: count convertible
    
    if (updateCount > 0) {
      toast.info(`${updateCount} file(s) will update existing documents.`);
    }
    if (convertibleCount > 0) {
      toast.info(`${convertibleCount} file(s) can be converted to PDF before uploading.`); // NEW: toast for convertible
    }
    if (largeFiles.length > 0) {
      toast.info(`${largeFiles.length} large file(s) detected. Upload may take several minutes.`);
    }
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const updateFileField = (fileId, field, value) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, [field]: value } : f
    ));
  };

  // NEW: Convert file to PDF using CloudConvert
  const convertFileToPdf = async (fileData) => {
    try {
      // Update status
      setFiles(prev => prev.map(f =>
        f.id === fileData.id ? { ...f, converting: true, conversionError: null, error: null } : f
      ));

      // First upload the original file to our S3, so CloudConvert can access it
      const uploadResult = await base44.integrations.Core.UploadFile({ file: fileData.file });
      const fileUrl = uploadResult.file_url;

      // Call conversion function on the backend
      const response = await base44.functions.invoke('convertUploadToPdf', {
        fileUrl: fileUrl,
        fileName: fileData.file.name,
        workspaceId: currentWorkspaceId
      });

      if (response.data && response.data.success && response.data.pdfUrl) {
        // Download the PDF and create a new File object
        const pdfResponse = await fetch(response.data.pdfUrl);
        const pdfBlob = await pdfResponse.blob();
        const pdfFileName = response.data.filename || `${fileData.title}.pdf`;
        const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });

        // Update the file data with the converted PDF
        setFiles(prev => prev.map(f =>
          f.id === fileData.id ? { 
            ...f, 
            file: pdfFile, // Replace original file with PDF
            // file_name will be updated when creating/updating Document based on new pdfFile.name
            converting: false,
            conversionError: null,
            convertToPdf: false // Mark as converted, so it doesn't try again
          } : f
        ));

        toast.success(`"${fileData.file.name}" converted to PDF successfully!`);
        return true;
      } else {
        throw new Error(response.data?.error || "Conversion failed");
      }
    } catch (error) {
      console.error("Error converting file:", error);
      setFiles(prev => prev.map(f =>
        f.id === fileData.id ? { 
          ...f, 
          converting: false, 
          conversionError: error.message || "Conversion failed",
          error: "PDF conversion failed" // Also set general error to show on card
        } : f
      ));
      toast.error(`Failed to convert "${fileData.file.name}": ${error.message}`);
      return false;
    }
  };


  // Upload with timeout wrapper
  const uploadWithTimeout = async (file, timeoutMs) => {
    return Promise.race([
      base44.integrations.Core.UploadFile({ file }), // Changed to base44 client
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout - file too large or connection too slow')), timeoutMs)
      )
    ]);
  };

  // Retry logic for failed uploads
  const uploadWithRetry = async (fileData, maxRetries = MAX_RETRIES) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt}/${maxRetries} for ${fileData.file.name}`);
          setFiles(prev => prev.map(f =>
            f.id === fileData.id ? { ...f, error: `Retrying... (${attempt}/${maxRetries})` } : f
          ));
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 10000)));
        }
        
        const timeout = fileData.isLargeFile ? UPLOAD_TIMEOUT : 60000; // 5 min for large files, 1 min for normal
        const result = await uploadWithTimeout(fileData.file, timeout);
        return result;
        
      } catch (error) {
        lastError = error;
        console.error(`Upload attempt ${attempt + 1} failed for ${fileData.file.name}:`, error);
        
        // Don't retry if it's a validation error or similar
        if (error.message?.includes('validation') || error.message?.includes('invalid')) {
          throw error;
        }
        
        // If we've exhausted retries, throw the error
        if (attempt === maxRetries) {
          throw lastError;
        }
      }
    }
    
    throw lastError;
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file to upload");
      return;
    }

    const filesWithoutTitle = files.filter(f => !f.title.trim());
    if (filesWithoutTitle.length > 0) {
      toast.error("Please provide titles for all documents");
      return;
    }

    // Check for files that need change notes but don't have them
    const filesNeedingNotes = files.filter(f => f.needsChangeNotes && !f.changeNotes.trim());
    if (filesNeedingNotes.length > 0) {
      toast.error("Please provide change notes for document updates");
      return;
    }

    // ADDED: Workspace ID validation
    if (!currentWorkspaceId) {
        toast.error("No active workspace found. Please select a workspace before uploading documents.");
        setUploading(false);
        return;
    }

    setUploading(true);

    // NEW: First, convert any files that need conversion
    const filesToConvert = files.filter(f => 
      f.isConvertible && f.convertToPdf && f.status === "pending" && !f.converting
    );
    for (const fileData of filesToConvert) {
      const conversionSuccess = await convertFileToPdf(fileData);
      if (!conversionSuccess) {
        // If conversion fails, ask user if they want to continue with original
        const continueWithOriginal = confirm(`Failed to convert "${fileData.file.name}" to PDF. Do you want to upload the original file instead?`);
        if (continueWithOriginal) {
          setFiles(prev => prev.map(f =>
            f.id === fileData.id ? { ...f, convertToPdf: false, conversionError: null, error: null, status: "pending" } : f
          ));
        } else {
          // If user cancels, mark as error and move on
          setFiles(prev => prev.map(f =>
            f.id === fileData.id ? { ...f, status: "error", error: fileData.conversionError || "PDF conversion failed", converting: false } : f
          ));
          continue; // Skip upload for this file
        }
      }
    }

    // Now upload all files (including those that were just converted or whose conversion was skipped)
    for (const fileData of files) {
      // Skip already successful uploads or files that had conversion errors and weren't retried
      if (fileData.status === "success" || (fileData.status === "error" && fileData.conversionError)) {
        continue;
      }

      try {
        // Update status to uploading
        setFiles(prev => prev.map(f =>
          f.id === fileData.id ? { ...f, status: "uploading", progress: 0, error: null } : f
        ));

        // For large files, show slower but more realistic progress
        const progressSpeed = fileData.isLargeFile ? 5 : 10;
        const progressMax = fileData.isLargeFile ? 85 : 90;
        
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map(f => {
            if (f.id === fileData.id && f.progress < progressMax) {
              return { ...f, progress: Math.min(f.progress + progressSpeed, progressMax) };
            }
            return f;
          }));
        }, fileData.isLargeFile ? 500 : 200);

        // Show specific message for large files
        if (fileData.isLargeFile) {
          toast.info(`Uploading large file: ${fileData.file.name}. This may take several minutes...`);
        }

        // Upload file with retry logic
        let file_url;
        try {
          const uploadResult = await uploadWithRetry(fileData);
          file_url = uploadResult.file_url;
        } catch (uploadError) {
          clearInterval(progressInterval);
          
          let errorMessage = "Upload failed";
          console.error("Upload error details:", uploadError);
          
          if (uploadError.message?.includes('timeout')) {
            errorMessage = `Upload timeout - ${fileData.file.name} (${(fileData.file.size / 1024 / 1024).toFixed(1)} MB) took too long. Try a faster connection or smaller file.`;
          } else if (uploadError.message?.includes('network') || uploadError.message?.includes('fetch')) {
            errorMessage = "Network error - please check your internet connection and try again";
          } else if (uploadError.message?.includes('size') || uploadError.message?.includes('too large')) {
            errorMessage = `File too large - server rejected the file. Maximum supported size may be less than ${MAX_FILE_SIZE / 1024 / 1024} MB.`;
          } else if (uploadError.message) {
            errorMessage = uploadError.message;
          }
          
          throw new Error(errorMessage);
        }

        clearInterval(progressInterval);

        // Update to 100% before creating document
        setFiles(prev => prev.map(f =>
          f.id === fileData.id ? { ...f, progress: 100 } : f
        ));

        // If updating existing document, create version history entry
        if (fileData.existingDocId) {
          const existingDoc = existingDocuments.find(d => d.id === fileData.existingDocId);
          
          if (existingDoc) {
            // Calculate new version number with timestamp for robust uniqueness
            const versionParts = (existingDoc.version || "1.0").split('.');
            let major = parseInt(versionParts[0] || '1', 10);
            let minor = parseInt(versionParts[1] || '0', 10);
            
            // Increment minor version for new file content
            minor++;
            const newVersion = `${major}.${minor}.${Date.now()}`;
            
            // Create version history entry for the OLD version
            const versionEntry = {
              file_url: existingDoc.file_url, // URL of the previous file
              version: existingDoc.version || "1.0",
              created_date: new Date().toISOString(),
              created_by: currentUser?.email || "unknown",
              change_notes: fileData.changeNotes || "Document updated"
            };
            
            const updatedVersionHistory = [
              ...(existingDoc.version_history || []),
              versionEntry
            ];
            
            // Update existing document with new file details and version
            await base44.entities.Document.update(fileData.existingDocId, { // Changed to base44 client
              workspace_id: currentWorkspaceId, // ADDED: Workspace scoping
              title: fileData.title,
              description: fileData.description,
              file_url: file_url, // New file URL
              file_name: fileData.file.name, // Use the (possibly converted) file name
              file_size: fileData.file.size, // Use the (possibly converted) file size
              file_type: fileData.file.type, // Use the (possibly converted) file type
              document_type: fileData.document_type,
              assigned_to_assignments: fileData.assigned_to_assignments,
              folder_path: folder || selectedFolderPath, // Use new 'folder' prop if provided, else existing
              version: newVersion,
              version_history: updatedVersionHistory,
              selected_task_id: fileData.selected_task_id || null, // ADDED: selected_task_id
            });
            
            toast.success(`"${fileData.title}" updated to version ${newVersion}`);
          }
        } else {
          // Create new document
          await base44.entities.Document.create({ // Changed to base44 client
            workspace_id: currentWorkspaceId, // ADDED: Workspace scoping
            title: fileData.title,
            description: fileData.description,
            file_url: file_url,
            file_name: fileData.file.name, // Use the (possibly converted) file name
            file_size: fileData.file.size, // Use the (possibly converted) file size
            file_type: fileData.file.type, // Use the (possibly converted) file type
            document_type: fileData.document_type,
            assigned_to_assignments: fileData.assigned_to_assignments,
            folder_path: folder || selectedFolderPath, // Use new 'folder' prop if provided, else existing
            version: "1.0", // Initial version
            version_history: [], // No history yet
            selected_task_id: fileData.selected_task_id || null, // ADDED: selected_task_id
          });
          
          toast.success(`"${fileData.title}" uploaded successfully`);
        }

        // Mark as success
        setFiles(prev => prev.map(f =>
          f.id === fileData.id ? { ...f, status: "success" } : f
        ));

      } catch (error) {
        console.error("Error uploading file:", error);
        const errorMessage = error.message || "Upload failed";
        setFiles(prev => prev.map(f =>
          f.id === fileData.id
            ? { ...f, status: "error", error: errorMessage }
            : f
        ));
        toast.error(`Failed to upload "${fileData.title}": ${errorMessage}`);
      }
    }

    setUploading(false);

    // Check if all uploads were successful
    const allSuccessful = files.every(f =>
      files.find(file => file.id === f.id)?.status === "success"
    );

    if (allSuccessful && files.length > 0) {
      toast.success(`All ${files.length} document(s) uploaded successfully`);
      if (onUploadComplete) {
        onUploadComplete();
      }
    } else {
      const failedCount = files.filter(f => 
        files.find(file => file.id === f.id)?.status === "error"
      ).length;
      if (failedCount > 0) {
        toast.warn(`${failedCount} document(s) failed to upload. You can retry them individually.`);
      }
    }
  };

  // Retry individual file
  const retryFile = async (fileId) => {
    const fileData = files.find(f => f.id === fileId);
    if (!fileData) return;
    
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: "pending", error: null, retryCount: f.retryCount + 1, conversionError: null, converting: false } : f
    ));
    
    // Trigger upload for this file by calling handleUpload.
    // It will iterate through all files, but only process those not yet successful.
    await handleUpload();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "uploading":
        return "border-blue-200 bg-blue-50 dark:bg-blue-950/20";
      case "success":
        return "border-green-200 bg-green-50 dark:bg-green-950/20";
      case "error":
        return "border-red-200 bg-red-50 dark:bg-red-950/20";
      default:
        return "border-gray-200 bg-white dark:bg-gray-900";
    }
  };

  const pendingFiles = files.filter(f => f.status === "pending" && !f.converting).length;
  const uploadingFiles = files.filter(f => f.status === "uploading" || f.converting).length; // Consider converting as part of uploading status for summary
  const successFiles = files.filter(f => f.status === "success").length;
  const errorFiles = files.filter(f => f.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Upload Summary */}
      {files.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-6">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Total: {files.length} file(s)
            </div>
            {successFiles > 0 && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {successFiles} Completed
              </Badge>
            )}
            {uploadingFiles > 0 && (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {uploadingFiles} Uploading
              </Badge>
            )}
            {errorFiles > 0 && (
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                {errorFiles} Failed
              </Badge>
            )}
            {pendingFiles > 0 && (
              <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300">
                <FileText className="w-3 h-3 mr-1" />
                {pendingFiles} Pending
              </Badge>
            )}
          </div>
          {!uploading && (pendingFiles === 0 && errorFiles === 0) && successFiles === files.length && files.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFiles([]);
                setUploadProgress({});
                if (onUploadComplete) {
                  onUploadComplete();
                }
              }}
              className="rounded-xl"
            >
              Done
            </Button>
          )}
        </div>
      )}

      {/* File Input */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Upload Documents
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Drag and drop files here, or click to browse
        </p>
        <Input
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={uploading}
          className="max-w-xs mx-auto"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Supports all file types. Maximum {MAX_FILE_SIZE / 1024 / 1024} MB per file.
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          ⚠️ Files over {LARGE_FILE_THRESHOLD / 1024 / 1024} MB may take several minutes to upload
        </p>
      </div>

      {/* File List with Progress */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Selected Files ({files.length})
          </h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {files.map((fileData) => (
              <Card
                key={fileData.id}
                className={`transition-all ${getStatusColor(fileData.status)} border-2`}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* File Header */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border">
                        {getStatusIcon(fileData.status)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {fileData.file.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                              {fileData.isLargeFile && (
                                <Badge variant="outline" className="text-[10px] px-1">
                                  Large File
                                </Badge>
                              )}
                              {fileData.existingDocId && (
                                <Badge className="text-[10px] px-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                  Update v{fileData.currentVersion || "1.0"}
                                </Badge>
                              )}
                              {fileData.retryCount > 0 && (
                                <Badge variant="outline" className="text-[10px] px-1">
                                  Retry #{fileData.retryCount}
                                </Badge>
                              )}
                              {fileData.isConvertible && ( // NEW: Convertible badge
                                <Badge className="text-[10px] px-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                  <FileType className="w-3 h-3 mr-1" />
                                  Convertible
                                </Badge>
                              )}
                            </p>
                          </div>

                          {fileData.status === "pending" && !uploading && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(fileData.id)}
                              className="flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          {fileData.status === "error" && !uploading && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => retryFile(fileData.id)}
                                className="flex-shrink-0"
                                title="Retry upload"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(fileData.id)}
                                className="flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* NEW: PDF Conversion Option */}
                        {fileData.isConvertible && fileData.status === "pending" && !fileData.converting && (
                          <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`convert-${fileData.id}`}
                                checked={fileData.convertToPdf}
                                onCheckedChange={(checked) => updateFileField(fileData.id, "convertToPdf", checked)}
                                disabled={uploading}
                              />
                              <label
                                htmlFor={`convert-${fileData.id}`}
                                className="text-sm font-medium text-green-800 dark:text-green-300 cursor-pointer flex items-center gap-2"
                              >
                                <Zap className="w-4 h-4" />
                                Convert to PDF before uploading
                              </label>
                            </div>
                            <p className="text-xs text-green-700 dark:text-green-400 mt-1 ml-6">
                              (This will convert to PDF/A format using CloudConvert)
                            </p>
                          </div>
                        )}

                        {/* NEW: Converting Status */}
                        {fileData.converting && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Converting to PDF...</span>
                            </div>
                          </div>
                        )}

                        {/* NEW: Conversion Error */}
                        {fileData.conversionError && !fileData.converting && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                            <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium">PDF Conversion Failed</p>
                                <p className="text-xs mt-1">{fileData.conversionError}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Progress Bar */}
                        {fileData.status === "uploading" && (
                          <div className="mt-2">
                            <Progress value={fileData.progress} className="h-2" />
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Uploading... {fileData.progress}%
                              {fileData.isLargeFile && " (Large file - please wait)"}
                            </p>
                          </div>
                        )}

                        {/* Error Message */}
                        {fileData.status === "error" && fileData.error && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                            <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="font-medium">Upload Failed</p>
                                <p className="text-xs mt-1">{fileData.error}</p>
                                {fileData.isLargeFile && (
                                  <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
                                    💡 Tip: Try uploading this large file over a more stable connection, or compress it first.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Success Message */}
                        {fileData.status === "success" && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Upload complete</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Form Fields (only for pending or error files) */}
                    {(fileData.status === "pending" || fileData.status === "error") && (
                      <div className="grid gap-3 pt-3 border-t">
                        <div>
                          <Label htmlFor={`title-${fileData.id}`}>Document Title *</Label>
                          <Input
                            id={`title-${fileData.id}`}
                            value={fileData.title}
                            onChange={(e) => updateFileField(fileData.id, "title", e.target.value)}
                            placeholder="Enter document title"
                            disabled={uploading || fileData.converting}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`description-${fileData.id}`}>Description</Label>
                          <Textarea
                            id={`description-${fileData.id}`}
                            value={fileData.description}
                            onChange={(e) => updateFileField(fileData.id, "description", e.target.value)}
                            placeholder="Enter document description"
                            disabled={uploading || fileData.converting}
                            rows={2}
                            className="mt-1"
                          />
                        </div>

                        {/* Change Notes for Updates */}
                        {fileData.needsChangeNotes && (
                          <div>
                            <Label htmlFor={`changeNotes-${fileData.id}`} className="text-blue-700 dark:text-blue-300">
                              Change Notes * (What changed in this version?)
                            </Label>
                            <Textarea
                              id={`changeNotes-${fileData.id}`}
                              value={fileData.changeNotes}
                              onChange={(e) => updateFileField(fileData.id, "changeNotes", e.target.value)}
                              placeholder="Describe what changed in this version..."
                              disabled={uploading || fileData.converting}
                              rows={2}
                              className="mt-1 border-blue-300 dark:border-blue-700"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Document Type</Label>
                            <Select
                              value={fileData.document_type}
                              onValueChange={(value) => updateFileField(fileData.id, "document_type", value)}
                              disabled={uploading || fileData.converting}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="contract">Contract</SelectItem>
                                <SelectItem value="specification">Specification</SelectItem>
                                <SelectItem value="design">Design</SelectItem>
                                <SelectItem value="report">Report</SelectItem>
                                <SelectItem value="presentation">Presentation</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Link to Assignment(s)</Label>
                            <Select
                              value={fileData.assigned_to_assignments[0] || "none"}
                              onValueChange={(value) => {
                                const assignments = value === "none" ? [] : [value];
                                updateFileField(fileData.id, "assigned_to_assignments", assignments);
                              }}
                              disabled={uploading || fileData.converting}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select assignment" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Assignment</SelectItem>
                                {assignments.map(assignment => (
                                  <SelectItem key={assignment.id} value={assignment.id}>
                                    {assignment.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (pendingFiles > 0 || errorFiles > 0 || files.some(f => f.converting)) && ( // Adjusted condition to include converting state
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {pendingFiles} file(s) pending{errorFiles > 0 && `, ${errorFiles} failed`}
            </p>
            {files.some(f => f.isLargeFile && (f.status === "pending" || f.status === "error" || f.converting)) && ( // Adjusted condition
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ Large files may take 5-10 minutes to upload
              </p>
            )}
            {files.some(f => f.convertToPdf && (f.status === "pending" || f.converting)) && ( // NEW: message about conversion
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✨ {files.filter(f => f.convertToPdf).length} file(s) will be converted to PDF first
              </p>
            )}
          </div>
          <Button
            onClick={handleUpload}
            disabled={uploading || (pendingFiles === 0 && errorFiles === 0)}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload {pendingFiles + errorFiles} Document{(pendingFiles + errorFiles) !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
