import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { ContextSelector, DebateChatInterface } from '@/features/debate';
import { db } from '@/api/db';

/**
 * AI Debate Hub Page
 * Standalone page for dual-AI debates with multiple context types
 */
export default function DebateHub() {
  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  // Context state
  const [contextType, setContextType] = useState('none');
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedRepo, setSelectedRepo] = useState(null);

  // Data loading
  const [projects, setProjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load workspace data
  const loadData = useCallback(async () => {
    if (!currentWorkspaceId || workspaceLoading) {
      if (!currentWorkspaceId) {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const [projectsData, assignmentsData, reposData] = await Promise.all([
        db.entities.Project.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
        db.entities.Assignment.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
        db.entities.WorkspaceRepository.filter({ workspace_id: currentWorkspaceId }),
      ]);
      setProjects(projectsData || []);
      setAssignments(assignmentsData || []);
      setRepositories(reposData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load workspace data');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, workspaceLoading]);

  useEffect(() => {
    if (currentWorkspaceId && !workspaceLoading) {
      loadData();
    }
  }, [currentWorkspaceId, workspaceLoading, loadData]);

  // Context change handler
  const handleContextChange = (type, data) => {
    setContextType(type);
    setSelectedProject(type === 'project' ? data : null);
    setSelectedAssignment(type === 'assignment' ? data : null);
    setSelectedRepo(type === 'github' ? data : null);
  };

  // Get context data for debate
  const getContextData = () => {
    switch (contextType) {
      case 'project':
        return selectedProject;
      case 'assignment':
        return selectedAssignment;
      case 'github':
        return selectedRepo;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading AI Debate...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-[calc(100vh-56px)]">
        {/* Header with gradient */}
        <div className="flex-shrink-0 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Debate</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Dual-AI analysis with consensus building
                </p>
              </div>
            </div>

            {/* Context Selector */}
            <ContextSelector
              contextType={contextType}
              selectedProject={selectedProject}
              selectedAssignment={selectedAssignment}
              selectedRepo={selectedRepo}
              onContextChange={handleContextChange}
              projects={projects}
              assignments={assignments}
              repositories={repositories}
            />
          </div>
        </div>

        {/* Main Debate Interface */}
        <div className="flex-1 min-h-0 overflow-hidden p-4">
          <DebateChatInterface contextType={contextType} contextData={getContextData()} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
