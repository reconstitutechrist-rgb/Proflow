
import React, { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/api/db";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Archive,
  Pin,
  Copy,
  Calendar,
  Hash,
  FileText,
  Star,
  ChevronRight,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function ChatSessionManager({
  currentSession, // Keep currentSession for active state
  onSessionSelect,
  currentAssignment // Keep currentAssignment for filtering
}) {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renamingSession, setRenamingSession] = useState(null);
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionDescription, setNewSessionDescription] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");

  const { currentWorkspaceId } = useWorkspace(); // Get currentWorkspaceId from context

  // Prevent infinite loops with ref, primarily for the loadSessions call itself
  const isLoadingRef = useRef(false);

  // Load sessions with proper dependency management and workspace scoping
  const loadSessions = useCallback(async () => {
    if (!currentWorkspaceId || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);

    try {
      const user = await db.auth.me(); // Fetch user internally
      if (!user?.email) {
        toast.error("User not authenticated.");
        setSessions([]); // Clear sessions if user is not authenticated
        return;
      }

      const userSessions = await db.entities.AIChatSession.filter({
        workspace_id: currentWorkspaceId, // Filter by current workspace
        created_by: user.email
      }, "-last_activity");

      setSessions(userSessions);
    } catch (error) {
      console.error("Error loading chat sessions:", error);
      toast.error("Failed to load chat history");
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [currentWorkspaceId]); // Dependency on currentWorkspaceId

  // Trigger session loading when workspace changes
  useEffect(() => {
    if (currentWorkspaceId) {
      loadSessions();
    } else {
      setSessions([]); // Clear sessions if no workspace is selected
      setLoading(false);
    }
  }, [currentWorkspaceId, loadSessions]);

  // Filter sessions without causing re-renders
  useEffect(() => {
    let filtered = [...sessions];

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter(session => session.status === filterStatus);
    }

    // Filter by assignment if selected
    if (currentAssignment) {
      filtered = filtered.filter(session =>
        !session.assignment_id || session.assignment_id === currentAssignment.id
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session =>
        session.name.toLowerCase().includes(query) ||
        session.description?.toLowerCase().includes(query) ||
        session.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredSessions(filtered);
  }, [sessions, filterStatus, currentAssignment, searchQuery]);


  // Internal function to create a new session (as per outline)
  const handleCreateSession = async (name, description, assignmentId) => {
    if (!currentWorkspaceId) {
      toast.error("No active workspace selected.");
      return;
    }

    try {
      const user = await db.auth.me(); // Fetch user internally
      if (!user?.email) {
        toast.error("User not authenticated.");
        return;
      }

      const sessionData = {
        workspace_id: currentWorkspaceId, // ADDED: Workspace scoping
        name,
        description,
        assignment_id: assignmentId || null,
        created_by: user.email,
        messages: [],
        documents: [],
        status: "active",
        message_count: 0,
        last_activity: new Date().toISOString()
      };

      const newSession = await db.entities.AIChatSession.create(sessionData); // Use db entity
      
      // Update local state and trigger selection
      setSessions(prev => [newSession, ...prev]);
      toast.success("Chat session created");
      onSessionSelect?.(newSession);
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create chat session");
    }
  };

  // Wrapper for "New Thread" button clicks, calling the internal creation
  const internalCreateNewSession = () => {
    // Default values for a new chat
    const defaultName = "New Chat";
    const defaultDescription = "";
    const assignmentId = currentAssignment?.id || null; // Auto-associate if an assignment is active

    handleCreateSession(defaultName, defaultDescription, assignmentId);
  };


  const handleRenameSession = async () => {
    if (!renamingSession || !newSessionName.trim()) {
      toast.error("Please enter a name for the thread");
      return;
    }

    try {
      await db.entities.AIChatSession.update(renamingSession.id, { // Use db entity
        name: newSessionName.trim(),
        description: newSessionDescription.trim() || renamingSession.description
      });

      toast.success("Thread renamed successfully");

      // Update local state without refetching
      setSessions(prev => prev.map(s =>
        s.id === renamingSession.id
          ? { ...s, name: newSessionName.trim(), description: newSessionDescription.trim() }
          : s
      ));

      setIsRenameDialogOpen(false);
      setRenamingSession(null);
      setNewSessionName("");
      setNewSessionDescription("");
    } catch (error) {
      console.error("Error renaming session:", error);
      toast.error("Failed to rename thread");
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm("Are you sure you want to delete this thread? This cannot be undone.")) {
      return;
    }

    try {
      await db.entities.AIChatSession.delete(sessionId); // Use db entity
      toast.success("Thread deleted");

      // Update local state without refetching
      setSessions(prev => prev.filter(s => s.id !== sessionId));

      // If deleted session was active, create new one
      if (currentSession?.id === sessionId) {
        internalCreateNewSession(); // Call internal function
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete thread");
    }
  };

  const handleArchiveSession = async (session) => {
    try {
      const newStatus = session.status === "archived" ? "active" : "archived";

      await db.entities.AIChatSession.update(session.id, { // Use db entity
        status: newStatus
      });

      toast.success(
        session.status === "archived" ? "Thread restored" : "Thread archived"
      );

      // Update local state without refetching
      setSessions(prev => prev.map(s =>
        s.id === session.id ? { ...s, status: newStatus } : s
      ));
    } catch (error) {
      console.error("Error archiving session:", error);
      toast.error("Failed to archive thread");
    }
  };

  const handlePinSession = async (session) => {
    try {
      const newStatus = session.status === "pinned" ? "active" : "pinned";

      await db.entities.AIChatSession.update(session.id, { // Use db entity
        status: newStatus
      });

      toast.success(
        session.status === "pinned" ? "Thread unpinned" : "Thread pinned"
      );

      // Update local state without refetching
      setSessions(prev => prev.map(s =>
        s.id === session.id ? { ...s, status: newStatus } : s
      ));
    } catch (error) {
      console.error("Error pinning session:", error);
      toast.error("Failed to pin thread");
    }
  };

  const handleDuplicateSession = async (session) => {
    if (!currentWorkspaceId) {
      toast.error("No active workspace to duplicate into.");
      return;
    }

    try {
      const user = await db.auth.me(); // Fetch user internally
      if (!user?.email) {
        toast.error("User not found for duplication.");
        return;
      }

      const duplicate = {
        name: `${session.name} (Copy)`,
        description: session.description,
        assignment_id: session.assignment_id,
        created_by: user.email, // Use internally fetched user email
        workspace_id: currentWorkspaceId, // ADDED: Workspace scoping
        messages: session.messages || [],
        documents: session.documents || [],
        query_mode: session.query_mode,
        custom_json_schema: session.custom_json_schema,
        tags: session.tags || [],
        status: "active",
        message_count: session.message_count || 0,
        last_activity: new Date().toISOString()
      };

      const newSession = await db.entities.AIChatSession.create(duplicate); // Use db entity
      toast.success("Thread duplicated");

      // Add to local state without refetching
      setSessions(prev => [newSession, ...prev]);

      onSessionSelect(newSession);
    } catch (error) {
      console.error("Error duplicating session:", error);
      toast.error("Failed to duplicate thread");
    }
  };

  const openRenameDialog = (session) => {
    setRenamingSession(session);
    setNewSessionName(session.name);
    setNewSessionDescription(session.description || "");
    setIsRenameDialogOpen(true);
  };

  if (!currentWorkspaceId) {
    return (
      <Card className="border-0 shadow-md h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h3 className="font-medium text-gray-900 mb-1">No Workspace Selected</h3>
            <p className="text-sm text-gray-500">Please select or create a workspace to view chat history.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-md h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm text-gray-500">Loading chat history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-md h-full flex flex-col">
        <CardHeader className="flex-shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Chat History
            </CardTitle>
            <Button
              size="sm"
              onClick={internalCreateNewSession} // Use internal creation function
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Thread
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
            >
              All ({sessions.length})
            </Button>
            <Button
              variant={filterStatus === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("active")}
            >
              Active ({sessions.filter(s => s.status === "active").length})
            </Button>
            <Button
              variant={filterStatus === "pinned" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("pinned")}
            >
              <Pin className="w-3 h-3 mr-1" />
              Pinned ({sessions.filter(s => s.status === "pinned").length})
            </Button>
            <Button
              variant={filterStatus === "archived" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("archived")}
            >
              <Archive className="w-3 h-3 mr-1" />
              Archived ({sessions.filter(s => s.status === "archived").length})
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <h3 className="font-medium text-gray-900 mb-1">
                  {searchQuery ? "No threads found" : "No chat history yet"}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery
                    ? "Try a different search term"
                    : "Start a new conversation to begin"}
                </p>
                {!searchQuery && (
                  <Button size="sm" onClick={internalCreateNewSession}> {/* Use internal creation function */}
                    <Plus className="w-4 h-4 mr-2" />
                    Start New Thread
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                      currentSession?.id === session.id
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                        : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                    onClick={() => onSessionSelect(session)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {session.status === "pinned" && (
                            <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          )}
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                            {session.name}
                          </h4>
                        </div>
                        {session.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                            {session.description}
                          </p>
                        )}
                      </div>

                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => openRenameDialog(session)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateSession(session)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePinSession(session)}>
                            <Pin className="w-4 h-4 mr-2" />
                            {session.status === "pinned" ? "Unpin" : "Pin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchiveSession(session)}>
                            <Archive className="w-4 h-4 mr-2" />
                            {session.status === "archived" ? "Restore" : "Archive"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteSession(session.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{session.message_count || 0}</span>
                      </div>
                      {session.documents?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>{session.documents.length}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {session.last_activity
                            ? formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })
                            : formatDistanceToNow(new Date(session.created_date), { addSuffix: true })
                          }
                        </span>
                      </div>
                    </div>

                    {/* Tags */}
                    {session.tags?.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {session.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            <Hash className="w-2 h-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {session.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{session.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Active indicator */}
                    {currentSession?.id === session.id && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <ChevronRight className="w-5 h-5 text-blue-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Thread</DialogTitle>
            <DialogDescription>
              Update the name and description for this conversation thread
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Thread Name
              </label>
              <Input
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="E.g., License Requirements Research"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Description (Optional)
              </label>
              <Textarea
                value={newSessionDescription}
                onChange={(e) => setNewSessionDescription(e.target.value)}
                placeholder="Brief description of what this thread covers..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameSession}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
