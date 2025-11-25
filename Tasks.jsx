
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Loader2,
  CheckSquare,
  Trash2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Search
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import TaskForm from "@/TaskForm";
import TaskBoard from "@/TaskBoard";
import ShareButton from "@/ShareButton";
import AITaskAssistantPanel from "@/AITaskAssistantPanel";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

export default function TasksPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Filter states
  const [selectedAssignment, setSelectedAssignment] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Assistant state
  const [isAIAssistantCollapsed, setIsAIAssistantCollapsed] = useState(false);

  const urlParams = new URLSearchParams(location.search);
  const sortBy = urlParams.get('sortBy');

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (currentWorkspaceId) {
      loadData();
    }
  }, [currentWorkspaceId]);

  const filteredTasks = useMemo(() => {
    let currentTasks = [...tasks];

    if (selectedAssignment && selectedAssignment !== 'all') {
      currentTasks = currentTasks.filter(task => task.assignment_id === selectedAssignment);
    }

    if (priorityFilter && priorityFilter !== 'all') {
      currentTasks = currentTasks.filter(task => task.priority === priorityFilter);
    }

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      currentTasks = currentTasks.filter(task =>
        task.title.toLowerCase().includes(lowerCaseQuery) ||
        task.description?.toLowerCase().includes(lowerCaseQuery) ||
        task.tags?.some(tag => tag.toLowerCase().includes(lowerCaseQuery))
      );
    }

    if (sortBy === 'priority') {
      currentTasks.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;

        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const priorityA = priorityOrder[a.priority] || 0;
        const priorityB = priorityOrder[b.priority] || 0;

        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }

        if (a.due_date && b.due_date) {
          const dateA = new Date(a.due_date);
          const dateB = new Date(b.due_date);
          if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
          if (isNaN(dateA.getTime())) return 1;
          if (isNaN(dateB.getTime())) return -1;
          return dateA.getTime() - dateB.getTime();
        }

        return 0;
      });
    }

    return currentTasks;
  }, [tasks, selectedAssignment, priorityFilter, searchQuery, sortBy]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, assignmentsData, usersData, user] = await Promise.all([
        base44.entities.Task.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        base44.entities.Assignment.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        User.list(),
        base44.auth.me()
      ]);

      setTasks(tasksData);
      setAssignments(assignmentsData);
      setUsers(usersData);
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (taskData) => {
    try {
      if (editingTask) {
        await base44.entities.Task.update(editingTask.id, taskData);
        toast.success("Task updated successfully");
      } else {
        await base44.entities.Task.create({
          ...taskData,
          workspace_id: currentWorkspaceId,
          assigned_by: currentUser?.email
        });
        toast.success("Task created successfully");
      }
      setIsTaskFormOpen(false);
      setEditingTask(null);
      loadData();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task");
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
      };
      await base44.entities.Task.update(task.id, updateData);
      loadData();
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status");
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  const handleDeleteTask = async (task) => {
    try {
      await base44.entities.Task.delete(task.id);
      toast.success("Task deleted successfully");
      loadData();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setIsTaskFormOpen(true);
  };

  const handleTaskUpdate = async (taskId, updatedFields) => {
    try {
      await base44.entities.Task.update(taskId, updatedFields);
      loadData();
    } catch (error) {
      console.error("Error updating task from board:", error);
      toast.error("Failed to update task");
    }
  };

  // Bulk selection handlers
  const handleSelectTask = (taskId, checked) => {
    if (checked) {
      setSelectedTasks(prev => [...prev, taskId]);
    } else {
      setSelectedTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(task => task.id));
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedTasks.length === 0) return;

    try {
      const updatePromises = selectedTasks.map(taskId =>
        base44.entities.Task.update(taskId, {
          status: newStatus,
          completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
        })
      );

      await Promise.all(updatePromises);
      toast.success(`${selectedTasks.length} tasks updated to ${newStatus}`);
      setSelectedTasks([]);
      loadData();
    } catch (error) {
      console.error("Error updating tasks:", error);
      toast.error("Failed to update some tasks");
    }
  };

  const handleBulkPriorityChange = async (newPriority) => {
    if (selectedTasks.length === 0) return;

    try {
      const updatePromises = selectedTasks.map(taskId =>
        base44.entities.Task.update(taskId, { priority: newPriority })
      );

      await Promise.all(updatePromises);
      toast.success(`${selectedTasks.length} tasks updated to ${newPriority} priority`);
      setSelectedTasks([]);
      loadData();
    } catch (error) {
      console.error("Error updating task priorities:", error);
      toast.error("Failed to update some tasks");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;

    try {
      setBulkDeleteLoading(true);
      const deletePromises = selectedTasks.map(taskId => base44.entities.Task.delete(taskId));
      await Promise.all(deletePromises);

      toast.success(`${selectedTasks.length} tasks deleted successfully`);
      setSelectedTasks([]);
      setShowBulkDeleteDialog(false);
      loadData();
    } catch (error) {
      console.error("Error deleting tasks:", error);
      toast.error("Failed to delete some tasks");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const canCreateTask = true;
  const canEditTask = (task) => true;
  const canDeleteTask = (task) => true;
  const canAssignTask = true;

  const getAssignmentName = (assignmentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    return assignment?.name || "Unknown Assignment";
  };

  const getUserName = (userEmail) => {
    const user = users.find(u => u.email === userEmail);
    return user?.full_name || userEmail;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Clean Header */}
      <div className="flex-shrink-0 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-light text-gray-900 dark:text-white tracking-tight">
              Tasks
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsAIAssistantCollapsed(!isAIAssistantCollapsed)}
              variant="outline"
              className="border-gray-200 dark:border-gray-800"
            >
              {isAIAssistantCollapsed ? (
                <>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Show AI
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Hide AI
                </>
              )}
            </Button>
            <Button
              onClick={() => setIsTaskFormOpen(true)}
              className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Minimal Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-200 dark:border-gray-800 focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
            />
          </div>

          <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
            <SelectTrigger className="w-[180px] border-gray-200 dark:border-gray-800">
              <SelectValue placeholder="All Assignments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignments</SelectItem>
              {assignments.map(assignment => (
                <SelectItem key={assignment.id} value={assignment.id}>
                  {assignment.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px] border-gray-200 dark:border-gray-800">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
        {/* Task Board */}
        <div className="overflow-auto">
          {/* Bulk Actions */}
          {selectedTasks.length > 0 && (
            <Card className="shadow-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20 backdrop-blur-xl rounded-2xl mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedTasks.length === filteredTasks.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      {selectedTasks.length} selected
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTasks([])}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Select onValueChange={handleBulkStatusChange}>
                      <SelectTrigger className="w-40 h-9 rounded-xl">
                        <SelectValue placeholder="Change Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select onValueChange={handleBulkPriorityChange}>
                      <SelectTrigger className="w-40 h-9 rounded-xl">
                        <SelectValue placeholder="Change Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowBulkDeleteDialog(true)}
                      className="rounded-xl"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete ({selectedTasks.length})
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task Form */}
          <AnimatePresence>
            {isTaskFormOpen && (
              <TaskForm
                task={editingTask}
                assignments={assignments}
                users={users}
                currentUser={currentUser}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setIsTaskFormOpen(false);
                  setEditingTask(null);
                }}
              />
            )}
          </AnimatePresence>

          {/* Task Board */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <CheckSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No tasks found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {searchQuery || priorityFilter !== 'all' || selectedAssignment !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first task'}
              </p>
              {!(searchQuery || priorityFilter !== 'all' || selectedAssignment !== 'all') && (
                <Button
                  onClick={() => setIsTaskFormOpen(true)}
                  variant="outline"
                  className="border-gray-300 dark:border-gray-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </Button>
              )}
            </div>
          ) : (
            <TaskBoard
              tasks={filteredTasks}
              assignments={assignments}
              users={users}
              currentUser={currentUser}
              onTaskClick={handleEdit}
              onTaskUpdate={handleTaskUpdate}
              onEdit={handleEdit}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              selectedTasks={selectedTasks}
              onSelectTask={handleSelectTask}
              onSelectAll={handleSelectAll}
              renderTaskActions={(task) => (
                <div className="flex items-center gap-1">
                  <ShareButton
                    item={task}
                    itemType="task"
                    currentUser={currentUser}
                    variant="ghost"
                    size="sm"
                  />
                </div>
              )}
            />
          )}
        </div>

        {/* AI Assistant */}
        {!isAIAssistantCollapsed && (
          <div className="overflow-auto">
            <AITaskAssistantPanel
              assignments={assignments}
              users={users}
              currentUser={currentUser}
              onTasksCreated={loadData}
              isCollapsed={isAIAssistantCollapsed}
              onToggleCollapse={() => setIsAIAssistantCollapsed(!isAIAssistantCollapsed)}
            />
          </div>
        )}
      </div>

      {/* Bulk Delete Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Delete {selectedTasks.length} Task{selectedTasks.length !== 1 ? 's' : ''}?
            </DialogTitle>
            <DialogDescription className="text-base pt-4">
              Are you sure you want to delete {selectedTasks.length} selected task{selectedTasks.length !== 1 ? 's' : ''}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={bulkDeleteLoading}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteLoading}
              className="rounded-xl"
            >
              {bulkDeleteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Tasks
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
