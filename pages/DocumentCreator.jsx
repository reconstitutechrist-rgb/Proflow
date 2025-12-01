
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { db } from "@/api/db";
import { Document } from "@/api/entities";
import DOMPurify from "dompurify";
import { Assignment } from "@/api/entities";
import { Task } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Save,
  Eye,
  Wand2,
  Image as ImageIcon,
  Download,
  Loader2,
  Sparkles,
  FileDown,
  Maximize2,
  Minimize2,
  Clock,
  CheckCircle,
  Mic,
  MicOff,
  BookOpen,
  Zap,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Users
} from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "@/components/editor/RichTextEditor";

import OutlineGenerator from "@/features/ai/OutlineGenerator";
import AIWritingAssistant from "@/features/ai/AIWritingAssistant";
import AIImageGenerator from "@/features/ai/AIImageGenerator";
import AIReviewPanel from "@/features/ai/AIReviewPanel";
import VoiceInput from "@/components/common/VoiceInput";
import ExportOptions from "@/features/documents/ExportOptions";
import AudienceRewriter from "@/features/ai/AudienceRewriter";
import { useWorkspace } from "@/features/workspace/WorkspaceContext"; // NEW: Import useWorkspace

const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export default function DocumentCreatorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const documentId = searchParams.get("id"); // Still use documentId for primary identification

  // NEW: Check for research context
  const fromResearch = searchParams.get("fromResearch");
  const researchAssignmentId = searchParams.get("assignmentId");
  const researchAssignmentName = searchParams.get("assignmentName");
  const researchQuestion = searchParams.get("researchQuestion");
  const suggestedDocTitle = searchParams.get("suggestedDocTitle");
  const recommendedActionsStr = searchParams.get("recommendedActions");
  const researchSummary = searchParams.get("researchSummary");

  // Generate unique session ID for new documents to prevent draft collisions
  const [sessionId] = useState(() =>
    documentId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [selectedAssignments, setSelectedAssignments] = useState([]); // Changed to plural, array of IDs
  const [selectedTask, setSelectedTask] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [documents, setDocuments] = useState([]); // New state
  const [editingDocId, setEditingDocId] = useState(null); // New state

  const [isPreview, setIsPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true); // New state
  const [lastSaved, setLastSaved] = useState(null);
  const [versions, setVersions] = useState([]);
  const [currentDocumentVersion, setCurrentDocumentVersion] = useState("1.0");

  const [isOutlineDialogOpen, setIsOutlineDialogOpen] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const quillRef = useRef(null);
  const autosaveTimerRef = useRef(null);

  const { currentWorkspaceId } = useWorkspace(); // NEW: Get current workspace ID

  // NEW: useEffect to trigger data load when workspace changes
  useEffect(() => {
    if (currentWorkspaceId) { // Only load data if currentWorkspaceId is available
      loadInitialData();
      if (!documentId && fromResearch !== "true") { // Only check for draft if not loading from research
        checkForDraftRecovery();
      }
    } else {
      setLoading(true); // Keep loading if workspace not ready
    }
  }, [documentId, fromResearch, currentWorkspaceId]); // Add currentWorkspaceId to dependencies

  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      // Autosave only if there's significant content to avoid saving empty drafts
      if (title.trim() && content.trim()) {
        handleAutosave();
      }
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [title, description, content, selectedAssignments, selectedTask, tags, sessionId]); // Updated selectedAssignment to selectedAssignments

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
          setSelectedAssignments(draft.selectedAssignments || []); // Updated
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

  // Renamed from loadData and updated to use useCallback and filter by workspaceId
  const loadInitialData = useCallback(async () => {
    if (!currentWorkspaceId) {
      setLoading(false); // Ensure loading state is reset if no workspace ID
      return;
    }

    try {
      setLoading(true);

      // Fetch all entities needed for dropdowns and general context, filtered by workspaceId
      const [assignmentsData, tasksData, usersData, allDocuments, user] = await Promise.all([
        Assignment.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        Task.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        db.entities.User.list(), // Users are typically global, not workspace-filtered by default
        Document.filter({ workspace_id: currentWorkspaceId }, "-updated_date", 100),
        db.auth.me()
      ]);

      setAssignments(assignmentsData || []);
      setTasks(tasksData || []);
      setUsers(usersData || []);
      setDocuments(allDocuments || []);
      setCurrentUser(user);

      const assignmentIdFromUrl = searchParams.get('assignment');
      const taskIdFromUrl = searchParams.get('task');

      if (documentId) { // Existing document logic
        const doc = allDocuments.find(d => d.id === documentId); // Find from fetched documents
        if (doc) {
          setTitle(doc.title || "");
          setDescription(doc.description || "");
          setContent(doc.content || "");
          setSelectedAssignments(doc.assigned_to_assignments || []); // Updated to plural
          setSelectedTask(doc.selected_task_id || "");
          setTags(doc.tags || []);
          setVersions(doc.version_history || []);
          setLastSaved(doc.updated_date);
          setCurrentDocumentVersion(doc.version || "1.0");
          setEditingDocId(documentId); // New state
        } else {
          // Document not found in the current workspace or doesn't exist
          toast.error("Document not found or not part of this workspace.");
          navigate("/dashboard"); // Redirect to dashboard or a specific error page
          return; // Stop further processing
        }
      } else if (fromResearch === "true") {
        // Pre-populate from research context
        setTitle(suggestedDocTitle || "Research Document");
        setSelectedAssignments(researchAssignmentId && assignmentsData.some(a => a.id === researchAssignmentId) ? [researchAssignmentId] : []);

        // Build initial description from research
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
        // New document, apply URL params if present
        if (assignmentIdFromUrl && assignmentsData.find(a => a.id === assignmentIdFromUrl)) {
          setSelectedAssignments([assignmentIdFromUrl]);
        }

        if (taskIdFromUrl && tasksData.find(t => t.id === taskIdFromUrl)) {
          setSelectedTask(taskIdFromUrl);
          const task = tasksData.find(t => t.id === taskIdFromUrl);
          if (task && task.assignment_id && !selectedAssignments.includes(task.assignment_id)) {
            // Add task's assignment if not already in selectedAssignments
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
        selectedAssignments, // Updated
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

    // Strip HTML tags using regex instead of DOM manipulation
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

      const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
      const file = new File([blob], filename, { type: 'text/html' });

      let fileUrl = null;

      try {
        const uploadResult = await db.integrations.Core.UploadFile({ file });
        fileUrl = uploadResult.file_url;
      } catch (uploadError) {
        console.error("File upload error:", uploadError);
        toast.warning("File upload failed, saving content only");
        // Create a simple fallback URL
        fileUrl = null;
      }

      const documentData = {
        title: title.trim(),
        description: description.trim() || "",
        content,
        document_type: "other",
        assigned_to_assignments: selectedAssignments, // Updated to plural
        selected_task_id: selectedTask || null,
        tags: tags || [],
        folder_path: "/created",
        file_url: fileUrl,
        file_name: filename,
        file_type: "text/html"
      };

      if (documentId) { // Check for documentId to decide update or create
        const changeNotes = prompt(
          "Describe what changed in this version (optional):",
          ""
        ) || "No description provided";

        // Get the existing document to compare and build version history
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

        await Document.update(documentId, { // Use Document entity
          ...documentData,
          version: newVersionNumber,
          version_history: versionHistory
        });

        toast.success(`Document updated to version ${newVersionNumber}`);
        setCurrentDocumentVersion(newVersionNumber);
        setVersions(versionHistory);
        setLastSaved(new Date().toISOString());

      } else {
        const newDoc = await Document.create({ // Use Document entity
          ...documentData,
          workspace_id: currentWorkspaceId, // NEW: Add workspace_id for new documents
          version: "1.0"
        });

        const draftKey = `doc_draft_${sessionId}`;
        localStorage.removeItem(draftKey);

        navigate(`?id=${newDoc.id}`, { replace: true });
        toast.success("Document created successfully!");
        setLastSaved(new Date().toISOString());
      }

    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save document: " + (error.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertContent = useCallback((newContent) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      // Sanitize content before inserting to prevent XSS
      const sanitizedContent = DOMPurify.sanitize(newContent, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'a', 'span', 'div', 'img'],
        ALLOWED_ATTR: ['href', 'target', 'class', 'id', 'src', 'alt', 'width', 'height']
      });

      if (range) {
        editor.clipboard.dangerouslyPasteHTML(range.index, sanitizedContent);
        editor.setSelection(range.index + sanitizedContent.length);
      } else {
        const length = editor.getLength();
        editor.clipboard.dangerouslyPasteHTML(length, sanitizedContent);
        editor.setSelection(length + sanitizedContent.length);
      }

      toast.success("Content inserted");
    }
  }, []);

  const handleInsertImage = useCallback((imageUrl) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection() || { index: editor.getLength() };
      editor.insertEmbed(range.index, 'image', imageUrl);
      editor.setSelection(range.index + 1);
    }
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

  const handleVoiceTranscription = (transcribedText) => {
    handleInsertContent(transcribedText);
  };

  const handleSmartFill = async (type, entityId) => {
    try {
      let fillContent = "";

      if (type === "assignment" && entityId) {
        const assignment = assignments.find(a => a.id === entityId);
        if (assignment) {
          fillContent = `<h2>Assignment Summary: ${assignment.name}</h2>`;
          fillContent += `<p><strong>Description:</strong> ${assignment.description || "No description available"}</p>`;
          fillContent += `<p><strong>Status:</strong> ${assignment.status}</p>`;
          fillContent += `<p><strong>Priority:</strong> ${assignment.priority}</p>`;
          if (assignment.start_date) fillContent += `<p><strong>Start Date:</strong> ${new Date(assignment.start_date).toLocaleDateString()}</p>`;
          if (assignment.end_date) fillContent += `<p><strong>End Date:</strong> ${new Date(assignment.end_date).toLocaleDateString()}</p>`;
        }
      } else if (type === "task" && entityId) {
        const task = tasks.find(t => t.id === entityId);
        if (task) {
          fillContent = `<p><strong>Task:</strong> ${task.title}</p>`;
          fillContent += `<ul>`;
          fillContent += `<li><strong>Status:</strong> ${task.status}</li>`;
          fillContent += `<li><strong>Priority:</strong> ${task.priority}</li>`;
          if (task.description) fillContent += `<li><strong>Description:</strong> ${task.description}</li>`;
          fillContent += `</ul>`;
        }
      } else if (type === "user" && entityId) {
        const user = users.find(u => u.email === entityId);
        if (user) {
          fillContent = `<p><strong>Contact:</strong> ${user.full_name}</p>`;
          fillContent += `<ul>`;
          fillContent += `<li><strong>Email:</strong> ${user.email}</li>`;
          if (user.job_title) fillContent += `<li><strong>Role:</strong> ${user.job_title}</li>`;
          if (user.phone) fillContent += `<li><strong>Phone:</strong> ${user.phone}</li>`;
          fillContent += `</ul>`;
        }
      }

      if (fillContent) {
        handleInsertContent(fillContent);
        toast.success("Content inserted from linked entity");
      }
    } catch (error) {
      console.error("Error with smart fill:", error);
      toast.error("Failed to insert entity data");
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  // Filter tasks by selected assignment (using the first selected assignment for simplicity for this UI element)
  const availableTasks = selectedAssignments.length > 0
    ? tasks.filter(task => task.assignment_id === selectedAssignments[0])
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-indigo-600">Loading document...</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : ''}`}>
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
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
                {isSaving && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
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
              onClick={() => setIsExportDialogOpen(true)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button
              onClick={handleSave}
              disabled={isSaving || !title.trim() || !currentWorkspaceId} // Disable if no workspace
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!title.trim() ? "Please enter a document title first" : (!currentWorkspaceId ? "No active workspace selected" : "Save document")}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
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
            value={selectedAssignments[0] || "none"}
            onValueChange={(value) => {
              setSelectedAssignments(value === "none" ? [] : [value]);
              setSelectedTask(""); // Reset task when assignment changes
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Link to Assignment (optional)" />
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
                <CardHeader>
                  <CardTitle>{title || "Untitled Document"}</CardTitle>
                  {description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'a', 'span', 'div', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
                      ALLOWED_ATTR: ['href', 'target', 'class', 'id', 'src', 'alt', 'width', 'height']
                    }) }}
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

        {/* AI Assistants Sidebar */}
        {!isPreview && (
          <div className="w-[427px] border-l border-gray-200 dark:border-gray-800 overflow-y-auto bg-white dark:bg-gray-900">
            <Tabs defaultValue="writing" className="h-full">
              <TabsList className="w-full grid grid-cols-4 border-b border-gray-200 dark:border-gray-800">
                <TabsTrigger value="writing" className="data-[state=active]:border-b-2 data-[state=active]:border-gray-900 dark:data-[state=active]:border-white">
                  <Sparkles className="w-4 h-4 mr-1" />
                  Write
                </TabsTrigger>
                <TabsTrigger value="images" className="data-[state=active]:border-b-2 data-[state=active]:border-gray-900 dark:data-[state=active]:border-white">
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Images
                </TabsTrigger>
                <TabsTrigger value="review" className="data-[state=active]:border-b-2 data-[state=active]:border-gray-900 dark:data-[state=active]:border-white">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Review
                </TabsTrigger>
                <TabsTrigger value="audience" className="data-[state=active]:border-b-2 data-[state=active]:border-gray-900 dark:data-[state=active]:border-white">
                  <Users className="w-4 h-4 mr-1" />
                  Audience
                </TabsTrigger>
              </TabsList>

              <div className="p-6 space-y-6">
                <TabsContent value="writing" className="mt-0 space-y-6">
                  {/* Outline Button */}
                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setIsOutlineDialogOpen(true)}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Generate Document Outline
                  </Button>

                  {/* Voice Input */}
                  <VoiceInput
                    isActive={isVoiceActive}
                    onToggle={setIsVoiceActive}
                    onTranscription={handleVoiceTranscription}
                  />

                  {/* Quick Insert Section - Simplified */}
                  <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                    <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Quick Insert</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Insert pre-formatted information from your assignments and team
                    </p>
                    <div className="space-y-2">
                      {selectedAssignments.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs border-gray-200 dark:border-gray-800"
                          onClick={() => handleSmartFill("assignment", selectedAssignments[0])}
                        >
                          <Zap className="w-3 h-3 mr-2" />
                          Insert Assignment Summary
                        </Button>
                      )}

                      {/* Now uses availableTasks filtered by assignment */}
                      {availableTasks.length > 0 ? (
                        <Select onValueChange={(value) => handleSmartFill("task", value)}>
                          <SelectTrigger className="h-9 text-xs border-gray-200 dark:border-gray-800">
                            <SelectValue placeholder="Insert Task Details..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTasks.map(task => (
                              <SelectItem key={task.id} value={task.id} className="text-xs">
                                {task.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-xs text-gray-500 dark:text-gray-400 p-2 border border-dashed rounded">
                          {selectedAssignments.length > 0
                            ? "No tasks found for this assignment"
                            : "Select an assignment to see related tasks"}
                        </div>
                      )}

                      <Select onValueChange={(value) => handleSmartFill("user", value)}>
                        <SelectTrigger className="h-9 text-xs border-gray-200 dark:border-gray-800">
                          <SelectValue placeholder="Insert Team Member Info..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(user => (
                            <SelectItem key={user.email} value={user.email} className="text-xs">
                              {user.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* AI Writing Assistant - Now Cleaner */}
                  <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                    <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">AI Writing Assistant</h3>
                    <AIWritingAssistant
                      content={content}
                      title={title}
                      description={description}
                      selectedAssignment={selectedAssignments[0]} // Pass the first selected assignment
                      selectedTask={selectedTask}
                      assignments={assignments}
                      tasks={tasks}
                      onInsertContent={handleInsertContent}
                      quillRef={quillRef}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="images" className="mt-0">
                  <AIImageGenerator
                    onInsertImage={handleInsertImage}
                    documentContext={{
                      title,
                      description,
                      selectedAssignment: assignments.find(a => a.id === selectedAssignments[0]),
                      selectedTask: tasks.find(t => t.id === selectedTask),
                      allTasks: tasks.filter(t => t.assignment_id === selectedAssignments[0]),
                      assignments: assignments,
                      tasks: tasks
                    }}
                  />
                </TabsContent>

                <TabsContent value="review" className="mt-0">
                  <AIReviewPanel
                    content={content}
                    title={title}
                    description={description}
                    selectedAssignment={selectedAssignments[0]} // Pass the first selected assignment
                    selectedTask={selectedTask}
                    assignments={assignments}
                    tasks={tasks}
                  />
                </TabsContent>

                <TabsContent value="audience" className="mt-0">
                  <AudienceRewriter
                    initialText={content}
                    onApplyRewrite={handleInsertContent}
                    quillRef={quillRef}
                    disabled={isGenerating}
                  />
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
            <DialogDescription>
              AI will create a structured outline based on your title and description
            </DialogDescription>
          </DialogHeader>
          <OutlineGenerator
            title={title}
            description={description}
            selectedAssignment={selectedAssignments[0]} // Pass the first selected assignment
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
            <DialogDescription>
              Choose export format and options
            </DialogDescription>
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
