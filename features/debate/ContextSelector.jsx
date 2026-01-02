import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Globe, Target, FolderOpen, Github, X } from 'lucide-react';

/**
 * Context selector for debate sessions
 * Allows users to choose between: No context, Project, Assignment, or GitHub repo
 */
export function ContextSelector({
  contextType,
  selectedProject,
  selectedAssignment,
  selectedRepo,
  onContextChange,
  projects = [],
  assignments = [],
  repositories = [],
}) {
  const getContextValue = () => {
    if (contextType === 'project' && selectedProject) {
      return `project:${selectedProject.id}`;
    } else if (contextType === 'assignment' && selectedAssignment) {
      return `assignment:${selectedAssignment.id}`;
    } else if (contextType === 'github' && selectedRepo) {
      return `github:${selectedRepo.id}`;
    }
    return 'none';
  };

  const handleValueChange = (value) => {
    if (value === 'none') {
      onContextChange('none', null);
    } else if (value.startsWith('project:')) {
      const projectId = value.replace('project:', '');
      const project = projects.find((p) => p.id === projectId);
      onContextChange('project', project);
    } else if (value.startsWith('assignment:')) {
      const assignmentId = value.replace('assignment:', '');
      const assignment = assignments.find((a) => a.id === assignmentId);
      onContextChange('assignment', assignment);
    } else if (value.startsWith('github:')) {
      const repoId = value.replace('github:', '');
      const repo = repositories.find((r) => r.id === repoId);
      onContextChange('github', repo);
    }
  };

  const clearContext = () => {
    onContextChange('none', null);
  };

  const hasSelection =
    contextType !== 'none' && (selectedProject || selectedAssignment || selectedRepo);

  return (
    <div className="flex items-center gap-3">
      <Select value={getContextValue()} onValueChange={handleValueChange}>
        <SelectTrigger className="w-72">
          <SelectValue>
            {selectedProject ? (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                <span className="truncate">{selectedProject.name}</span>
              </div>
            ) : selectedAssignment ? (
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-purple-600" />
                <span className="truncate">{selectedAssignment.name}</span>
              </div>
            ) : selectedRepo ? (
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-gray-700" />
                <span className="truncate">{selectedRepo.github_repo_full_name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>No Context (General Topic)</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* No Context Option */}
          <SelectItem value="none">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <div>
                <span className="font-medium">No Context</span>
                <p className="text-xs text-gray-500">Debate any general topic</p>
              </div>
            </div>
          </SelectItem>

          {/* Projects Section */}
          {projects.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1 pt-2">
                Proflow Projects
              </div>
              {projects.map((project) => (
                <SelectItem key={`project:${project.id}`} value={`project:${project.id}`}>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600" />
                    <span>{project.name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}

          {/* Assignments Section */}
          {assignments.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1 pt-2">
                Proflow Assignments
              </div>
              {assignments.map((assignment) => (
                <SelectItem
                  key={`assignment:${assignment.id}`}
                  value={`assignment:${assignment.id}`}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-purple-600" />
                    <span>{assignment.name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}

          {/* GitHub Repositories Section */}
          {repositories.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1 pt-2">
                GitHub Repositories
              </div>
              {repositories.map((repo) => (
                <SelectItem key={`github:${repo.id}`} value={`github:${repo.id}`}>
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4 text-gray-700" />
                    <span>{repo.github_repo_full_name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      {hasSelection && (
        <Button variant="ghost" size="icon" onClick={clearContext} title="Clear context">
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export default ContextSelector;
