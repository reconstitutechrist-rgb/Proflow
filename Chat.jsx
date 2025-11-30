
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { db } from "@/api/db";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  Users,
  Plus,
  Hash,
  MoreVertical,
  Pin,
  X,
  Search,
  Archive,
  Settings,
  File,
  Eye,
  EyeOff,
  Reply,
  Edit,
  FolderOpen,
  Target
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import ConversationSidebar from "@/ConversationSidebar";
import EnhancedMessage from "@/EnhancedMessage";
import RichTextEditor from "@/RichTextEditor";
import ThreadSearch from "@/ThreadSearch";
import ChatSummaryButton from "@/ChatSummaryButton";
import { toast } from "sonner";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

// Define VirtualizedMessageList component (simplified, not truly virtualized without a library)
// It maps over messages and renders EnhancedMessage, passing necessary props.
const VirtualizedMessageList = React.memo(({
  messages,
  currentUser,
  replyToMessageData,
  viewMode,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onBookmark,
  onAddReaction,
  onRemoveReaction,
}) => {
  return (
    <div className="space-y-1">
      {messages.map((message, index) => {
        const previousMessage = index > 0 ? messages[index - 1] : null;
        const repliedToMessage = message.reply_to ? replyToMessageData[message.reply_to] : null;
        return (
          <div key={message.id} id={`message-${message.id}`}>
            <EnhancedMessage
              message={message}
              previousMessage={previousMessage}
              currentUser={currentUser}
              repliedToMessage={repliedToMessage} // Pass the fetched reply-to message
              viewMode={viewMode} // Pass view mode
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onPin={onPin}
              onBookmark={onBookmark}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
            />
          </div>
        );
      })}
    </div>
  );
});


