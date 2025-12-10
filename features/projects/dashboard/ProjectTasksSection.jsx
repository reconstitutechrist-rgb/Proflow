import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckSquare,
  Circle,
  Clock,
  ArrowRight,
  CheckCircle2,
  Calendar,
  User,
  MoreHorizontal,
  AlertCircle,
} from 'lucide-react';

const STATUS_CONFIG = {
  todo: {
    icon: Circle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  in_progress: {
    icon: ArrowRight,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  review: {
    icon: Clock,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export default function ProjectTasksSection({ tasks, assignments, onTaskClick, onStatusChange }) {
  const getAssignmentName = (assignmentId) => {
    const assignment = assignments?.find((a) => a.id === assignmentId);
    return assignment?.name || null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
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
        <div className="space-y-2">
          {tasks.map((task) => {
            const overdue = isOverdue(task);
            const assignmentName = getAssignmentName(task.assignment_id);

            return (
              <Card
                key={task.id}
                className={`cursor-pointer hover:shadow-md transition-all duration-200 ${
                  task.status === 'completed' ? 'opacity-70' : ''
                }`}
                onClick={() => onTaskClick(task)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <StatusIcon status={task.status} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3
                          className={`font-medium truncate ${
                            task.status === 'completed'
                              ? 'text-gray-500 line-through'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </h3>

                        {task.priority && (
                          <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </Badge>
                        )}

                        {overdue && (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mb-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                        {task.due_date && (
                          <span
                            className={`flex items-center gap-1 ${
                              overdue ? 'text-red-600 dark:text-red-400' : ''
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.due_date)}
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

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(task.id, 'todo');
                          }}
                        >
                          <Circle className="w-4 h-4 mr-2 text-gray-500" />
                          To Do
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(task.id, 'in_progress');
                          }}
                        >
                          <ArrowRight className="w-4 h-4 mr-2 text-blue-500" />
                          In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(task.id, 'review');
                          }}
                        >
                          <Clock className="w-4 h-4 mr-2 text-purple-500" />
                          Review
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(task.id, 'completed');
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                          Completed
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
