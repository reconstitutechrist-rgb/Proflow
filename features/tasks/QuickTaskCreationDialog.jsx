import React, { useState } from 'react';
import { Task } from '@/api/entities';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckSquare, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function QuickTaskCreationDialog({
  isOpen,
  onClose,
  taskData,
  assignments,
  currentUser,
}) {
  const { currentWorkspaceId } = useWorkspace();
  const [formData, setFormData] = useState({
    title: taskData?.title || '',
    description: taskData?.description || '',
    assignment_id: taskData?.assignment_id || '',
    assigned_to: currentUser?.email || '',
    priority: taskData?.priority || 'medium',
    status: 'todo',
    related_documents: taskData?.related_documents || [],
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  // Update form when taskData changes
  React.useEffect(() => {
    if (taskData) {
      setFormData({
        title: taskData.title || '',
        description: taskData.description || '',
        assignment_id: taskData.assignment_id || '',
        assigned_to: currentUser?.email || '',
        priority: taskData.priority || 'medium',
        status: 'todo',
        related_documents: taskData.related_documents || [],
      });
    }
  }, [taskData, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }

    if (!formData.assignment_id) {
      setError('Please select an assignment');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await Task.create({
        workspace_id: currentWorkspaceId,
        title: formData.title,
        description: formData.description,
        assignment_id: formData.assignment_id,
        assigned_to: formData.assigned_to,
        assigned_by: currentUser?.email || '',
        priority: formData.priority,
        status: formData.status,
        related_documents: formData.related_documents,
        auto_generated: true,
        generation_source: {
          source_type: 'document_analysis',
          source_id: 'ai_suggestion',
          confidence: 85,
          reasoning: 'Generated from AI document analysis',
        },
      });

      toast.success('Task created successfully!');
      onClose();
    } catch (err) {
      console.error('Error creating task:', err);
      setError(`Failed to create task: ${err.message}`);
      toast.error('Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            Create Task (AI Suggested)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title..."
              required
            />
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task details..."
              className="h-24"
            />
          </div>

          {/* Assignment Selection */}
          <div className="space-y-2">
            <Label htmlFor="assignment">Assignment *</Label>
            <Select
              value={formData.assignment_id}
              onValueChange={(value) => setFormData({ ...formData, assignment_id: value })}
              required
            >
              <SelectTrigger id="assignment">
                <SelectValue placeholder="Select assignment..." />
              </SelectTrigger>
              <SelectContent>
                {!assignments || assignments.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No assignments available
                  </div>
                ) : (
                  assignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger id="priority">
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

          {/* Related Documents Badge */}
          {formData.related_documents.length > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Related Documents:
              </p>
              <div className="flex flex-wrap gap-2">
                {formData.related_documents.map((docId, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    Document {idx + 1}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Dialog Footer */}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !formData.title.trim() || !formData.assignment_id}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
