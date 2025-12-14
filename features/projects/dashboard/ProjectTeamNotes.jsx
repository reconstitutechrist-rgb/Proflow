import { useState, useEffect } from 'react';
import { Note } from '@/api/entities';
import { db } from '@/api/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StickyNote, Plus, Save, Trash2, Clock, Loader2, Pin, PinOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function ProjectTeamNotes({ projectId, workspaceId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (projectId && workspaceId) {
      loadNotes();
      loadCurrentUser();
    }
  }, [projectId, workspaceId]);

  const loadCurrentUser = async () => {
    try {
      const user = await db.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadNotes = async () => {
    try {
      setLoading(true);
      // Filter notes specific to this project
      const notesData = await Note.filter(
        {
          workspace_id: workspaceId,
          associated_entity_type: 'project',
          associated_entity_id: projectId,
          is_shared: true,
        },
        '-updated_date'
      );
      setNotes(notesData);
    } catch (error) {
      console.error('Error loading project notes:', error);
      toast.error('Failed to load team notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!newNoteTitle.trim() && !newNoteContent.trim()) {
      toast.error('Please add a title or content');
      return;
    }

    try {
      setSaving(true);

      const noteData = {
        workspace_id: workspaceId,
        title: newNoteTitle.trim() || 'Untitled Note',
        content: newNoteContent,
        is_shared: true,
        associated_entity_type: 'project',
        associated_entity_id: projectId,
        created_by: currentUser?.email,
        created_by_name: currentUser?.full_name,
        is_pinned: false,
      };

      if (editingNote) {
        await Note.update(editingNote.id, {
          ...noteData,
          last_edited_by: currentUser?.email,
          last_edited_by_name: currentUser?.full_name,
        });
        toast.success('Note updated');
      } else {
        await Note.create(noteData);
        toast.success('Team note created');
      }

      resetForm();
      loadNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await Note.delete(noteId);
      toast.success('Note deleted');
      loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleTogglePin = async (note) => {
    try {
      await Note.update(note.id, {
        is_pinned: !note.is_pinned,
      });
      loadNotes();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNewNoteTitle(note.title || '');
    setNewNoteContent(note.content || '');
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingNote(null);
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsDialogOpen(false);
  };

  // Sort notes: pinned first, then by date
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.updated_date) - new Date(a.updated_date);
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-yellow-600" />
            Team Notes
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(true)} className="h-7">
            <Plus className="w-3 h-3 mr-1" />
            Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : sortedNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedNotes.map((note) => (
              <div
                key={note.id}
                className={`p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
                  note.is_pinned
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
                onClick={() => handleEditNote(note)}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">
                    {note.title}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(note);
                    }}
                  >
                    {note.is_pinned ? (
                      <PinOff className="w-3 h-3 text-yellow-600" />
                    ) : (
                      <Pin className="w-3 h-3 text-gray-400" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                  {note.content}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-[8px]">
                        {note.created_by_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[80px]">
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
          <div className="text-center py-6 text-gray-500">
            <StickyNote className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm">No team notes yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add a note to share quick info with your team
            </p>
          </div>
        )}
      </CardContent>

      {/* Note Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
          else setIsDialogOpen(true);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-yellow-600" />
              {editingNote ? 'Edit Note' : 'New Team Note'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Input
              placeholder="Note title..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
            />
            <Textarea
              placeholder="Write your note here... Team members can see and edit this."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={6}
              className="resize-none"
            />
            {editingNote && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                Last edited{' '}
                {formatDistanceToNow(new Date(editingNote.updated_date), {
                  addSuffix: true,
                })}
                {editingNote.last_edited_by_name && ` by ${editingNote.last_edited_by_name}`}
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {editingNote && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleDeleteNote(editingNote.id);
                    resetForm();
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSaveNote} disabled={saving}>
                {saving ? (
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
    </Card>
  );
}
