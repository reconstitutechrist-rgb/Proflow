import React, { useState, useEffect } from "react";
import { Note } from "@/api/entities";
import { Assignment } from "@/api/entities";
import { Task } from "@/api/entities";
import { Document } from "@/api/entities";
import { db } from "@/api/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StickyNote,
  Plus,
  Search,
  Sparkles,
  Pin,
  Edit2,
  Trash2,
  Loader2,
  X,
  Link as LinkIcon,
  Tag
} from "lucide-react";
import { Label } from "@/components/ui/label";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { toast } from "sonner";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

export default function DashboardNotes({ currentUser }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [savingNote, setSavingNote] = useState(false);

  const { currentWorkspaceId } = useWorkspace();

  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
    tags: [],
    tagInput: "",
    associated_entity_type: "none",
    associated_entity_id: "",
    associated_entity_name: "",
    color: "#FBBF24",
    is_pinned: false
  });

  const noteColors = [
    { value: "#FBBF24", label: "Yellow" },
    { value: "#60A5FA", label: "Blue" },
    { value: "#34D399", label: "Green" },
    { value: "#F87171", label: "Red" },
    { value: "#A78BFA", label: "Purple" },
    { value: "#FB923C", label: "Orange" },
    { value: "#EC4899", label: "Pink" }
  ];

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link'],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ]
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link',
    'color', 'background'
  ];

  useEffect(() => {
    if (currentWorkspaceId) {
      loadData();
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setFilteredNotes(notes);
    }
  }, [searchQuery, notes]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [notesData, assignmentsData, tasksData, documentsData] = await Promise.all([
        Note.filter({ workspace_id: currentWorkspaceId }, "-updated_date", 100),
        Assignment.filter({ workspace_id: currentWorkspaceId }, "-updated_date", 50),
        Task.filter({ workspace_id: currentWorkspaceId }, "-updated_date", 50),
        Document.filter({ workspace_id: currentWorkspaceId }, "-updated_date", 50)
      ]);
      
      setNotes(notesData);
      setFilteredNotes(notesData);
      setAssignments(assignmentsData);
      setTasks(tasksData);
      setDocuments(documentsData);
    } catch (error) {
      console.error("Error loading notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const generateAIKeywords = async (title, content) => {
    try {
      const strippedContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      const prompt = `Analyze this note and generate 8-12 relevant keywords and phrases for semantic search.

Note Title: ${title}
Content: ${strippedContent}

Generate keywords that capture:
- Main topics and themes
- Key concepts mentioned
- Related terminology
- Potential use cases
- Context and purpose

Return only a JSON array of keyword strings.`;

      const response = await db.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            keywords: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      return response.keywords || [];
    } catch (error) {
      console.error("Error generating AI keywords:", error);
      return [];
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes);
      return;
    }

    setSearching(true);
    try {
      const prompt = `User is searching their notes with this query: "${searchQuery}"

Generate 5-8 related keywords and search terms that would help find relevant notes.
Consider synonyms, related concepts, and common variations.

Return only a JSON array of search term strings.`;

      const response = await db.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            search_terms: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const searchTerms = response.search_terms || [];
      const allTerms = [searchQuery.toLowerCase(), ...searchTerms.map(t => t.toLowerCase())];

      const filtered = notes.filter(note => {
        const strippedContent = (note.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const noteText = `${note.title} ${strippedContent} ${(note.ai_keywords || []).join(' ')} ${(note.tags || []).join(' ')}`.toLowerCase();
        return allTerms.some(term => noteText.includes(term));
      });

      setFilteredNotes(filtered);
    } catch (error) {
      console.error("Error performing semantic search:", error);
      const filtered = notes.filter(note => {
        const strippedContent = (note.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const noteText = `${note.title} ${strippedContent}`.toLowerCase();
        return noteText.includes(searchQuery.toLowerCase());
      });
      setFilteredNotes(filtered);
      toast.error("Semantic search unavailable, using basic search");
    } finally {
      setSearching(false);
    }
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setNoteForm({
      title: "",
      content: "",
      tags: [],
      tagInput: "",
      associated_entity_type: "none",
      associated_entity_id: "",
      associated_entity_name: "",
      color: "#FBBF24",
      is_pinned: false
    });
    setShowCreateDialog(true);
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteForm({
      title: note.title || "",
      content: note.content || "",
      tags: note.tags || [],
      tagInput: "",
      associated_entity_type: note.associated_entity_type || "none",
      associated_entity_id: note.associated_entity_id || "",
      associated_entity_name: note.associated_entity_name || "",
      color: note.color || "#FBBF24",
      is_pinned: note.is_pinned || false
    });
    setShowCreateDialog(true);
  };

  const handleSaveNote = async () => {
    if (!noteForm.title.trim() || !noteForm.content.trim()) {
      toast.error("Please provide both title and content for the note");
      return;
    }

    try {
      setSavingNote(true);
      
      const aiKeywords = await generateAIKeywords(noteForm.title, noteForm.content);

      const noteData = {
        workspace_id: currentWorkspaceId,
        title: noteForm.title,
        content: noteForm.content,
        tags: noteForm.tags,
        associated_entity_type: noteForm.associated_entity_type,
        associated_entity_id: noteForm.associated_entity_id || null,
        associated_entity_name: noteForm.associated_entity_name || null,
        color: noteForm.color,
        is_pinned: noteForm.is_pinned,
        ai_keywords: aiKeywords
      };

      if (editingNote) {
        await Note.update(editingNote.id, noteData);
        toast.success("Note updated successfully");
      } else {
        await Note.create(noteData);
        toast.success("Note created successfully");
      }

      setShowCreateDialog(false);
      loadData();
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note. Please try again");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      await Note.delete(noteId);
      toast.success("Note deleted successfully");
      loadData();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note. Please try again");
    }
  };

  const handleTogglePin = async (note) => {
    try {
      await Note.update(note.id, {
        ...note,
        is_pinned: !note.is_pinned
      });
      toast.success(note.is_pinned ? "Note unpinned" : "Note pinned");
      loadData();
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast.error("Failed to update note");
    }
  };

  const handleAddTag = () => {
    if (noteForm.tagInput.trim() && !noteForm.tags.includes(noteForm.tagInput.trim())) {
      setNoteForm({
        ...noteForm,
        tags: [...noteForm.tags, noteForm.tagInput.trim()],
        tagInput: ""
      });
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setNoteForm({
      ...noteForm,
      tags: noteForm.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleEntityAssociation = (entityType) => {
    setNoteForm({
      ...noteForm,
      associated_entity_type: entityType,
      associated_entity_id: "",
      associated_entity_name: ""
    });
  };

  const handleSelectEntity = (entityId) => {
    let entityName = "";
    
    if (noteForm.associated_entity_type === "assignment") {
      const assignment = assignments.find(a => a.id === entityId);
      entityName = assignment?.name || "";
    } else if (noteForm.associated_entity_type === "task") {
      const task = tasks.find(t => t.id === entityId);
      entityName = task?.title || "";
    } else if (noteForm.associated_entity_type === "document") {
      const document = documents.find(d => d.id === entityId);
      entityName = document?.title || "";
    }

    setNoteForm({
      ...noteForm,
      associated_entity_id: entityId,
      associated_entity_name: entityName
    });
  };

  const recentNotes = filteredNotes.slice(0, 5);
  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.is_pinned);
  const sortedFilteredNotes = [...pinnedNotes, ...unpinnedNotes];

  const renderNoteCard = (note) => (
    <Card 
      key={note.id} 
      className="relative hover:shadow-lg transition-all duration-200 border-l-4"
      style={{ borderLeftColor: note.color }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {note.title}
              </h3>
              {note.is_pinned && (
                <Pin className="w-4 h-4 text-amber-500 flex-shrink-0" />
              )}
            </div>
            <div 
              className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3"
              dangerouslySetInnerHTML={{ __html: note.content }}
            />
            
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {note.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {note.associated_entity_name && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                <LinkIcon className="w-3 h-3" />
                <span className="capitalize">{note.associated_entity_type}:</span>
                <span className="font-medium">{note.associated_entity_name}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleTogglePin(note)}
            >
              <Pin className={`w-4 h-4 ${note.is_pinned ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleEditNote(note)}
            >
              <Edit2 className="w-4 h-4 text-blue-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleDeleteNote(note.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        <div className="text-xs text-gray-400 mt-2">
          {new Date(note.updated_date || note.created_date).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-amber-600" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-600" />
              Notes
            </CardTitle>
            <Button onClick={handleCreateNote} size="sm" className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search notes semantically..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-amber-600" />
              )}
              {!searching && searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <Tabs defaultValue="recent" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="recent">
                  Recent Notes
                </TabsTrigger>
                <TabsTrigger value="all">
                  All Notes ({filteredNotes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="recent" className="space-y-3 mt-4">
                {recentNotes.length > 0 ? (
                  recentNotes.map(renderNoteCard)
                ) : (
                  <div className="text-center py-12">
                    <StickyNote className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No notes yet
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Create your first note to get started!
                    </p>
                    <Button onClick={handleCreateNote} className="bg-amber-600 hover:bg-amber-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Note
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all" className="space-y-3 mt-4">
                {sortedFilteredNotes.length > 0 ? (
                  <div className="grid gap-3">
                    {sortedFilteredNotes.map(renderNoteCard)}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    {searchQuery ? (
                      <>
                        <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          No matching notes found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Try adjusting your search terms
                        </p>
                      </>
                    ) : (
                      <>
                        <StickyNote className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          No notes yet
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          Create your first note to get started!
                        </p>
                        <Button onClick={handleCreateNote} className="bg-amber-600 hover:bg-amber-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Note
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-600" />
              {editingNote ? "Edit Note" : "Create New Note"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Note title..."
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <div className="border rounded-lg overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={noteForm.content}
                  onChange={(value) => setNoteForm({ ...noteForm, content: value })}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Write your note here... Use the toolbar for formatting"
                  className="bg-white dark:bg-gray-800"
                  style={{ minHeight: "200px" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={noteForm.tagInput}
                  onChange={(e) => setNoteForm({ ...noteForm, tagInput: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  Add
                </Button>
              </div>
              {noteForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {noteForm.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {noteColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNoteForm({ ...noteForm, color: color.value })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      noteForm.color === color.value 
                        ? 'border-gray-900 dark:border-white scale-110' 
                        : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link to Entity (Optional)</Label>
              <Select
                value={noteForm.associated_entity_type}
                onValueChange={handleEntityAssociation}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                </SelectContent>
              </Select>

              {noteForm.associated_entity_type !== "none" && (
                <Select
                  value={noteForm.associated_entity_id}
                  onValueChange={handleSelectEntity}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${noteForm.associated_entity_type}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {noteForm.associated_entity_type === "assignment" &&
                      assignments.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.id}>
                          {assignment.name}
                        </SelectItem>
                      ))}
                    {noteForm.associated_entity_type === "task" &&
                      tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    {noteForm.associated_entity_type === "document" &&
                      documents.map((document) => (
                        <SelectItem key={document.id} value={document.id}>
                          {document.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_pinned"
                checked={noteForm.is_pinned}
                onChange={(e) => setNoteForm({ ...noteForm, is_pinned: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_pinned" className="cursor-pointer">
                Pin this note to top
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNote} 
              className="bg-amber-600 hover:bg-amber-700"
              disabled={savingNote}
            >
              {savingNote ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editingNote ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {editingNote ? "Update Note" : "Create Note"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}