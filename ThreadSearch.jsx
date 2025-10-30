import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function ThreadSearch({ assignmentId, onThreadSelect }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentThreads, setRecentThreads] = useState([]);

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (currentWorkspaceId) {
      loadRecentThreads();
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (searchQuery.trim() && currentWorkspaceId) {
      const debounce = setTimeout(() => {
        performSearch();
      }, 300);

      return () => clearTimeout(debounce);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, currentWorkspaceId]);

  const loadRecentThreads = async () => {
    try {
      // CRITICAL: Only load threads from current workspace
      const threads = await base44.entities.ConversationThread.filter({
        workspace_id: currentWorkspaceId,
        ...(assignmentId && { assignment_id: assignmentId })
      }, "-last_activity", 10);

      setRecentThreads(threads);
    } catch (error) {
      console.error("Error loading recent threads:", error);
      toast.error("Failed to load recent threads");
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim() || !currentWorkspaceId) return;

    try {
      setLoading(true);

      // CRITICAL: Search only in current workspace
      const [threads, messages] = await Promise.all([
        base44.entities.ConversationThread.filter({
          workspace_id: currentWorkspaceId,
          ...(assignmentId && { assignment_id: assignmentId })
        }, "-last_activity", 50),
        base44.entities.Message.filter({
          workspace_id: currentWorkspaceId,
          ...(assignmentId && { assignment_id: assignmentId })
        }, "-created_date", 100)
      ]);

      const searchLower = searchQuery.toLowerCase();

      // Search in threads
      const threadMatches = threads.filter(thread =>
        thread.topic?.toLowerCase().includes(searchLower) ||
        thread.description?.toLowerCase().includes(searchLower) ||
        thread.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );

      // Search in messages and get their threads
      const messageMatches = messages.filter(msg =>
        msg.content?.toLowerCase().includes(searchLower)
      );

      const threadIdsFromMessages = [...new Set(messageMatches.map(m => m.thread_id))];
      const threadsFromMessages = threads.filter(t => threadIdsFromMessages.includes(t.id));

      // Combine and deduplicate
      const allMatchingThreads = [...threadMatches];
      threadsFromMessages.forEach(thread => {
        if (!allMatchingThreads.find(t => t.id === thread.id)) {
          allMatchingThreads.push(thread);
        }
      });

      // Sort by last activity
      allMatchingThreads.sort((a, b) => 
        new Date(b.last_activity) - new Date(a.last_activity)
      );

      setSearchResults(allMatchingThreads);
    } catch (error) {
      console.error("Error searching threads:", error);
      toast.error("Failed to search threads");
    } finally {
      setLoading(false);
    }
  };

  const handleThreadClick = (thread) => {
    // CRITICAL: Validate thread is in current workspace before selecting
    if (thread.workspace_id !== currentWorkspaceId) {
      toast.error("Cannot access threads from other workspaces");
      console.error("Security violation: Cross-workspace thread access attempt", {
        threadWorkspace: thread.workspace_id,
        currentWorkspace: currentWorkspaceId
      });
      return;
    }

    if (onThreadSelect) {
      onThreadSelect(thread);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search threads and messages..."
            className="pl-9"
            autoFocus
          />
        </div>
      </div>

      {searchQuery.trim() ? (
        loading ? (
          <div className="text-center py-4 text-sm text-gray-500">Loading...</div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <div className="text-xs text-gray-500 mb-2">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </div>
            {searchResults.map(thread => (
              <button
                key={thread.id}
                onClick={() => handleThreadClick(thread)}
                className="w-full text-left p-3 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {thread.topic}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(thread.last_activity).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {thread.description || "No description available."}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-gray-500">
            No threads found.
          </div>
        )
      ) : (
        recentThreads.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <div className="text-xs text-gray-500 mb-2">Recent Threads</div>
            {recentThreads.map(thread => (
              <button
                key={thread.id}
                onClick={() => handleThreadClick(thread)}
                className="w-full text-left p-3 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {thread.topic}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(thread.last_activity).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {thread.description || "No description available."}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-gray-500">
            No recent threads found.
          </div>
        )
      )}
    </div>
  );
}