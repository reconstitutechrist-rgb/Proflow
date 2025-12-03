import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban,
  Target,
  ChevronRight,
  ChevronDown,
  FileText,
  FolderOpen,
} from "lucide-react";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";

export default function ProjectAssignmentStructure({
  documents,
  projects,
  assignments,
  selectedItem,
  onItemSelect,
}) {
  const { currentWorkspaceId } = useWorkspace();
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  // Build the hierarchical tree structure
  const tree = useMemo(() => {
    // Filter documents to current workspace and exclude folder placeholders
    const workspaceDocs = documents.filter(
      (doc) =>
        doc.workspace_id === currentWorkspaceId &&
        doc.document_type !== "folder_placeholder"
    );

    // Group assignments by project_id
    const assignmentsByProject = {};
    assignments.forEach((a) => {
      const projectId = a.project_id || "standalone";
      if (!assignmentsByProject[projectId]) {
        assignmentsByProject[projectId] = [];
      }
      assignmentsByProject[projectId].push(a);
    });

    // Build project entries with document counts
    const projectEntries = projects.map((project) => {
      const projectAssignments = assignmentsByProject[project.id] || [];

      // Count documents directly linked to this project
      const projectDocCount = workspaceDocs.filter(
        (d) => d.assigned_to_project === project.id
      ).length;

      // Build assignment entries with their document counts
      const assignmentEntries = projectAssignments.map((assignment) => {
        const assignmentDocCount = workspaceDocs.filter((d) =>
          d.assigned_to_assignments?.includes(assignment.id)
        ).length;

        return {
          id: assignment.id,
          name: assignment.title || assignment.name || "Untitled Assignment",
          documentCount: assignmentDocCount,
        };
      });

      return {
        id: project.id,
        name: project.name || "Untitled Project",
        documentCount: projectDocCount,
        assignments: assignmentEntries,
        totalAssignmentDocs: assignmentEntries.reduce(
          (sum, a) => sum + a.documentCount,
          0
        ),
      };
    });

    // Standalone assignments (no project)
    const standaloneAssignments = (assignmentsByProject["standalone"] || []).map(
      (assignment) => {
        const docCount = workspaceDocs.filter((d) =>
          d.assigned_to_assignments?.includes(assignment.id)
        ).length;

        return {
          id: assignment.id,
          name: assignment.title || assignment.name || "Untitled Assignment",
          documentCount: docCount,
        };
      }
    );

    // Unlinked documents (no project and no assignments)
    const unlinkedCount = workspaceDocs.filter(
      (d) =>
        !d.assigned_to_project &&
        (!d.assigned_to_assignments || d.assigned_to_assignments.length === 0)
    ).length;

    return {
      projects: projectEntries,
      standaloneAssignments,
      unlinkedCount,
    };
  }, [documents, projects, assignments, currentWorkspaceId]);

  const toggleProject = (projectId) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const isSelected = (type, id) => {
    return selectedItem?.type === type && selectedItem?.id === id;
  };

  return (
    <div className="space-y-1">
      {/* Projects */}
      {tree.projects.map((project) => {
        const isExpanded = expandedProjects.has(project.id);
        const hasAssignments = project.assignments.length > 0;
        const totalDocs = project.documentCount + project.totalAssignmentDocs;

        return (
          <div key={project.id}>
            {/* Project Row */}
            <div
              className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors group ${
                isSelected("project", project.id)
                  ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => onItemSelect("project", project.id)}
            >
              {hasAssignments ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleProject(project.id);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              ) : (
                <div className="w-6" />
              )}

              <FolderKanban className="w-5 h-5 text-blue-500 flex-shrink-0" />

              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
                {project.name}
              </span>

              {totalDocs > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {totalDocs}
                </Badge>
              )}
            </div>

            {/* Nested Assignments */}
            {isExpanded && hasAssignments && (
              <div className="ml-6 border-l border-gray-200 dark:border-gray-700 pl-2">
                {project.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected("assignment", assignment.id)
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => onItemSelect("assignment", assignment.id)}
                  >
                    <Target className="w-4 h-4 text-purple-500 flex-shrink-0" />

                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                      {assignment.name}
                    </span>

                    {assignment.documentCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {assignment.documentCount}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Standalone Assignments Section */}
      {tree.standaloneAssignments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
            Standalone Assignments
          </p>
          {tree.standaloneAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                isSelected("assignment", assignment.id)
                  ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => onItemSelect("assignment", assignment.id)}
            >
              <Target className="w-4 h-4 text-purple-500 flex-shrink-0" />

              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                {assignment.name}
              </span>

              {assignment.documentCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {assignment.documentCount}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Unlinked Documents Section */}
      {tree.unlinkedCount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div
            className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
              isSelected("unlinked", null)
                ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            onClick={() => onItemSelect("unlinked", null)}
          >
            <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />

            <span className="flex-1 text-sm font-medium text-gray-600 dark:text-gray-400">
              Unlinked Documents
            </span>

            <Badge variant="secondary" className="text-xs">
              {tree.unlinkedCount}
            </Badge>
          </div>
        </div>
      )}

      {/* Empty State */}
      {tree.projects.length === 0 &&
        tree.standaloneAssignments.length === 0 &&
        tree.unlinkedCount === 0 && (
          <div className="text-center py-8 px-4">
            <FolderOpen className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No documents found</p>
          </div>
        )}

      {/* Info Notice */}
      <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          Click a project or assignment to filter documents
        </p>
      </div>
    </div>
  );
}
