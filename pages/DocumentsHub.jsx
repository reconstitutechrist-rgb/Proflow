import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { db } from "@/api/db";
import { Document } from "@/api/entities";
import { Assignment } from "@/api/entities";
import { Task } from "@/api/entities";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogDescription,
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
  Maximize2,
  Minimize2,
  Clock,
  Edit3,
  Brain,
  Upload,
  CheckCircle,
  X,
  Users,
  Info,
  Zap,
  Plus,
  FolderOpen,
  Search,
  List,
  LayoutGrid,
  ChevronRight,
  Target,
  Bell,
  ArrowLeft,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import RichTextEditor from "@/components/editor/RichTextEditor";
import { Checkbox } from "@/components/ui/checkbox";

import DocumentUploader from "@/features/documents/DocumentUploader";
import OutlineGenerator from "@/features/ai/OutlineGenerator";
import AIReviewPanel from "@/features/ai/AIReviewPanel";
import ExportOptions from "@/features/documents/ExportOptions";
import AudienceRewriter from "@/features/ai/AudienceRewriter";
import AIImageGenerator from "@/features/ai/AIImageGenerator";
import ConversationalAssistant from "@/features/ai/ConversationalAssistant";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { createPageUrl } from "@/lib/utils";

const AUTOSAVE_INTERVAL = 30000;

// Document templates
const DOCUMENT_TEMPLATES = [
  {
    id: "assignment-brief",
    title: "Assignment Brief",
    description: "Project scope, objectives, and deliverables",
    icon: FileText,
    color: "from-blue-500 to-cyan-500",
    prompt: "Generate a comprehensive assignment brief with project overview, objectives, scope, key deliverables, timeline, and success metrics."
  },
  {
    id: "technical-spec",
    title: "Technical Specification",
    description: "Architecture and implementation details",
    icon: Zap,
    color: "from-purple-500 to-pink-500",
    prompt: "Create a technical specification with system architecture, component breakdown, requirements, and deployment considerations."
  },
  {
    id: "project-plan",
    title: "Project Plan",
    description: "Tasks, milestones, and risk management",
    icon: Target,
    color: "from-green-500 to-teal-500",
    prompt: "Develop a project plan with executive summary, goals, work breakdown, resource allocation, and risk mitigation."
  },
  {
    id: "status-report",
    title: "Status Report",
    description: "Progress, achievements, and next steps",
    icon: Bell,
    color: "from-orange-500 to-red-500",
    prompt: "Generate a status report covering progress, completed tasks, upcoming tasks, blockers, and overall health."
  },
];

