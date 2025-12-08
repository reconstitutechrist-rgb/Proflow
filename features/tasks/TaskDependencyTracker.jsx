import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';
import { GitBranch, ArrowRight, AlertCircle, Link, X, Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function TaskDependencyTracker({ task, allTasks, onDependencyUpdate }) {
  const [dependencies, setDependencies] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState('');
  const [dependencyType, setDependencyType] = useState('blocks');
  const [loading, setLoading] = useState(false); // Changed initial state to false

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (task && allTasks && currentWorkspaceId) {
      loadDependencies();
    }
  }, [task, allTasks, currentWorkspaceId]);

  const loadDependencies = () => {
    if (!task) return;

    // CRITICAL: Validate task is in current workspace
    if (task.workspace_id !== currentWorkspaceId) {
      toast.error('Cannot access dependencies from other workspaces');
      console.error('Security violation: Cross-workspace dependency access', {
        taskWorkspace: task.workspace_id,
        currentWorkspace: currentWorkspaceId,
      });
      setDependencies([]); // Clear any potentially stale data
      setAvailableTasks([]); // Clear available tasks
      return;
    }

    // Get existing dependencies
    const existingDependencies = task.dependencies || [];

    // CRITICAL: Filter allTasks to only show tasks from current workspace
    const workspaceTasks = allTasks.filter(
      (t) => t.workspace_id === currentWorkspaceId && t.id !== task.id
    );

    // Map dependency IDs to actual task objects
    const dependencyTasks = existingDependencies
      .map((dep) => {
        const dependencyTask = workspaceTasks.find((t) => t.id === dep.task_id);
        return {
          ...dep,
          task: dependencyTask,
        };
      })
      .filter((dep) => dep.task); // Remove dependencies where task wasn't found

    setDependencies(dependencyTasks);
    setAvailableTasks(
      workspaceTasks.filter((t) => !existingDependencies.some((dep) => dep.task_id === t.id))
    );
  };

  const handleAddDependency = async () => {
    if (!selectedTask || !task) return;

    // CRITICAL: Validate both tasks are in current workspace
    const dependentTask = allTasks.find((t) => t.id === selectedTask);
    if (!dependentTask) {
      toast.error('Selected task not found');
      return;
    }

    if (
      dependentTask.workspace_id !== currentWorkspaceId ||
      task.workspace_id !== currentWorkspaceId
    ) {
      toast.error('Cannot create dependencies across workspaces');
      console.error('Security violation: Cross-workspace dependency creation attempt', {
        taskWorkspace: task.workspace_id,
        dependentTaskWorkspace: dependentTask.workspace_id,
        currentWorkspace: currentWorkspaceId,
      });
      return;
    }

    try {
      setLoading(true);

      const newDependency = {
        task_id: selectedTask,
        dependency_type: dependencyType,
        created_date: new Date().toISOString(),
      };

      const updatedDependencies = [...(task.dependencies || []), newDependency];

      await db.entities.Task.update(task.id, {
        dependencies: updatedDependencies,
        workspace_id: currentWorkspaceId, // CRITICAL: Maintain workspace_id
      });

      toast.success('Dependency added successfully');
      setShowAddDialog(false);
      setSelectedTask('');

      if (onDependencyUpdate) {
        onDependencyUpdate();
      }

      loadDependencies();
    } catch (error) {
      console.error('Error adding dependency:', error);
      toast.error('Failed to add dependency');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDependency = async (dependencyTaskId) => {
    if (!task) return;

    // CRITICAL: Validate task is in current workspace
    if (task.workspace_id !== currentWorkspaceId) {
      toast.error('Cannot modify dependencies from other workspaces');
      return;
    }

    try {
      setLoading(true);

      const updatedDependencies = (task.dependencies || []).filter(
        (dep) => dep.task_id !== dependencyTaskId
      );

      await db.entities.Task.update(task.id, {
        dependencies: updatedDependencies,
        workspace_id: currentWorkspaceId, // CRITICAL: Maintain workspace_id
      });

      toast.success('Dependency removed successfully');

      if (onDependencyUpdate) {
        onDependencyUpdate();
      }

      loadDependencies();
    } catch (error) {
      console.error('Error removing dependency:', error);
      toast.error('Failed to remove dependency');
    } finally {
      setLoading(false);
    }
  };

  const getDependencyIcon = (type) => {
    switch (type) {
      case 'blocks':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'relates_to':
        return <Link className="w-4 h-4 text-blue-500" />;
      case 'follows':
        return <ArrowRight className="w-4 h-4 text-green-500" />;
      default:
        return <Link className="w-4 h-4 text-gray-500" />;
    }
  };

  const getDependencyLabel = (type) => {
    switch (type) {
      case 'blocks':
        return 'Blocks';
      case 'relates_to':
        return 'Related to';
      case 'follows':
        return 'Follows';
      default:
        return type;
    }
  };

  // If task is not valid for the current workspace, display a message
  if (!task || task.workspace_id !== currentWorkspaceId) {
    return (
      <div className="text-center py-8 text-red-500 dark:text-red-400">
        <AlertCircle className="w-12 h-12 mx-auto mb-3" />
        <p className="text-sm font-medium">Task not found or not in current workspace.</p>
        <p className="text-xs mt-1">Please select a valid task within your active workspace.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Task Dependencies for "{task.title}"
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddDialog(true)}
          disabled={availableTasks.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Dependency
        </Button>
      </div>

      {dependencies.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No dependencies added yet</p>
          <p className="text-xs mt-1">Dependencies help track task relationships</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dependencies.map(
            (dep) =>
              dep.task && (
                <div
                  key={dep.task_id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getDependencyIcon(dep.dependency_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {dep.task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getDependencyLabel(dep.dependency_type)}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            dep.task.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {dep.task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDependency(dep.task_id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )
          )}
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          🔒 Dependencies can only be created between tasks in the same workspace.
        </p>
      </div>

      {/* Add Dependency Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task Dependency</DialogTitle>
            <DialogDescription>
              Create a relationship between this task and another task.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task">Select Task</Label>
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger id="task">
                  <SelectValue placeholder="Choose a task..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTasks.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No available tasks in this workspace to create a dependency.
                    </div>
                  ) : (
                    availableTasks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{t.title}</span>
                          <span className="text-xs text-gray-500">
                            {t.status.replace('_', ' ')} • {t.priority} priority
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Dependency Type</Label>
              <Select value={dependencyType} onValueChange={setDependencyType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blocks">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <div>
                        <div className="font-medium">Blocks</div>
                        <div className="text-xs text-gray-500">
                          This task blocks the selected task
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="relates_to">
                    <div className="flex items-center gap-2">
                      <Link className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="font-medium">Related To</div>
                        <div className="text-xs text-gray-500">
                          Tasks are related but not blocking
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="follows">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-green-500" />
                      <div>
                        <div className="font-medium">Follows</div>
                        <div className="text-xs text-gray-500">
                          This task follows the selected task
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAddDependency} disabled={loading || !selectedTask}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Dependency
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
