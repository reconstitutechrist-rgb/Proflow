import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Loader2,
  Target
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ProjectForm from "../components/projects/ProjectForm";
import ProjectGrid from "../components/projects/ProjectGrid";
import ProjectDetails from "../components/projects/ProjectDetails";
import { useWorkspace } from "../components/workspace/WorkspaceContext";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const navigate = useNavigate();
  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (currentWorkspaceId) {
      loadData();
    }
  }, [currentWorkspaceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, assignmentsData, usersData, user] = await Promise.all([
        base44.entities.Project.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        base44.entities.Assignment.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        base44.entities.User.list(),
        base44.auth.me()
      ]);

      setProjects(projectsData);
      setAssignments(assignmentsData);
      setUsers(usersData);
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setIsFormOpen(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleSubmit = async (projectData) => {
    try {
      if (editingProject) {
        await base44.entities.Project.update(editingProject.id, projectData);
        toast.success("Project updated successfully");
      } else {
        await base44.entities.Project.create({
          ...projectData,
          workspace_id: currentWorkspaceId
        });
        toast.success("Project created successfully");
      }
      setIsFormOpen(false);
      setEditingProject(null);
      loadData();
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project");
    }
  };

  const handleDeleteProject = async (project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await base44.entities.Project.delete(project.id);
      toast.success("Project deleted successfully");
      setSelectedProject(null);
      loadData();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  const handleNavigateToAssignments = (projectId) => {
    navigate(createPageUrl("Assignments") + `?project=${projectId}`);
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchQuery === "" || 
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || project.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-purple-600" />
            Projects
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <Button onClick={handleCreateProject} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[160px]">
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

      {/* Projects Grid */}
      <AnimatePresence mode="wait">
        {filteredProjects.length > 0 ? (
          <ProjectGrid
            projects={filteredProjects}
            assignments={assignments}
            onProjectClick={setSelectedProject}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No projects found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first project'}
            </p>
            {!(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all') && (
              <Button onClick={handleCreateProject} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <ProjectForm
            project={editingProject}
            users={users}
            currentUser={currentUser}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingProject(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Project Details Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {selectedProject && (
            <ProjectDetails
              project={selectedProject}
              onClose={() => setSelectedProject(null)}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
              onNavigateToAssignments={handleNavigateToAssignments}
              currentUser={currentUser}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}