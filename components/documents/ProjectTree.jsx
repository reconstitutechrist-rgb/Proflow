import React, { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, FolderKanban, Target, FileText, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Get a color for a project based on its index or stored color
 */
const getProjectColor = (project, index) => {
  const colors = [
    'bg-purple-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-amber-500',
    'bg-indigo-500',
  ];

  if (project?.color) {
    // Try to match hex color to a tailwind class
    const colorMap = {
      '#8B5CF6': 'bg-purple-500',
      '#3B82F6': 'bg-blue-500',
      '#10B981': 'bg-green-500',
      '#F97316': 'bg-orange-500',
      '#EC4899': 'bg-pink-500',
      '#06B6D4': 'bg-cyan-500',
      '#F59E0B': 'bg-amber-500',
      '#6366F1': 'bg-indigo-500',
    };
    return colorMap[project.color] || colors[index % colors.length];
  }

  return colors[index % colors.length];
};

/**
 * TreeItem - A single item in the project tree (project or assignment)
 */
function TreeItem({
  item,
  level = 0,
  isProject = true,
  isSelected = false,
  isExpanded = false,
  documentCount = 0,
  childItems = [],
  onSelect,
  onToggleExpand,
  colorClass,
  darkMode,
  getAssignmentDocCount,
  selectedAssignment,
  onAssignmentSelect,
}) {
  const hasChildren = isProject && childItems.length > 0;
  const paddingLeft = level * 12;

  return (
    <div>
      <button
        onClick={() => {
          if (isProject && hasChildren) {
            onToggleExpand();
          }
          onSelect();
        }}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all',
          isSelected
            ? darkMode
              ? 'bg-white/10 text-white'
              : 'bg-indigo-50 text-indigo-700'
            : darkMode
              ? 'text-gray-400 hover:bg-white/5 hover:text-white'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
      >
        {/* Expand/collapse icon for projects with children */}
        {isProject && hasChildren ? (
          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        {isProject ? (
          <span className={cn('w-2.5 h-2.5 rounded-sm flex-shrink-0', colorClass)} />
        ) : (
          <Target
            className={cn(
              'w-4 h-4 flex-shrink-0',
              isSelected
                ? darkMode
                  ? 'text-white'
                  : 'text-indigo-600'
                : darkMode
                  ? 'text-gray-500'
                  : 'text-gray-400'
            )}
          />
        )}

        {/* Name */}
        <span className="flex-1 truncate text-left">{item.name || item.title}</span>

        {/* Document count badge */}
        {documentCount > 0 && (
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded-full flex-shrink-0',
              isSelected
                ? darkMode
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 text-indigo-700'
                : darkMode
                  ? 'bg-white/10 text-gray-400'
                  : 'bg-gray-100 text-gray-500'
            )}
          >
            {documentCount}
          </span>
        )}
      </button>

      {/* Children (assignments under project) */}
      {isExpanded && hasChildren && (
        <div className="ml-2">
          {childItems.map((assignment) => (
            <TreeItem
              key={assignment.id}
              item={assignment}
              level={level + 1}
              isProject={false}
              isSelected={selectedAssignment === assignment.id}
              documentCount={getAssignmentDocCount(assignment.id)}
              onSelect={() => onAssignmentSelect(assignment.id)}
              darkMode={darkMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ProjectTree - Expandable tree of projects with nested assignments
 * @param {Object} props
 * @param {Array} props.projects - All projects
 * @param {Array} props.assignments - All assignments
 * @param {Array} props.documents - All documents (for counting)
 * @param {string|null} props.selectedProject - Currently selected project ID
 * @param {string|null} props.selectedAssignment - Currently selected assignment ID
 * @param {Function} props.onProjectSelect - Callback when project selected
 * @param {Function} props.onAssignmentSelect - Callback when assignment selected
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 * @param {Function} props.getProjectDocumentCount - Function to get doc count for project
 * @param {Function} props.getAssignmentDocumentCount - Function to get doc count for assignment
 */
export default function ProjectTree({
  projects = [],
  assignments = [],
  documents = [],
  selectedProject,
  selectedAssignment,
  onProjectSelect,
  onAssignmentSelect,
  darkMode = false,
  getProjectDocumentCount,
  getAssignmentDocumentCount,
}) {
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  // Build tree structure: group assignments by project
  const tree = useMemo(() => {
    const assignmentsByProject = {};

    // Group assignments by their project_id
    assignments.forEach((assignment) => {
      const projectId = assignment.project_id || 'standalone';
      if (!assignmentsByProject[projectId]) {
        assignmentsByProject[projectId] = [];
      }
      assignmentsByProject[projectId].push(assignment);
    });

    // Build project entries with their assignments
    const projectTree = projects.map((project, index) => ({
      ...project,
      assignments: assignmentsByProject[project.id] || [],
      colorClass: getProjectColor(project, index),
    }));

    // Get standalone assignments (not linked to any project)
    const standaloneAssignments = assignmentsByProject['standalone'] || [];

    return {
      projects: projectTree,
      standaloneAssignments,
    };
  }, [projects, assignments]);

  const toggleProjectExpand = useCallback((projectId) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const handleProjectSelect = useCallback(
    (projectId) => {
      onProjectSelect(selectedProject === projectId ? null : projectId);
    },
    [selectedProject, onProjectSelect]
  );

  const handleAssignmentSelect = useCallback(
    (assignmentId) => {
      onAssignmentSelect(selectedAssignment === assignmentId ? null : assignmentId);
    },
    [selectedAssignment, onAssignmentSelect]
  );

  return (
    <div className="space-y-1">
      {/* Section header */}
      <div className="flex items-center justify-between px-2 py-1">
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            darkMode ? 'text-gray-500' : 'text-gray-400'
          )}
        >
          Projects
        </span>
      </div>

      {/* Projects list */}
      {tree.projects.length === 0 ? (
        <div
          className={cn(
            'px-3 py-4 text-sm text-center',
            darkMode ? 'text-gray-500' : 'text-gray-400'
          )}
        >
          No projects yet
        </div>
      ) : (
        tree.projects.map((project) => (
          <TreeItem
            key={project.id}
            item={project}
            level={0}
            isProject={true}
            isSelected={selectedProject === project.id}
            isExpanded={expandedProjects.has(project.id)}
            documentCount={getProjectDocumentCount?.(project.id) || 0}
            childItems={project.assignments}
            onSelect={() => handleProjectSelect(project.id)}
            onToggleExpand={() => toggleProjectExpand(project.id)}
            colorClass={project.colorClass}
            darkMode={darkMode}
            getAssignmentDocCount={getAssignmentDocumentCount}
            selectedAssignment={selectedAssignment}
            onAssignmentSelect={handleAssignmentSelect}
          />
        ))
      )}

      {/* Standalone assignments (not linked to any project) */}
      {tree.standaloneAssignments.length > 0 && (
        <>
          <div className="flex items-center justify-between px-2 py-1 mt-4">
            <span
              className={cn(
                'text-xs font-semibold uppercase tracking-wider',
                darkMode ? 'text-gray-500' : 'text-gray-400'
              )}
            >
              Assignments
            </span>
          </div>
          {tree.standaloneAssignments.map((assignment) => (
            <TreeItem
              key={assignment.id}
              item={assignment}
              level={0}
              isProject={false}
              isSelected={selectedAssignment === assignment.id}
              documentCount={getAssignmentDocumentCount?.(assignment.id) || 0}
              onSelect={() => handleAssignmentSelect(assignment.id)}
              darkMode={darkMode}
            />
          ))}
        </>
      )}
    </div>
  );
}
