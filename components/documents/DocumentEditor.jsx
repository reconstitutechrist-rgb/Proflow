import React, { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/api/db";
import { Document } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Image as ImageIcon,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Clock,
  Brain,
  Upload,
  CheckCircle,
  X,
  FileUp,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "@/components/editor/RichTextEditor";
import { Checkbox } from "@/components/ui/checkbox";

import OutlineGenerator from "@/features/ai/OutlineGenerator";
import AIReviewPanel from "@/features/ai/AIReviewPanel";
import ExportOptions from "@/features/documents/ExportOptions";
import AIImageGenerator from "@/features/ai/AIImageGenerator";
import ConversationalAssistant from "@/features/ai/ConversationalAssistant";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import DocumentReviewModal from "@/components/documents/DocumentReviewModal";

const AUTOSAVE_INTERVAL = 30000;

export default function DocumentEditor({
  documentId,
  initialData,
  projects,
  assignments,
  tasks,
  currentUser,
  onSaveComplete
}) {
  const { currentWorkspaceId } = useWorkspace();

  // Editor state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [currentDocumentVersion, setCurrentDocumentVersion] = useState("1.0");
  const [saveAsPdf, setSaveAsPdf] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [activeAITab, setActiveAITab] = useState("assistant");

  // Review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Data
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [selectedExistingDocs, setSelectedExistingDocs] = useState([]);
  const [availableDocsForReference, setAvailableDocsForReference] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [isOutlineDialogOpen, setIsOutlineDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Refs
  const autosaveTimerRef = useRef(null);

  // Load data
  useEffect(() => {
    if (documentId && currentWorkspaceId) {
      loadDocument(documentId);
    } else if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setContent(initialData.content || "");
      setSelectedAssignments(initialData.assigned_to_assignments || []);
      setSelectedProject(initialData.assigned_to_project || "");
      setLoading(false);
    } else {
      setLoading(false);
      const draftKey = `doc_draft_hub_${currentWorkspaceId}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (new Date() - new Date(draft.timestamp) < 24 * 60 * 60 * 1000) {
            setTitle(draft.title);
            setDescription(draft.description);
            setContent(draft.content);
            setSelectedAssignments(draft.selectedAssignments || []);
            setSelectedTask(draft.selectedTask || "");
            setTags(draft.tags || []);
            toast.info("Restored draft from last session");
          }
        } catch (e) {
          console.error("Failed to load draft", e);
        }
      }
    }
  }, [documentId, currentWorkspaceId, initialData]);

  // Load reference documents
  useEffect(() => {
    if (currentWorkspaceId) {
      Document.filter({ workspace_id: currentWorkspaceId }, "-created_date")
        .then(docs => {
          const refs = (docs || []).filter(doc =>
            doc.id !== documentId &&
            doc.document_type !== 'folder_placeholder' &&
            doc.file_url
          );
          setAvailableDocsForReference(refs);
        })
        .catch(console.error);
    }
  }, [currentWorkspaceId, documentId]);

  // Autosave
  useEffect(() => {
    if (!documentId && title.trim() && content.trim()) {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(handleAutosave, AUTOSAVE_INTERVAL);
      return () => {
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      };
    }
  }, [title, content, documentId, selectedAssignments, tags, description, selectedTask, currentWorkspaceId]);

  const loadDocument = async (id) => {
    try {
      setLoading(true);
      const doc = await Document.get(id);
      if (doc) {
        setTitle(doc.title || "");
        setDescription(doc.description || "");
        setContent(doc.content || "");
        setSelectedAssignments(doc.assigned_to_assignments || []);
        setSelectedProject(doc.assigned_to_project || "");
        setSelectedTask(doc.selected_task_id || "");
        setTags(doc.tags || []);
        setLastSaved(doc.updated_date);
        setCurrentDocumentVersion(doc.version || "1.0");
      }
    } catch (error) {
      console.error("Error loading document:", error);
      toast.error("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const handleAutosave = async () => {
    if (!documentId && currentWorkspaceId) {
      const draftKey = `doc_draft_hub_${currentWorkspaceId}`;
      localStorage.setItem(draftKey, JSON.stringify({
        title, description, content, selectedAssignments, selectedTask, tags,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const handleSave = async (overrideData = null) => {
    const saveTitle = overrideData?.title ?? title;
    const saveDescription = overrideData?.description ?? description;
    const saveContent = overrideData?.content ?? content;

    if (!saveTitle.trim()) {
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

      const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${saveTitle}</title>
        <style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6}</style>
        </head><body>${saveContent}</body></html>`;

      let fileUrl = null;
      let finalFileName = `${saveTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
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
        title: saveTitle.trim(),
        description: saveDescription.trim(),
        content: saveContent,
        document_type: "document",
        assigned_to_assignments: selectedAssignments,
        assigned_to_project: selectedProject || null,
        selected_task_id: selectedTask || null,
        tags,
        folder_path: "/created",
        file_url: fileUrl,
        file_name: finalFileName,
        file_type: finalFileType
      };

      let savedDoc;
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

        savedDoc = await Document.update(documentId, { ...documentData, version: newVersionNumber, version_history: versionHistory });
        toast.success(`Updated to v${newVersionNumber}`);
        setCurrentDocumentVersion(newVersionNumber);
      } else {
        savedDoc = await Document.create({ ...documentData, workspace_id: currentWorkspaceId, version: "1.0" });
        localStorage.removeItem(`doc_draft_hub_${currentWorkspaceId}`);
        toast.success("Document created!");
      }

      // Update local state with saved values
      if (overrideData) {
        setTitle(saveTitle);
        setDescription(saveDescription);
        setContent(saveContent);
      }
      setLastSaved(new Date().toISOString());

      if (onSaveComplete) onSaveComplete(savedDoc);

      return savedDoc;

    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save document");
    } finally {
      setIsSaving(false);
      setIsConverting(false);
    }
  };

  const handleInsertContent = useCallback((newContent) => {
    setContent(prev => prev + (prev ? '\n\n' : '') + newContent);
    toast.success("Content inserted");
  }, []);

  const handleInsertImage = useCallback((imageUrl) => {
    const imgHtml = `<img src="${imageUrl}" alt="Generated image" style="max-width: 100%; height: auto;" />`;
    setContent(prev => prev + (prev ? '\n\n' : '') + imgHtml);
    toast.success("Image inserted");
  }, []);

  const handleApplyOutline = (outlineHtml) => {
    setContent(outlineHtml);
    setIsOutlineDialogOpen(false);
    toast.success("Outline applied");
  };

  // Handle "Done" button - open review modal
  const handleDone = () => {
    if (!content.trim()) {
      toast.error("Please add some content before reviewing");
      return;
    }
    setIsReviewModalOpen(true);
  };

  // Handle save from review modal
  const handleReviewModalSave = async (data) => {
    const savedDoc = await handleSave(data);
    if (savedDoc) {
      setIsReviewModalOpen(false);
    }
  };

  // Handle close from review modal (back to editing)
  const handleReviewModalClose = (data) => {
    if (data?.hasChanges) {
      setTitle(data.title);
      setDescription(data.description);
      setContent(data.content);
    }
    setIsReviewModalOpen(false);
  };

  const availableTasks = selectedAssignments.length > 0
    ? tasks.filter(task => task.assignment_id === selectedAssignments[0])
    : [];

  const getAllReferenceDocuments = () => [
    ...uploadedDocuments.filter(d => d.includedInContext).map(d => d.url),
    ...selectedExistingDocs.map(d => d.url)
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
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
              <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)}>
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
              <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-white dark:bg-gray-800">
                <Checkbox id="save-pdf" checked={saveAsPdf} onCheckedChange={setSaveAsPdf} />
                <label htmlFor="save-pdf" className="text-xs cursor-pointer">PDF</label>
              </div>
              <Button
                variant="outline"
                onClick={handleDone}
                disabled={!content.trim()}
                className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/20"
              >
                <Check className="w-4 h-4" />
                Done
              </Button>
              <Button onClick={() => handleSave()} disabled={isSaving || !title.trim()} className="bg-gradient-to-r from-indigo-600 to-purple-600">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-3 mt-4">
            <Select value={selectedProject || "none"} onValueChange={(v) => setSelectedProject(v === "none" ? "" : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Link to Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedAssignments[0] || "none"} onValueChange={(v) => { setSelectedAssignments(v === "none" ? [] : [v]); setSelectedTask(""); }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Link to Assignment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Assignment</SelectItem>
                {assignments.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedAssignments.length > 0 && availableTasks.length > 0 && (
              <Select value={selectedTask || "none"} onValueChange={(v) => setSelectedTask(v === "none" ? "" : v)}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Link to Task" /></SelectTrigger>
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

        {/* Editor Content - Simple layout */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <Input placeholder="Document title..." value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-semibold" />
            <Textarea placeholder="Brief description..." value={description} onChange={(e) => setDescription(e.target.value)} className="h-20" />
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm min-h-[400px]">
              <RichTextEditor value={content} onChange={setContent} placeholder="Start writing..." minHeight="400px" />
            </div>
          </div>
        </div>
      </div>

      {/* AI Sidebar */}
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

      {/* Review Modal */}
      <DocumentReviewModal
        isOpen={isReviewModalOpen}
        onClose={handleReviewModalClose}
        initialContent={content}
        initialTitle={title}
        initialDescription={description}
        onSave={handleReviewModalSave}
        isSaving={isSaving}
        selectedAssignment={selectedAssignments[0]}
        selectedTask={selectedTask}
        assignments={assignments}
        tasks={tasks}
        referenceDocumentUrls={getAllReferenceDocuments()}
      />
    </div>
  );
}
