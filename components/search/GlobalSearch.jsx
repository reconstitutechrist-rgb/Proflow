import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/api/db';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  FileText,
  FolderOpen,
  MessageSquare,
  CheckSquare,
  Loader2,
  Target,
} from 'lucide-react';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';

export default function GlobalSearch({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState({
    projects: [],
    assignments: [],
    documents: [],
    tasks: [],
    messages: [],
  });
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults({
        projects: [],
        assignments: [],
        documents: [],
        tasks: [],
        messages: [],
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchQuery.trim().length < 2) {
      setResults({
        projects: [],
        assignments: [],
        documents: [],
        tasks: [],
        messages: [],
      });
      return;
    }

    const timeout = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery, currentWorkspaceId]);

  const performSearch = async (query) => {
    if (!currentWorkspaceId) {
      return;
    }

    setLoading(true);
    try {
      const searchLower = query.toLowerCase();

      const [projects, assignments, documents, tasks, messages] = await Promise.allSettled([
        db.entities.Project.filter(
          {
            workspace_id: currentWorkspaceId,
          },
          '-updated_date',
          20
        ),
        db.entities.Assignment.filter(
          {
            workspace_id: currentWorkspaceId,
          },
          '-updated_date',
          20
        ),
        db.entities.Document.filter(
          {
            workspace_id: currentWorkspaceId,
          },
          '-updated_date',
          20
        ),
        db.entities.Task.filter(
          {
            workspace_id: currentWorkspaceId,
          },
          '-updated_date',
          20
        ),
        db.entities.Message.filter(
          {
            workspace_id: currentWorkspaceId,
          },
          '-created_date',
          20
        ).catch(() => []),
      ]);

      const projectResults = (projects.status === 'fulfilled' ? projects.value : [])
        .filter(
          (p) =>
            p.name?.toLowerCase().includes(searchLower) ||
            p.description?.toLowerCase().includes(searchLower)
        )
        .slice(0, 5);

      const assignmentResults = (assignments.status === 'fulfilled' ? assignments.value : [])
        .filter(
          (a) =>
            a.name?.toLowerCase().includes(searchLower) ||
            a.description?.toLowerCase().includes(searchLower)
        )
        .slice(0, 5);

      const documentResults = (documents.status === 'fulfilled' ? documents.value : [])
        .filter(
          (d) =>
            d.title?.toLowerCase().includes(searchLower) ||
            d.description?.toLowerCase().includes(searchLower) ||
            d.content?.toLowerCase().includes(searchLower)
        )
        .slice(0, 5);

      const taskResults = (tasks.status === 'fulfilled' ? tasks.value : [])
        .filter(
          (t) =>
            t.title?.toLowerCase().includes(searchLower) ||
            t.description?.toLowerCase().includes(searchLower)
        )
        .slice(0, 5);

      const messageResults = (messages.status === 'fulfilled' ? messages.value : [])
        .filter((m) => m.content?.toLowerCase().includes(searchLower))
        .slice(0, 5);

      setResults({
        projects: projectResults,
        assignments: assignmentResults,
        documents: documentResults,
        tasks: taskResults,
        messages: messageResults,
      });
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result, type) => {
    onClose();
    // Navigation will be handled by the parent via onResultClick callback
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('globalSearchResult', {
        detail: { result, type },
      });
      window.dispatchEvent(event);
    }
  };

  const totalResults =
    results.projects.length +
    results.assignments.length +
    results.documents.length +
    results.tasks.length +
    results.messages.length;

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput
        placeholder="Search projects, assignments, documents, tasks..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {!loading && searchQuery.trim().length >= 2 && totalResults === 0 && (
          <CommandEmpty>No results found in current workspace.</CommandEmpty>
        )}

        {!loading && results.projects.length > 0 && (
          <>
            <CommandGroup heading="Projects">
              {results.projects.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => handleResultClick(project, 'project')}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Target className="w-4 h-4 text-purple-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    {project.description && (
                      <p className="text-xs text-gray-500 truncate">{project.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {project.status}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {!loading && results.assignments.length > 0 && (
          <>
            <CommandGroup heading="Assignments">
              {results.assignments.map((assignment) => (
                <CommandItem
                  key={assignment.id}
                  onSelect={() => handleResultClick(assignment, 'assignment')}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{assignment.name}</p>
                    {assignment.description && (
                      <p className="text-xs text-gray-500 truncate">{assignment.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {assignment.status}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {!loading && results.documents.length > 0 && (
          <>
            <CommandGroup heading="Documents">
              {results.documents.map((document) => (
                <CommandItem
                  key={document.id}
                  onSelect={() => handleResultClick(document, 'document')}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-green-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{document.title}</p>
                    {document.description && (
                      <p className="text-xs text-gray-500 truncate">{document.description}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {!loading && results.tasks.length > 0 && (
          <>
            <CommandGroup heading="Tasks">
              {results.tasks.map((task) => (
                <CommandItem
                  key={task.id}
                  onSelect={() => handleResultClick(task, 'task')}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4 text-orange-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-gray-500 truncate">{task.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {task.status}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {!loading && results.messages.length > 0 && (
          <CommandGroup heading="Messages">
            {results.messages.map((message) => (
              <CommandItem
                key={message.id}
                onSelect={() => handleResultClick(message, 'message')}
                className="flex items-center gap-3 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-purple-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{message.author_name}</p>
                  <p className="text-xs text-gray-500 truncate">{message.content}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
