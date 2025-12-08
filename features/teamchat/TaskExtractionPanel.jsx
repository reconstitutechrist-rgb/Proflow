import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListTodo, Loader2, Sparkles, Check, X, User, FolderOpen, AlertCircle } from 'lucide-react';
import { useTeamChatAI } from './useTeamChatAI';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function TaskExtractionPanel({
  open,
  onOpenChange,
  messages,
  currentChat,
  projects,
  users,
}) {
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [editedTasks, setEditedTasks] = useState([]);
  const [creating, setCreating] = useState(false);

  const { currentWorkspaceId } = useWorkspace();
  const { extractingTasks, extractedTasks, extractTasks, createTasks, clearExtractedTasks } =
    useTeamChatAI();

  // Extract tasks when panel opens
  useEffect(() => {
    if (open && messages?.length && extractedTasks.length === 0) {
      extractTasks(messages, currentChat?.default_project_id, projects, users);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, messages, currentChat?.default_project_id, projects, users, extractTasks]);

  // Initialize edited tasks and selection when extraction completes
  useEffect(() => {
    if (extractedTasks.length > 0) {
      setEditedTasks([...extractedTasks]);
      setSelectedTasks(new Set(extractedTasks.map((_, i) => i)));
    }
  }, [extractedTasks]);

  // Clear state when panel closes
  const handleClose = () => {
    onOpenChange(false);
    clearExtractedTasks();
    setSelectedTasks(new Set());
    setEditedTasks([]);
  };

  /**
   * Toggle task selection
   */
  const toggleTaskSelection = (index) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedTasks(newSelection);
  };

  /**
   * Update a task field
   */
  const updateTask = (index, field, value) => {
    setEditedTasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  /**
   * Remove a task from the list
   */
  const removeTask = (index) => {
    setEditedTasks((prev) => prev.filter((_, i) => i !== index));
    setSelectedTasks((prev) => {
      const newSelection = new Set();
      prev.forEach((i) => {
        if (i < index) newSelection.add(i);
        else if (i > index) newSelection.add(i - 1);
      });
      return newSelection;
    });
  };

  /**
   * Create selected tasks
   */
  const handleCreateTasks = async () => {
    const tasksToCreate = editedTasks.filter((_, i) => selectedTasks.has(i));
    if (tasksToCreate.length === 0) return;

    setCreating(true);
    try {
      const currentUser = await db.auth.me();
      await createTasks(tasksToCreate, currentWorkspaceId, currentUser);
      handleClose();
    } catch (error) {
      console.error('Error creating tasks:', error);
    } finally {
      setCreating(false);
    }
  };

  /**
   * Re-extract tasks
   */
  const handleReExtract = () => {
    clearExtractedTasks();
    setEditedTasks([]);
    setSelectedTasks(new Set());
    extractTasks(messages, currentChat?.default_project_id, projects, users);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-emerald-500" />
            Extract Tasks from Chat
          </SheetTitle>
          <SheetDescription>
            Review and create tasks from your conversation. Edit details before creating.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col h-[calc(100vh-200px)]">
          {/* Loading State */}
          {extractingTasks && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Analyzing conversation...</p>
              <p className="text-xs mt-1">Looking for action items and tasks</p>
            </div>
          )}

          {/* No Tasks Found */}
          {!extractingTasks && editedTasks.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <AlertCircle className="w-8 h-8 mb-3" />
              <p className="text-sm font-medium">No tasks found</p>
              <p className="text-xs mt-1 text-center px-4">
                No action items were detected in this conversation. Try phrases like "we need to" or
                "let's" to create tasks.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleReExtract}>
                <Sparkles className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Task List */}
          {!extractingTasks && editedTasks.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">
                  {selectedTasks.size} of {editedTasks.length} selected
                </span>
                <Button variant="ghost" size="sm" onClick={handleReExtract}>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Re-extract
                </Button>
              </div>

              <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-3">
                  {editedTasks.map((task, index) => (
                    <div
                      key={index}
                      className={`
                        border rounded-lg p-3 transition-colors
                        ${selectedTasks.has(index) ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-gray-200 bg-white dark:bg-gray-900'}
                      `}
                    >
                      {/* Task Header */}
                      <div className="flex items-start gap-2 mb-2">
                        <Checkbox
                          checked={selectedTasks.has(index)}
                          onCheckedChange={() => toggleTaskSelection(index)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <Input
                            value={task.title}
                            onChange={(e) => updateTask(index, 'title', e.target.value)}
                            className="font-medium text-sm h-8 border-0 p-0 focus-visible:ring-0 bg-transparent"
                            placeholder="Task title..."
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-red-500"
                          onClick={() => removeTask(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Task Details */}
                      <div className="pl-6 space-y-2">
                        {/* Description */}
                        {task.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
                        )}

                        {/* Selectors Row */}
                        <div className="flex flex-wrap gap-2">
                          {/* Priority */}
                          <Select
                            value={task.priority}
                            onValueChange={(v) => updateTask(index, 'priority', v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-auto">
                              <Badge
                                className={PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}
                              >
                                {task.priority}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Project */}
                          <Select
                            value={task.project_id || '__none__'}
                            onValueChange={(v) => updateTask(index, 'project_id', v === '__none__' ? null : v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-auto max-w-[140px]">
                              <div className="flex items-center gap-1">
                                <FolderOpen className="w-3 h-3" />
                                <SelectValue placeholder="Project" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">No project</SelectItem>
                              {projects?.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Assignee */}
                          <Select
                            value={task.assigned_to || '__none__'}
                            onValueChange={(v) => updateTask(index, 'assigned_to', v === '__none__' ? null : v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-auto max-w-[140px]">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <SelectValue placeholder="Assignee" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Unassigned</SelectItem>
                              {users?.map((u) => (
                                <SelectItem key={u.email} value={u.email}>
                                  {u.full_name || u.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="pt-4 border-t mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTasks}
                  disabled={selectedTasks.size === 0 || creating}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Create {selectedTasks.size} Task{selectedTasks.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
