
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { db } from "@/api/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Loader2,
  CheckSquare,
  Trash2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  LayoutGrid,
  List,
  Calendar,
  Clock,
  User,
  Filter,
  SlidersHorizontal
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

import TaskForm from "@/features/tasks/TaskForm";
import TaskBoard from "@/features/tasks/TaskBoard";
import ShareButton from "@/components/common/ShareButton";
import AITaskAssistantPanel from "@/features/ai/AITaskAssistantPanel";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";

export default function TasksPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
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

  // View mode state
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban', 'list', 'calendar'

  // Quick filter presets
  const [activePreset, setActivePreset] = useState('all');

  // AI Assistant state
  const [isAIAssistantCollapsed, setIsAIAssistantCollapsed] = useState(false);

  // Filter presets
  const filterPresets = [
    { id: 'all', label: 'All Tasks', icon: CheckSquare },
    { id: 'my-tasks', label: 'My Tasks', icon: User },
    { id: 'overdue', label: 'Overdue', icon: AlertCircle },
    { id: 'due-today', label: 'Due Today', icon: Clock },
    { id: 'this-week', label: 'This Week', icon: Calendar },
  ];

  const urlParams = new URLSearchParams(location.search);
  const sortBy = urlParams.get('sortBy');
  const assignmentParam = urlParams.get('assignment');

  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  useEffect(() => {
    if (currentWorkspaceId && !workspaceLoading) {
      loadData();
    }
  }, [currentWorkspaceId, workspaceLoading]);

  // Set assignment filter from URL parameter
  useEffect(() => {
    if (assignmentParam) {
      setSelectedAssignment(assignmentParam);
      // Also open the task form for quick creation
      setIsTaskFormOpen(true);
    }
  }, [assignmentParam]);

  const filteredTasks = useMemo(() => {
    let currentTasks = [...tasks];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);

    // Apply preset filters
    if (activePreset === 'my-tasks' && currentUser?.email) {
      currentTasks = currentTasks.filter(task => task.assigned_to === currentUser.email);
    } else if (activePreset === 'overdue') {
      currentTasks = currentTasks.filter(task => {
        if (!task.due_date || task.status === 'completed') return false;
        const dueDate = new Date(task.due_date);
        return dueDate < today;
      });
    } else if (activePreset === 'due-today') {
      currentTasks = currentTasks.filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      });
    } else if (activePreset === 'this-week') {
      currentTasks = currentTasks.filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        return dueDate >= today && dueDate <= endOfWeek;
      });
    }

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
  }, [tasks, selectedAssignment, priorityFilter, searchQuery, sortBy, activePreset, currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, assignmentsData, projectsData, usersData, user] = await Promise.all([
        db.entities.Task.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        db.entities.Assignment.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        db.entities.Project.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        db.entities.User.list(),
        db.auth.me()
      ]);

      setTasks(tasksData);
      setAssignments(assignmentsData);
      setProjects(projectsData);
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
        await db.entities.Task.update(editingTask.id, taskData);
        toast.success("Task updated successfully");
      } else {
        await db.entities.Task.create({
          ...taskData,
          workspace_id: currentWorkspaceId,
          assigned_by: currentUser?.id
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
      await db.entities.Task.update(task.id, updateData);
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
      await db.entities.Task.delete(task.id);
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
      await db.entities.Task.update(taskId, updatedFields);
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
        db.entities.Task.update(taskId, {
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
        db.entities.Task.update(taskId, { priority: newPriority })
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
      const deletePromises = selectedTasks.map(taskId => db.entities.Task.delete(taskId));
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
    return assignment?.title || "Unknown Assignment";
  };

  const getUserName = (userEmail) => {
    const user = users.find(u => u.email === userEmail);
    return user?.full_name || userEmail;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Clean Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-light text-gray-900 dark:text-white tracking-tight">
              Tasks
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
              {activePreset !== 'all' && (
                <span className="ml-2 text-purple-600 dark:text-purple-400">
                  ({filterPresets.find(p => p.id === activePreset)?.label})
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className={viewMode === 'kanban' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className={viewMode === 'calendar' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}
              >
                <Calendar className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={() => setIsAIAssistantCollapsed(!isAIAssistantCollapsed)}
              variant="outline"
              size="sm"
              className="border-gray-200 dark:border-gray-800"
            >
              {isAIAssistantCollapsed ? (
                <>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  AI
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mr-2" />
                  AI
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

        {/* Filter Presets */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {filterPresets.map((preset) => {
            const Icon = preset.icon;
            const isActive = activePreset === preset.id;
            return (
              <Button
                key={preset.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivePreset(preset.id)}
                className={isActive
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {preset.label}
                {preset.id === 'overdue' && tasks.filter(t => {
                  if (!t.due_date || t.status === 'completed') return false;
                  return new Date(t.due_date) < new Date();
                }).length > 0 && (
                  <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-xs">
                    {tasks.filter(t => {
                      if (!t.due_date || t.status === 'completed') return false;
                      return new Date(t.due_date) < new Date();
                    }).length}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        {/* Search and Additional Filters */}
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
                  {assignment.name || assignment.title}
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

          {(selectedAssignment !== 'all' || priorityFilter !== 'all' || searchQuery || activePreset !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedAssignment('all');
                setPriorityFilter('all');
                setSearchQuery('');
                setActivePreset('all');
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4 mr-1" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 ${viewMode === 'kanban' ? 'grid grid-cols-1 lg:grid-cols-2' : 'flex'} gap-8 overflow-hidden`}>
        {/* Task Views */}
        <div className={`overflow-auto ${viewMode !== 'kanban' ? 'flex-1' : ''}`}>
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
                assignmentId={selectedAssignment !== 'all' ? selectedAssignment : null}
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
          {loading || workspaceLoading || !currentWorkspaceId ? (
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
          ) : viewMode === 'kanban' ? (
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
          ) : viewMode === 'list' ? (
            /* List View */
            <Card className="border-0 shadow-md">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Task</th>
                      <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                      <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Priority</th>
                      <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Assignee</th>
                      <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Due Date</th>
                      <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr
                        key={task.id}
                        className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => handleEdit(task)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedTasks.includes(task.id)}
                              onCheckedChange={(checked) => {
                                event?.stopPropagation();
                                handleSelectTask(task.id, checked);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                              {task.description && (
                                <p className="text-sm text-gray-500 line-clamp-1">{task.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={
                            task.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                            task.status === 'blocked' ? 'bg-red-100 text-red-700 border-red-300' :
                            'bg-gray-100 text-gray-700 border-gray-300'
                          }>
                            {task.status?.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={
                            task.priority === 'urgent' ? 'bg-red-500' :
                            task.priority === 'high' ? 'bg-orange-500' :
                            task.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-gray-400'
                          }>
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                          {task.assigned_to ? getUserName(task.assigned_to) : '-'}
                        </td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            /* Calendar View */
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="grid grid-cols-7 gap-4">
                  {/* Calendar Header */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-medium text-gray-600 dark:text-gray-400 py-2">
                      {day}
                    </div>
                  ))}
                  {/* Calendar Days */}
                  {(() => {
                    const today = new Date();
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    const startDay = startOfMonth.getDay();
                    const daysInMonth = endOfMonth.getDate();
                    const days = [];

                    // Add empty cells for days before the start of the month
                    for (let i = 0; i < startDay; i++) {
                      days.push(<div key={`empty-${i}`} className="h-24"></div>);
                    }

                    // Add days of the month
                    for (let day = 1; day <= daysInMonth; day++) {
                      const date = new Date(today.getFullYear(), today.getMonth(), day);
                      const dateStr = date.toISOString().split('T')[0];
                      const tasksOnDay = filteredTasks.filter(task =>
                        task.due_date && task.due_date.split('T')[0] === dateStr
                      );
                      const isToday = day === today.getDate();

                      days.push(
                        <div
                          key={day}
                          className={`h-24 border rounded-lg p-2 ${
                            isToday ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300' : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-purple-600' : 'text-gray-600'}`}>
                            {day}
                          </div>
                          <div className="space-y-1 overflow-auto max-h-16">
                            {tasksOnDay.slice(0, 2).map(task => (
                              <div
                                key={task.id}
                                onClick={() => handleEdit(task)}
                                className={`text-xs p-1 rounded cursor-pointer truncate ${
                                  task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                  task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {task.title}
                              </div>
                            ))}
                            {tasksOnDay.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{tasksOnDay.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return days;
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Assistant */}
        {!isAIAssistantCollapsed && (
          <div className="overflow-auto">
            <AITaskAssistantPanel
              assignments={assignments}
              projects={projects}
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
