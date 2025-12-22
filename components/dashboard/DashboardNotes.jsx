import React, { useState, useEffect, useCallback } from 'react';
import { Note } from '@/api/entities';
import { Assignment } from '@/api/entities';
import { Task } from '@/api/entities';
import { Document } from '@/api/entities';
import { db } from '@/api/db';
import DOMPurify from 'dompurify';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  StickyNote,
  Plus,
  Search,
  Sparkles,
  Pin,
  PinOff,
  Edit2,
  Trash2,
  Loader2,
  X,
  Link as LinkIcon,
  Users,
  Clock,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { toast } from 'sonner';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { useDebouncedValue } from '@/hooks';

const NOTES_COLLAPSED_KEY = 'proflow_notes_collapsed';

export default function DashboardNotes({ currentUser }) {
  const [notes, setNotes] = useState([]);
  const [sharedNotes, setSharedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(NOTES_COLLAPSED_KEY);
      return saved ? JSON.parse(saved) : true; // collapsed by default
    } catch {
      return true;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      try {
        localStorage.setItem(NOTES_COLLAPSED_KEY, JSON.stringify(newValue));
      } catch (e) {
        console.error('Error saving notes collapsed state:', e);
      }
      return newValue;
    });
  };
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 500);
  const [searching, setSearching] = useState(false);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSharedDialog, setShowSharedDialog] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editingSharedNote, setEditingSharedNote] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [savingNote, setSavingNote] = useState(false);
  const [savingShared, setSavingShared] = useState(false);
  const [sharedNoteTitle, setSharedNoteTitle] = useState('');
  const [sharedNoteContent, setSharedNoteContent] = useState('');
  const [activeTab, setActiveTab] = useState('recent');

  const { currentWorkspaceId } = useWorkspace();

  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    tags: [],
    tagInput: '',
    associated_entity_type: 'none',
    associated_entity_id: '',
    associated_entity_name: '',
    color: '#FBBF24',
    is_pinned: false,
  });

  const noteColors = [
    { value: '#FBBF24', label: 'Yellow' },
    { value: '#60A5FA', label: 'Blue' },
    { value: '#34D399', label: 'Green' },
    { value: '#F87171', label: 'Red' },
    { value: '#A78BFA', label: 'Purple' },
    { value: '#FB923C', label: 'Orange' },
    { value: '#EC4899', label: 'Pink' },
  ];

  useEffect(() => {
    if (currentWorkspaceId) {
      loadData();
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      performSearch();
    } else {
      setFilteredNotes(notes);
    }
  }, [debouncedSearchQuery, notes]);

  const loadData = async () => {
    try {
      setLoading(true);
      // PERFORMANCE: Reduced initial load limits to improve mount performance
      const [notesData, sharedNotesData, assignmentsData, tasksData, documentsData] =
        await Promise.all([
          Note.filter({ workspace_id: currentWorkspaceId }, '-updated_date', 20),
          Note.filter({ workspace_id: currentWorkspaceId, is_shared: true }, '-updated_date', 10),
          Assignment.filter({ workspace_id: currentWorkspaceId }, '-updated_date', 20),
          Task.filter({ workspace_id: currentWorkspaceId }, '-updated_date', 20),
          Document.filter({ workspace_id: currentWorkspaceId }, '-updated_date', 20),
        ]);

      // Filter out shared notes from personal notes list
      const personalNotes = notesData.filter((n) => !n.is_shared);
      setNotes(personalNotes);
      setFilteredNotes(personalNotes);
      setSharedNotes(sharedNotesData);
      setAssignments(assignmentsData);
      setTasks(tasksData);
      setDocuments(documentsData);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const generateAIKeywords = async (title, content) => {
    try {
      const strippedContent = content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

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
          type: 'object',
          properties: {
            keywords: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      });

      return response.keywords || [];
    } catch (error) {
      console.error('Error generating AI keywords:', error);
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
          type: 'object',
          properties: {
            search_terms: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      });

      const searchTerms = response.search_terms || [];
      const allTerms = [searchQuery.toLowerCase(), ...searchTerms.map((t) => t.toLowerCase())];

      const filtered = notes.filter((note) => {
        const strippedContent = (note.content || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const noteText =
          `${note.title} ${strippedContent} ${(note.ai_keywords || []).join(' ')} ${(note.tags || []).join(' ')}`.toLowerCase();
        return allTerms.some((term) => noteText.includes(term));
      });

      setFilteredNotes(filtered);
    } catch (error) {
      console.error('Error performing semantic search:', error);
      const filtered = notes.filter((note) => {
        const strippedContent = (note.content || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const noteText = `${note.title} ${strippedContent}`.toLowerCase();
        return noteText.includes(searchQuery.toLowerCase());
      });
      setFilteredNotes(filtered);
      toast.error('Semantic search unavailable, using basic search');
    } finally {
      setSearching(false);
    }
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setNoteForm({
      title: '',
      content: '',
      tags: [],
      tagInput: '',
      associated_entity_type: 'none',
      associated_entity_id: '',
      associated_entity_name: '',
      color: '#FBBF24',
      is_pinned: false,
    });
    setShowCreateDialog(true);
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteForm({
      title: note.title || '',
      content: note.content || '',
      tags: note.tags || [],
      tagInput: '',
      associated_entity_type: note.associated_entity_type || 'none',
      associated_entity_id: note.associated_entity_id || '',
      associated_entity_name: note.associated_entity_name || '',
      color: note.color || '#FBBF24',
      is_pinned: note.is_pinned || false,
    });
    setShowCreateDialog(true);
  };

  const handleSaveNote = async () => {
    if (!noteForm.title.trim() || !noteForm.content.trim()) {
      toast.error('Please provide both title and content for the note');
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
        ai_keywords: aiKeywords,
      };

      if (editingNote) {
        await Note.update(editingNote.id, noteData);
        toast.success('Note updated successfully');
      } else {
        await Note.create(noteData);
        toast.success('Note created successfully');
      }

      setShowCreateDialog(false);
      loadData();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note. Please try again');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await Note.delete(noteId);
      toast.success('Note deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note. Please try again');
    }
  };

  const handleTogglePin = async (note) => {
    try {
      await Note.update(note.id, {
        ...note,
        is_pinned: !note.is_pinned,
      });
      toast.success(note.is_pinned ? 'Note unpinned' : 'Note pinned');
      loadData();
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update note');
    }
  };

  const handleAddTag = () => {
    if (noteForm.tagInput.trim() && !noteForm.tags.includes(noteForm.tagInput.trim())) {
      setNoteForm({
        ...noteForm,
        tags: [...noteForm.tags, noteForm.tagInput.trim()],
        tagInput: '',
      });
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setNoteForm({
      ...noteForm,
      tags: noteForm.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleEntityAssociation = (entityType) => {
    setNoteForm({
      ...noteForm,
      associated_entity_type: entityType,
      associated_entity_id: '',
      associated_entity_name: '',
    });
  };

  const handleSelectEntity = (entityId) => {
    let entityName = '';

    if (noteForm.associated_entity_type === 'assignment') {
      const assignment = assignments.find((a) => a.id === entityId);
      entityName = assignment?.name || '';
    } else if (noteForm.associated_entity_type === 'task') {
      const task = tasks.find((t) => t.id === entityId);
      entityName = task?.title || '';
    } else if (noteForm.associated_entity_type === 'document') {
      const document = documents.find((d) => d.id === entityId);
      entityName = document?.title || '';
    }

    setNoteForm({
      ...noteForm,
      associated_entity_id: entityId,
      associated_entity_name: entityName,
    });
  };

  // Shared notes handlers
  const handleCreateSharedNote = () => {
    setEditingSharedNote(null);
    setSharedNoteTitle('');
    setSharedNoteContent('');
    setShowSharedDialog(true);
  };

  const handleEditSharedNote = (note) => {
    setEditingSharedNote(note);
    setSharedNoteTitle(note.title || '');
    setSharedNoteContent(note.content || '');
    setShowSharedDialog(true);
  };

  const handleSaveSharedNote = async () => {
    if (!sharedNoteTitle.trim() && !sharedNoteContent.trim()) {
      toast.error('Please add a title or content');
      return;
    }

    try {
      setSavingShared(true);

      const noteData = {
        workspace_id: currentWorkspaceId,
        title: sharedNoteTitle.trim() || 'Untitled Note',
        content: sharedNoteContent,
        is_shared: true,
        created_by: currentUser?.email,
        created_by_name: currentUser?.full_name,
        is_pinned: editingSharedNote?.is_pinned || false,
      };

      if (editingSharedNote) {
        await Note.update(editingSharedNote.id, {
          ...noteData,
          last_edited_by: currentUser?.email,
          last_edited_by_name: currentUser?.full_name,
        });
        toast.success('Shared note updated');
      } else {
        await Note.create(noteData);
        toast.success('Shared note created');
      }

      resetSharedForm();
      loadData();
    } catch (error) {
      console.error('Error saving shared note:', error);
      toast.error('Failed to save shared note');
    } finally {
      setSavingShared(false);
    }
  };

  const handleDeleteSharedNote = async (noteId) => {
    try {
      await Note.delete(noteId);
      toast.success('Shared note deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting shared note:', error);
      toast.error('Failed to delete shared note');
    }
  };

  const handleToggleSharedPin = async (note) => {
    try {
      await Note.update(note.id, {
        is_pinned: !note.is_pinned,
      });
      loadData();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const resetSharedForm = () => {
    setEditingSharedNote(null);
    setSharedNoteTitle('');
    setSharedNoteContent('');
    setShowSharedDialog(false);
  };

  // Sort shared notes: pinned first, then by date
  const sortedSharedNotes = [...sharedNotes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.updated_date) - new Date(a.updated_date);
  });

  const recentNotes = filteredNotes.slice(0, 5);
  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.is_pinned);
  const sortedFilteredNotes = [...pinnedNotes, ...unpinnedNotes];

  const renderNoteCard = (note) => (
    <div
      key={note.id}
      className="group relative p-3 rounded-lg border-l-4 bg-white dark:bg-gray-800 hover:shadow-md transition-all duration-200"
      style={{ borderLeftColor: note.color }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {note.title}
            </h3>
            {note.is_pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
          </div>
          <div
            className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content || '') }}
          />
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <span>{new Date(note.updated_date || note.created_date).toLocaleDateString()}</span>
            {note.tags && note.tags.length > 0 && (
              <div className="flex gap-1">
                {note.tags.slice(0, 2).map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0">
                    {tag}
                  </Badge>
                ))}
                {note.tags.length > 2 && (
                  <span className="text-gray-400">+{note.tags.length - 2}</span>
                )}
              </div>
            )}
            {note.associated_entity_name && (
              <span className="flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                {note.associated_entity_name}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons - visible on hover */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleTogglePin(note)}
          >
            <Pin
              className={`w-3 h-3 ${note.is_pinned ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleEditNote(note)}
          >
            <Edit2 className="w-3 h-3 text-blue-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleDeleteNote(note.id)}
          >
            <Trash2 className="w-3 h-3 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
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
      <Collapsible open={!isCollapsed} onOpenChange={() => toggleCollapsed()}>
        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <button
                  className="flex items-center gap-2 text-left flex-1"
                  onClick={toggleCollapsed}
                >
                  <StickyNote className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold">Notes</span>
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  )}
                  {isCollapsed && notes.length > 0 && (
                    <span className="text-sm text-gray-500 ml-2">({notes.length})</span>
                  )}
                </button>
              </CollapsibleTrigger>
              <Button
                onClick={handleCreateNote}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Note
              </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
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
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="recent">Recent</TabsTrigger>
                    <TabsTrigger value="all">All ({filteredNotes.length})</TabsTrigger>
                    <TabsTrigger value="shared" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Shared ({sharedNotes.length})
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
                        <Button
                          onClick={handleCreateNote}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Note
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="all" className="space-y-3 mt-4">
                    {sortedFilteredNotes.length > 0 ? (
                      <div className="grid gap-3">{sortedFilteredNotes.map(renderNoteCard)}</div>
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
                            <Button
                              onClick={handleCreateNote}
                              className="bg-amber-600 hover:bg-amber-700"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create Note
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="shared" className="space-y-3 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-500">
                        Quick notes visible to all team members in this workspace
                      </p>
                      <Button onClick={handleCreateSharedNote} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        New Shared Note
                      </Button>
                    </div>
                    {sortedSharedNotes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedSharedNotes.map((note) => (
                          <div
                            key={note.id}
                            className={`p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer ${
                              note.is_pinned
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                            }`}
                            onClick={() => handleEditSharedNote(note)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                                {note.title}
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSharedPin(note);
                                }}
                              >
                                {note.is_pinned ? (
                                  <PinOff className="w-3 h-3 text-yellow-600" />
                                ) : (
                                  <Pin className="w-3 h-3 text-gray-400" />
                                )}
                              </Button>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                              {note.content}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarFallback className="text-[8px]">
                                    {note.created_by_name?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-20">
                                  {note.created_by_name || note.created_by}
                                </span>
                              </div>
                              <span>
                                {formatDistanceToNow(new Date(note.updated_date), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No shared notes yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Create a note to share quick info with your team
                        </p>
                        <Button onClick={handleCreateSharedNote} className="mt-4">
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Shared Note
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-600" />
              {editingNote ? 'Edit Note' : 'Create New Note'}
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
              <RichTextEditor
                value={noteForm.content}
                onChange={(value) => setNoteForm({ ...noteForm, content: value })}
                placeholder="Write your note here... Use the toolbar for formatting"
                minHeight="200px"
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={noteForm.tagInput}
                  onChange={(e) => setNoteForm({ ...noteForm, tagInput: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
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

              {noteForm.associated_entity_type !== 'none' && (
                <Select value={noteForm.associated_entity_id} onValueChange={handleSelectEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${noteForm.associated_entity_type}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {noteForm.associated_entity_type === 'assignment' &&
                      assignments.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.id}>
                          {assignment.name}
                        </SelectItem>
                      ))}
                    {noteForm.associated_entity_type === 'task' &&
                      tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    {noteForm.associated_entity_type === 'document' &&
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
                  {editingNote ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {editingNote ? 'Update Note' : 'Create Note'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared Note Dialog */}
      <Dialog
        open={showSharedDialog}
        onOpenChange={(open) => {
          if (!open) resetSharedForm();
          else setShowSharedDialog(true);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-yellow-600" />
              {editingSharedNote ? 'Edit Shared Note' : 'New Shared Note'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Input
              placeholder="Note title..."
              value={sharedNoteTitle}
              onChange={(e) => setSharedNoteTitle(e.target.value)}
            />
            <Textarea
              placeholder="Write your note here... All team members can see and edit this."
              value={sharedNoteContent}
              onChange={(e) => setSharedNoteContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
            {editingSharedNote && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                Last edited{' '}
                {formatDistanceToNow(new Date(editingSharedNote.updated_date), {
                  addSuffix: true,
                })}
                {editingSharedNote.last_edited_by_name &&
                  ` by ${editingSharedNote.last_edited_by_name}`}
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {editingSharedNote && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleDeleteSharedNote(editingSharedNote.id);
                    resetSharedForm();
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetSharedForm}>
                Cancel
              </Button>
              <Button onClick={handleSaveSharedNote} disabled={savingShared}>
                {savingShared ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
