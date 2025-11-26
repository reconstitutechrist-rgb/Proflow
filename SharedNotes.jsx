import React, { useState, useEffect, useCallback } from "react";
import { Note } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  StickyNote,
  Plus,
  Save,
  Trash2,
  Edit2,
  X,
  Users,
  Clock,
  Loader2,
  Pin,
  PinOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function SharedNotes({ compact = false }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const { currentWorkspaceId, currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (currentWorkspaceId) {
      loadNotes();
      loadCurrentUser();
    }
  }, [currentWorkspaceId]);

  const loadCurrentUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const loadNotes = async () => {
    try {
      setLoading(true);
      const notesData = await Note.filter(
        { workspace_id: currentWorkspaceId, is_shared: true },
        "-updated_date"
      );
      setNotes(notesData);
    } catch (error) {
      console.error("Error loading shared notes:", error);
      toast.error("Failed to load shared notes");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!newNoteTitle.trim() && !newNoteContent.trim()) {
      toast.error("Please add a title or content");
      return;
    }

    try {
      setSaving(true);

      const noteData = {
        workspace_id: currentWorkspaceId,
        title: newNoteTitle.trim() || "Untitled Note",
        content: newNoteContent,
        is_shared: true,
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
        toast.success("Note updated");
      } else {
        await Note.create(noteData);
        toast.success("Shared note created");
      }

      resetForm();
      loadNotes();
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await Note.delete(noteId);
      toast.success("Note deleted");
      loadNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  const handleTogglePin = async (note) => {
    try {
      await Note.update(note.id, {
        is_pinned: !note.is_pinned,
      });
      loadNotes();
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNewNoteTitle(note.title || "");
    setNewNoteContent(note.content || "");
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingNote(null);
    setNewNoteTitle("");
    setNewNoteContent("");
    setIsDialogOpen(false);
  };

  // Sort notes: pinned first, then by date
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.updated_date) - new Date(a.updated_date);
  });

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-yellow-600" />
              Shared Notes
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsDialogOpen(true)}
              className="h-7 w-7 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : sortedNotes.length > 0 ? (
            <div className="space-y-2">
              {sortedNotes.slice(0, 3).map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleEditNote(note)}
                  className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                      {note.is_pinned && (
                        <Pin className="w-3 h-3 inline mr-1 text-yellow-600" />
                      )}
                      {note.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {note.content}
                  </p>
                </div>
              ))}
              {sortedNotes.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  +{sortedNotes.length - 3} more notes
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-2">
              No shared notes yet
            </p>
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
                {editingNote ? "Edit Shared Note" : "New Shared Note"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Input
                placeholder="Note title..."
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
              />
              <Textarea
                placeholder="Write your note here... Both team members can see and edit this."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={6}
                className="resize-none"
              />
              {editingNote && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  Last edited{" "}
                  {formatDistanceToNow(new Date(editingNote.updated_date), {
                    addSuffix: true,
                  })}
                  {editingNote.last_edited_by_name &&
                    ` by ${editingNote.last_edited_by_name}`}
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

  // Full view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-yellow-600" />
            Shared Notes
            <Badge variant="secondary" className="ml-2">
              <Users className="w-3 h-3 mr-1" />
              Team
            </Badge>
          </CardTitle>
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          Quick notes visible to all team members in this workspace
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : sortedNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedNotes.map((note) => (
              <div
                key={note.id}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer ${
                  note.is_pinned
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                }`}
                onClick={() => handleEditNote(note)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                    {note.title}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
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
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                  {note.content}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-[8px]">
                        {note.created_by_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{note.created_by_name || note.created_by}</span>
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
            <StickyNote className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No shared notes yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Create a note to share quick info with your team
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create First Note
            </Button>
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
              {editingNote ? "Edit Shared Note" : "New Shared Note"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Input
              placeholder="Note title..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
            />
            <Textarea
              placeholder="Write your note here... Both team members can see and edit this."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
            {editingNote && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                Last edited{" "}
                {formatDistanceToNow(new Date(editingNote.updated_date), {
                  addSuffix: true,
                })}
                {editingNote.last_edited_by_name &&
                  ` by ${editingNote.last_edited_by_name}`}
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
