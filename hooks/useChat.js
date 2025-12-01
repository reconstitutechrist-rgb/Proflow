import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { db } from "@/api/db";
import { supabase } from "@/api/supabaseClient";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { toast } from "sonner";

export function useChat() {
  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedContextId, setSelectedContextId] = useState("general");
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
  const dragCounter = useRef(0);
  const pollingIntervalRef = useRef(null);
  const typingChannelRef = useRef(null);
  const isTypingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const currentUserRef = useRef(null);

  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  // Derived state
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

  const currentThreadMessages = currentThread
    ? messages.filter((m) => m.thread_id === currentThread.id)
    : [];

  const pinnedMessages = currentThreadMessages.filter(m => m.is_pinned);
  const regularMessages = currentThreadMessages.filter(m => !m.is_pinned);

  // Load initial data
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!currentWorkspaceId || workspaceLoading) {
      if (!currentWorkspaceId) {
        setAssignments([]);
        setProjects([]);
        setUsers([]);
        setThreads([]);
        setCurrentUser(null);
        currentUserRef.current = null;
        setSelectedContextId("general");
        setCurrentThread(null);
        setLoading(false);
        initialLoadDoneRef.current = false;
      }
      return;
    }

    // Skip if already loaded unless force refresh
    if (initialLoadDoneRef.current && !forceRefresh) {
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
      currentUserRef.current = user;

      // Use functional updates to avoid depending on current state
      setSelectedContextId(prevContextId => {
        let newSelectedContextId = prevContextId || "general";

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

        return newSelectedContextId;
      });

      setCurrentThread(prevThread => {
        // Get current selectedContextId for thread selection
        let contextId = "general";
        setSelectedContextId(current => {
          contextId = current;
          return current;
        });

        if (prevThread && threadsData.some(t => t.id === prevThread.id)) {
          return prevThread;
        }

        if (contextId === "general") {
          return threadsData.find(t => !t.assignment_id && !t.project_id) || null;
        } else if (contextId.startsWith("project:")) {
          const projectId = contextId.replace("project:", "");
          return threadsData.find(t => t.project_id === projectId) || null;
        } else if (contextId.startsWith("assignment:")) {
          const assignmentId = contextId.replace("assignment:", "");
          return threadsData.find(t => t.assignment_id === assignmentId) || null;
        }
        return null;
      });

      initialLoadDoneRef.current = true;
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load initial data");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, workspaceLoading]);

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

      const replyToIds = threadMessages
        .filter(m => m.reply_to)
        .map(m => m.reply_to);

      if (replyToIds.length > 0) {
        const uniqueReplyToIds = [...new Set(replyToIds)];
        const replyToMessagesMap = {};

        const fetchedReplyToMessages = await Promise.all(
          uniqueReplyToIds.map(async (id) => {
            try {
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
        setReplyToMessageData({});
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    }
  }, [currentThread?.id, currentWorkspaceId]);

  // Effects - Initial load when workspace changes
  useEffect(() => {
    initialLoadDoneRef.current = false;
    loadData();
  }, [currentWorkspaceId, workspaceLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (currentThread?.id) {
      loadMessages();
      pollingIntervalRef.current = setInterval(() => {
        loadMessages();
      }, 5000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentThread?.id, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (currentThread && currentUser) {
      markThreadAsRead();
    }
  }, [currentThread?.id, currentUser?.email]);

  // Typing indicator setup
  useEffect(() => {
    if (!currentThread?.id || !currentUser) {
      setTypingUsers([]);
      return;
    }

    const channelName = `typing:${currentThread.id}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUser.email,
        },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = Object.values(state).flat().filter(
        (user) => user.email !== currentUser.email && user.isTyping
      );
      setTypingUsers(users);
    });

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

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        typingChannelRef.current = channel;
      }
    });

    return () => {
      if (typingChannelRef.current) {
        typingChannelRef.current.unsubscribe();
        typingChannelRef.current = null;
      }
      setTypingUsers([]);
    };
  }, [currentThread?.id, currentUser?.email]);

  // Handlers
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const markThreadAsRead = async () => {
    if (!currentThread || !currentUser) return;

    try {
      const updatedUnreadCounts = (currentThread.unread_counts || []).map(uc =>
        uc.user_email === currentUser.email ? { ...uc, unread_count: 0 } : uc
      );

      await db.entities.ConversationThread.update(currentThread.id, {
        unread_counts: updatedUnreadCounts
      });

      const threadMessages = messages.filter(m => m.thread_id === currentThread.id);
      for (const msg of threadMessages) {
        const readBy = msg.read_by || [];
        if (!readBy.some(r => r.user_email === currentUser.email)) {
          await db.entities.Message.update(msg.id, {
            read_by: [...readBy, { user_email: currentUser.email, read_at: new Date().toISOString() }]
          });
        }
      }

      loadData(true);
    } catch (error) {
      console.error("Error marking thread as read:", error);
    }
  };

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !currentThread || !currentWorkspaceId) return;

    try {
      const messageData = {
        workspace_id: currentWorkspaceId,
        content: newMessage,
        assignment_id: currentAssignment?.id || null,
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

      await db.entities.ConversationThread.update(currentThread.id, {
        last_activity: new Date().toISOString(),
        message_count: (currentThread.message_count || 0) + 1
      });

      loadMessages();
      loadData(true);
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
    if (!file || !currentThread || !currentWorkspaceId) return;

    setUploadingFile(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });

      const messageData = {
        workspace_id: currentWorkspaceId,
        content: `Shared a file: ${file.name}`,
        assignment_id: currentAssignment?.id || null,
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

  const handleFileUploadFromDrop = async (file) => {
    if (!currentThread || !currentUser || !currentWorkspaceId) return;

    setUploadingFile(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });

      const messageData = {
        workspace_id: currentWorkspaceId,
        content: `Shared a file: ${file.name}`,
        assignment_id: currentAssignment?.id || null,
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

  // Drag and drop handlers
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
      const file = files[0];
      await handleFileUploadFromDrop(file);
    }
  };

  const handleTyping = useCallback(() => {
    const user = currentUserRef.current;
    if (!currentThread || !user || !typingChannelRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      typingChannelRef.current.track({
        email: user.email,
        name: user.full_name,
        isTyping: true,
      });
    }

    // Use ref in timeout to avoid stale closure
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      const currentUser = currentUserRef.current;
      if (typingChannelRef.current && currentUser) {
        typingChannelRef.current.track({
          email: currentUser.email,
          name: currentUser.full_name,
          isTyping: false,
        });
      }
    }, 3000);
  }, [currentThread?.id]);

  const handleContextSelect = (contextValue) => {
    if (contextValue === "general") {
      setSelectedContextId("general");
    } else if (contextValue.type === "project") {
      setSelectedContextId(`project:${contextValue.id}`);
    } else if (contextValue.type === "assignment" || contextValue.name) {
      setSelectedContextId(`assignment:${contextValue.id}`);
    }
    setCurrentThread(null);
  };

  const handleThreadSelect = (thread) => {
    setCurrentThread(thread);
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

      const newThread = await db.entities.ConversationThread.create(threadData);

      if (!newThread) {
        throw new Error("Thread creation returned no data");
      }

      await loadData(true);
      setCurrentThread(newThread);
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
      loadData(true);
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
      loadData(true);
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

  return {
    // State
    assignments,
    projects,
    selectedContextId,
    messages,
    threads,
    currentThread,
    currentUser,
    users,
    newMessage,
    loading,
    isThreadFormOpen,
    newThreadTopic,
    newThreadDescription,
    isSearchOpen,
    viewMode,
    replyToMessage,
    editingMessage,
    showPinnedMessages,
    uploadingFile,
    isDraggingFile,
    replyToMessageData,
    typingUsers,

    // Derived
    currentProject,
    currentAssignment,
    contextType,
    currentThreadMessages,
    pinnedMessages,
    regularMessages,

    // Refs
    messagesEndRef,
    messageListRef,
    fileInputRef,

    // Setters
    setSelectedContextId,
    setCurrentThread,
    setNewMessage,
    setIsThreadFormOpen,
    setNewThreadTopic,
    setNewThreadDescription,
    setIsSearchOpen,
    setViewMode,
    setReplyToMessage,
    setEditingMessage,
    setShowPinnedMessages,
    setIsDraggingFile,

    // Handlers
    loadData,
    loadMessages,
    scrollToBottom,
    handleSendMessage,
    handleEditMessage,
    handleDeleteMessage,
    handlePinMessage,
    handleBookmarkMessage,
    handleAddReaction,
    handleRemoveReaction,
    handleFileUpload,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleTyping,
    handleContextSelect,
    handleThreadSelect,
    handleNewThread,
    handlePinThread,
    handleArchiveThread,
    handleNewThreadSubmit,
  };
}
