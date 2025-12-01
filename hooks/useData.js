import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';

/**
 * Query key factory for consistent cache key generation
 */
export const queryKeys = {
  // Tasks
  tasks: (workspaceId) => ['tasks', workspaceId],
  task: (taskId) => ['task', taskId],

  // Documents
  documents: (workspaceId) => ['documents', workspaceId],
  document: (documentId) => ['document', documentId],

  // Assignments
  assignments: (workspaceId) => ['assignments', workspaceId],
  assignment: (assignmentId) => ['assignment', assignmentId],

  // Projects
  projects: (workspaceId) => ['projects', workspaceId],
  project: (projectId) => ['project', projectId],

  // Users and workspace members
  users: (workspaceId) => ['users', workspaceId],
  user: (userId) => ['user', userId],
  workspaceMembers: (workspaceId) => ['workspaceMembers', workspaceId],

  // Messages and threads
  messages: (threadId) => ['messages', threadId],
  threads: (workspaceId) => ['threads', workspaceId],

  // Workspaces
  workspaces: () => ['workspaces'],
  workspace: (workspaceId) => ['workspace', workspaceId],

  // Notes
  notes: (workspaceId) => ['notes', workspaceId],
  note: (noteId) => ['note', noteId],
};

/**
 * Default stale time for queries (5 minutes)
 */
const DEFAULT_STALE_TIME = 1000 * 60 * 5;

/**
 * Default error handler for mutations
 */
const handleMutationError = (error, entityName, operation) => {
  console.error(`Failed to ${operation} ${entityName}:`, error);
  toast.error(`Failed to ${operation} ${entityName}`);
};

/**
 * Hook for fetching tasks with caching
 */
export function useTasks(filters = {}) {
  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.tasks(currentWorkspaceId),
    queryFn: async () => {
      const tasks = await db.Task.filter({
        workspace_id: currentWorkspaceId,
        ...filters,
      });
      return tasks;
    },
    enabled: !!currentWorkspaceId && !workspaceLoading,
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Hook for fetching a single task
 */
export function useTask(taskId) {
  return useQuery({
    queryKey: queryKeys.task(taskId),
    queryFn: async () => {
      const task = await db.Task.get(taskId);
      return task;
    },
    enabled: !!taskId,
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Hook for creating a task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async (taskData) => {
      return await db.Task.create({
        ...taskData,
        workspace_id: currentWorkspaceId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(currentWorkspaceId) });
      toast.success('Task created successfully');
    },
    onError: (error) => handleMutationError(error, 'task', 'create'),
  });
}

/**
 * Hook for updating a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async ({ taskId, updates }) => {
      return await db.Task.update(taskId, updates);
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(currentWorkspaceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      toast.success('Task updated successfully');
    },
    onError: (error) => handleMutationError(error, 'task', 'update'),
  });
}

/**
 * Hook for deleting a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async (taskId) => {
      return await db.Task.delete(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(currentWorkspaceId) });
      toast.success('Task deleted successfully');
    },
    onError: (error) => handleMutationError(error, 'task', 'delete'),
  });
}

/**
 * Hook for fetching documents with caching
 */
export function useDocuments(filters = {}) {
  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.documents(currentWorkspaceId),
    queryFn: async () => {
      const documents = await db.Document.filter({
        workspace_id: currentWorkspaceId,
        ...filters,
      });
      return documents;
    },
    enabled: !!currentWorkspaceId && !workspaceLoading,
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Hook for fetching a single document
 */
export function useDocument(documentId) {
  return useQuery({
    queryKey: queryKeys.document(documentId),
    queryFn: async () => {
      const document = await db.Document.get(documentId);
      return document;
    },
    enabled: !!documentId,
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Hook for creating a document
 */
export function useCreateDocument() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async (documentData) => {
      return await db.Document.create({
        ...documentData,
        workspace_id: currentWorkspaceId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents(currentWorkspaceId) });
      toast.success('Document created successfully');
    },
    onError: (error) => handleMutationError(error, 'document', 'create'),
  });
}

/**
 * Hook for updating a document
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async ({ documentId, updates }) => {
      return await db.Document.update(documentId, updates);
    },
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents(currentWorkspaceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.document(documentId) });
      toast.success('Document saved successfully');
    },
    onError: (error) => handleMutationError(error, 'document', 'save'),
  });
}

/**
 * Hook for deleting a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async (documentId) => {
      return await db.Document.delete(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents(currentWorkspaceId) });
      toast.success('Document deleted successfully');
    },
    onError: (error) => handleMutationError(error, 'document', 'delete'),
  });
}

/**
 * Hook for fetching assignments with caching
 */
export function useAssignments(filters = {}) {
  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.assignments(currentWorkspaceId),
    queryFn: async () => {
      const assignments = await db.Assignment.filter({
        workspace_id: currentWorkspaceId,
        ...filters,
      });
      return assignments;
    },
    enabled: !!currentWorkspaceId && !workspaceLoading,
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Hook for creating an assignment
 */
export function useCreateAssignment() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async (assignmentData) => {
      return await db.Assignment.create({
        ...assignmentData,
        workspace_id: currentWorkspaceId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments(currentWorkspaceId) });
      toast.success('Assignment created successfully');
    },
    onError: (error) => handleMutationError(error, 'assignment', 'create'),
  });
}

