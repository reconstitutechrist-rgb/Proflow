import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { db } from "@/api/db";
import { Document } from "@/api/entities";
import { Assignment } from "@/api/entities";
import { Task } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  Loader2,
  Sparkles,
  Edit3,
  FolderOpen,
  Zap,
  CheckCircle,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import DocumentLibrary from "@/components/documents/DocumentLibrary";
import DocumentEditor from "@/components/documents/DocumentEditor";

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
    icon: Target, // Target needs import if used
    color: "from-green-500 to-teal-500",
    prompt: "Develop a project plan with executive summary, goals, work breakdown, resource allocation, and risk mitigation."
  },
  {
    id: "status-report",
    title: "Status Report",
    description: "Progress, achievements, and next steps",
    icon: Bell, // Bell needs import if used
    color: "from-orange-500 to-red-500",
    prompt: "Generate a status report covering progress, completed tasks, upcoming tasks, blockers, and overall health."
  },
];

// Re-import icons needed for templates array
import { Target, Bell } from "lucide-react";

export default function DocumentsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  // Tab state from URL
  const activeMainTab = searchParams.get("tab") || "library";
  const documentId = searchParams.get("id");

  // Data
  const [documents, setDocuments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Template Generation State
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [shouldGenerateTasks, setShouldGenerateTasks] = useState(false);
  const [selectedTemplateAssignment, setSelectedTemplateAssignment] = useState([]);

  // Editor State Hand-off
  const [pendingDocumentData, setPendingDocumentData] = useState(null);

  // Load data
  useEffect(() => {
    if (currentWorkspaceId && !workspaceLoading) {
      loadData();
    }
  }, [currentWorkspaceId, workspaceLoading, documentId]);

  const loadData = async () => {
    if (!currentWorkspaceId) return;

    try {
      setLoading(true);

      const [workspaceAssignments, allAssignmentsList, workspaceProjects, allProjectsList, tasksData, allDocuments, user] = await Promise.all([
        Assignment.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        Assignment.list("-updated_date", 100),
        db.entities.Project.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        db.entities.Project.list("-updated_date", 100),
        Task.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        Document.filter({ workspace_id: currentWorkspaceId }, "-created_date"),
        db.auth.me()
      ]);

      // Consolidate assignments
      const legacyAssignments = (allAssignmentsList || []).filter(a => !a.workspace_id);
      const combinedAssignments = [...(workspaceAssignments || []), ...legacyAssignments];
      const uniqueAssignments = combinedAssignments.filter((assignment, index, self) =>
        index === self.findIndex(a => a.id === assignment.id)
      );
      setAssignments(uniqueAssignments);

      // Consolidate projects
      const legacyProjects = (allProjectsList || []).filter(p => !p.workspace_id);
      const combinedProjects = [...(workspaceProjects || []), ...legacyProjects];
      const uniqueProjects = combinedProjects.filter((project, index, self) =>
        index === self.findIndex(p => p.id === project.id)
      );
      setProjects(uniqueProjects);
      
      setTasks(tasksData || []);
      setDocuments(allDocuments || []);
      setCurrentUser(user);

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const createNewDocument = () => {
    setPendingDocumentData(null); // Clear any pending data
    setSearchParams({ tab: "studio" });
  };

  const handleEditDocument = (doc) => {
    // If it's a file upload (has file_url but maybe no content), we might want to preview it instead
    // But for now, let's route to studio. The editor handles loading content.
    setSearchParams({ tab: "studio", id: doc.id });
  };

  const handleDeleteDocument = async (e, doc) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
      try {
        await Document.delete(doc.id);
        toast.success("Document deleted");
        loadData();
      } catch (error) {
        toast.error("Failed to delete document");
      }
    }
  };

  const handleGenerateFromTemplate = async () => {
    if (!templateTitle.trim() || !customPrompt.trim()) {
      toast.error("Please fill in title and description");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await db.integrations.Core.InvokeLLM({
        prompt: customPrompt,
        add_context_from_internet: false
      });
      
      setPendingDocumentData({
        title: templateTitle,
        content: response,
        assigned_to_assignments: selectedTemplateAssignment,
        description: `Generated from template: ${selectedTemplate.title}`
      });
      
      setSearchParams({ tab: "studio" });
      toast.success("Document generated!");
      
      // Reset template form
      setTemplateTitle("");
      setCustomPrompt("");
      setSelectedTemplate(null);
      setSelectedTemplateAssignment([]);

    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate document");
    } finally {
      setIsGenerating(false);
    }
  };

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
        <Tabs value={activeMainTab} onValueChange={(v) => {
          if (v === 'library') {
            setSearchParams({ tab: v });
          } else {
            // For studio/templates, just switch tab, preserve ID if in studio
            setSearchParams(prev => {
              const newParams = new URLSearchParams(prev);
              newParams.set('tab', v);
              if (v !== 'studio') newParams.delete('id'); // Clear ID if leaving studio
              return newParams;
            });
          }
        }}>
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
          <DocumentLibrary
            documents={documents}
            projects={projects}
            assignments={assignments}
            currentUser={currentUser}
            onEditDocument={handleEditDocument}
            onDeleteDocument={handleDeleteDocument}
            onCreateDocument={createNewDocument}
            onRefresh={loadData}
          />
        )}

        {/* Studio Tab */}
        {activeMainTab === "studio" && (
          <DocumentEditor
            documentId={documentId}
            initialData={pendingDocumentData}
            projects={projects}
            assignments={assignments}
            tasks={tasks}
            currentUser={currentUser}
            onSaveComplete={(doc) => {
              loadData(); // Refresh list
              if (doc && doc.id && !documentId) {
                setSearchParams({ tab: "studio", id: doc.id });
              }
              setPendingDocumentData(null); // Clear pending data after save
            }}
          />
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
                      onClick={() => { setSelectedTemplate(template); setTemplateTitle(template.title); setCustomPrompt(template.prompt); }}
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
                        <Input value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} placeholder="Enter title..." />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">What should this document include?</label>
                        <Textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} className="min-h-24" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="gen-tasks" checked={shouldGenerateTasks} onCheckedChange={setShouldGenerateTasks} />
                        <label htmlFor="gen-tasks" className="text-sm cursor-pointer">Generate related tasks (Coming Soon)</label>
                      </div>
                      <Button onClick={handleGenerateFromTemplate} disabled={isGenerating || !templateTitle.trim() || !customPrompt.trim()} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 h-12">
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
    </div>
  );
}
