
import React, { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Search,
  Brain,
  Loader2,
  Target
} from "lucide-react";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

// Assuming base44 is globally available or provided by the framework,
// and it now encapsulates access to Task entities and LLM integrations.
// The original imports for Task and InvokeLLM are no longer needed
// as they are accessed via base44.
// Removed: import { Task } from "@/api/entities";
// Removed: import { InvokeLLM } from "@/api/integrations";

export default function SmartTaskSearch({
  assignmentId, // New prop for filtering tasks by assignment
  onSelectTask, // New prop for handling task selection (usage not specified in outline)
  className = ""
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false); // Indicates an active LLM-powered search
  const [loading, setLoading] = useState(true); // Indicates initial task loading state
  const [tasks, setTasks] = useState([]); // All tasks loaded for the current workspace/assignment
  const [filteredTasks, setFilteredTasks] = useState([]); // Tasks filtered by the search query

  const { currentWorkspaceId } = useWorkspace();

  // Effect to load tasks whenever the workspace or assignmentId changes
  useEffect(() => {
    if (currentWorkspaceId) {
      loadTasks();
    }
  }, [currentWorkspaceId, assignmentId]); // Dependencies for loadTasks

  // Function to load tasks based on the current workspace and assignment
  const loadTasks = useCallback(async () => {
    if (!currentWorkspaceId) {
      setTasks([]);
      setFilteredTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const filter = { workspace_id: currentWorkspaceId };
      if (assignmentId) {
        filter.assignment_id = assignmentId;
      }
      // Accessing Task entity through the assumed global 'base44' object
      const tasksData = await base44.entities.Task.filter(filter, "-updated_date");
      setTasks(tasksData);
      setFilteredTasks(tasksData); // Initially, all loaded tasks are filtered tasks
    } catch (error) {
      console.error("Error loading tasks:", error);
      setTasks([]);
      setFilteredTasks([]);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, assignmentId]);

  // Performs the AI-powered smart search on the loaded tasks
  const performSmartSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setFilteredTasks(tasks); // If query is empty, show all currently loaded tasks
      return;
    }

    setIsSearching(true);
    try {
      const prompt = `Generate search terms for task search: "${query}"
Include synonyms, related concepts, and task-specific terms.
Return as JSON array of 5-8 keywords.`;

      // Accessing LLM integration through the assumed global 'base44' object
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            keywords: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const keywords = [query.toLowerCase(), ...(response.keywords || []).map(k => k.toLowerCase())];

      // Filter tasks based on generated keywords
      const results = tasks.filter(task => {
        const searchableText = [
          task.title,
          task.description,
          task.status,
          task.priority,
          ...(task.ai_keywords || []) // Include AI-generated keywords from the task itself
        ].filter(Boolean).join(' ').toLowerCase(); // Filter out null/undefined values before joining

        return keywords.some(keyword => searchableText.includes(keyword));
      });

      setFilteredTasks(results);
      // The prop 'onSelectTask' is not used here but could be invoked if a specific task
      // is clicked from a displayed list of results (not part of this outline).
    } catch (error) {
      console.error("Error performing smart search:", error);
      // Fallback to simple title/description search on error
      const simple = tasks.filter(task =>
        (task.title?.toLowerCase().includes(query.toLowerCase()) ||
        task.description?.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredTasks(simple);
    } finally {
      setIsSearching(false);
    }
  }, [tasks]); // Re-run if the base tasks list changes

  // Debounced execution of performSmartSearch when the query changes
  useEffect(() => {
    // Only perform search if not in the initial loading phase
    if (!loading) {
      const timeoutId = setTimeout(() => {
        performSmartSearch(searchQuery);
      }, 800); // Debounce delay for AI-powered search

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, performSmartSearch, loading]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder={loading ? "Loading tasks..." : "AI-powered task search with skills and workflow matching..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 text-base"
          disabled={loading} // Disable input while tasks are loading
        />
        {(isSearching || loading) && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* Search Mode Toggle and Filters have been removed as per the outline */}

      {/* Search Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          <span>{loading ? "Loading tasks..." : `Found ${filteredTasks.length} tasks`}</span>
        </div>
        {/* AI-Enhanced Search indicator, always shown as this component is now inherently smart */}
        <div className="flex items-center gap-1">
          <Brain className="w-4 h-4 text-purple-500" />
          <span className="text-purple-600">AI-Enhanced Search</span>
        </div>
      </div>
    </div>
  );
}
