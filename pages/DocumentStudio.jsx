
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { db } from "@/api/db";
import { Document } from "@/api/entities";
import { Assignment } from "@/api/entities";
import { Task } from "@/api/entities";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  FileText,
  Save,
  Eye,
  Wand2,
  Image as ImageIcon,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Clock,
  Brain,
  FileUp,
  Upload,
  CheckCircle,
  X,
  Users,
  Info,
  ChevronDown,
  FolderOpen,
  Lightbulb
} from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "@/components/editor/RichTextEditor";
import { Checkbox } from "@/components/ui/checkbox";

import OutlineGenerator from "@/features/ai/OutlineGenerator";
import AIReviewPanel from "@/features/ai/AIReviewPanel";
import ExportOptions from "@/features/documents/ExportOptions";
import AudienceRewriter from "@/features/ai/AudienceRewriter";
import AIImageGenerator from "@/features/ai/AIImageGenerator";
import ConversationalAssistant from "@/features/ai/ConversationalAssistant";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { createPageUrl } from "@/lib/utils";

const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export default function DocumentStudioPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const documentId = searchParams.get("id");

  const fromResearch = searchParams.get("fromResearch");
  const researchAssignmentId = searchParams.get("assignmentId");
  const researchAssignmentName = searchParams.get("assignmentName");
  const researchQuestion = searchParams.get("researchQuestion");
  const suggestedDocTitle = searchParams.get("suggestedDocTitle");
  const recommendedActionsStr = searchParams.get("recommendedActions");
  const researchSummary = searchParams.get("researchSummary");

  const [sessionId] = useState(() =>
    documentId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [isPreview, setIsPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [currentDocumentVersion, setCurrentDocumentVersion] = useState("1.0");

  const [isOutlineDialogOpen, setIsOutlineDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("assistant");

  // AI Generation states
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // New state for PDF conversion
  const [saveAsPdf, setSaveAsPdf] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // New state for existing document references
  const [selectedExistingDocs, setSelectedExistingDocs] = useState([]);
  const [availableDocsForReference, setAvailableDocsForReference] = useState([]);

  // Tools tab section states
  const [refDocsExpanded, setRefDocsExpanded] = useState(true);
  const [imageGenExpanded, setImageGenExpanded] = useState(true);

  const autosaveTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (currentWorkspaceId) {
      loadInitialData();
      if (!documentId && fromResearch !== "true") {
        checkForDraftRecovery();
      }
    } else {
      setLoading(true);
    }
  }, [documentId, fromResearch, currentWorkspaceId]);

  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      if (title.trim() && content.trim()) {
        handleAutosave();
      }
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [title, description, content, selectedAssignments, selectedTask, tags, sessionId]);

  // Add this useEffect to debug what's being passed
  useEffect(() => {
    if (selectedAssignments.length > 0) {
      const filteredTasks = tasks.filter(t => t.assignment_id === selectedAssignments[0]);
      console.log('DocumentStudio - Assignment selected:', {
        assignmentId: selectedAssignments[0],
        assignmentName: assignments.find(a => a.id === selectedAssignments[0])?.name,
        totalTasks: tasks.length,
        filteredTasks: filteredTasks.length,
        tasks: filteredTasks
      });
    }
  }, [selectedAssignments, tasks, assignments]);

  const checkForDraftRecovery = () => {
    const draftKey = `doc_draft_${sessionId}`;
    const draftStr = localStorage.getItem(draftKey);

    if (!draftStr) return;

    try {
      const draft = JSON.parse(draftStr);
      const draftAge = Date.now() - new Date(draft.timestamp).getTime();

      if (draftAge < 24 * 60 * 60 * 1000) {
        const contentLength = draft.content?.length || 0;
        const recover = window.confirm(
          `Found unsaved draft from ${new Date(draft.timestamp).toLocaleString()}.\n\n` +
          `Title: "${draft.title || 'Untitled'}"\n` +
          `Length: ${contentLength} characters\n\n` +
          `Recover this draft?`
        );

        if (recover) {
          setTitle(draft.title || "");
          setDescription(draft.description || "");
          setContent(draft.content || "");
          setSelectedAssignments(draft.selectedAssignments || []);
          setSelectedTask(draft.selectedTask || "");
          setTags(draft.tags || []);
          toast.success("Draft recovered!");
        } else {
          localStorage.removeItem(draftKey);
        }
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch (error) {
      console.error("Error recovering draft:", error);
      localStorage.removeItem(draftKey);
    }
  };

  const loadInitialData = useCallback(async () => {
    if (!currentWorkspaceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [assignmentsData, projectsData, tasksData, allDocuments, user] = await Promise.all([
        Assignment.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        db.entities.Project.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        Task.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        Document.filter({ workspace_id: currentWorkspaceId }, "-updated_date", 100),
        db.auth.me()
      ]);

      setAssignments(assignmentsData || []);
      setProjects(projectsData || []);
      setTasks(tasksData || []);
      setCurrentUser(user);

      // Filter documents for reference selection (exclude current doc and folder placeholders)
      const docsForReference = (allDocuments || []).filter(doc => 
        doc.id !== documentId && 
        doc.document_type !== 'folder_placeholder' &&
        doc.file_url // Only include documents with actual files
      );
      setAvailableDocsForReference(docsForReference);

      const assignmentIdFromUrl = searchParams.get('assignment');
      const taskIdFromUrl = searchParams.get('task');

      if (documentId) {
        const doc = allDocuments.find(d => d.id === documentId);
        if (doc) {
          setTitle(doc.title || "");
          setDescription(doc.description || "");
          setContent(doc.content || "");
          setSelectedAssignments(doc.assigned_to_assignments || []);
          setSelectedProject(doc.assigned_to_project || null);
          setSelectedTask(doc.selected_task_id || "");
          setTags(doc.tags || []);
          setLastSaved(doc.updated_date);
          setCurrentDocumentVersion(doc.version || "1.0");

          // Load saved reference documents (uploaded)
          if (doc.reference_document_urls && doc.reference_document_urls.length > 0) {
            const loadedUploadedDocs = doc.reference_document_urls.map((url, index) => ({
              id: `saved_${index}_${Date.now()}`,
              name: `Reference Document ${index + 1}`,
              url: url,
              includedInContext: true,
              source: 'saved'
            }));
            setUploadedDocuments(loadedUploadedDocs);
          }

          // Load linked existing documents
          if (doc.linked_document_ids && doc.linked_document_ids.length > 0) {
            const linkedDocs = doc.linked_document_ids
              .map(docId => {
                const linkedDoc = allDocuments.find(d => d.id === docId);
                if (linkedDoc) {
                  return {
                    id: linkedDoc.id,
                    name: linkedDoc.title || linkedDoc.file_name,
                    url: linkedDoc.file_url,
                    type: linkedDoc.file_type || 'unknown',
                    source: 'existing'
                  };
                }
                return null;
              })
              .filter(Boolean);
            setSelectedExistingDocs(linkedDocs);
          }
        } else {
          toast.error("Document not found or not part of this workspace.");
          navigate("/dashboard");
          return;
        }
      } else if (fromResearch === "true") {
        setTitle(suggestedDocTitle || "Research Document");
        setSelectedAssignments(researchAssignmentId && assignmentsData.some(a => a.id === researchAssignmentId) ? [researchAssignmentId] : []);

        let initialDescription = "";
        if (researchQuestion) {
          initialDescription += `Research Question: ${researchQuestion}\n\n`;
        }
        if (researchSummary) {
          initialDescription += `Research Summary:\n${researchSummary}\n\n`;
        }
        if (recommendedActionsStr) {
          try {
            const actions = JSON.parse(decodeURIComponent(recommendedActionsStr));
            if (actions && actions.length > 0) {
              initialDescription += `Recommended Actions:\n`;
              actions.forEach((action, idx) => {
                initialDescription += `${idx + 1}. ${action.action} (Priority: ${action.priority || 'N/A'})\n`;
              });
            }
          } catch (e) {
            console.error("Error parsing recommended actions:", e);
            initialDescription += `Recommended Actions: ${decodeURIComponent(recommendedActionsStr)}\n\n`;
          }
        }
        setDescription(initialDescription.trim());
        setCurrentDocumentVersion("1.0");

        toast.success(`Document initialized from research about: ${researchAssignmentName || "your project"}`);
      } else {
        if (assignmentIdFromUrl && assignmentsData.find(a => a.id === assignmentIdFromUrl)) {
          setSelectedAssignments([assignmentIdFromUrl]);
        }

        if (taskIdFromUrl && tasksData.find(t => t.id === taskIdFromUrl)) {
          setSelectedTask(taskIdFromUrl);
          const task = tasksData.find(t => t.id === taskIdFromUrl);
          if (task && task.assignment_id && !selectedAssignments.includes(task.assignment_id)) {
            setSelectedAssignments(prev => prev.length > 0 ? [...prev, task.assignment_id] : [task.assignment_id]);
          }
        }
        setCurrentDocumentVersion("1.0");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, documentId, fromResearch, researchAssignmentId, suggestedDocTitle, researchAssignmentName, researchQuestion, researchSummary, recommendedActionsStr, searchParams, navigate]);

  const handleAutosave = async () => {
    try {
      const draftKey = `doc_draft_${sessionId}`;
      localStorage.setItem(draftKey, JSON.stringify({
        title,
        description,
        content,
        selectedAssignments,
        selectedTask,
        tags,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error("Autosave failed:", error);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a document title");
      return;
    }

    const stripHtml = (html) => {
      if (!html) return "";
      return html.replace(/<[^>]*>/g, '').trim();
    };

    const plainContent = stripHtml(content);

    if (!content || plainContent.length < 10) {
      const confirm = window.confirm(
        "Your document has very little content. Are you sure you want to save?"
      );
      if (!confirm) return;
    }

    if (!currentWorkspaceId) {
      toast.error("Cannot save document: No active workspace selected.");
      return;
    }

    try {
      setIsSaving(true);
      
      if (saveAsPdf) {
        setIsConverting(true);
      }

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1, h2, h3 { color: #333; margin-top: 1.5em; }
    p { margin: 1em 0; }
    ul, ol { margin: 1em 0; padding-left: 2em; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;

      let fileUrl = null;
      let documentFileNameBase = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
      let finalFileName = `${documentFileNameBase}.html`;
      let finalFileType = 'text/html';

      // First, upload the HTML file
      const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
      const htmlFile = new File([blob], finalFileName, { type: 'text/html' });

      try {
        const uploadResult = await db.integrations.Core.UploadFile({ file: htmlFile });
        fileUrl = uploadResult.file_url;

        // If user wants PDF, convert it
        if (saveAsPdf) {
          toast.info("Converting document to PDF...", { duration: 3000 });
          
          const convertResponse = await db.functions.invoke('convertUploadToPdf', {
            fileUrl: fileUrl,
            fileName: finalFileName, // Pass original HTML filename for context
            workspaceId: currentWorkspaceId
          });

          if (convertResponse.data?.success && convertResponse.data?.pdfUrl) {
            fileUrl = convertResponse.data.pdfUrl;
            finalFileName = convertResponse.data.filename || `${documentFileNameBase}.pdf`;
            finalFileType = 'application/pdf';
            toast.success("Document converted to PDF successfully");
          } else {
            throw new Error(convertResponse.data?.error || "PDF conversion failed");
          }
        }
      } catch (uploadError) {
        console.error("File upload/conversion error:", uploadError);
        toast.warning("File upload/conversion failed, saving content only.");
        fileUrl = null; // Reset fileUrl if conversion failed
      } finally {
        setIsConverting(false);
      }

      const documentData = {
        title: title.trim(),
        description: description.trim() || "",
        content,
        document_type: "other",
        assigned_to_assignments: selectedAssignments,
        assigned_to_project: selectedProject || null,
        selected_task_id: selectedTask || null,
        tags: tags || [],
        folder_path: "/created",
        file_url: fileUrl,
        file_name: finalFileName,
        file_type: finalFileType,
        reference_document_urls: uploadedDocuments.filter(d => d.includedInContext).map(d => d.url),
        linked_document_ids: selectedExistingDocs.map(d => d.id)
      };

      if (documentId) {
        const changeNotes = prompt(
          "Describe what changed in this version (optional):",
          ""
        ) || "No description provided";

        const existingDoc = await Document.get(documentId);

        const newVersion = {
          content: existingDoc.content,
          file_url: existingDoc.file_url,
          version: existingDoc.version || "1.0",
          created_date: existingDoc.updated_date,
          created_by: existingDoc.created_by,
          change_notes: changeNotes,
          updated_by: currentUser?.email || "unknown",
          updated_date: new Date().toISOString()
        };

        const versionHistory = Array.isArray(existingDoc.version_history)
          ? [...existingDoc.version_history, newVersion]
          : [newVersion];

        const [major, minor] = (existingDoc.version || "1.0").split('.').map(Number);
        const contentLengthChange = Math.abs(content.length - (existingDoc.content?.length || 0));
        const isMajorChange = changeNotes.toLowerCase().includes('major') ||
                              contentLengthChange > (existingDoc.content?.length || 0) * 0.5;
        const newVersionNumber = isMajorChange ?
          `${major + 1}.0` : `${major}.${minor + 1}`;

        await Document.update(documentId, {
          ...documentData,
          version: newVersionNumber,
          version_history: versionHistory
        });

        toast.success(`Document updated to version ${newVersionNumber}${saveAsPdf && fileUrl ? ' (PDF)' : ''}`);
        setCurrentDocumentVersion(newVersionNumber);
        setLastSaved(new Date().toISOString());

      } else {
        const newDoc = await Document.create({
          ...documentData,
          workspace_id: currentWorkspaceId,
          version: "1.0"
        });

        const draftKey = `doc_draft_${sessionId}`;
        localStorage.removeItem(draftKey);

        navigate(`?id=${newDoc.id}`, { replace: true });
        toast.success(`Document created successfully${saveAsPdf && fileUrl ? ' as PDF' : ''}!`);
        setLastSaved(new Date().toISOString());
      }

    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save document: " + (error.message || "Unknown error"));
    } finally {
      setIsSaving(false);
      setIsConverting(false);
    }
  };

  const handleInsertContent = useCallback((newContent) => {
    // Append the new content into the document
    // Since we're using a simple textarea-based editor, we append to the content
    setContent(prevContent => {
      const separator = prevContent.trim() ? '\n\n' : '';
      return prevContent + separator + newContent;
    });
    toast.success("Content inserted");
  }, []);

  const handleInsertImage = useCallback((imageUrl) => {
    // Insert image as HTML img tag
    const imgHtml = `<img src="${imageUrl}" alt="Generated image" style="max-width: 100%; height: auto;" />`;
    setContent(prevContent => {
      const separator = prevContent.trim() ? '\n\n' : '';
      return prevContent + separator + imgHtml;
    });
    toast.success("Image inserted");
  }, []);

  const handleApplyOutline = (outlineHtml) => {
    setContent(outlineHtml);
    setIsOutlineDialogOpen(false);
    toast.success("Outline applied to document");
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFile(true);

    try {
      for (const file of files) {
        const { file_url } = await db.integrations.Core.UploadFile({ file });

        const newDoc = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: file_url,
          includedInContext: true,
          source: 'uploaded'
        };

        setUploadedDocuments(prev => [...prev, newDoc]);
        toast.success(`${file.name} uploaded successfully`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveDocument = (docId) => {
    setUploadedDocuments(prev => prev.filter(d => d.id !== docId));
    toast.success("Document removed");
  };

  const handleAddExistingDoc = (docId) => {
    const doc = availableDocsForReference.find(d => d.id === docId);
    if (!doc) return;

    // Check if already added
    if (selectedExistingDocs.some(d => d.id === docId)) {
      toast.info("Document already added as reference");
      return;
    }

    setSelectedExistingDocs(prev => [...prev, {
      id: doc.id,
      name: doc.title || doc.file_name,
      url: doc.file_url,
      type: doc.file_type || 'unknown',
      source: 'existing'
    }]);
    
    toast.success(`${doc.title} added as reference`);
  };

  const handleRemoveExistingDoc = (docId) => {
    setSelectedExistingDocs(prev => prev.filter(d => d.id !== docId));
    toast.success("Reference document removed");
  };

  // Combine uploaded and existing docs for AI context
  const getAllReferenceDocuments = () => {
    return [
      ...uploadedDocuments.filter(d => d.includedInContext).map(d => d.url),
      ...selectedExistingDocs.map(d => d.url)
    ];
  };


  const handleUseInGenerator = () => {
    // Save current document state to sessionStorage for the generator
    const documentState = {
      title,
      description,
      content,
      selectedAssignments,
      selectedTask,
      tags,
      fromStudio: true,
      timestamp: Date.now()
    };
    
    sessionStorage.setItem('studio_document_transfer', JSON.stringify(documentState));
    
    // Navigate to generator
    const assignmentId = selectedAssignments[0];
    const url = assignmentId 
      ? `${createPageUrl("Generate")}?assignment=${assignmentId}&fromStudio=true`
      : `${createPageUrl("Generate")}?fromStudio=true`;
    
    navigate(url);
    
    toast.success("Document transferred to AI Generator");
  };

  const availableTasks = selectedAssignments.length > 0
    ? tasks.filter(task => task.assignment_id === selectedAssignments[0])
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-indigo-600">Loading document studio...</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : ''}`}>
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title || "Untitled Document"}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {lastSaved && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Saved {new Date(lastSaved).toLocaleTimeString()}
                  </span>
                )}
                {isSaving && !isConverting && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                )}
                {isConverting && (
                  <span className="text-xs text-purple-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Converting to PDF...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="hidden md:flex"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {isPreview ? "Edit" : "Preview"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleUseInGenerator}
              disabled={!content || content.trim().length < 50}
              title={!content || content.trim().length < 50 ? "Add at least 50 characters of content first" : "Use this document in AI Generator for advanced refinement"}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Use in Generator
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportDialogOpen(true)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            {/* New PDF conversion checkbox */}
            <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-white dark:bg-gray-800">
              <Checkbox
                id="save-as-pdf"
                checked={saveAsPdf}
                onCheckedChange={setSaveAsPdf}
                disabled={isSaving || isConverting}
              />
              <label
                htmlFor="save-as-pdf"
                className="text-xs font-medium cursor-pointer select-none"
              >
                Save as PDF
              </label>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving || isConverting || !title.trim() || !currentWorkspaceId}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!title.trim() ? "Please enter a document title first" : (!currentWorkspaceId ? "No active workspace selected" : "Save document")}
            >
              {isSaving || isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isConverting ? 'Converting...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex flex-wrap gap-3 mt-4">
          <Select
            value={selectedProject || "none"}
            onValueChange={(value) => setSelectedProject(value === "none" ? null : value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Link to Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Project</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedAssignments[0] || "none"}
            onValueChange={(value) => {
              setSelectedAssignments(value === "none" ? [] : [value]);
              setSelectedTask("");
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Link to Assignment" />
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

          {selectedAssignments.length > 0 && availableTasks.length > 0 && (
            <Select value={selectedTask || "none"} onValueChange={(value) => setSelectedTask(value === "none" ? "" : value)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Link to Task (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Task</SelectItem>
                {availableTasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-600">
                  ×
                </button>
              </Badge>
            ))}
            <Input
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="w-32 h-7 text-sm"
            />
          </div>

          {documentId && currentDocumentVersion && (
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              Version {currentDocumentVersion}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor/Preview */}
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-6 overflow-hidden">
          {isPreview ? (
            <div className="flex-1 overflow-auto p-6">
              <Card className="max-w-4xl mx-auto">
                <CardContent className="pt-6">
                  <h1 className="text-3xl font-bold mb-4">{title || "Untitled Document"}</h1>
                  {description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 border-l-4 border-indigo-500 pl-4 italic">{description}</p>
                  )}
                  <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content || '') }}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Document Title
                </label>
                <Input
                  placeholder="Enter document title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-semibold"
                />
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Brief Description (optional)
                </label>
                <Textarea
                  placeholder="Add a brief description of this document..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-20"
                />
              </div>

              <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden flex flex-col">
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Start writing your document..."
                  minHeight="100%"
                  className="flex-1 h-full"
                />
              </div>
            </>
          )}
        </div>

        {/* AI Tools Sidebar */}
        {!isPreview && (
          <div className="w-[427px] border-l border-gray-200 dark:border-gray-800 overflow-y-auto bg-white dark:bg-gray-900">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="w-full grid grid-cols-3 border-b border-gray-200 dark:border-gray-800 rounded-none">
                <TabsTrigger value="assistant" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none">
                  <Brain className="w-4 h-4 mr-1" />
                  Assistant
                </TabsTrigger>
                <TabsTrigger value="review" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Review
                </TabsTrigger>
                <TabsTrigger value="tools" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none">
                  <FileUp className="w-4 h-4 mr-1" />
                  Tools
                </TabsTrigger>
              </TabsList>

              <div className="p-6 space-y-6">
                <TabsContent value="assistant" className="mt-0 h-[calc(100vh-200px)]">
                  <ConversationalAssistant
                    content={content}
                    title={title}
                    description={description}
                    selectedAssignment={selectedAssignments[0]}
                    selectedTask={selectedTask}
                    assignments={assignments}
                    tasks={tasks}
                    onInsertContent={handleInsertContent}
                    referenceDocumentUrls={getAllReferenceDocuments()}
                  />
                </TabsContent>

                <TabsContent value="review" className="mt-0 space-y-6">
                  <AIReviewPanel
                    content={content}
                    title={title}
                    description={description}
                    selectedAssignment={selectedAssignments[0]}
                    selectedTask={selectedTask}
                    assignments={assignments}
                    tasks={tasks}
                    referenceDocumentUrls={getAllReferenceDocuments()}
                  />

                  <div className="border-t pt-6">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-600" />
                      Audience Rewriter
                    </h3>
                    <AudienceRewriter
                      document={documentId ? {
                        id: documentId,
                        content: content,
                        title: title,
                        workspace_id: currentWorkspaceId,
                        version: currentDocumentVersion,
                        created_by: currentUser?.email
                      } : null}
                      onRewriteComplete={(rewrittenContent) => {
                        setContent(rewrittenContent);
                        toast.success("Content rewritten for selected audience");
                      }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="tools" className="mt-0 space-y-4">
                  {/* Context Usage Indicator */}
                  <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
                      Reference documents provide context to <strong>Assistant</strong>, <strong>Review</strong>, and <strong>Image Generator</strong> for smarter AI responses.
                    </AlertDescription>
                  </Alert>

                  {/* Reference Documents Card */}
                  <Card className="border shadow-sm">
                    <CardHeader
                      className="py-3 px-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      onClick={() => setRefDocsExpanded(!refDocsExpanded)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-sm">Reference Documents</span>
                          {(uploadedDocuments.length + selectedExistingDocs.length) > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {uploadedDocuments.length + selectedExistingDocs.length}
                            </Badge>
                          )}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${refDocsExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </CardHeader>

                    {refDocsExpanded && (
                      <CardContent className="pt-0 pb-4 px-4 space-y-4">
                        {/* Empty State */}
                        {uploadedDocuments.length === 0 && selectedExistingDocs.length === 0 ? (
                          <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                            <FolderOpen className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No reference documents</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 mb-4 max-w-[200px] mx-auto">
                              Add documents to help AI generate charts, visualizations, and context-aware content
                            </p>
                            <div className="flex gap-2 justify-center">
                              <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileUpload}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.txt,.md"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFile}
                              >
                                {uploadingFile ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Upload className="w-3 h-3 mr-1" />
                                )}
                                Upload
                              </Button>
                              <Select onValueChange={handleAddExistingDoc}>
                                <SelectTrigger className="w-auto h-8 text-xs">
                                  <FolderOpen className="w-3 h-3 mr-1" />
                                  <span>Library</span>
                                </SelectTrigger>
                                <SelectContent>
                                  {availableDocsForReference.length === 0 ? (
                                    <SelectItem value="none" disabled>No documents</SelectItem>
                                  ) : (
                                    availableDocsForReference.map(doc => (
                                      <SelectItem key={doc.id} value={doc.id}>
                                        {doc.title || doc.file_name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* File Type Hints */}
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Supports PDF, Word, TXT, Markdown files
                            </p>

                            {/* Upload & Select Row */}
                            <div className="flex gap-2">
                              <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileUpload}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.txt,.md"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFile}
                              >
                                {uploadingFile ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3 h-3 mr-1" />
                                    Upload
                                  </>
                                )}
                              </Button>
                              <Select onValueChange={handleAddExistingDoc}>
                                <SelectTrigger className="flex-1 h-8 text-xs">
                                  <FolderOpen className="w-3 h-3 mr-1" />
                                  <span>From Library</span>
                                </SelectTrigger>
                                <SelectContent>
                                  {availableDocsForReference.length === 0 ? (
                                    <SelectItem value="none" disabled>No documents</SelectItem>
                                  ) : (
                                    availableDocsForReference.map(doc => (
                                      <SelectItem key={doc.id} value={doc.id}>
                                        <div className="flex flex-col">
                                          <span className="font-medium">{doc.title || doc.file_name}</span>
                                          <span className="text-xs text-gray-500">
                                            {doc.document_type || 'document'}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Active References List */}
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                              {/* Uploaded Documents */}
                              {uploadedDocuments.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Uploaded</p>
                                  {uploadedDocuments.map(doc => (
                                    <div
                                      key={doc.id}
                                      className="flex items-center justify-between p-2 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                        <span className="text-sm truncate">{doc.name}</span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 flex-shrink-0 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                        onClick={() => handleRemoveDocument(doc.id)}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Library Documents */}
                              {selectedExistingDocs.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">From Library</p>
                                  {selectedExistingDocs.map(doc => (
                                    <div
                                      key={doc.id}
                                      className="flex items-center justify-between p-2 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        <span className="text-sm truncate">{doc.name}</span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 flex-shrink-0 hover:bg-green-100 dark:hover:bg-green-900/50"
                                        onClick={() => handleRemoveExistingDoc(doc.id)}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    )}
                  </Card>

                  {/* AI Image Generator Card */}
                  <Card className="border shadow-sm">
                    <CardHeader
                      className="py-3 px-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      onClick={() => setImageGenExpanded(!imageGenExpanded)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-pink-100 dark:bg-pink-900/30 rounded">
                            <ImageIcon className="w-4 h-4 text-pink-600" />
                          </div>
                          <span className="font-medium text-sm">AI Image & Chart Generator</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${imageGenExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </CardHeader>

                    {imageGenExpanded && (
                      <CardContent className="pt-0 pb-4 px-4">
                        {/* Show helpful message if no assignment selected */}
                        {!selectedAssignments[0] && (
                          <Alert className="mb-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                            <Info className="w-4 h-4 text-amber-600" />
                            <AlertDescription className="text-xs text-amber-900 dark:text-amber-100">
                              <strong>Tip:</strong> Link to an assignment with tasks for data visualization options
                            </AlertDescription>
                          </Alert>
                        )}

                        <AIImageGenerator
                          onInsertImage={handleInsertImage}
                          documentContext={{
                            title,
                            description,
                            content,
                            selectedAssignment: selectedAssignments[0]
                              ? assignments.find(a => a.id === selectedAssignments[0])
                              : null,
                            selectedTask: selectedTask
                              ? tasks.find(t => t.id === selectedTask)
                              : null,
                            allTasks: selectedAssignments[0]
                              ? tasks.filter(t => t.assignment_id === selectedAssignments[0])
                              : [],
                            assignments: assignments,
                            tasks: tasks
                          }}
                          referenceDocumentUrls={getAllReferenceDocuments()}
                        />
                      </CardContent>
                    )}
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </div>

      {/* Outline Generator Dialog */}
      <Dialog open={isOutlineDialogOpen} onOpenChange={setIsOutlineDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Generate Document Outline</DialogTitle>
          </DialogHeader>
          <OutlineGenerator
            title={title}
            description={description}
            selectedAssignment={selectedAssignments[0]}
            selectedTask={selectedTask}
            assignments={assignments}
            tasks={tasks}
            onApplyOutline={handleApplyOutline}
          />
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Document</DialogTitle>
          </DialogHeader>
          <ExportOptions
            title={title}
            content={content}
            documentId={documentId}
            onClose={() => setIsExportDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
