
import React, { useState, useMemo, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  ArrowUpCircle,
  User as UserIcon,
  Calendar,
  Pencil,
  Trash2,
  MoreVertical,
  AlertCircle as AlertCircleIcon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useWorkspace } from "@/components/workspace/WorkspaceContext"; // NEW IMPORT
import { base44 } from "@/lib/api"; // Assuming base44 is imported from here

const statusConfig = {
  all: {
    title: "All Tasks",
    color: "bg-gray-100",
    borderColor: "border-gray-200",
    icon: Circle,
    iconColor: "text-gray-600",
    tabColor: "text-gray-700 border-gray-300"
  },
  todo: {
    title: "To Do",
    color: "bg-gray-100",
    borderColor: "border-gray-200",
    icon: Circle,
    iconColor: "text-gray-400",
    tabColor: "text-gray-700 border-gray-300"
  },
  in_progress: {
    title: "In Progress",
    color: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: ArrowUpCircle,
    iconColor: "text-blue-600",
    tabColor: "text-blue-700 border-blue-500"
  },
  review: {
    title: "Review",
    color: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: Clock,
    iconColor: "text-purple-600",
    tabColor: "text-purple-700 border-purple-500"
  },
  completed: {
    title: "Completed",
    color: "bg-green-50",
    borderColor: "border-green-200",
    icon: CheckCircle,
    iconColor: "text-green-600",
    tabColor: "text-green-700 border-green-500"
  }
};

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

