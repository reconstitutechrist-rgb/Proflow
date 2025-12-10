import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { db } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Plus, Search, Loader2, FolderOpen, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import AssignmentForm from '@/features/assignments/AssignmentForm';
import AssignmentDetails from '@/features/assignments/AssignmentDetails';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';

export default function AssignmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignment');

  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [selectedProject, setSelectedProject] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const [loading, setLoading] = useState(true);

  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  useEffect(() => {
    if (currentWorkspaceId && !workspaceLoading) {
      loadData();
    }
  }, [currentWorkspaceId, workspaceLoading]);

  useEffect(() => {
    if (assignmentId && assignments.length > 0) {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (assignment) {
        setSelectedAssignment(assignment);
      }
    }
  }, [assignmentId, assignments]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentsData, tasksData, documentsData, usersData, projectsData, user] =
        await Promise.all([
          db.entities.Assignment.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
          db.entities.Task.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
          db.entities.Document.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
          db.entities.User.list(),
          db.entities.Project.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
          db.auth.me(),
        ]);

      setAssignments(assignmentsData);
      setTasks(tasksData);
      setDocuments(documentsData);
      setUsers(usersData);
      setCurrentUser(user);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (assignmentData) => {
    try {
      if (editingAssignment) {
        await db.entities.Assignment.update(editingAssignment.id, assignmentData);
        toast.success('Assignment updated successfully');
      } else {
        await db.entities.Assignment.create({
          ...assignmentData,
          workspace_id: currentWorkspaceId,
        });
        toast.success('Assignment created successfully');
      }
      setIsFormOpen(false);
      setEditingAssignment(null);
      loadData();
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast.error('Failed to save assignment');
    }
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setIsFormOpen(true);
  };

  const handleDelete = async (assignmentId) => {
    if (!window.confirm('Delete this assignment?')) return;

    try {
      await db.entities.Assignment.delete(assignmentId);
      toast.success('Assignment deleted');
      setSelectedAssignment(null);
      setSearchParams({});
      loadData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesProject = selectedProject === 'all' || assignment.project_id === selectedProject;
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      assignment.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesProject && matchesStatus && matchesSearch;
  });

  const getStatusColor = (status) => {
    const colors = {
      planning: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      on_hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[status] || colors.planning;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
      urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Clean Header */}
      <div className="flex-shrink-0 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-light text-gray-900 dark:text-white tracking-tight">
              Assignments
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filteredAssignments.length}{' '}
              {filteredAssignments.length === 1 ? 'assignment' : 'assignments'}
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingAssignment(null);
              setIsFormOpen(true);
            }}
            className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Assignment
          </Button>
        </div>

        {/* Minimal Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-200 dark:border-gray-800 focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
            />
          </div>

          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[180px] border-gray-200 dark:border-gray-800">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] border-gray-200 dark:border-gray-800">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No assignments found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery || statusFilter !== 'all' || selectedProject !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first assignment'}
            </p>
            {!(searchQuery || statusFilter !== 'all' || selectedProject !== 'all') && (
              <Button
                onClick={() => setIsFormOpen(true)}
                variant="outline"
                className="border-gray-300 dark:border-gray-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Assignment
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
            <AnimatePresence mode="popLayout">
              {filteredAssignments.map((assignment) => (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <Card
                    className="group cursor-pointer border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-900"
                    onClick={() => {
                      setSelectedAssignment(assignment);
                      setSearchParams({ assignment: assignment.id });
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors line-clamp-2">
                          {assignment.title}
                        </h3>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0 ml-2" />
                      </div>

                      {assignment.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="secondary"
                          className={`${getStatusColor(assignment.status)} text-xs font-normal`}
                        >
                          {assignment.status?.replace('_', ' ')}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`${getPriorityColor(assignment.priority)} text-xs font-normal`}
                        >
                          {assignment.priority}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AssignmentForm
            assignment={editingAssignment}
            projects={projects}
            users={users}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingAssignment(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={!!selectedAssignment}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAssignment(null);
            setSearchParams({});
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {selectedAssignment && (
            <AssignmentDetails
              assignment={selectedAssignment}
              projects={projects}
              users={users}
              currentUser={currentUser}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onClose={() => {
                setSelectedAssignment(null);
                setSearchParams({});
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
