import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Search,
  Filter,
  X,
  FolderOpen,
  CheckSquare,
  FileText,
  Target,
  Loader2,
  AlertCircle,
  GripVertical,
  Calendar,
  Clock,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { db } from '@/api/db';
import { getProjectMemory } from '@/api/projectMemory';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import TeamChatBubble from '@/features/teamchat/TeamChatBubble';

// Dashboard section components
import ProjectDashboardHeader from '@/features/projects/dashboard/ProjectDashboardHeader';
import ProjectSearchFilter from '@/features/projects/dashboard/ProjectSearchFilter';
import ProjectAssignmentsSection from '@/features/projects/dashboard/ProjectAssignmentsSection';
import ProjectTasksSection from '@/features/projects/dashboard/ProjectTasksSection';
import ProjectDocumentsSection from '@/features/projects/dashboard/ProjectDocumentsSection';
import ProjectAIAssistant from '@/features/projects/dashboard/ProjectAIAssistant';

const PANEL_STORAGE_KEY = 'proflow_project_dashboard_panel_sizes';

export default function ProjectDashboard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  // Core data state
  const [project, setProject] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [projectMemory, setProjectMemory] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Panel sizes (persisted to localStorage)
  const [panelSizes, setPanelSizes] = useState(() => {
    try {
      const saved = localStorage.getItem(PANEL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [50, 50];
    } catch {
      return [50, 50];
    }
  });

  // Handle panel resize
  const handlePanelResize = (sizes) => {
    setPanelSizes(sizes);
    localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(sizes));
  };

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load project data
  const loadProjectData = useCallback(async () => {
    if (!currentWorkspaceId || workspaceLoading || !projectId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load project first
      const projectData = await db.entities.Project.get(projectId);
      if (!projectData) {
        setError('Project not found');
        setLoading(false);
        return;
      }

      // Load related data in parallel
      const [assignmentsData, allTasks, documentsData, memoryData, user] = await Promise.all([
        db.entities.Assignment.filter({ workspace_id: currentWorkspaceId, project_id: projectId }),
        db.entities.Task.filter({ workspace_id: currentWorkspaceId }),
        db.entities.Document.filter({ workspace_id: currentWorkspaceId }),
        getProjectMemory(projectId, currentWorkspaceId).catch(() => null),
        db.auth.me(),
      ]);

      // Filter tasks that belong to this project (via project_id or assignment)
      const assignmentIds = assignmentsData.map((a) => a.id);
      const projectTasks = allTasks.filter(
        (t) => t.project_id === projectId || assignmentIds.includes(t.assignment_id)
      );

      // Filter documents linked to this project
      const projectDocs = documentsData.filter(
        (d) =>
          d.assigned_to_project === projectId ||
          (d.assigned_to_assignments &&
            d.assigned_to_assignments.some((id) => assignmentIds.includes(id)))
      );

      setProject(projectData);
      setAssignments(assignmentsData || []);
      setTasks(projectTasks || []);
      setDocuments(projectDocs || []);
      setProjectMemory(memoryData);
      setCurrentUser(user);
    } catch (err) {
      console.error('Error loading project data:', err);
      setError('Failed to load project data');
      toast.error('Failed to load project data');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, workspaceLoading, projectId]);

  useEffect(() => {
    if (currentWorkspaceId && !workspaceLoading && projectId) {
      loadProjectData();
    }
  }, [currentWorkspaceId, workspaceLoading, projectId, loadProjectData]);

  // Filter logic
  const applyFilters = useCallback(
    (items, searchFields) => {
      return items
        .filter((item) => {
          if (!searchQuery.trim()) return true;
          const query = searchQuery.toLowerCase();
          return searchFields.some((field) => item[field]?.toLowerCase().includes(query));
        })
        .filter((item) => statusFilter === 'all' || item.status === statusFilter)
        .filter((item) => priorityFilter === 'all' || item.priority === priorityFilter);
    },
    [searchQuery, statusFilter, priorityFilter]
  );

  const filteredAssignments = useMemo(
    () => applyFilters(assignments, ['name', 'description']),
    [assignments, applyFilters]
  );

  const filteredTasks = useMemo(
    () => applyFilters(tasks, ['title', 'description']),
    [tasks, applyFilters]
  );

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter(
      (d) => d.title?.toLowerCase().includes(query) || d.file_name?.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all';

  // Navigation handlers
  const handleNavigateBack = () => {
    navigate('/Projects');
  };

  const handleAssignmentClick = (assignment) => {
    navigate(`/Assignments?id=${assignment.id}`);
  };

  const handleTaskClick = (task) => {
    navigate(`/Tasks?id=${task.id}`);
  };

  const handleDocumentClick = (document) => {
    navigate(`/DocumentsHub?doc=${document.id}`);
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await db.entities.Task.update(taskId, {
        status: newStatus,
        ...(newStatus === 'completed' ? { completed_date: new Date().toISOString() } : {}),
      });
      // Reload data to reflect changes
      loadProjectData();
      toast.success('Task status updated');
    } catch (err) {
      console.error('Error updating task status:', err);
      toast.error('Failed to update task status');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading project dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{error}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  The project you're looking for doesn't exist or you don't have access to it.
                </p>
              </div>
              <Button onClick={handleNavigateBack} className="mt-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col overflow-hidden -m-8 h-[calc(100vh-56px)]">
        <PanelGroup
          direction={isMobile ? 'vertical' : 'horizontal'}
          onLayout={handlePanelResize}
          className="flex-1"
        >
          {/* Left Panel - Project Dashboard */}
          <Panel defaultSize={panelSizes[0]} minSize={25} className="flex flex-col">
            <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900/50">
              {/* Header */}
              <ProjectDashboardHeader project={project} onNavigateBack={handleNavigateBack} />

              {/* Search & Filter Bar */}
              <ProjectSearchFilter
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                priorityFilter={priorityFilter}
                setPriorityFilter={setPriorityFilter}
                onClearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
              />

              {/* Scrollable Content */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {/* Assignments Section */}
                  <ProjectAssignmentsSection
                    assignments={filteredAssignments}
                    onAssignmentClick={handleAssignmentClick}
                  />

                  {/* Tasks Section */}
                  <ProjectTasksSection
                    tasks={filteredTasks}
                    assignments={assignments}
                    onTaskClick={handleTaskClick}
                    onStatusChange={handleTaskStatusChange}
                  />

                  {/* Documents Section */}
                  <ProjectDocumentsSection
                    documents={filteredDocuments}
                    onDocumentClick={handleDocumentClick}
                  />
                </div>
              </ScrollArea>
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-2 bg-gray-200 dark:bg-gray-700 hover:bg-indigo-300 dark:hover:bg-indigo-700 transition-colors cursor-col-resize flex items-center justify-center group data-[panel-group-direction=vertical]:h-2 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize">
            <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 data-[panel-group-direction=vertical]:rotate-90" />
          </PanelResizeHandle>

          {/* Right Panel - AI Assistant */}
          <Panel defaultSize={panelSizes[1]} minSize={25} className="flex flex-col">
            <ProjectAIAssistant
              project={project}
              assignments={assignments}
              tasks={tasks}
              documents={documents}
              projectMemory={projectMemory}
              workspaceId={currentWorkspaceId}
              currentUser={currentUser}
              onDataRefresh={loadProjectData}
            />
          </Panel>
        </PanelGroup>

        {/* Team Chat Bubble - Filtered to this project */}
        <TeamChatBubble projectFilter={projectId} />
      </div>
    </ErrorBoundary>
  );
}
