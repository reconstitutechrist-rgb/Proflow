import React, { useState, useCallback } from 'react';
import { Task } from '@/api/entities';
import { User } from '@/api/entities';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Target,
  CheckCircle,
  Loader2,
  Plus,
  Edit,
  User as UserIcon,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper functions moved outside component to avoid dependency issues
const mapPriority = (aiPriority) => {
  if (!aiPriority) return 'medium';
  const priority = aiPriority.toLowerCase();
  if (priority.includes('urgent') || priority.includes('critical')) return 'urgent';
  if (priority.includes('high')) return 'high';
  if (priority.includes('low')) return 'low';
  return 'medium';
};

const parseDueDate = (deadline) => {
  if (!deadline) {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }

  try {
    const lowerDeadline = deadline.toLowerCase();

    if (lowerDeadline.includes('today')) {
      return new Date().toISOString().split('T')[0];
    }

    if (lowerDeadline.includes('tomorrow')) {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      return date.toISOString().split('T')[0];
    }

    if (lowerDeadline.includes('week')) {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    }

    const parsedDate = new Date(deadline);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
  } catch (e) {
    console.error('Error parsing date:', e);
  }

  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
};

export default function ActionItemsToTasksConverter({
  actionItems,
  assignmentId,
  currentUser,
  teamMembers = [],
  onTasksCreated,
}) {
  const { currentWorkspaceId } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [taskForms, setTaskForms] = useState({});
  const [createdCount, setCreatedCount] = useState(0);

  // Memoized function to find assignee email
  const findAssigneeEmail = useCallback(
    (assigneeName) => {
      if (!assigneeName) return currentUser?.email || '';

      const member = teamMembers.find(
        (m) =>
          m.full_name?.toLowerCase().includes(assigneeName.toLowerCase()) ||
          m.email?.toLowerCase().includes(assigneeName.toLowerCase())
      );

      return member?.email || currentUser?.email || '';
    },
    [currentUser, teamMembers]
  );

  // Initialize task forms from action items
  React.useEffect(() => {
    if (actionItems && actionItems.length > 0 && Object.keys(taskForms).length === 0) {
      const forms = {};
      actionItems.forEach((item, idx) => {
        forms[idx] = {
          title: item.task,
          description: item.context || '',
          priority: mapPriority(item.priority),
          assigned_to: findAssigneeEmail(item.assignee),
          due_date: parseDueDate(item.deadline),
          estimated_effort: 2,
        };
      });
      setTaskForms(forms);
      setSelectedItems(actionItems.map((_, idx) => idx));
    }
  }, [actionItems, taskForms, findAssigneeEmail]);

  const toggleItemSelection = (idx) => {
    setSelectedItems((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const updateTaskForm = (idx, field, value) => {
    setTaskForms((prev) => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [field]: value,
      },
    }));
  };

  const createTasks = async () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one action item to create tasks');
      return;
    }

    setIsCreating(true);
    let successCount = 0;

    try {
      const taskCreationPromises = selectedItems.map(async (idx) => {
        const form = taskForms[idx];
        const originalItem = actionItems[idx];

        const taskData = {
          workspace_id: currentWorkspaceId,
          title: form.title,
          description: `${form.description}\n\n---\nExtracted from chat conversation\nOriginal action item: "${originalItem.task}"`,
          assignment_id: assignmentId,
          assigned_to: form.assigned_to,
          assigned_by: currentUser?.email,
          priority: form.priority,
          status: 'todo',
          due_date: form.due_date,
          estimated_effort: form.estimated_effort,
          auto_generated: true,
          generation_source: {
            source_type: 'chat_summary',
            confidence: 0.85,
            reasoning: `Created from AI-extracted action item in chat conversation`,
            original_context: originalItem.context,
          },
        };

        await Task.create(taskData);
        successCount++;
      });

      await Promise.all(taskCreationPromises);
      setCreatedCount(successCount);

      if (onTasksCreated) {
        onTasksCreated(successCount);
      }

      setTimeout(() => {
        setIsOpen(false);
        setCreatedCount(0);
      }, 2000);
    } catch (error) {
      console.error('Error creating tasks:', error);
      alert('Failed to create some tasks. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!actionItems || actionItems.length === 0) {
    return null;
  }

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={() => setIsOpen(true)}
        variant="default"
        className="bg-orange-600 hover:bg-orange-700 text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Tasks from Action Items ({actionItems.length})
      </Button>

      {/* Task Creation Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-600" />
              Convert Action Items to Tasks
            </DialogTitle>
            <DialogDescription>
              Review and customize the extracted action items before creating tasks. Select which
              items to create and adjust details as needed.
            </DialogDescription>
          </DialogHeader>

          {createdCount > 0 ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-12 text-center"
            >
              <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Tasks Created Successfully!
              </h3>
              <p className="text-gray-600">
                Created {createdCount} {createdCount === 1 ? 'task' : 'tasks'} from action items
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4 mt-4">
              {actionItems.map((item, idx) => (
                <Card
                  key={idx}
                  className={`border-2 transition-all ${
                    selectedItems.includes(idx)
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedItems.includes(idx)}
                        onCheckedChange={() => toggleItemSelection(idx)}
                        className="mt-1"
                      />

                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">
                            Task Title
                          </label>
                          <Input
                            value={taskForms[idx]?.title || ''}
                            onChange={(e) => updateTaskForm(idx, 'title', e.target.value)}
                            placeholder="Task title"
                            className="font-medium"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">
                            Description
                          </label>
                          <Textarea
                            value={taskForms[idx]?.description || ''}
                            onChange={(e) => updateTaskForm(idx, 'description', e.target.value)}
                            placeholder="Additional context..."
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-700 mb-1 block">
                              Priority
                            </label>
                            <Select
                              value={taskForms[idx]?.priority || 'medium'}
                              onValueChange={(value) => updateTaskForm(idx, 'priority', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700 mb-1 block">
                              Assign To
                            </label>
                            <Select
                              value={taskForms[idx]?.assigned_to || ''}
                              onValueChange={(value) => updateTaskForm(idx, 'assigned_to', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select user" />
                              </SelectTrigger>
                              <SelectContent>
                                {teamMembers.map((member) => (
                                  <SelectItem key={member.email} value={member.email}>
                                    {member.full_name || member.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700 mb-1 block">
                              Due Date
                            </label>
                            <Input
                              type="date"
                              value={taskForms[idx]?.due_date || ''}
                              onChange={(e) => updateTaskForm(idx, 'due_date', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700 mb-1 block">
                              Est. Hours
                            </label>
                            <Input
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={taskForms[idx]?.estimated_effort || 2}
                              onChange={(e) =>
                                updateTaskForm(idx, 'estimated_effort', parseFloat(e.target.value))
                              }
                            />
                          </div>
                        </div>

                        {item.context && (
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                            <strong>Original Context:</strong> {item.context}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-600" />
                  <span className="font-medium text-gray-900">
                    {selectedItems.length} of {actionItems.length} items selected
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedItems.length === actionItems.length) {
                      setSelectedItems([]);
                    } else {
                      setSelectedItems(actionItems.map((_, idx) => idx));
                    }
                  }}
                >
                  {selectedItems.length === actionItems.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              onClick={createTasks}
              disabled={isCreating || selectedItems.length === 0 || createdCount > 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Tasks...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create {selectedItems.length} {selectedItems.length === 1 ? 'Task' : 'Tasks'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
