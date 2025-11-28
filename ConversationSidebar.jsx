
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderOpen,
  MessageSquare,
  Plus,
  Search,
  Pin,
  Archive,
  Tag,
  Filter,
  X,
  ChevronDown,
  MoreVertical,
  Globe, // NEW: Added Globe icon
} from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { toast } from "sonner";
import { db } from "@/api/db";

export default function ConversationSidebar({
  currentUser, // NEW prop
  assignments, // NEW prop
  selectedAssignment, // NEW prop
  selectedAssignmentId, // NEW prop: Track "general" vs assignment ID
  onAssignmentSelect, // NEW prop
  threads, // NEW prop: All threads for the workspace
  selectedThread,
  onThreadSelect, // Renamed from onSelectThread
  onNewThread, // Renamed from onCreateThread
  onPinThread, // NEW prop
  onArchiveThread, // NEW prop
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTags, setFilterTags] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  // Removed local 'threads' state as it's now passed via props
  // Removed local 'loading' state as thread loading is handled by parent

  // No longer directly using currentWorkspaceId here, parent handles fetching threads
  // const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const users = await db.entities.User.list();
        setTeamMembers(users);
      } catch (error) {
        console.error("Error loading team members:", error);
      }
    };
    loadTeamMembers();
  }, []);

  // Removed useEffect for loading threads as 'threads' is now a prop

  // Removed handleCreateThread, handlePinThread, handleArchiveThread
  // as their functionality is exposed via onNewThread, onPinThread, onArchiveThread props

  const allTags = useMemo(() => {
    const tagSet = new Set();
    threads.forEach(thread => { // Using props.threads
      thread.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [threads]);

  // NEW: Filter threads based on selected context (general or assignment-specific)
  const filteredContextThreads = useMemo(() => {
    if (selectedAssignmentId === "general") {
      // Show only general workspace threads (no assignment_id)
      return threads.filter(t => !t.assignment_id);
    } else {
      // Show threads for selected assignment
      return threads.filter(t => t.assignment_id === selectedAssignmentId);
    }
  }, [threads, selectedAssignmentId]);


  // Apply additional filters (search, tags, archive)
  const filteredThreads = useMemo(() => {
    let filtered = filteredContextThreads; // Source is now filteredContextThreads

    if (!showArchived) {
      filtered = filtered.filter(thread => thread.status !== 'archived');
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(thread =>
        thread.topic?.toLowerCase().includes(query) ||
        thread.description?.toLowerCase().includes(query) ||
        thread.context_summary?.toLowerCase().includes(query)
      );
    }

    if (filterTags.length > 0) {
      filtered = filtered.filter(thread =>
        thread.tags?.some(tag => filterTags.includes(tag))
      );
    }

    return filtered;
  }, [filteredContextThreads, searchQuery, filterTags, showArchived]); // Dependency on filteredContextThreads

  const pinnedThreads = filteredThreads.filter(t => t.is_pinned);
  const unpinnedThreads = filteredThreads.filter(t => !t.is_pinned);

  const getUnreadCount = (thread) => {
    // const user = db.auth.currentUser; // Using currentUser prop
    if (!currentUser || !thread.unread_counts) return 0;
    const userUnread = thread.unread_counts.find(uc => uc.user_email === currentUser.email);
    return userUnread?.unread_count || 0;
  };

  const getParticipantAvatars = (thread) => {
    if (!thread.participants || !teamMembers.length) return [];
    return thread.participants
      .slice(0, 3)
      .map(email => teamMembers.find(m => m.email === email))
      .filter(Boolean);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const ThreadItem = ({ thread }) => {
    const unreadCount = getUnreadCount(thread);
    const participants = getParticipantAvatars(thread);
    const isSelected = selectedThread?.id === thread.id;

    return (
      <div
        className={`p-3 rounded-lg cursor-pointer transition-all ${
          isSelected
            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-600'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div
            onClick={() => onThreadSelect(thread)} // Changed to onThreadSelect
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            {thread.is_pinned && (
              <Pin className="w-3 h-3 text-yellow-600 flex-shrink-0" />
            )}
            <h4 className={`font-medium text-sm truncate ${
              isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-white'
            }`}>
              {thread.topic}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 ml-2">
                {unreadCount}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onThreadSelect(thread)}> {/* Changed to onThreadSelect */}
                  Open Thread
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPinThread(thread)}> {/* Changed to onPinThread */}
                  {thread.is_pinned ? "Unpin Thread" : "Pin Thread"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchiveThread(thread)}> {/* Changed to onArchiveThread */}
                  {thread.status === 'archived' ? "Restore Thread" : "Archive Thread"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {thread.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
            {thread.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {participants.length > 0 && (
              <div className="flex -space-x-1">
                {participants.map((member, idx) => (
                  <Avatar key={idx} className="w-5 h-5 border-2 border-white dark:border-gray-800">
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {member?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {thread.participants && thread.participants.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                    <span className="text-[10px] text-gray-600 dark:text-gray-300">
                      +{thread.participants.length - 3}
                    </span>
                  </div>
                )}
              </div>
            )}

            {thread.priority && thread.priority !== 'medium' && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getPriorityColor(thread.priority)}`}>
                {thread.priority}
              </Badge>
            )}
          </div>

          {thread.last_activity && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {format(new Date(thread.last_activity), 'MMM d')}
            </span>
          )}
        </div>

        {thread.tags && thread.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {thread.tags.slice(0, 2).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {thread.tags.length > 2 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{thread.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Assignment/Context Selector */}
      <div className="p-4 border-b">
        <Select 
          value={selectedAssignmentId || "general"} 
          onValueChange={(value) => {
            if (value === "general") {
              onAssignmentSelect("general");
            } else {
              const assignment = assignments.find(a => a.id === value);
              if (assignment) onAssignmentSelect(assignment); // Pass full assignment object
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select context" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-600" />
                <span className="font-medium">General Workspace Chat</span>
              </div>
            </SelectItem>
            {assignments.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                  Assignments
                </div>
                {assignments.map((assignment) => (
                  <SelectItem key={assignment.id} value={assignment.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-indigo-600" />
                      <span>{assignment.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search threads..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {allTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <Tag className="w-3 h-3" />
                  Tags
                  {filterTags.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1 text-xs">
                      {filterTags.length}
                    </Badge>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {allTags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    checked={filterTags.includes(tag)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilterTags([...filterTags, tag]);
                      } else {
                        setFilterTags(filterTags.filter(t => t !== tag));
                      }
                    }}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="w-3 h-3 mr-1" />
            {showArchived ? "Hide" : "Show"} Archived
          </Button>
        </div>

        {(filterTags.length > 0 || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8"
            onClick={() => {
              setFilterTags([]);
              setSearchQuery("");
            }}
          >
            <X className="w-3 h-3 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* New Thread Button */}
      <div className="p-4 border-b">
        <Button
          onClick={onNewThread} // Changed to onNewThread
          className="w-full"
          // Removed 'disabled' as it's now handled by the parent's onNewThread function
        >
          <Plus className="w-4 h-4 mr-2" />
          New Thread
        </Button>
      </div>

      {/* Threads List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Removed 'loading' check as threads are passed as prop and parent handles loading */}
            <>
              {pinnedThreads.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Pin className="w-4 h-4 text-yellow-600" />
                    <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Pinned
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {pinnedThreads.map((thread) => (
                      <ThreadItem key={thread.id} thread={thread} />
                    ))}
                  </div>
                </div>
              )}

              {unpinnedThreads.length > 0 && (
                <div className={pinnedThreads.length > 0 ? "mt-6" : ""}>
                  {pinnedThreads.length > 0 && (
                    <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3">
                      All Threads
                    </h3>
                  )}
                  <div className="space-y-2">
                    {unpinnedThreads.map((thread) => (
                      <ThreadItem key={thread.id} thread={thread} />
                    ))}
                  </div>
                </div>
              )}

              {filteredThreads.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {searchQuery || filterTags.length > 0
                      ? "No threads match your filters"
                      : selectedAssignmentId === "general"
                        ? "No general threads yet"
                        : "No threads for this assignment yet"}
                  </p>
                  <Button
                    onClick={onNewThread} // Changed to onNewThread
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Thread
                  </Button>
                </div>
              )}
            </>
        </div>
      </ScrollArea>
    </div>
  );
}