/**
 * Hook for updating an assignment
 */
export function useUpdateAssignment() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async ({ assignmentId, updates }) => {
      return await db.Assignment.update(assignmentId, updates);
    },
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments(currentWorkspaceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignment(assignmentId) });
      toast.success('Assignment updated successfully');
    },
    onError: (error) => handleMutationError(error, 'assignment', 'update'),
  });
}

/**
 * Hook for deleting an assignment
 */
export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async (assignmentId) => {
      return await db.Assignment.delete(assignmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments(currentWorkspaceId) });
      toast.success('Assignment deleted successfully');
    },
    onError: (error) => handleMutationError(error, 'assignment', 'delete'),
  });
}

/**
 * Hook for fetching projects with caching
 */
export function useProjects(filters = {}) {
  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.projects(currentWorkspaceId),
    queryFn: async () => {
      const projects = await db.Project.filter({
        workspace_id: currentWorkspaceId,
        ...filters,
      });
      return projects;
    },
    enabled: !!currentWorkspaceId && !workspaceLoading,
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Hook for creating a project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async (projectData) => {
      return await db.Project.create({
        ...projectData,
        workspace_id: currentWorkspaceId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(currentWorkspaceId) });
      toast.success('Project created successfully');
    },
    onError: (error) => handleMutationError(error, 'project', 'create'),
  });
}

/**
 * Hook for updating a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async ({ projectId, updates }) => {
      return await db.Project.update(projectId, updates);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(currentWorkspaceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      toast.success('Project updated successfully');
    },
    onError: (error) => handleMutationError(error, 'project', 'update'),
  });
}

/**
 * Hook for deleting a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async (projectId) => {
      return await db.Project.delete(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(currentWorkspaceId) });
      toast.success('Project deleted successfully');
    },
    onError: (error) => handleMutationError(error, 'project', 'delete'),
  });
}

/**
 * Hook for fetching workspace members
 */
export function useWorkspaceMembers() {
  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.workspaceMembers(currentWorkspaceId),
    queryFn: async () => {
      const members = await db.WorkspaceMember.filter({
        workspace_id: currentWorkspaceId,
      });
      return members;
    },
    enabled: !!currentWorkspaceId && !workspaceLoading,
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Hook for fetching notes
 */
export function useNotes(filters = {}) {
  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.notes(currentWorkspaceId),
    queryFn: async () => {
      const notes = await db.Note.filter({
        workspace_id: currentWorkspaceId,
        ...filters,
      });
      return notes;
    },
    enabled: !!currentWorkspaceId && !workspaceLoading,
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Hook for creating a note
 */
export function useCreateNote() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async (noteData) => {
      return await db.Note.create({
        ...noteData,
        workspace_id: currentWorkspaceId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes(currentWorkspaceId) });
      toast.success('Note saved');
    },
    onError: (error) => handleMutationError(error, 'note', 'save'),
  });
}

/**
 * Hook for updating a note
 */
export function useUpdateNote() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async ({ noteId, updates }) => {
      return await db.Note.update(noteId, updates);
    },
    onSuccess: (_, { noteId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes(currentWorkspaceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.note(noteId) });
    },
    onError: (error) => handleMutationError(error, 'note', 'update'),
  });
}

/**
 * Hook for deleting a note
 */
export function useDeleteNote() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async (noteId) => {
      return await db.Note.delete(noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes(currentWorkspaceId) });
      toast.success('Note deleted');
    },
    onError: (error) => handleMutationError(error, 'note', 'delete'),
  });
}

/**
 * Generic hook for prefetching data
 */
export function usePrefetch() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();

  return {
    prefetchTasks: () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.tasks(currentWorkspaceId),
        queryFn: async () => {
          return await db.Task.filter({ workspace_id: currentWorkspaceId });
        },
      });
    },
    prefetchDocuments: () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.documents(currentWorkspaceId),
        queryFn: async () => {
          return await db.Document.filter({ workspace_id: currentWorkspaceId });
        },
      });
    },
    prefetchAssignments: () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.assignments(currentWorkspaceId),
        queryFn: async () => {
          return await db.Assignment.filter({ workspace_id: currentWorkspaceId });
        },
      });
    },
    prefetchProjects: () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.projects(currentWorkspaceId),
        queryFn: async () => {
          return await db.Project.filter({ workspace_id: currentWorkspaceId });
        },
      });
    },
  };
}
