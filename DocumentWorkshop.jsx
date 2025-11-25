import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Document } from "@/api/entities";
import { Assignment } from "@/api/entities";
import { Task } from "@/api/entities";
import { User } from "@/api/entities";
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
  DialogHeader,
  DialogTitle,
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
  FileUp,
  Settings,
  Target,
  MessageSquare,
  Upload,
  CheckCircle,
  X,
  Users,
  Info,
  Zap,
  Plus,
  FolderOpen,
  ArrowLeft,
  Command as CommandIcon,
  Search,
  Bell,
  ChevronRight,
  LayoutDashboard
} from "lucide-react";
import { toast } from "sonner";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";

import OutlineGenerator from "@/components/document-creator/OutlineGenerator";
import AIReviewPanel from "@/components/document-creator/AIReviewPanel";
import ExportOptions from "@/components/document-creator/ExportOptions";
import AudienceRewriter from "@/components/generation/AudienceRewriter";
import AIImageGenerator from "@/components/document-creator/AIImageGenerator";
import ConversationalAssistant from "@/components/document-creator/ConversationalAssistant";
import PromptBuilderWizard from "./PromptBuilderWizard";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { createPageUrl } from "@/utils";
import { InvokeLLM, UploadFile } from "@/api/integrations";

const AUTOSAVE_INTERVAL = 30000; // 30 seconds

// Document templates from DocumentGenerator
const DOCUMENT_TEMPLATES = [
  {
    id: "assignment-brief",
    title: "Assignment Brief",
    description: "Detailed brief outlining project scope, objectives, and deliverables",
    icon: FileText,
    color: "from-blue-500 to-cyan-500",
    prompt: "Generate a comprehensive assignment brief. Include project overview, objectives, scope (in/out), key deliverables, timeline, roles and responsibilities, and success metrics. The tone should be professional and informative."
  },
  {
    id: "technical-spec",
    title: "Technical Specification",
    description: "Outline of technical requirements, architecture, and implementation details",
    icon: Zap,
    color: "from-purple-500 to-pink-500",
    prompt: "Create a technical specification document. Detail the system architecture, component breakdown, key technologies, functional and non-functional requirements, and deployment considerations. Focus on clarity and precision for engineers."
  },
  {
    id: "project-plan",
    title: "Project Plan",
    description: "Roadmap detailing tasks, milestones, resources, and risk management",
    icon: Target,
    color: "from-green-500 to-teal-500",
    prompt: "Develop a detailed project plan. Include an executive summary, project goals, detailed work breakdown structure, resource allocation, risk assessment and mitigation strategies, and communication plan. Ensure it's actionable and trackable."
  },
  {
    id: "status-report",
    title: "Status Report",
    description: "Regular update on project progress, achievements, challenges, and next steps",
    icon: Bell,
    color: "from-orange-500 to-red-500",
    prompt: "Generate a concise weekly status report. Cover progress since the last report, completed tasks, upcoming tasks, any blockers or issues, and a summary of overall project health. Keep it brief and to the point for stakeholders."
  },
];

// Mode types
const MODES = {
  WELCOME: "welcome",
  TEMPLATE_SELECT: "template_select",
  QUICK_GENERATE: "quick_generate",
  EDITOR: "editor",
  PREVIEW: "preview"
};

