import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Edit2,
  Trash2,
  Plus,
  Calendar,
  User as UserIcon,
  AlertCircle,
  CheckSquare,
  Repeat,
  RefreshCw,
  Target,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { validateTaskStructure, getPriorityColor } from '@/utils/taskUtils';

export default function TaskProposalPanel({
  proposedTasks = [],
  failedTasks = [],
  duplicateWarnings = [],
  assignments = [],
  projects = [],
  users = [],
  currentUser,
  isCreating = false,
  creationProgress = { current: 0, total: 0, currentTask: '' },
  onTasksChange,
  onCreateTasks,
  onClear,
  onRetryFailed,
}) {
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);

  const handleEditTask = (index) => {
    setEditingTaskIndex(index);
  };

  const handleSaveEdit = (index) => {
    const task = proposedTasks[index];
    const validation = validateTaskStructure(task, { assignments, projects, users, currentUser });

    if (!validation.isValid) {
      const newTasks = [...proposedTasks];
      newTasks[index] = { ...task, _validationErrors: validation.errors };
      onTasksChange(newTasks);
    } else {
      const newTasks = [...proposedTasks];
      newTasks[index] = { ...validation.validatedTask, _validationErrors: undefined };
      onTasksChange(newTasks);
      setEditingTaskIndex(null);
    }
  };

  const handleDeleteTask = (index) => {
    const newTasks = proposedTasks.filter((_, i) => i !== index);
    onTasksChange(newTasks);
  };

  const handleTaskFieldChange = (index, field, value) => {
    const newTasks = [...proposedTasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    onTasksChange(newTasks);
  };

  if (proposedTasks.length === 0 && failedTasks.length === 0) {
    return null;
  }

  return (
    <div className="border-t bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3 max-h-[40%] overflow-y-auto flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Review Tasks ({proposedTasks.length + failedTasks.length})
          </h3>
        </div>
        {!isCreating && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClear} className="text-xs h-8">
              <Trash2 className="w-3 h-3 mr-1" />
              Clear All
            </Button>
            {proposedTasks.length > 0 && (
              <Button
                size="sm"
                onClick={onCreateTasks}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-xs h-8"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Create {proposedTasks.length} Task{proposedTasks.length !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Proposed tasks list */}
      {proposedTasks.length > 0 && (
        <div className="space-y-2">
          {proposedTasks.map((task, index) => (
            <div
              key={index}
              className={`bg-white dark:bg-gray-800 border ${task._validationErrors ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'} rounded-lg p-3 shadow-sm flex items-center justify-between gap-3`}
            >
              {editingTaskIndex === index ? (
                <div className="flex-1 space-y-2">
                  <Input
                    value={task.title}
                    onChange={(e) => handleTaskFieldChange(index, 'title', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Task title"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Select
                      value={task.assignment_id || assignments[0]?.id || ''}
                      onValueChange={(val) => handleTaskFieldChange(index, 'assignment_id', val)}
                    >
                      <SelectTrigger className="h-8 text-xs w-[140px]">
                        <SelectValue placeholder="Assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignments.map((assignment) => (
                          <SelectItem key={assignment.id} value={assignment.id}>
                            {assignment.name || assignment.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={task.project_id || 'none'}
                      onValueChange={(val) =>
                        handleTaskFieldChange(index, 'project_id', val === 'none' ? null : val)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs w-[140px]">
                        <SelectValue placeholder="Project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={task.assigned_to || currentUser?.email || ''}
                      onValueChange={(val) => handleTaskFieldChange(index, 'assigned_to', val)}
                    >
                      <SelectTrigger className="h-8 text-xs w-[140px]">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.email} value={user.email}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={task.priority || 'medium'}
                      onValueChange={(val) => handleTaskFieldChange(index, 'priority', val)}
                    >
                      <SelectTrigger className="h-8 text-xs w-[100px]">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    {task.project_id && (
                      <Badge
                        variant="secondary"
                        className="px-1 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                      >
                        <Target className="w-2.5 h-2.5 mr-1" />
                        {projects.find((p) => p.id === task.project_id)?.name || task.project_id}
                      </Badge>
                    )}
                    {task.assignment_id && (
                      <Badge variant="secondary" className="px-1 py-0.5">
                        <Plus className="w-2.5 h-2.5 mr-1" />
                        {assignments.find((a) => a.id === task.assignment_id)?.name ||
                          task.assignment_id}
                      </Badge>
                    )}
                    {task.assigned_to && (
                      <Badge variant="secondary" className="px-1 py-0.5">
                        <UserIcon className="w-2.5 h-2.5 mr-1" />
                        {users
                          .find((u) => u.email === task.assigned_to)
                          ?.full_name?.split(' ')[0] || task.assigned_to.split('@')[0]}
                      </Badge>
                    )}
                    {task.due_date && (
                      <Badge variant="secondary" className="px-1 py-0.5">
                        <Calendar className="w-2.5 h-2.5 mr-1" />
                        {format(new Date(task.due_date), 'MMM d')}
                      </Badge>
                    )}
                    {task.priority && (
                      <Badge className={`px-1 py-0.5 ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </Badge>
                    )}
                    {task.is_recurring && (
                      <Badge variant="secondary" className="px-1 py-0.5">
                        <Repeat className="w-2.5 h-2.5 mr-1" />
                        Recurring
                      </Badge>
                    )}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <Badge variant="secondary" className="px-1 py-0.5">
                        {task.subtasks.length} subtask{task.subtasks.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  {duplicateWarnings.find((dw) => dw.task === task) && (
                    <div className="text-xs text-yellow-700 dark:text-yellow-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>Potential duplicate detected</span>
                    </div>
                  )}
                  {task._validationErrors && task._validationErrors.length > 0 && (
                    <div className="text-xs text-red-700 dark:text-red-400 mt-1 flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span className="font-medium">{task._validationErrors[0]}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-1 flex-shrink-0">
                {editingTaskIndex === index ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSaveEdit(index)}
                    className="h-7 w-7 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditTask(index)}
                    className="h-7 w-7"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteTask(index)}
                  className="h-7 w-7 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Failed Tasks */}
      {failedTasks.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <p className="font-semibold text-sm">
              {failedTasks.length} task{failedTasks.length !== 1 ? 's' : ''} failed to create
            </p>
          </div>
          {failedTasks.map((ft, idx) => (
            <div
              key={idx}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-red-900 dark:text-red-200">
                    {ft.task.title}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">{ft.error}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRetryFailed && onRetryFailed(ft.task)}
                  className="text-xs border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 h-8"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Progress */}
      {isCreating && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating tasks... {creationProgress.current} of {creationProgress.total}
            </span>
            <span className="text-xs text-purple-700 dark:text-purple-400">
              {Math.round((creationProgress.current / creationProgress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full transition-all duration-300"
              style={{ width: `${(creationProgress.current / creationProgress.total) * 100}%` }}
            />
          </div>
          {creationProgress.currentTask && (
            <p className="text-xs text-purple-700 dark:text-purple-400 mt-2 truncate">
              Current: {creationProgress.currentTask}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