export default function ChatPage() {
  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedContextId, setSelectedContextId] = useState("general"); // "general", "project:id", or "assignment:id"
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isThreadFormOpen, setIsThreadFormOpen] = useState(false);
  const [newThreadTopic, setNewThreadTopic] = useState("");
  const [newThreadDescription, setNewThreadDescription] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState('comfortable');
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [replyToMessageData, setReplyToMessageData] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);

  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const dragCounter = useRef(0); // New ref for drag-drop
  const pollingIntervalRef = useRef(null); // New ref for polling interval
  const typingChannelRef = useRef(null); // Supabase real-time channel for typing

  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  // Derive the current context (project or assignment)
  const currentProject = useMemo(() => {
    if (selectedContextId.startsWith("project:")) {
      const projectId = selectedContextId.replace("project:", "");
      return projects.find(p => p.id === projectId);
    }
    return null;
  }, [selectedContextId, projects]);

  const currentAssignment = useMemo(() => {
    if (selectedContextId.startsWith("assignment:")) {
      const assignmentId = selectedContextId.replace("assignment:", "");
      return assignments.find(a => a.id === assignmentId);
    }
    return null;
  }, [selectedContextId, assignments]);

  const contextType = useMemo(() => {
    if (selectedContextId === "general") return "general";
    if (selectedContextId.startsWith("project:")) return "project";
    if (selectedContextId.startsWith("assignment:")) return "assignment";
    return "general";
  }, [selectedContextId]);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!currentWorkspaceId || workspaceLoading) {
      if (!currentWorkspaceId) {
        setAssignments([]);
        setProjects([]);
        setUsers([]);
        setThreads([]);
        setCurrentUser(null);
        setSelectedContextId("general");
        setCurrentThread(null);
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const [threadsData, assignmentsData, projectsData, usersData, user] = await Promise.all([
        db.entities.ConversationThread.filter({ workspace_id: currentWorkspaceId }, "-last_activity"),
        db.entities.Assignment.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        db.entities.Project.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        db.entities.User.list(),
        db.auth.me()
      ]);

      setAssignments(assignmentsData);
      setProjects(projectsData);
      setUsers(usersData);
      setThreads(threadsData);
      setCurrentUser(user);

      // Handle active context selection after data load
      let newSelectedContextId = selectedContextId || "general";
      let newCurrentThread = null;

      // Keep current selection if valid
      if (newSelectedContextId.startsWith("project:")) {
        const projectId = newSelectedContextId.replace("project:", "");
        if (!projectsData.some(p => p.id === projectId)) {
          newSelectedContextId = "general";
        }
      } else if (newSelectedContextId.startsWith("assignment:")) {
        const assignmentId = newSelectedContextId.replace("assignment:", "");
        if (!assignmentsData.some(a => a.id === assignmentId)) {
          newSelectedContextId = "general";
        }
      }

      setSelectedContextId(newSelectedContextId);

      // Try to keep current thread if still valid
      if (currentThread && threadsData.some(t => t.id === currentThread.id)) {
        newCurrentThread = currentThread;
      } else {
        // Select first thread for current context
        if (newSelectedContextId === "general") {
          newCurrentThread = threadsData.find(t => !t.assignment_id && !t.project_id) || null;
        } else if (newSelectedContextId.startsWith("project:")) {
          const projectId = newSelectedContextId.replace("project:", "");
          newCurrentThread = threadsData.find(t => t.project_id === projectId) || null;
        } else if (newSelectedContextId.startsWith("assignment:")) {
          const assignmentId = newSelectedContextId.replace("assignment:", "");
          newCurrentThread = threadsData.find(t => t.assignment_id === assignmentId) || null;
        }
      }
      setCurrentThread(newCurrentThread);

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load initial data");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, workspaceLoading, selectedContextId, currentThread]);

  // Load messages for current thread
  const loadMessages = useCallback(async () => {
    if (!currentThread?.id || !currentWorkspaceId) {
      setMessages([]);
      setReplyToMessageData({});
      return;
    }

    try {
      const threadMessages = await db.entities.Message.filter({
        workspace_id: currentWorkspaceId,
        thread_id: currentThread.id
      }, "created_date");

      setMessages(threadMessages);

      // Load reply-to messages
      const replyToIds = threadMessages
        .filter(m => m.reply_to)
        .map(m => m.reply_to);

      if (replyToIds.length > 0) {
        const uniqueReplyToIds = [...new Set(replyToIds)];
        const replyToMessagesMap = {};

        // Load all reply-to messages in parallel
        const fetchedReplyToMessages = await Promise.all(
          uniqueReplyToIds.map(async (id) => {
            try {
              // Assuming Message.filter returns an array, and we need the first item
              const messages = await db.entities.Message.filter({ id: id }, "created_date", 1);
              return messages.length > 0 ? { id: id, message: messages[0] } : null;
            } catch (error) {
              console.error(`Error loading reply-to message ${id}:`, error);
              return null;
            }
          })
        );

        fetchedReplyToMessages.forEach(item => {
          if (item) {
            replyToMessagesMap[item.id] = item.message;
          }
        });

        setReplyToMessageData(replyToMessagesMap);
      } else {
        setReplyToMessageData({}); // Clear if no replies
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    }
  }, [currentThread?.id, currentWorkspaceId]); // Added currentWorkspaceId to dependencies


  // Initial data load effect
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Setup message polling when thread is selected
  useEffect(() => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Load messages immediately if a thread is selected
    if (currentThread?.id) { // Removed currentAssignment?.id
      loadMessages(); // Initial fetch
      
      // Set up polling interval
      pollingIntervalRef.current = setInterval(() => {
        loadMessages();
      }, 5000);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentThread?.id, loadMessages]); // This dependency array ensures it re-runs when currentThread or currentAssignment changes, or loadMessages reference changes.


  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // Mark messages as read when thread is selected
  useEffect(() => {
    if (currentThread && currentUser) {
      markThreadAsRead();
    }
  }, [currentThread?.id, currentUser?.email]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const markThreadAsRead = async () => {
    if (!currentThread || !currentUser) return;

    try {
      // Update unread counts
      const updatedUnreadCounts = (currentThread.unread_counts || []).map(uc =>
        uc.user_email === currentUser.email ? { ...uc, unread_count: 0 } : uc
      );

      await db.entities.ConversationThread.update(currentThread.id, {
        unread_counts: updatedUnreadCounts
      });

      // Mark all messages as read
      const threadMessages = messages.filter(m => m.thread_id === currentThread.id);
      for (const msg of threadMessages) {
        const readBy = msg.read_by || [];
        if (!readBy.some(r => r.user_email === currentUser.email)) {
          await db.entities.Message.update(msg.id, {
            read_by: [...readBy, { user_email: currentUser.email, read_at: new Date().toISOString() }]
          });
        }
      }

      loadData(); // Reload threads to update unread counts on sidebar
    } catch (error) {
      console.error("Error marking thread as read:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !currentThread || !currentWorkspaceId) return;

    try {
      const messageData = {
        workspace_id: currentWorkspaceId,
        content: newMessage,
        assignment_id: currentAssignment?.id || null, // Can be null for general chat
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        message_type: "text",
        thread_id: currentThread.id,
        reply_to: replyToMessage?.id || null,
        mentioned_users: extractMentions(newMessage)
      };

      await db.entities.Message.create(messageData);
      setNewMessage("");
      setReplyToMessage(null);

      // Update thread activity and message count
      await db.entities.ConversationThread.update(currentThread.id, {
        last_activity: new Date().toISOString(),
        message_count: (currentThread.message_count || 0) + 1
      });

      loadMessages(); // Reload messages in the current thread
      loadData(); // Reload threads to update sidebar (last_activity, message_count)
      toast.success("Message sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleEditMessage = async (message) => {
    if (!newMessage.trim() || !message) return;

    try {
      const editHistory = message.edit_history || [];
      editHistory.push({
        content: message.content,
        edited_at: new Date().toISOString(),
        edited_by: currentUser.email
      });

      await db.entities.Message.update(message.id, {
        content: newMessage,
        is_edited: true,
        last_edited_at: new Date().toISOString(),
        edit_history: editHistory
      });

      setNewMessage("");
      setEditingMessage(null);
      loadMessages();
      toast.success("Message updated");
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error("Failed to edit message");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await db.entities.Message.delete(messageId);
      loadMessages();
      toast.success("Message deleted");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      await db.entities.Message.update(messageId, {
        is_pinned: !message.is_pinned,
        pinned_by: currentUser.email,
        pinned_at: new Date().toISOString()
      });

      loadMessages();
      toast.success(message.is_pinned ? "Message unpinned" : "Message pinned");
    } catch (error) {
      console.error("Error pinning message:", error);
      toast.error("Failed to pin message");
    }
  };

  const handleBookmarkMessage = async (messageId) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const bookmarkedBy = message.is_bookmarked_by || [];
      const isBookmarked = bookmarkedBy.includes(currentUser.email);

      await db.entities.Message.update(messageId, {
        is_bookmarked_by: isBookmarked
          ? bookmarkedBy.filter(email => email !== currentUser.email)
          : [...bookmarkedBy, currentUser.email]
      });

      loadMessages();
      toast.success(isBookmarked ? "Bookmark removed" : "Message bookmarked");
    } catch (error) {
      console.error("Error bookmarking message:", error);
      toast.error("Failed to bookmark message");
    }
  };

  const handleAddReaction = async (messageId, emoji) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const reactions = message.reactions || [];
      reactions.push({
        emoji,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        timestamp: new Date().toISOString()
      });

      await db.entities.Message.update(messageId, { reactions });
      loadMessages();
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error("Failed to add reaction");
    }
  };

  const handleRemoveReaction = async (messageId, emoji) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const reactions = (message.reactions || []).filter(
        r => !(r.emoji === emoji && r.user_email === currentUser.email)
      );

      await db.entities.Message.update(messageId, { reactions });
      loadMessages();
    } catch (error) {
      console.error("Error removing reaction:", error);
      toast.error("Failed to remove reaction");
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentThread || !currentWorkspaceId) return; // Removed !currentAssignment check

    setUploadingFile(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });

      const messageData = {
        workspace_id: currentWorkspaceId,
        content: `Shared a file: ${file.name}`,
        assignment_id: currentAssignment?.id || null, // Can be null for general chat
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        message_type: "file",
        thread_id: currentThread.id,
        file_url,
        file_name: file.name
      };

      await db.entities.Message.create(messageData);
      loadMessages();
      toast.success("File uploaded");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // File drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;

    if (dragCounter.current === 0) {
      setIsDraggingFile(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0 && currentThread) {
      const file = files[0]; // Handle first file
      await handleFileUploadFromDrop(file);
    }
  };

  const handleFileUploadFromDrop = async (file) => {
    if (!currentThread || !currentUser || !currentWorkspaceId) return; // Removed !currentAssignment check

    setUploadingFile(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });

      const messageData = {
        workspace_id: currentWorkspaceId,
        content: `Shared a file: ${file.name}`,
        assignment_id: currentAssignment?.id || null, // Can be null for general chat
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        message_type: "file",
        thread_id: currentThread.id,
        file_url,
        file_name: file.name
      };

      await db.entities.Message.create(messageData);
      loadMessages();
      toast.success("File uploaded");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  // Track if we've already marked user as typing to avoid repeated broadcasts
  const isTypingRef = useRef(false);

  // Setup Supabase real-time channel for typing indicators
  useEffect(() => {
    if (!currentThread?.id || !currentUser) {
      setTypingUsers([]);
      return;
    }

    const channelName = `typing:${currentThread.id}`;

    // Create a Supabase Realtime channel for this thread
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUser.email,
        },
      },
    });

    // Handle presence sync (get all currently typing users)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = Object.values(state).flat().filter(
        (user) => user.email !== currentUser.email && user.isTyping
      );
      setTypingUsers(users);
    });

    // Handle presence join/leave
    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      setTypingUsers(prev => {
        const newUsers = newPresences.filter(
          p => p.email !== currentUser.email && p.isTyping
        );
        return [...prev.filter(u => !newUsers.find(n => n.email === u.email)), ...newUsers];
      });
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      setTypingUsers(prev =>
        prev.filter(u => !leftPresences.find(l => l.email === u.email))
      );
    });

    // Subscribe to the channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        typingChannelRef.current = channel;
      }
    });

    // Cleanup on unmount or thread change
    return () => {
      if (typingChannelRef.current) {
        typingChannelRef.current.unsubscribe();
        typingChannelRef.current = null;
      }
      setTypingUsers([]);
    };
  }, [currentThread?.id, currentUser?.email]);

  const handleTyping = useCallback(() => {
    if (!currentThread || !currentUser || !typingChannelRef.current) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Only broadcast if not already marked as typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      // Broadcast typing status via Supabase Presence
      typingChannelRef.current.track({
        email: currentUser.email,
        name: currentUser.full_name,
        isTyping: true,
      });
    }

    // Set timeout to clear typing status after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      if (typingChannelRef.current) {
        typingChannelRef.current.track({
          email: currentUser.email,
          name: currentUser.full_name,
          isTyping: false,
        });
      }
    }, 3000);
  }, [currentThread?.id, currentUser?.email, currentUser?.full_name]);

  const extractMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];

    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedUser = users.find(m =>
        m.full_name?.toLowerCase().includes(match[1].toLowerCase())
      );
      if (mentionedUser) {
        mentions.push(mentionedUser.email);
      }
    }

    return mentions;
  };

  const handleContextSelect = (contextValue) => {
    // contextValue can be "general", a project object, or an assignment object
    if (contextValue === "general") {
      setSelectedContextId("general");
    } else if (contextValue.type === "project") {
      setSelectedContextId(`project:${contextValue.id}`);
    } else if (contextValue.type === "assignment" || contextValue.name) {
      // Assignment objects don't have a 'type' field, so we check for 'name'
      setSelectedContextId(`assignment:${contextValue.id}`);
    }
    setCurrentThread(null); // Clear selected thread when context changes
  };

  const handleThreadSelect = (thread) => {
    setCurrentThread(thread); // Set the full thread object
    setReplyToMessage(null);
    setEditingMessage(null);
  };

  const handleNewThread = async (topic, description) => {
    if (!currentUser) {
      toast.error("Unable to create thread: User not logged in");
      return;
    }
    if (!currentWorkspaceId) {
      toast.error("Unable to create thread: No workspace selected");
      return;
    }

    try {
      // Build thread data with all required fields
      const threadData = {
        workspace_id: currentWorkspaceId,
        name: topic,
        description: description || null,
        assignment_id: contextType === "assignment" ? selectedContextId.replace("assignment:", "") : null,
        project_id: contextType === "project" ? selectedContextId.replace("project:", "") : null,
        status: 'active',
        last_activity: new Date().toISOString(),
        message_count: 0,
        is_pinned: false,
        participants: [currentUser.email],
        created_by: currentUser.email,
      };

      console.log("Creating thread with data:", threadData);
      const newThread = await db.entities.ConversationThread.create(threadData);
      console.log("Thread created successfully:", newThread);

      if (!newThread) {
        throw new Error("Thread creation returned no data");
      }

      await loadData(); // Reload threads to update sidebar
      setCurrentThread(newThread); // Set the newly created thread as current
      setIsThreadFormOpen(false);
      setNewThreadTopic("");
      setNewThreadDescription("");
      toast.success("Thread created successfully!");
    } catch (error) {
      console.error("Error creating thread:", error);
      const errorMessage = error?.message || error?.details || "Unknown error occurred";
      toast.error(`Failed to create thread: ${errorMessage}`);
    }
  };

  const handlePinThread = async (thread) => {
    try {
      await db.entities.ConversationThread.update(thread.id, {
        is_pinned: !thread.is_pinned,
        pinned_by: currentUser.email,
        pinned_at: new Date().toISOString()
      });
      loadData(); // Reload threads to update sidebar
      toast.success(thread.is_pinned ? "Thread unpinned" : "Thread pinned");
    } catch (error) {
      console.error("Error pinning thread:", error);
      toast.error("Failed to pin thread");
    }
  };

  const handleArchiveThread = async (thread) => {
    try {
      await db.entities.ConversationThread.update(thread.id, {
        status: thread.status === 'archived' ? 'active' : 'archived'
      });
      loadData(); // Reload threads to update sidebar
      toast.success(thread.status === 'archived' ? "Thread restored" : "Thread archived");
    } catch (error) {
      console.error("Error archiving thread:", error);
      toast.error("Failed to archive thread");
    }
  };

  const handleNewThreadSubmit = (e) => {
    e.preventDefault();
    if (newThreadTopic.trim()) {
      handleNewThread(newThreadTopic, newThreadDescription);
    }
  };

  const currentThreadMessages = currentThread
    ? messages.filter((m) => m.thread_id === currentThread.id)
    : [];

  const pinnedMessages = currentThreadMessages.filter(m => m.is_pinned);
  const regularMessages = currentThreadMessages.filter(m => !m.is_pinned);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="h-96 bg-gray-200 rounded-xl"></div>
            <div className="lg:col-span-3 h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-12rem)]">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-6 rounded-lg border border-indigo-100 dark:border-indigo-900/50 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              Team Chat
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Collaborate and communicate with your team
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentThread && (
              <ChatSummaryButton
                messages={currentThreadMessages}
                threadTopic={currentThread.topic}
                assignment_id={currentAssignment?.id}
                className="rounded-lg shadow-sm"
              />
            )}
            <Button
              variant="outline"
              onClick={() => setIsThreadFormOpen(true)}
              className="rounded-lg border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              // disabled={!currentAssignment} // Removed this disability, can create general thread
            >
              <Plus className="w-4 h-4 mr-2" />
              New Thread
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100%-120px)]">
        {/* Enhanced Conversation Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full shadow-md border-0 bg-white/80 dark:bg-gray-900/80 rounded-lg overflow-hidden">
            <ConversationSidebar
              currentUser={currentUser}
              assignments={assignments}
              projects={projects}
              selectedAssignment={currentAssignment}
              selectedProject={currentProject}
              selectedContextId={selectedContextId}
              onContextSelect={handleContextSelect}
              threads={threads}
              selectedThread={currentThread}
              onThreadSelect={handleThreadSelect}
              onNewThread={() => setIsThreadFormOpen(true)}
              onPinThread={handlePinThread}
              onArchiveThread={handleArchiveThread}
            />
          </Card>
        </div>

        {/* Enhanced Chat Area */}
        <div className="lg:col-span-3 flex flex-col h-full">
          <Card className="flex-1 flex flex-col shadow-md border-0 bg-white/80 dark:bg-gray-900/80 rounded-lg overflow-hidden">
            {currentThread ? (
              <>
                {/* Thread Header */}
                <CardHeader className="border-b bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Hash className="w-5 h-5 text-indigo-500" />
                        {currentThread.name || currentThread.topic}
                        {!currentThread.assignment_id && !currentThread.project_id && (
                          <Badge variant="outline" className="text-sm font-normal bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                            General Workspace Chat
                          </Badge>
                        )}
                        {currentThread.project_id && (
                          <Badge variant="outline" className="text-sm font-normal bg-indigo-100/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">
                            <Target className="w-3 h-3 mr-1" />
                            Project
                          </Badge>
                        )}
                        {currentThread.assignment_id && (
                          <Badge variant="outline" className="text-sm font-normal bg-purple-100/50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                            <FolderOpen className="w-3 h-3 mr-1" />
                            Assignment
                          </Badge>
                        )}
                        {currentThread.priority && currentThread.priority !== 'medium' && (
                          <Badge variant="secondary" className="text-sm font-normal">
                            {currentThread.priority}
                          </Badge>
                        )}
                      </CardTitle>
                      {currentThread.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {currentThread.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        title="Search messages"
                      >
                        <Search className="w-4 h-4" />
                      </Button>

                      {pinnedMessages.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                          title="View pinned messages"
                        >
                          <Pin className={`w-4 h-4 ${showPinnedMessages ? 'text-yellow-600' : ''}`} />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMode(viewMode === 'compact' ? 'comfortable' : 'compact')}
                        title="Toggle view density"
                      >
                        {viewMode === 'compact' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePinThread(currentThread)}>
                            <Pin className="w-4 h-4 mr-2" />
                            {currentThread.is_pinned ? 'Unpin' : 'Pin'} Thread
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchiveThread(currentThread)}>
                            <Archive className="w-4 h-4 mr-2" />
                            {currentThread.status === 'archived' ? 'Restore' : 'Archive'} Thread
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Settings className="w-4 h-4 mr-2" />
                            Thread Settings
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Thread Tags */}
                  {currentThread.tags && currentThread.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {currentThread.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Participants */}
                  <div className="flex items-center gap-2 mt-3">
                    <Users className="w-4 h-4 text-gray-500" />
                    <div className="flex -space-x-2">
                      {currentThread.participants?.slice(0, 5).map((participantEmail, idx) => {
                        const member = users.find(m => m.email === participantEmail);
                        return (
                          <Avatar key={idx} className="w-6 h-6 border-2 border-white dark:border-gray-800">
                            <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                              {member?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })}
                      {currentThread.participants && currentThread.participants.length > 5 && (
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            +{currentThread.participants.length - 5}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Search Section */}
                {isSearchOpen && (
                  <ThreadSearch
                    messages={currentThreadMessages}
                    onResultClick={(msg) => {
                      const messageElement = document.getElementById(`message-${msg.id}`);
                      messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    onClose={() => setIsSearchOpen(false)}
                  />
                )}

                {/* Pinned Messages Section */}
                {showPinnedMessages && pinnedMessages.length > 0 && (
                  <div className="border-b bg-yellow-50 dark:bg-yellow-900/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Pin className="w-4 h-4 text-yellow-600" />
                        Pinned Messages ({pinnedMessages.length})
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPinnedMessages(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {pinnedMessages.map((msg) => (
                        <div key={msg.id} className="p-2 bg-white dark:bg-gray-800 rounded-lg text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">{msg.author_name}</div>
                          <div className="text-gray-700 dark:text-gray-300 line-clamp-2">{msg.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages Area with Drag & Drop */}
                <CardContent
                  ref={messageListRef}
                  className={`flex-1 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white/50 dark:from-gray-900/50 dark:to-gray-800/50 relative ${
                    viewMode === 'compact' ? 'p-2' : 'p-6'
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Drag Overlay */}
                  {isDraggingFile && (
                    <div className="absolute inset-0 bg-indigo-50/90 dark:bg-indigo-900/90 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-dashed border-indigo-400 dark:border-indigo-600 rounded-lg">
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                          <File className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                          Drop file to upload
                        </h3>
                        <p className="text-indigo-700 dark:text-indigo-300">
                          Release to share in this thread
                        </p>
                      </div>
                    </div>
                  )}

                  {currentThreadMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Start the conversation
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Be the first to send a message in this thread
                        </p>
                      </div>
                    </div>
                  ) : (
                    <VirtualizedMessageList
                      messages={regularMessages}
                      currentUser={currentUser}
                      replyToMessageData={replyToMessageData}
                      viewMode={viewMode}
                      onReply={(msg) => setReplyToMessage(msg)}
                      onEdit={(msg) => {
                        setEditingMessage(msg);
                        setNewMessage(msg.content);
                      }}
                      onDelete={handleDeleteMessage}
                      onPin={handlePinMessage}
                      onBookmark={handleBookmarkMessage}
                      onAddReaction={handleAddReaction}
                      onRemoveReaction={handleRemoveReaction}
                    />
                  )}
                  <div ref={messagesEndRef} />

                  {/* Typing Indicator - Real-time via Supabase Presence */}
                  {typingUsers.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span>
                        {typingUsers.length === 1
                          ? `${typingUsers[0].name} is typing...`
                          : typingUsers.length === 2
                            ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
                            : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`
                        }
                      </span>
                    </div>
                  )}
                </CardContent>

                {/* Reply Context Banner */}
                {replyToMessage && (
                  <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Reply className="w-4 h-4 text-indigo-600" />
                      <span className="text-gray-700 dark:text-gray-300">
                        Replying to <strong>{replyToMessage.author_name}</strong>
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setReplyToMessage(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Edit Context Banner */}
                {editingMessage && (
                  <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Edit className="w-4 h-4 text-yellow-600" />
                      <span className="text-gray-700 dark:text-gray-300">
                        Editing message
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditingMessage(null);
                        setNewMessage("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Message Input with Drag & Drop Hint */}
                <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <RichTextEditor
                        value={newMessage}
                        onChange={(value) => {
                          setNewMessage(value);
                          handleTyping();
                        }}
                        onSend={editingMessage ? () => handleEditMessage(editingMessage) : handleSendMessage}
                        onFileAttach={() => fileInputRef.current?.click()}
                        placeholder={`Message ${currentThread.name || currentThread.topic}... (or drag & drop files)`}
                        teamMembers={users}
                        disabled={!currentThread}
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                    <Button
                      onClick={editingMessage ? () => handleEditMessage(editingMessage) : handleSendMessage}
                      disabled={!newMessage.trim() || !currentThread || uploadingFile}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md h-12 px-6"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 flex items-center justify-center">
                    <MessageSquare className="w-12 h-12 text-indigo-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Select a conversation
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Choose a thread from the sidebar or start a new conversation
                  </p>
                  <Button
                    onClick={() => setIsThreadFormOpen(true)}
                    // disabled={!currentAssignment} // Removed this disability, can create general thread
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg shadow-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Start New Thread
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* No Assignment Selected Message (only if no assignments exist AND we're not in general chat) */}
      {selectedContextId !== "general" && !currentAssignment && !currentProject && assignments.length === 0 && projects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No assignments available for chat
          </h3>
          <p className="text-base text-gray-500 dark:text-gray-400">
            Create an assignment first to start team conversations
          </p>
        </div>
      )}

      {/* Create Thread Dialog */}
      <Dialog open={isThreadFormOpen} onOpenChange={setIsThreadFormOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-lg shadow-lg border-0 bg-white/80 dark:bg-gray-900/80">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Start New Thread</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {selectedContextId === "general"
                ? "Create a new general workspace conversation thread."
                : currentProject
                  ? "Create a new conversation thread for the selected project."
                  : "Create a new conversation thread for the selected assignment."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNewThreadSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="threadTopic" className="text-right text-gray-700 dark:text-gray-300">
                  Topic
                </Label>
                <Input
                  id="threadTopic"
                  value={newThreadTopic}
                  onChange={(e) => setNewThreadTopic(e.target.value)}
                  className="col-span-3 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                  placeholder="e.g., Q3 Marketing Campaign Brainstorm"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="threadDescription" className="text-right text-gray-700 dark:text-gray-300">
                  Description
                </Label>
                <Textarea
                  id="threadDescription"
                  value={newThreadDescription}
                  onChange={(e) => setNewThreadDescription(e.target.value)}
                  className="col-span-3 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                  placeholder="Optional: Briefly describe the thread's purpose"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsThreadFormOpen(false)}
                className="rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newThreadTopic.trim() || !currentUser || !currentWorkspaceId}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Thread
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