export default function DocumentWorkshop() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const documentId = searchParams.get("id");
  const { currentWorkspaceId } = useWorkspace();

  // UI State
  const [mode, setMode] = useState(MODES.WELCOME);
  const [activeAITab, setActiveAITab] = useState("chat");
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Document State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  // Generation State
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Data
  const [assignments, setAssignments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);

  // References
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [selectedExistingDocs, setSelectedExistingDocs] = useState([]);
  const [availableDocsForReference, setAvailableDocsForReference] = useState([]);

  // Save State
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [currentDocumentVersion, setCurrentDocumentVersion] = useState("1.0");
  const [saveAsPdf, setSaveAsPdf] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // AI State
  const [conversationMessages, setConversationMessages] = useState([]);
  const [conversationInput, setConversationInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [showDiffView, setShowDiffView] = useState(false);

  // Task Generation
  const [shouldGenerateTasks, setShouldGenerateTasks] = useState(true);
  const [shouldNotifyTeam, setShouldNotifyTeam] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);

  // Dialogs
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isOutlineDialogOpen, setIsOutlineDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Loading
  const [loading, setLoading] = useState(true);

  // Refs
  const quillRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const conversationEndRef = useRef(null);

  // Load initial data
  useEffect(() => {
    if (currentWorkspaceId) {
      loadInitialData();
    }
  }, [currentWorkspaceId, documentId]);

  // Auto-save
  useEffect(() => {
    if (mode === MODES.EDITOR && title.trim() && content.trim()) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = setTimeout(() => {
        handleAutosave();
      }, AUTOSAVE_INTERVAL);

      return () => {
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
        }
      };
    }
  }, [title, description, content, selectedAssignments, selectedTask, tags, mode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K for command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      // Ctrl/Cmd + S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (mode === MODES.EDITOR) {
          handleSave();
        }
      }
      // Ctrl/Cmd + / for toggle AI panel
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsAIPanelOpen(!isAIPanelOpen);
      }
      // Escape to close command palette
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, isAIPanelOpen, mode]);

  // Scroll chat to bottom
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  const loadInitialData = async () => {
    if (!currentWorkspaceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [assignmentsData, tasksData, usersData, allDocuments, user] = await Promise.all([
        Assignment.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        Task.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        base44.entities.User.list(),
        Document.filter({ workspace_id: currentWorkspaceId }, "-updated_date", 100),
        base44.auth.me()
      ]);

      setAssignments(assignmentsData || []);
      setTasks(tasksData || []);
      setUsers(usersData || []);
      setDocuments(allDocuments || []);
      setCurrentUser(user);

      // Get recent documents
      const recent = (allDocuments || [])
        .filter(doc => doc.document_type !== 'folder_placeholder')
        .slice(0, 5);
      setRecentDocuments(recent);

      // Filter documents for reference
      const docsForReference = (allDocuments || []).filter(doc =>
        doc.id !== documentId &&
        doc.document_type !== 'folder_placeholder' &&
        doc.file_url
      );
      setAvailableDocsForReference(docsForReference);

      // If editing existing document
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
          setMode(MODES.EDITOR);
        } else {
          toast.error("Document not found");
          navigate(createPageUrl("Documents"));
          return;
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAutosave = async () => {
    if (!documentId) {
      // Save draft to localStorage for new documents
      try {
        const draftKey = `doc_draft_workshop_${currentWorkspaceId}`;
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

      // Upload HTML file
      const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
      const htmlFile = new File([blob], finalFileName, { type: 'text/html' });

      try {
        const uploadResult = await base44.integrations.Core.UploadFile({ file: htmlFile });
        fileUrl = uploadResult.file_url;

        // Convert to PDF if requested
        if (saveAsPdf) {
          toast.info("Converting to PDF...", { duration: 3000 });

          const convertResponse = await base44.functions.invoke('convertUploadToPdf', {
            fileUrl: fileUrl,
            fileName: finalFileName,
            workspaceId: currentWorkspaceId
          });

          if (convertResponse.data?.success && convertResponse.data?.pdfUrl) {
            fileUrl = convertResponse.data.pdfUrl;
            finalFileName = convertResponse.data.filename || `${documentFileNameBase}.pdf`;
            finalFileType = 'application/pdf';
            toast.success("Converted to PDF");
          }
        }
      } catch (uploadError) {
        console.error("File upload error:", uploadError);
        toast.warning("File upload failed, saving content only");
        fileUrl = null;
      } finally {
        setIsConverting(false);
      }

      const documentData = {
        title: title.trim(),
        description: description.trim() || "",
        content,
        document_type: selectedTemplate?.id || "other",
        assigned_to_assignments: selectedAssignments,
        selected_task_id: selectedTask || null,
        tags: tags || [],
        folder_path: "/created",
        file_url: fileUrl,
        file_name: finalFileName,
        file_type: finalFileType,
        ai_analysis: {
          template_used: selectedTemplate?.title || "custom",
          conversation_length: conversationMessages.length,
          was_generated: isGenerating || conversationMessages.length > 0
        }
      };

      if (documentId) {
        // Update existing
        const changeNotes = prompt("Describe what changed (optional):", "") || "Updates";
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
        const isMajorChange = changeNotes.toLowerCase().includes('major');
        const newVersionNumber = isMajorChange ? `${major + 1}.0` : `${major}.${minor + 1}`;

        await Document.update(documentId, {
          ...documentData,
          version: newVersionNumber,
          version_history: versionHistory
        });

        toast.success(`Updated to v${newVersionNumber}`);
        setCurrentDocumentVersion(newVersionNumber);
        setLastSaved(new Date().toISOString());

      } else {
        // Create new
        const newDoc = await Document.create({
          ...documentData,
          workspace_id: currentWorkspaceId,
          version: "1.0"
        });

        // Clear draft
        const draftKey = `doc_draft_workshop_${currentWorkspaceId}`;
        localStorage.removeItem(draftKey);

        // Generate tasks if requested
        if (shouldGenerateTasks && suggestedTasks.length > 0) {
          await createTasksFromSuggestions(newDoc.id);
        }

        navigate(`${createPageUrl("DocumentWorkshop")}?id=${newDoc.id}`, { replace: true });
        toast.success("Document created successfully!");
        setLastSaved(new Date().toISOString());
      }

    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save: " + (error.message || "Unknown error"));
    } finally {
      setIsSaving(false);
      setIsConverting(false);
    }
  };

  const createTasksFromSuggestions = async (documentId) => {
    try {
      const taskPromises = suggestedTasks.map(async (taskSuggestion) => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (taskSuggestion.due_date_offset_days || 7));

        return Task.create({
          workspace_id: currentWorkspaceId,
          title: taskSuggestion.title,
          description: `${taskSuggestion.description}\n\nGenerated from document: ${title}`,
          assignment_id: selectedAssignments[0] || null,
          assigned_to: currentUser?.email,
          assigned_by: currentUser?.email,
          priority: taskSuggestion.priority || 'medium',
          status: 'todo',
          due_date: dueDate.toISOString().split('T')[0],
          estimated_effort: taskSuggestion.estimated_effort || 2,
          auto_generated: true,
          related_documents: [documentId]
        });
      });

      await Promise.all(taskPromises);
      toast.success(`Created ${suggestedTasks.length} tasks`);
    } catch (error) {
      console.error("Error creating tasks:", error);
      toast.error("Failed to create some tasks");
    }
  };

  // Render welcome screen
  const renderWelcomeScreen = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900"
    >
      <div className="max-w-5xl w-full p-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Document Workshop
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Create, edit, and collaborate on documents with AI assistance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Quick Generate */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="cursor-pointer border-2 hover:border-indigo-500 hover:shadow-xl transition-all h-full"
              onClick={() => setMode(MODES.TEMPLATE_SELECT)}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">✨ Quick Generate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Use AI to create from professional templates. Fast, intelligent, and ready to edit.
                </p>
                <div className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                  Start here <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Blank Document */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="cursor-pointer border-2 hover:border-purple-500 hover:shadow-xl transition-all h-full"
              onClick={() => {
                setMode(MODES.EDITOR);
                setTitle("Untitled Document");
              }}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                  <Edit3 className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">📝 Blank Document</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Start from scratch with a clean slate. Full editing power and AI copilot ready.
                </p>
                <div className="mt-4 text-sm text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                  Create blank <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Import Existing */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="cursor-pointer border-2 hover:border-green-500 hover:shadow-xl transition-all h-full"
              onClick={() => navigate(createPageUrl("Documents"))}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center mb-4">
                  <FolderOpen className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">📂 Open Existing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Browse and edit your existing documents or import from files.
                </p>
                <div className="mt-4 text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                  Browse documents <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Documents */}
        {recentDocuments.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Documents
            </h3>
            <div className="space-y-2">
              {recentDocuments.map((doc) => (
                <motion.div
                  key={doc.id}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-gray-800 hover:border-indigo-500 cursor-pointer transition-all"
                  onClick={() => navigate(`${createPageUrl("DocumentWorkshop")}?id=${doc.id}`)}
                >
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(doc.updated_date).toLocaleTimeString()}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Quick tip */}
        <div className="mt-8 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-indigo-900 dark:text-indigo-100">
                <strong>Pro tip:</strong> Press <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs font-mono border">Ctrl+K</kbd> anytime to access the command palette
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Render template selector
  const renderTemplateSelector = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 p-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setMode(MODES.WELCOME)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Choose a Template
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select a template to get started, or create a custom document
          </p>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {DOCUMENT_TEMPLATES.map((template) => (
            <motion.div
              key={template.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`cursor-pointer border-2 hover:shadow-xl transition-all h-full ${
                  selectedTemplate?.id === template.id
                    ? 'border-indigo-500 ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                    : 'hover:border-indigo-300'
                }`}
                onClick={() => {
                  setSelectedTemplate(template);
                  setTitle(template.title + " for " + (selectedAssignments[0] ? assignments.find(a => a.id === selectedAssignments[0])?.name || "Project" : "Project"));
                  setCustomPrompt(template.prompt);
                }}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center mb-4`}>
                    <template.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl flex items-center justify-between">
                    {template.title}
                    {selectedTemplate?.id === template.id && (
                      <CheckCircle className="w-5 h-5 text-indigo-600" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    {template.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Custom Document Option */}
        <Card className="border-2 border-dashed hover:border-indigo-500 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
                <Wand2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Create Custom Document</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don't see what you need? Use the AI Prompt Wizard to create a custom template
                </p>
              </div>
              <Button
                onClick={() => setIsWizardOpen(true)}
                variant="outline"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Open Wizard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Next Step */}
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex justify-end"
          >
            <Button
              onClick={() => setMode(MODES.QUICK_GENERATE)}
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  // Render quick generate customization
  const renderQuickGenerate = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 p-8"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setMode(MODES.TEMPLATE_SELECT)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Customize Your {selectedTemplate?.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Provide some details so AI can create the perfect document for you
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Document Title */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Document Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Assignment Brief for Client Onboarding"
                className="text-lg"
              />
            </div>

            {/* Link to Assignment */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Link to Assignment (Optional)
              </label>
              <Select
                value={selectedAssignments[0] || "none"}
                onValueChange={(value) => setSelectedAssignments(value === "none" ? [] : [value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignment..." />
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

            {/* Custom Prompt */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                What should this document include? *
              </label>
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Be specific! For example: Include executive summary, requirements, timeline..."
                className="min-h-32"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 The more details you provide, the better your document will be!
              </p>
            </div>

            {/* Reference Materials */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Reference Materials (Optional)
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md"
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="generate-tasks"
                  checked={shouldGenerateTasks}
                  onCheckedChange={setShouldGenerateTasks}
                />
                <label htmlFor="generate-tasks" className="text-sm cursor-pointer">
                  Automatically generate related tasks
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify-team"
                  checked={shouldNotifyTeam}
                  onCheckedChange={setShouldNotifyTeam}
                />
                <label htmlFor="notify-team" className="text-sm cursor-pointer">
                  Notify team members when created
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={async () => {
                if (!title.trim() || !customPrompt.trim()) {
                  toast.error("Please fill in all required fields");
                  return;
                }
                // Generate document content
                setIsGenerating(true);
                try {
                  const response = await base44.integrations.Core.InvokeLLM({
                    prompt: customPrompt,
                    add_context_from_internet: false
                  });
                  setContent(response);
                  setMode(MODES.EDITOR);
                  toast.success("Document generated!");
                } catch (error) {
                  console.error("Generation error:", error);
                  toast.error("Failed to generate document");
                } finally {
                  setIsGenerating(false);
                }
              }}
              disabled={isGenerating || !title.trim() || !customPrompt.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-12"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating your document...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Document
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Prompt Wizard */}
      <PromptBuilderWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={(result) => {
          setTitle(result.title);
          setCustomPrompt(result.prompt);
          setIsWizardOpen(false);
          toast.success("Prompt optimized!");
        }}
        assignment={selectedAssignments[0] ? assignments.find(a => a.id === selectedAssignments[0]) : null}
      />
    </motion.div>
  );

  // Main render
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-indigo-600">Loading...</span>
      </div>
    );
  }

  if (mode === MODES.WELCOME) {
    return renderWelcomeScreen();
  }

  if (mode === MODES.TEMPLATE_SELECT) {
    return renderTemplateSelector();
  }

  if (mode === MODES.QUICK_GENERATE) {
    return renderQuickGenerate();
  }

  // Editor mode - placeholder for now
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Editor Mode</h2>
        <p className="text-gray-600 mb-4">Rich editor with AI copilot coming next...</p>
        <Button onClick={() => setMode(MODES.WELCOME)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Welcome
        </Button>
      </div>
    </div>
  );
}