export default function TaskBoard({
  assignmentId, // NEW PROP
  tasks: initialTasks, // RENAMED PROP
  onTaskUpdate, // This prop is now primarily for parent notification after internal base44 calls
  currentUser,
  assignments,
  users,
  onStatusChange, // Still used by handleStatusChangeClick for dropdowns
  onEdit,
  onDelete,
  onReorder, // This prop is no longer directly used in handleDragEnd
  renderTaskActions,
  onTaskClick,
  selectedTasks = [],
  onSelectTask,
  onSelectAll,
}) {
  const [tasks, setTasks] = useState(initialTasks || []); // Local state for tasks
  const [loading, setLoading] = useState(true); // NEW STATE
  const [activeTab, setActiveTab] = useState(() => {
    // Persist active tab in localStorage
    return localStorage.getItem('taskBoardActiveTab') || 'todo';
  });
  
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedTaskId: null
  });
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);

  const { currentWorkspaceId } = useWorkspace(); // NEW USAGE

  // Persist active tab whenever it changes
  useEffect(() => {
    localStorage.setItem('taskBoardActiveTab', activeTab);
  }, [activeTab]);

  // Load tasks based on assignmentId and currentWorkspaceId
  useEffect(() => {
    if (assignmentId && currentWorkspaceId) {
      loadTasks();
    } else if (initialTasks) {
      // If no assignmentId/workspaceId, but initialTasks are provided (e.g., for a specific static list)
      setTasks(initialTasks);
      setLoading(false);
    }
  }, [assignmentId, currentWorkspaceId, initialTasks]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksData = await base44.entities.Task.filter({
        workspace_id: currentWorkspaceId,
        assignment_id: assignmentId
      }, "order");
      setTasks(tasksData);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  // Count tasks per status (from filtered tasks)
  const taskCounts = useMemo(() => {
    const counts = {
      all: tasks.length,
      todo: 0,
      in_progress: 0,
      review: 0,
      completed: 0
    };
    
    tasks.forEach(task => {
      if (counts.hasOwnProperty(task.status)) {
        counts[task.status]++;
      }
    });
    
    return counts;
  }, [tasks]);

  // Tasks in other tabs that match current filters
  const tasksInOtherTabs = useMemo(() => {
    if (activeTab === 'all') return {};
    
    const otherTabs = {};
    tasks.forEach(task => {
      if (task.status !== activeTab && task.status !== 'all') {
        if (!otherTabs[task.status]) {
          otherTabs[task.status] = 0;
        }
        otherTabs[task.status]++;
      }
    });
    return otherTabs;
  }, [tasks, activeTab]);

  // Filter tasks by active tab
  const filteredTasks = useMemo(() => {
    const filtered = activeTab === 'all' 
      ? tasks 
      : tasks.filter(task => task.status === activeTab);
    
    return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [tasks, activeTab]);

  const handleDragStart = (start) => {
    setDragState({
      isDragging: true,
      draggedTaskId: start.draggableId
    });
  };

  const handleDragEnd = async (result) => { // MODIFIED LOGIC
    setDragState({
      isDragging: false,
      draggedTaskId: null
    });

    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const task = tasks.find(t => t.id === draggableId);

    if (!task) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    try {
      const newStatus = destination.droppableId;
      const updates = {
        status: newStatus,
        order: destination.index // Assuming order is an integer index here, based on outline
      };

      if (newStatus === 'completed' && !task.completed_date) {
        updates.completed_date = new Date().toISOString();
      } else if (newStatus !== 'completed' && task.completed_date) {
        updates.completed_date = null;
      }

      await base44.entities.Task.update(task.id, updates);

      loadTasks(); // Reload tasks after update
      if (onTaskUpdate) {
        onTaskUpdate(); // Notify parent
      }
      toast.success(`Task moved to ${statusConfig[newStatus].title}`);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleUpdateTask = async (taskId, updates) => { // NEW FUNCTION
    try {
      await base44.entities.Task.update(taskId, updates);
      loadTasks(); // Reload tasks after update
      if (onTaskUpdate) {
        onTaskUpdate(); // Notify parent
      }
      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const getAssignmentName = (assignmentId) => {
    const assignment = assignments?.find(a => a.id === assignmentId);
    return assignment?.name || "Unknown Assignment";
  };

  const getUserName = (userEmail) => {
    const user = users?.find(u => u.email === userEmail);
    return user?.full_name || userEmail;
  };

  const isOverdue = (task) => {
    if (!task.due_date || task.status === 'completed') return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const dueDate = new Date(task.due_date);
    return dueDate < today;
  };

  const handleDeleteClick = (task, e) => {
    e.stopPropagation();
    setDeleteConfirmTask(task);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTask) return;

    try {
      await onDelete(deleteConfirmTask); // Still uses the onDelete prop
      toast.success("Task deleted successfully", {
        description: `"${deleteConfirmTask.title}" has been removed.`
      });
      setDeleteConfirmTask(null);
      loadTasks(); // Reload tasks after delete
      if (onTaskUpdate) {
        onTaskUpdate(); // Notify parent
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task", {
        description: error.message || "Please try again."
      });
    }
  };

  const handleEditClick = (task, e) => {
    e.stopPropagation();
    if (onEdit) { // Still uses onEdit prop
      onEdit(task);
    }
  };

  const handleStatusChangeClick = async (task, newStatus, e) => {
    e.stopPropagation();
    try {
      // This uses the onStatusChange prop, which presumably triggers a parent handler
      // that also updates the backend and then calls onTaskUpdate prop of TaskBoard.
      await onStatusChange(task, newStatus);
      toast.success("Task status updated");
      loadTasks(); // Reload tasks after status change
      if (onTaskUpdate) {
        onTaskUpdate(); // Notify parent
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const currentConfig = statusConfig[activeTab];
  const StatusIcon = currentConfig.icon;

  if (loading && !initialTasks.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        {Object.entries(statusConfig).map(([status, config]) => {
          const Icon = config.icon;
          const isActive = activeTab === status;
          const count = taskCounts[status];
          
          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                isActive
                  ? `${config.color} ${config.tabColor} border-2 shadow-sm`
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 border-2 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? config.iconColor : 'text-gray-400'}`} />
              <span>{config.title}</span>
              <Badge 
                variant={isActive ? "default" : "secondary"} 
                className={`ml-1 text-xs ${isActive ? config.iconColor.replace('text-', 'bg-') + ' text-white' : ''}`}
              >
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Hint for tasks in other tabs */}
      {activeTab !== 'all' && Object.keys(tasksInOtherTabs).length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
          <AlertCircleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <span className="font-medium">Tasks found in other tabs:</span>{' '}
            {Object.entries(tasksInOtherTabs).map(([status, count], index) => (
              <span key={status}>
                {index > 0 && ', '}
                <button
                  onClick={() => setActiveTab(status)}
                  className="underline hover:no-underline font-medium"
                >
                  {statusConfig[status].title} ({count})
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Select All Checkbox */}
      {onSelectTask && onSelectAll && filteredTasks.length > 0 && (
        <div className="flex items-center gap-3 px-4">
          <Checkbox
            checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
            onCheckedChange={(checked) => onSelectAll(checked)}
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select All ({filteredTasks.length} tasks)
          </span>
        </div>
      )}

      {/* Tasks List with Drag-and-Drop */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {activeTab === 'all' ? (
          // All Tasks View - No drag and drop between statuses in "All" view
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                <StatusIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No tasks found</p>
                <p className="text-xs mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentUser={currentUser}
                  assignments={assignments}
                  users={users}
                  getAssignmentName={getAssignmentName}
                  getUserName={getUserName}
                  isOverdue={isOverdue}
                  statusConfig={statusConfig}
                  priorityColors={priorityColors}
                  onTaskClick={onTaskClick}
                  onEditClick={handleEditClick}
                  onDeleteClick={handleDeleteClick}
                  onStatusChangeClick={handleStatusChangeClick}
                  renderTaskActions={renderTaskActions}
                  selectedTasks={selectedTasks}
                  onSelectTask={onSelectTask}
                  isDraggable={false}
                />
              ))
            )}
          </div>
        ) : (
          // Single Status View - With drag and drop
          <Droppable droppableId={activeTab} type="task">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-3 min-h-[200px] rounded-xl transition-colors p-2 ${
                  snapshot.isDraggingOver ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
              >
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                    <StatusIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No {currentConfig.title.toLowerCase()} tasks</p>
                    <p className="text-xs mt-1">Tasks you add will appear here</p>
                  </div>
                ) : (
                  filteredTasks.map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id}
                      index={index}
                      isDragDisabled={selectedTasks && selectedTasks.includes(task.id)}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`group transition-all duration-200 ${
                            snapshot.isDragging
                              ? 'rotate-2 shadow-xl scale-105 opacity-90'
                              : (dragState.draggedTaskId === task.id && dragState.isDragging)
                                ? 'opacity-50'
                                : ''
                          }`}
                        >
                          <TaskCard
                            task={task}
                            currentUser={currentUser}
                            assignments={assignments}
                            users={users}
                            getAssignmentName={getAssignmentName}
                            getUserName={getUserName}
                            isOverdue={isOverdue}
                            statusConfig={statusConfig}
                            priorityColors={priorityColors}
                            onTaskClick={onTaskClick}
                            onEditClick={handleEditClick}
                            onDeleteClick={handleDeleteClick}
                            onStatusChangeClick={handleStatusChangeClick}
                            renderTaskActions={renderTaskActions}
                            selectedTasks={selectedTasks}
                            onSelectTask={onSelectTask}
                            isDraggable={true}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))
                )}

                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </DragDropContext>

      {/* Drop Zones for other tabs when dragging */}
      {dragState.isDragging && activeTab !== 'all' && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          {Object.entries(statusConfig)
            .filter(([status]) => status !== activeTab && status !== 'all')
            .map(([status, config]) => {
              const Icon = config.icon;
              return (
                <Droppable key={status} droppableId={status} type="task">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        border-2 border-dashed rounded-lg p-4 text-center transition-all
                        ${snapshot.isDraggingOver 
                          ? `${config.color} ${config.borderColor} border-solid shadow-lg` 
                          : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${snapshot.isDraggingOver ? config.iconColor : 'text-gray-400'}`} />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {config.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Drop to move here
                      </p>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmTask} onOpenChange={(open) => !open && setDeleteConfirmTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<span className="font-medium text-gray-900 dark:text-white">{deleteConfirmTask?.title}</span>"?
              {deleteConfirmTask?.auto_generated && (
                <span className="block mt-2 text-purple-600 dark:text-purple-400">
                  ⚠️ This is an AI-generated task.
                </span>
              )}
              <span className="block mt-2 font-semibold">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Separate TaskCard component for reusability
function TaskCard({
  task,
  currentUser,
  assignments,
  users,
  getAssignmentName,
  getUserName,
  isOverdue,
  statusConfig,
  priorityColors,
  onTaskClick,
  onEditClick,
  onDeleteClick,
  onStatusChangeClick,
  renderTaskActions,
  selectedTasks,
  onSelectTask,
  isDraggable
}) {
  const taskStatusConfig = statusConfig[task.status];
  const StatusIcon = taskStatusConfig?.icon || Circle;

  return (
    <Card className={`hover:shadow-md transition-all cursor-pointer ${
      selectedTasks && selectedTasks.includes(task.id)
        ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20'
        : 'bg-white dark:bg-gray-800'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          {onSelectTask && (
            <Checkbox
              checked={selectedTasks.includes(task.id)}
              onCheckedChange={(checked) => onSelectTask(task.id, checked)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
          )}

          <div className="flex-1 min-w-0" onClick={() => onTaskClick && onTaskClick(task)}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusIcon className={`w-4 h-4 ${taskStatusConfig?.iconColor || 'text-gray-400'}`} />
                <Badge className={priorityColors[task.priority] || priorityColors.medium}>
                  {task.priority}
                </Badge>
                {isOverdue(task) && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Overdue
                  </Badge>
                )}
                {task.auto_generated && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                    AI
                  </Badge>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => onEditClick(task, e)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Task
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {Object.entries(statusConfig)
                    .filter(([status]) => status !== task.status && status !== 'all')
                    .map(([status, config]) => {
                      const Icon = config.icon;
                      return (
                        <DropdownMenuItem 
                          key={status}
                          onClick={(e) => onStatusChangeClick(task, status, e)}
                        >
                          <Icon className={`w-4 h-4 mr-2 ${config.iconColor}`} />
                          Move to {config.title}
                        </DropdownMenuItem>
                      );
                    })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => onDeleteClick(task, e)}
                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Custom Action Buttons */}
              {renderTaskActions && (
                <div onClick={(e) => e.stopPropagation()}>
                  {renderTaskActions(task)}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">
                {task.title}
              </h4>

              {task.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {task.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <UserIcon className="w-3 h-3" />
                  <span>{getUserName(task.assigned_to)}</span>
                </div>
                {task.due_date && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(task.due_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {task.assignment_id && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    📁 {getAssignmentName(task.assignment_id)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
