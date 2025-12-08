import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  ArrowUpCircle,
  Pencil,
  Clock,
  User,
  FolderOpen,
  AlertTriangle,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import RelatedContentSuggestions from '@/features/documents/RelatedContentSuggestions';

export default function TaskItem({
  task,
  assignment,
  assignedUser,
  onStatusChange,
  onEdit,
  onDelete,
  showRelated = false,
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-red-100 text-red-800 border-red-200',
    urgent: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  const statusIcons = {
    todo: <Circle className="w-5 h-5 text-gray-400" />,
    in_progress: <ArrowUpCircle className="w-5 h-5 text-blue-500" />,
    review: <Clock className="w-5 h-5 text-orange-500" />,
    completed: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  };

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800 border-gray-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    review: 'bg-orange-100 text-orange-800 border-orange-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
  };

  // Check if task is overdue
  const isOverdue =
    task.due_date && task.status !== 'completed' && new Date(task.due_date) < new Date();

  const handleDeleteClick = () => {
    setDeleteError('');
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) {
      console.error('No onDelete function provided to TaskItem');
      setDeleteError('Delete function not available');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      console.log('Attempting to delete task:', task.id);
      await onDelete(task);
      console.log('Task deletion successful');
      // Dialog will close automatically as component will unmount
    } catch (error) {
      console.error('Error deleting task:', error);
      setDeleteError(error.message || 'Failed to delete task. Please try again.');
      setIsDeleting(false);
      // Keep dialog open to show error
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setDeleteError('');
    setIsDeleting(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card
          className={`bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
        >
          <CardHeader className="flex flex-row items-start justify-between pb-4">
            <div className="flex items-start gap-3 flex-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="mt-1 hover:opacity-70 transition-opacity">
                    {statusIcons[task.status]}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onStatusChange(task, 'todo')}>
                    <Circle className="w-4 h-4 mr-2 text-gray-400" />
                    Mark as Todo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task, 'in_progress')}>
                    <ArrowUpCircle className="w-4 h-4 mr-2 text-blue-500" />
                    Mark as In Progress
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task, 'review')}>
                    <Clock className="w-4 h-4 mr-2 text-orange-500" />
                    Mark as Review
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task, 'completed')}>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                    Mark as Completed
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex-1 min-w-0">
                <CardTitle
                  className={`text-lg ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}
                >
                  {task.title}
                  {task.auto_generated && (
                    <Badge
                      variant="outline"
                      className="ml-2 text-xs bg-purple-50 text-purple-700 border-purple-200"
                    >
                      AI Generated
                    </Badge>
                  )}
                </CardTitle>
                {task.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                )}

                {/* Assignment Info */}
                {assignment && (
                  <div className="flex items-center gap-2 mt-2">
                    <FolderOpen className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{assignment.name}</span>
                  </div>
                )}

                {/* Assignee Info */}
                {assignedUser && (
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-xs">
                        {assignedUser.full_name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600">
                      {assignedUser.full_name || assignedUser.email}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit && onEdit(task)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete Task'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <Badge className={`border ${statusColors[task.status]}`} variant="secondary">
                {task.status.replace('_', ' ')}
              </Badge>
              <Badge className={`border ${priorityColors[task.priority]}`} variant="secondary">
                {task.priority} priority
              </Badge>
              {task.due_date && (
                <Badge
                  variant="outline"
                  className={`flex items-center gap-1 ${isOverdue ? 'bg-red-50 text-red-700 border-red-200' : ''}`}
                >
                  <CalendarIcon className="w-3 h-3" />
                  {isOverdue && <AlertTriangle className="w-3 h-3" />}
                  Due: {format(new Date(task.due_date), 'MMM d')}
                </Badge>
              )}
              {task.completed_date && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Completed: {format(new Date(task.completed_date), 'MMM d')}
                </Badge>
              )}
              {task.estimated_effort && (
                <Badge variant="outline" className="text-xs">
                  ~{task.estimated_effort}h
                </Badge>
              )}
            </div>

            {/* Generation Source Info for AI-generated tasks */}
            {task.auto_generated && task.generation_source && (
              <div className="mb-4 p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                <strong>Generated from:</strong>{' '}
                {task.generation_source.source_type.replace('_', ' ')}
                {task.generation_source.reasoning && (
                  <div className="text-purple-600 mt-1">{task.generation_source.reasoning}</div>
                )}
              </div>
            )}

            {/* Task Metadata */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Created: {format(new Date(task.created_date), 'MMM d, yyyy')}</span>
              <span>Updated: {format(new Date(task.updated_date), 'MMM d')}</span>
            </div>
          </CardContent>

          {/* Related Content Section - shown when expanded */}
          {showRelated && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <RelatedContentSuggestions
                currentItem={task}
                itemType="task"
                maxSuggestions={4}
                className="shadow-none border border-gray-200"
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* Enhanced Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Delete Task
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to delete "{task.title}"?</p>
              <p className="text-sm text-gray-600">
                This action cannot be undone and will permanently remove:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-4">
                <li>Task details and description</li>
                <li>All comments and history</li>
                <li>Any linked documents or dependencies</li>
              </ul>
              {task.auto_generated && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                  <p className="text-amber-800">
                    <strong>Note:</strong> This is an AI-generated task. Deleting it won't affect
                    the source document or workflow pattern.
                  </p>
                </div>
              )}
              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                  <p className="text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <strong>Error:</strong> {deleteError}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Task
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
