import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckSquare,
  Circle,
  Clock,
  ArrowRight,
  CheckCircle2,
  Calendar,
  User,
  AlertCircle,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do', icon: Circle, color: 'text-gray-500' },
  { value: 'in_progress', label: 'In Progress', icon: ArrowRight, color: 'text-blue-500' },
  { value: 'review', label: 'Review', icon: Clock, color: 'text-purple-500' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-green-500' },
];

const PRIORITY_OPTIONS = [
  {
    value: 'low',
    label: 'Low',
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  {
    value: 'medium',
    label: 'Medium',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    value: 'high',
    label: 'High',
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
];

export default function ProjectTasksSection({
  tasks,
  assignments,
  onStatusChange,
  onPriorityChange,
}) {
  const getAssignmentName = (assignmentId) => {
    const assignment = assignments?.find((a) => a.id === assignmentId);
    return assignment?.name || null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = (task) => {
    if (!task.due_date || task.status === 'completed') return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const StatusIcon = ({ status }) => {
    const config = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
    const Icon = config.icon;
    return <Icon className={`w-4 h-4 ${config.color}`} />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-green-600" />
          Tasks
          <Badge variant="secondary" className="ml-1">
            {tasks.length}
          </Badge>
        </h2>
      </div>

      {tasks.length === 0 ? (
        <Card className="bg-gray-50 dark:bg-gray-800/50 border-dashed">
          <CardContent className="p-6 text-center">
            <CheckSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No tasks found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const overdue = isOverdue(task);
            const assignmentName = getAssignmentName(task.assignment_id);

            return (
              <Card key={task.id} className={task.status === 'completed' ? 'opacity-70' : ''}>
                <CardContent className="p-4">
                  {/* Header row: Status icon, Title, Dropdowns */}
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <StatusIcon status={task.status} />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Title + Overdue badge */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3
                          className={`font-medium ${
                            task.status === 'completed'
                              ? 'text-gray-500 line-through'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </h3>

                        {overdue && (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>

                      {/* Description - Full display */}
                      {task.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 whitespace-pre-wrap">
                          {task.description}
                        </p>
                      )}

                      {/* Metadata row */}
                      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                        {task.due_date && (
                          <span
                            className={`flex items-center gap-1 ${
                              overdue ? 'text-red-600 dark:text-red-400' : ''
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            Due: {formatDate(task.due_date)}
                          </span>
                        )}

                        {task.assigned_to && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {task.assigned_to}
                          </span>
                        )}

                        {assignmentName && (
                          <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                            <CheckSquare className="w-3 h-3" />
                            {assignmentName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dropdowns */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Status Dropdown */}
                      <Select
                        value={task.status || 'todo'}
                        onValueChange={(value) => onStatusChange(task.id, value)}
                      >
                        <SelectTrigger className="h-7 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => {
                            const Icon = status.icon;
                            return (
                              <SelectItem key={status.value} value={status.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-3 h-3 ${status.color}`} />
                                  <span>{status.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {/* Priority Dropdown */}
                      <Select
                        value={task.priority || 'medium'}
                        onValueChange={(value) => onPriorityChange(task.id, value)}
                      >
                        <SelectTrigger className="h-7 w-[90px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                              <span className={priority.color}>{priority.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