export default function DocumentsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  // Tab state from URL
  const activeMainTab = searchParams.get("tab") || "library";
  const documentId = searchParams.get("id");

  // Library state
  const [documents, setDocuments] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Editor state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [currentDocumentVersion, setCurrentDocumentVersion] = useState("1.0");
  const [saveAsPdf, setSaveAsPdf] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [activeAITab, setActiveAITab] = useState("assistant");

  // Templates state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [shouldGenerateTasks, setShouldGenerateTasks] = useState(false);

  // Data
  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [selectedExistingDocs, setSelectedExistingDocs] = useState([]);
  const [availableDocsForReference, setAvailableDocsForReference] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [isOutlineDialogOpen, setIsOutlineDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);

  // Refs
  const autosaveTimerRef = useRef(null);

  // Load data
  useEffect(() => {
    if (currentWorkspaceId && !workspaceLoading) {
      loadData();
    }
  }, [currentWorkspaceId, workspaceLoading, documentId]);

  // Autosave
  useEffect(() => {
    if (activeMainTab === "studio" && title.trim() && content.trim()) {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(handleAutosave, AUTOSAVE_INTERVAL);
      return () => {
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      };
    }
  }, [title, content, activeMainTab]);

  const loadData = async () => {
    if (!currentWorkspaceId) return;

    try {
      setLoading(true);

      const [workspaceAssignments, allAssignmentsList, workspaceProjects, allProjectsList, tasksData, usersData, allDocuments, user] = await Promise.all([
        Assignment.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        Assignment.list("-updated_date", 100),
        db.entities.Project.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        db.entities.Project.list("-updated_date", 100),
        Task.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        db.entities.User.list(),
        Document.filter({ workspace_id: currentWorkspaceId }, "-created_date"),
        db.auth.me()
      ]);

      // Include legacy assignments without workspace_id
      const legacyAssignments = (allAssignmentsList || []).filter(a => !a.workspace_id);
      const combinedAssignments = [...(workspaceAssignments || []), ...legacyAssignments];
      const uniqueAssignments = combinedAssignments.filter((assignment, index, self) =>
        index === self.findIndex(a => a.id === assignment.id)
      );
      setAssignments(uniqueAssignments);

      // Include legacy projects without workspace_id
      const legacyProjects = (allProjectsList || []).filter(p => !p.workspace_id);
      const combinedProjects = [...(workspaceProjects || []), ...legacyProjects];
      const uniqueProjects = combinedProjects.filter((project, index, self) =>
        index === self.findIndex(p => p.id === project.id)
      );
      setProjects(uniqueProjects);
      setTasks(tasksData || []);
      setUsers(usersData || []);
      setDocuments(allDocuments || []);
      setCurrentUser(user);

      // Filter docs for reference
      const docsForReference = (allDocuments || []).filter(doc =>
        doc.id !== documentId &&
        doc.document_type !== 'folder_placeholder' &&
        doc.file_url
      );
      setAvailableDocsForReference(docsForReference);

      // Load document if editing
      if (documentId) {
        const doc = allDocuments.find(d => d.id === documentId);
        if (doc) {
          setTitle(doc.title || "");
          setDescription(doc.description || "");
          setContent(doc.content || "");
          setSelectedAssignments(doc.assigned_to_assignments || []);
          setSelectedTask(doc.selected_task_id || "");
          setTags(doc.tags || []);
          setLastSaved(doc.updated_date);
          setCurrentDocumentVersion(doc.version || "1.0");
          // Switch to studio tab when editing
          if (activeMainTab === "library") {
            setSearchParams({ tab: "studio", id: documentId });
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleAutosave = async () => {
    if (!documentId) {
      const draftKey = `doc_draft_hub_${currentWorkspaceId}`;
      localStorage.setItem(draftKey, JSON.stringify({
        title, description, content, selectedAssignments, selectedTask, tags,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a document title");
      return;
    }
    if (!currentWorkspaceId) {
      toast.error("No active workspace selected");
      return;
    }

    try {
      setIsSaving(true);
      if (saveAsPdf) setIsConverting(true);

      const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
        <style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6}</style>
        </head><body>${content}</body></html>`;

      let fileUrl = null;
      let finalFileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
      let finalFileType = 'text/html';

      const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
      const htmlFile = new File([blob], finalFileName, { type: 'text/html' });

      try {
        const uploadResult = await db.integrations.Core.UploadFile({ file: htmlFile });
        fileUrl = uploadResult.file_url;

        if (saveAsPdf) {
          toast.info("Converting to PDF...");
          const convertResponse = await db.functions.invoke('convertUploadToPdf', {
            fileUrl, fileName: finalFileName, workspaceId: currentWorkspaceId
          });
          if (convertResponse.data?.success && convertResponse.data?.pdfUrl) {
            fileUrl = convertResponse.data.pdfUrl;
            finalFileName = convertResponse.data.filename;
            finalFileType = 'application/pdf';
          }
        }
      } catch (uploadError) {
        console.error("Upload error:", uploadError);
        toast.warning("File upload failed, saving content only");
      } finally {
        setIsConverting(false);
      }

      const documentData = {
        title: title.trim(),
        description: description.trim(),
        content,
        document_type: selectedTemplate?.id || "other",
        assigned_to_assignments: selectedAssignments,
        selected_task_id: selectedTask || null,
        tags,
        folder_path: "/created",
        file_url: fileUrl,
        file_name: finalFileName,
        file_type: finalFileType
      };

      if (documentId) {
        const changeNotes = prompt("Describe changes (optional):", "") || "Updates";
        const existingDoc = await Document.get(documentId);

        const newVersion = {
          content: existingDoc.content,
          file_url: existingDoc.file_url,
          version: existingDoc.version || "1.0",
          created_date: existingDoc.updated_date,
          change_notes: changeNotes,
          updated_date: new Date().toISOString()
        };

        const versionHistory = [...(existingDoc.version_history || []), newVersion];
        const [major, minor] = (existingDoc.version || "1.0").split('.').map(Number);
        const newVersionNumber = changeNotes.toLowerCase().includes('major')
          ? `${major + 1}.0` : `${major}.${minor + 1}`;

        await Document.update(documentId, { ...documentData, version: newVersionNumber, version_history: versionHistory });
        toast.success(`Updated to v${newVersionNumber}`);
        setCurrentDocumentVersion(newVersionNumber);
      } else {
        const newDoc = await Document.create({ ...documentData, workspace_id: currentWorkspaceId, version: "1.0" });
        localStorage.removeItem(`doc_draft_hub_${currentWorkspaceId}`);
        setSearchParams({ tab: "studio", id: newDoc.id });
        toast.success("Document created!");
      }
      setLastSaved(new Date().toISOString());
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save document");
    } finally {
      setIsSaving(false);
      setIsConverting(false);
    }
  };

  const handleInsertContent = useCallback((newContent) => {
    // Append new content to existing content
    setContent(prev => prev + (prev ? '\n\n' : '') + newContent);
    toast.success("Content inserted");
  }, []);

  const handleInsertImage = useCallback((imageUrl) => {
    // Insert image as HTML img tag
    const imgHtml = `<img src="${imageUrl}" alt="Generated image" style="max-width: 100%; height: auto;" />`;
    setContent(prev => prev + (prev ? '\n\n' : '') + imgHtml);
    toast.success("Image inserted");
  }, []);

  const handleApplyOutline = (outlineHtml) => {
    setContent(outlineHtml);
    setIsOutlineDialogOpen(false);
    toast.success("Outline applied");
  };

  const handleUploadComplete = () => {
    setIsUploadOpen(false);
    loadData();
    toast.success("Document(s) uploaded");
  };

  const handleEditDocument = (doc) => {
    // If it's an uploaded file (has file_url but no editable content), show preview
    if (doc.file_url && !doc.content) {
      setPreviewDocument(doc);
      setIsPreviewOpen(true);
      return;
    }
    // Otherwise, open in studio for editing
    setSearchParams({ tab: "studio", id: doc.id });
  };

  const handleGenerateFromTemplate = async () => {
    if (!title.trim() || !customPrompt.trim()) {
      toast.error("Please fill in title and description");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await db.integrations.Core.InvokeLLM({
        prompt: customPrompt,
        add_context_from_internet: false
      });
      setContent(response);
      setSearchParams({ tab: "studio" });
      toast.success("Document generated!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate document");
    } finally {
      setIsGenerating(false);
    }
  };

  const createNewDocument = () => {
    setTitle("");
    setDescription("");
    setContent("");
    setSelectedAssignments([]);
    setSelectedTask("");
    setTags([]);
    setSelectedTemplate(null);
    setSearchParams({ tab: "studio" });
  };

  // Filter documents for library
  const filteredDocuments = documents
    .filter(doc => {
      if (doc.document_type === "folder_placeholder") return false;
      const matchesSearch = !searchQuery ||
        doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAssignment = selectedAssignmentFilter === "all" ||
        (selectedAssignmentFilter === "unassigned" && (!doc.assigned_to_assignments || doc.assigned_to_assignments.length === 0)) ||
        (doc.assigned_to_assignments?.includes(selectedAssignmentFilter));
      const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
      return matchesSearch && matchesAssignment && matchesType;
    });

  const availableTasks = selectedAssignments.length > 0
    ? tasks.filter(task => task.assignment_id === selectedAssignments[0])
    : [];

  const getAllReferenceDocuments = () => [
    ...uploadedDocuments.filter(d => d.includedInContext).map(d => d.url),
    ...selectedExistingDocs.map(d => d.url)
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
            <p className="text-sm text-gray-500">{documents.length} documents in workspace</p>
          </div>
          <Button onClick={createNewDocument} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeMainTab} onValueChange={(v) => setSearchParams({ tab: v })}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="studio" className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Studio
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Templates
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* Library Tab */}
        {activeMainTab === "library" && (
          <div className="h-full flex flex-col p-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedAssignmentFilter} onValueChange={setSelectedAssignmentFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Assignments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignments</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignments.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="specification">Specification</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
                {viewMode === "grid" ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              </Button>
              <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>

            {/* Documents Grid/List */}
            <ScrollArea className="flex-1">
              {filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents found</h3>
                  <p className="text-sm text-gray-500 mb-4">Try adjusting filters or create a new document</p>
                  <Button onClick={createNewDocument} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Document
                  </Button>
                </div>
              ) : (
                <div className={viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-2"
                }>
                  <AnimatePresence mode="popLayout">
                    {filteredDocuments.map((doc) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <Card
                          className="cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all"
                          onClick={() => handleEditDocument(doc)}
                        >
                          <CardContent className={viewMode === "grid" ? "p-4" : "p-3 flex items-center gap-4"}>
                            <div className={`${viewMode === "grid" ? "mb-3" : ""} w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0`}>
                              <FileText className="w-5 h-5 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 dark:text-white truncate">{doc.title}</h3>
                              <p className="text-xs text-gray-500">{new Date(doc.created_date).toLocaleDateString()}</p>
                            </div>
                            {viewMode === "list" && <ChevronRight className="w-5 h-5 text-gray-400" />}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Studio Tab */}
        {activeMainTab === "studio" && (
          <div className={`flex h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : ''}`}>
            {/* Editor Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Editor Header */}
              <div className="flex-shrink-0 border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-white">{title || "Untitled Document"}</h2>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {lastSaved && <span><Clock className="w-3 h-3 inline mr-1" />Saved {new Date(lastSaved).toLocaleTimeString()}</span>}
                        {isSaving && <span className="text-blue-600"><Loader2 className="w-3 h-3 inline animate-spin mr-1" />Saving...</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsPreview(!isPreview)}>
                      <Eye className="w-4 h-4 mr-2" />{isPreview ? "Edit" : "Preview"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)}>
                      <Download className="w-4 h-4 mr-2" />Export
                    </Button>
                    <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-white dark:bg-gray-800">
                      <Checkbox id="save-pdf" checked={saveAsPdf} onCheckedChange={setSaveAsPdf} />
                      <label htmlFor="save-pdf" className="text-xs cursor-pointer">PDF</label>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving || !title.trim()} className="bg-gradient-to-r from-indigo-600 to-purple-600">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save
                    </Button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-3 mt-4">
                  <Select value={selectedAssignments[0] || "none"} onValueChange={(v) => { setSelectedAssignments(v === "none" ? [] : [v]); setSelectedTask(""); }}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Link to Assignment" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Assignment</SelectItem>
                      {assignments.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {selectedAssignments.length > 0 && availableTasks.length > 0 && (
                    <Select value={selectedTask || "none"} onValueChange={(v) => setSelectedTask(v === "none" ? "" : v)}>
                      <SelectTrigger className="w-64"><SelectValue placeholder="Link to Task" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Task</SelectItem>
                        {availableTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <div className="flex items-center gap-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}<button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-red-600">x</button>
                      </Badge>
                    ))}
                    <Input
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => { if (e.key === 'Enter' && tagInput.trim()) { setTags([...tags, tagInput.trim()]); setTagInput(""); } }}
                      className="w-28 h-7 text-sm"
                    />
                  </div>
                  {documentId && <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />v{currentDocumentVersion}</Badge>}
                </div>
              </div>

              {/* Editor/Preview Content */}
              <div className="flex-1 overflow-auto p-6">
                {isPreview ? (
                  <Card className="max-w-4xl mx-auto">
                    <CardContent className="pt-6">
                      <h1 className="text-3xl font-bold mb-4">{title}</h1>
                      {description && <p className="text-gray-600 mb-6 border-l-4 border-indigo-500 pl-4">{description}</p>}
                      <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
                    </CardContent>
                  </Card>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-4">
                    <Input placeholder="Document title..." value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-semibold" />
                    <Textarea placeholder="Brief description..." value={description} onChange={(e) => setDescription(e.target.value)} className="h-20" />
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm min-h-[400px]">
                      <RichTextEditor value={content} onChange={setContent} placeholder="Start writing..." minHeight="400px" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Sidebar */}
            {!isPreview && (
              <div className="w-[380px] border-l bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
                <Tabs value={activeAITab} onValueChange={setActiveAITab} className="flex flex-col h-full">
                  <TabsList className="w-full grid grid-cols-3 border-b rounded-none flex-shrink-0">
                    <TabsTrigger value="assistant"><Brain className="w-4 h-4 mr-1" />AI</TabsTrigger>
                    <TabsTrigger value="review"><CheckCircle className="w-4 h-4 mr-1" />Review</TabsTrigger>
                    <TabsTrigger value="tools"><FileUp className="w-4 h-4 mr-1" />Tools</TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-auto p-4">
                    <TabsContent value="assistant" className="mt-0 h-full">
                      <ConversationalAssistant
                        content={content}
                        title={title}
                        description={description}
                        selectedAssignment={selectedAssignments[0]}
                        selectedTask={selectedTask}
                        assignments={assignments}
                        tasks={tasks}
                        onInsertContent={handleInsertContent}
                        setIsOutlineDialogOpen={setIsOutlineDialogOpen}
                        onApplyOutline={handleApplyOutline}
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
                      />
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-green-600" />Audience Rewriter
                        </h3>
                        <AudienceRewriter initialText={content} onApplyRewrite={handleInsertContent} />
                      </div>
                    </TabsContent>

                    <TabsContent value="tools" className="mt-0 space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Upload className="w-4 h-4 text-blue-600" />Reference Documents
                        </h3>
                        <Select onValueChange={(docId) => {
                          const doc = availableDocsForReference.find(d => d.id === docId);
                          if (doc && !selectedExistingDocs.some(d => d.id === docId)) {
                            setSelectedExistingDocs([...selectedExistingDocs, { id: doc.id, name: doc.title, url: doc.file_url }]);
                          }
                        }}>
                          <SelectTrigger><SelectValue placeholder="Add from library..." /></SelectTrigger>
                          <SelectContent>
                            {availableDocsForReference.map(doc => (
                              <SelectItem key={doc.id} value={doc.id}>{doc.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedExistingDocs.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {selectedExistingDocs.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between p-2 border rounded-lg bg-green-50 dark:bg-green-950/20">
                                <span className="text-sm truncate">{doc.name}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedExistingDocs(selectedExistingDocs.filter(d => d.id !== doc.id))}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-pink-600" />AI Image Generator
                        </h3>
                        <AIImageGenerator
                          onInsertImage={handleInsertImage}
                          documentContext={{
                            title,
                            description,
                            selectedAssignment: assignments.find(a => a.id === selectedAssignments[0]),
                            selectedTask: tasks.find(t => t.id === selectedTask),
                            allTasks: tasks.filter(t => t.assignment_id === selectedAssignments[0])
                          }}
                        />
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeMainTab === "templates" && (
          <div className="h-full overflow-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <Sparkles className="w-12 h-12 mx-auto text-indigo-500 mb-3" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Quick Generate with AI</h2>
                <p className="text-gray-600">Select a template and let AI create a professional document for you</p>
              </div>

              {/* Template Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {DOCUMENT_TEMPLATES.map((template) => (
                  <motion.div key={template.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card
                      className={`cursor-pointer border-2 transition-all ${selectedTemplate?.id === template.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'hover:border-indigo-300'}`}
                      onClick={() => { setSelectedTemplate(template); setTitle(template.title); setCustomPrompt(template.prompt); }}
                    >
                      <CardHeader className="pb-2">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center mb-2`}>
                          <template.icon className="w-5 h-5 text-white" />
                        </div>
                        <CardTitle className="text-lg flex items-center justify-between">
                          {template.title}
                          {selectedTemplate?.id === template.id && <CheckCircle className="w-5 h-5 text-indigo-600" />}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Generation Form */}
              {selectedTemplate && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Document Title</label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter title..." />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Link to Assignment (Optional)</label>
                        <Select value={selectedAssignments[0] || "none"} onValueChange={(v) => setSelectedAssignments(v === "none" ? [] : [v])}>
                          <SelectTrigger><SelectValue placeholder="Select assignment..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Assignment</SelectItem>
                            {assignments.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">What should this document include?</label>
                        <Textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} className="min-h-24" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="gen-tasks" checked={shouldGenerateTasks} onCheckedChange={setShouldGenerateTasks} />
                        <label htmlFor="gen-tasks" className="text-sm cursor-pointer">Generate related tasks</label>
                      </div>
                      <Button onClick={handleGenerateFromTemplate} disabled={isGenerating || !title.trim() || !customPrompt.trim()} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 h-12">
                        {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating...</> : <><Zap className="w-4 h-4 mr-2" />Generate Document</>}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <DocumentUploader
            assignments={assignments}
            projects={projects}
            currentUser={currentUser}
            selectedFolderPath="/"
            onUploadComplete={handleUploadComplete}
            existingDocuments={documents}
          />
        </DialogContent>
      </Dialog>

      {/* Outline Dialog */}
      <Dialog open={isOutlineDialogOpen} onOpenChange={setIsOutlineDialogOpen}>
        <DialogContent className="max-w-3xl">
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
          <ExportOptions title={title} content={content} documentId={documentId} onClose={() => setIsExportDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {previewDocument?.title || "Document Preview"}
            </DialogTitle>
            {previewDocument?.description && (
              <DialogDescription>{previewDocument.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-lg border bg-gray-50 dark:bg-gray-900">
            {previewDocument?.file_url && (() => {
              const fileType = previewDocument.file_type?.toLowerCase() || '';
              const fileName = previewDocument.file_name?.toLowerCase() || '';
              const fileUrl = previewDocument.file_url;

              // Image formats
              const isImage = fileType.startsWith('image/') ||
                ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'].some(ext => fileName.endsWith(ext));

              // PDF
              const isPdf = fileType === 'application/pdf' || fileName.endsWith('.pdf');

              // Office documents (use Google Docs Viewer)
              const isOfficeDoc = [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
                'application/msword', // doc
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
                'application/vnd.ms-excel', // xls
                'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
                'application/vnd.ms-powerpoint', // ppt
              ].includes(fileType) ||
                ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'].some(ext => fileName.endsWith(ext));

              // Text files
              const isText = fileType.startsWith('text/') ||
                ['.txt', '.md', '.json', '.xml', '.csv', '.log'].some(ext => fileName.endsWith(ext));

              // Video
              const isVideo = fileType.startsWith('video/') ||
                ['.mp4', '.webm', '.ogg', '.mov'].some(ext => fileName.endsWith(ext));

              // Audio
              const isAudio = fileType.startsWith('audio/') ||
                ['.mp3', '.wav', '.ogg', '.m4a'].some(ext => fileName.endsWith(ext));

              if (isImage) {
                return (
                  <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                    <img
                      src={fileUrl}
                      alt={previewDocument.title}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                );
              }

              if (isPdf) {
                return (
                  <iframe
                    src={fileUrl}
                    className="w-full h-full"
                    title={previewDocument.title}
                  />
                );
              }

              if (isOfficeDoc) {
                // Use Google Docs Viewer for Office documents
                const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
                return (
                  <iframe
                    src={googleViewerUrl}
                    className="w-full h-full"
                    title={previewDocument.title}
                  />
                );
              }

              if (isVideo) {
                return (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <video
                      src={fileUrl}
                      controls
                      className="max-w-full max-h-full"
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                );
              }

              if (isAudio) {
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-4">
                    <FileText className="w-16 h-16 text-gray-400" />
                    <p className="text-lg font-medium">{previewDocument.title}</p>
                    <audio src={fileUrl} controls className="w-full max-w-md">
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                );
              }

              if (isText) {
                return (
                  <iframe
                    src={fileUrl}
                    className="w-full h-full bg-white"
                    title={previewDocument.title}
                  />
                );
              }

              // Fallback for unsupported types
              return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <FileText className="w-16 h-16 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Preview not available for this file type
                  </p>
                  <p className="text-sm text-gray-500">{fileType || 'Unknown type'}</p>
                  <Button onClick={() => window.open(fileUrl, '_blank')}>
                    <Download className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                </div>
              );
            })()}
          </div>
          <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              {previewDocument?.file_name && <span>{previewDocument.file_name}</span>}
              {previewDocument?.file_size && (
                <span className="ml-2">({(previewDocument.file_size / 1024 / 1024).toFixed(2)} MB)</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.open(previewDocument?.file_url, '_blank')}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="ghost" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
