import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db } from '@/api/db';
import { supabase } from '@/api/supabaseClient';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';

// File upload validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/zip',
  'application/x-rar-compressed',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/webm',
];

// Validate file before upload
const validateFile = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` };
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type) && file.type !== '') {
    return { valid: false, error: `File type "${file.type}" is not allowed` };
  }
  return { valid: true };
};

export function useChat() {
  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedContextId, setSelectedContextId] = useState('general');
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isThreadFormOpen, setIsThreadFormOpen] = useState(false);
  const [newThreadTopic, setNewThreadTopic] = useState('');
  const [newThreadDescription, setNewThreadDescription] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState('comfortable');
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [replyToMessageData, setReplyToMessageData] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);

  // New states for fixing issues
  const [isSending, setIsSending] = useState(false); // Prevent duplicate sends
  const [operationLoading, setOperationLoading] = useState({}); // Track individual operations

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
  const selectedContextIdRef = useRef('general');
  const messageChannelRef = useRef(null); // For real-time message subscriptions
  const subscriptionActiveRef = useRef(false); // Track subscription state for cleanup

  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  // Derived state
  const currentProject = useMemo(() => {
    if (selectedContextId.startsWith('project:')) {
      const projectId = selectedContextId.replace('project:', '');
      return projects.find((p) => p.id === projectId);
    }
    return null;
  }, [selectedContextId, projects]);

  const currentAssignment = useMemo(() => {
    if (selectedContextId.startsWith('assignment:')) {
      const assignmentId = selectedContextId.replace('assignment:', '');
      return assignments.find((a) => a.id === assignmentId);
    }
    return null;
  }, [selectedContextId, assignments]);

  const contextType = useMemo(() => {
    if (selectedContextId === 'general') return 'general';
    if (selectedContextId.startsWith('project:')) return 'project';
    if (selectedContextId.startsWith('assignment:')) return 'assignment';
    return 'general';
  }, [selectedContextId]);

  const currentThreadMessages = currentThread
    ? messages.filter((m) => m.thread_id === currentThread.id)
    : [];

  const pinnedMessages = currentThreadMessages.filter((m) => m.is_pinned);
  const regularMessages = currentThreadMessages.filter((m) => !m.is_pinned);

  // Load initial data
  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!currentWorkspaceId || workspaceLoading) {
        if (!currentWorkspaceId) {
          setAssignments([]);
          setProjects([]);
          setUsers([]);
          setThreads([]);
          setCurrentUser(null);
          currentUserRef.current = null;
          setSelectedContextId('general');
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
          db.entities.ConversationThread.filter(
            { workspace_id: currentWorkspaceId },
            '-last_activity'
          ),
          db.entities.Assignment.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
          db.entities.Project.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
          db.entities.User.list(),
          db.auth.me(),
        ]);

        setAssignments(assignmentsData);
        setProjects(projectsData);
        setUsers(usersData);
        setThreads(threadsData);
        setCurrentUser(user);
        currentUserRef.current = user;

        // Calculate new context ID based on validity
        let newSelectedContextId = selectedContextIdRef.current || 'general';

        if (newSelectedContextId.startsWith('project:')) {
          const projectId = newSelectedContextId.replace('project:', '');
          if (!projectsData.some((p) => p.id === projectId)) {
            newSelectedContextId = 'general';
          }
        } else if (newSelectedContextId.startsWith('assignment:')) {
          const assignmentId = newSelectedContextId.replace('assignment:', '');
          if (!assignmentsData.some((a) => a.id === assignmentId)) {
            newSelectedContextId = 'general';
          }
        }

        // Update both state and ref
        selectedContextIdRef.current = newSelectedContextId;
        setSelectedContextId(newSelectedContextId);

        // Calculate thread selection using the ref (guaranteed current value)
        setCurrentThread((prevThread) => {
          if (prevThread && threadsData.some((t) => t.id === prevThread.id)) {
            return prevThread;
          }

          const contextId = selectedContextIdRef.current;
          if (contextId === 'general') {
            return threadsData.find((t) => !t.assignment_id && !t.project_id) || null;
          } else if (contextId.startsWith('project:')) {
            const projectId = contextId.replace('project:', '');
            return threadsData.find((t) => t.project_id === projectId) || null;
          } else if (contextId.startsWith('assignment:')) {
            const assignmentId = contextId.replace('assignment:', '');
            return threadsData.find((t) => t.assignment_id === assignmentId) || null;
          }
          return null;
        });

        initialLoadDoneRef.current = true;
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    },
    [currentWorkspaceId, workspaceLoading]
  );

  // Load messages for current thread
  const loadMessages = useCallback(async () => {
    if (!currentThread?.id || !currentWorkspaceId) {
      setMessages([]);
      setReplyToMessageData({});
      return;
    }

    try {
      const threadMessages = await db.entities.Message.filter(
        {
          workspace_id: currentWorkspaceId,
          thread_id: currentThread.id,
        },
        'created_date'
      );

      setMessages(threadMessages);

      const replyToIds = threadMessages.filter((m) => m.reply_to).map((m) => m.reply_to);

      if (replyToIds.length > 0) {
        const uniqueReplyToIds = [...new Set(replyToIds)];
        const replyToMessagesMap = {};

        const fetchedReplyToMessages = await Promise.all(
          uniqueReplyToIds.map(async (id) => {
            try {
              const messages = await db.entities.Message.filter({ id: id }, 'created_date', 1);
              return messages.length > 0 ? { id: id, message: messages[0] } : null;
            } catch (error) {
              console.error(`Error loading reply-to message ${id}:`, error);
              return null;
            }
          })
        );

        fetchedReplyToMessages.forEach((item) => {
          if (item) {
            replyToMessagesMap[item.id] = item.message;
          }
        });

        setReplyToMessageData(replyToMessagesMap);
      } else {
        setReplyToMessageData({});
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  }, [currentThread?.id, currentWorkspaceId]);

  // Effects - Initial load when workspace changes
  useEffect(() => {
    initialLoadDoneRef.current = false;
    loadData();
  }, [currentWorkspaceId, workspaceLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time message subscription + fallback polling
  useEffect(() => {
    // Clear previous subscriptions and polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (messageChannelRef.current) {
      messageChannelRef.current.unsubscribe();
      messageChannelRef.current = null;
    }
    subscriptionActiveRef.current = false;

    if (!currentThread?.id || !currentWorkspaceId) {
      return;
    }

    // Initial load
    loadMessages();

    // Set up real-time subscription for messages
    const channelName = `messages:${currentThread.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${currentThread.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Check if this message isn't already in state (avoid duplicates from optimistic updates)
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          subscriptionActiveRef.current = true;
          messageChannelRef.current = channel;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Fallback to polling if real-time fails
          console.warn('Real-time subscription failed, falling back to polling');
          subscriptionActiveRef.current = false;
          if (!pollingIntervalRef.current) {
            pollingIntervalRef.current = setInterval(() => {
              loadMessages();
            }, 5000);
          }
        }
      });

    // Set up fallback polling as backup (less frequent when realtime is active)
    pollingIntervalRef.current = setInterval(() => {
      if (!subscriptionActiveRef.current) {
        loadMessages();
      }
    }, 15000); // Less frequent fallback polling

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (messageChannelRef.current) {
        messageChannelRef.current.unsubscribe();
        messageChannelRef.current = null;
      }
      subscriptionActiveRef.current = false;
    };
  }, [currentThread?.id, currentWorkspaceId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (currentThread && currentUser) {
      markThreadAsRead();
    }
  }, [currentThread?.id, currentUser?.email]);

  // Typing indicator setup with proper cleanup
  useEffect(() => {
    if (!currentThread?.id || !currentUser) {
      setTypingUsers([]);
      return;
    }

    let isMounted = true;
    let channel = null;

    const channelName = `typing:${currentThread.id}`;

    channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUser.email,
        },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      if (!isMounted) return;
      const state = channel.presenceState();
      const users = Object.values(state)
        .flat()
        .filter((user) => user.email !== currentUser.email && user.isTyping);
      setTypingUsers(users);
    });

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      if (!isMounted) return;
      setTypingUsers((prev) => {
        const newUsers = newPresences.filter((p) => p.email !== currentUser.email && p.isTyping);
        return [...prev.filter((u) => !newUsers.find((n) => n.email === u.email)), ...newUsers];
      });
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      if (!isMounted) return;
      setTypingUsers((prev) => prev.filter((u) => !leftPresences.find((l) => l.email === u.email)));
    });

    channel.subscribe((status) => {
      if (!isMounted) return;
      if (status === 'SUBSCRIBED') {
        typingChannelRef.current = channel;
      }
    });

    return () => {
      isMounted = false;
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      // Unsubscribe from channel
      if (channel) {
        channel.unsubscribe();
      }
      typingChannelRef.current = null;
      setTypingUsers([]);
    };
  }, [currentThread?.id, currentUser?.email]);

  // Handlers
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markThreadAsRead = async () => {
    if (!currentThread || !currentUser) return;

    try {
      // Update thread unread count
      const updatedUnreadCounts = (currentThread.unread_counts || []).map((uc) =>
        uc.user_email === currentUser.email ? { ...uc, unread_count: 0 } : uc
      );

      // Batch all updates into a single Promise.all to avoid race conditions
      const threadMessages = messages.filter((m) => m.thread_id === currentThread.id);
      const unreadMessages = threadMessages.filter((msg) => {
        const readBy = msg.read_by || [];
        return !readBy.some((r) => r.user_email === currentUser.email);
      });

      const readAt = new Date().toISOString();
      const readByUpdate = { user_email: currentUser.email, read_at: readAt };

      // Execute all updates in parallel for better performance
      await Promise.all([
        db.entities.ConversationThread.update(currentThread.id, {
          unread_counts: updatedUnreadCounts,
        }),
        ...unreadMessages.map((msg) =>
          db.entities.Message.update(msg.id, {
            read_by: [...(msg.read_by || []), readByUpdate],
          })
        ),
      ]);

      // Only refresh if there were updates
      if (unreadMessages.length > 0) {
        loadData(true);
      }
    } catch (error) {
      console.error('Error marking thread as read:', error);
    }
  };

  const extractMentions = (text) => {
    // Match @word or @"full name" or @[full name] patterns
    const mentionRegex = /@(?:"([^"]+)"|'([^']+)'|\[([^\]]+)\]|(\w+))/g;
    const mentions = [];
    const addedEmails = new Set();

    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      // Get the captured name from any of the groups
      const mentionName = match[1] || match[2] || match[3] || match[4];
      if (!mentionName) continue;

      const mentionLower = mentionName.toLowerCase();

      // Try to find exact match first
      let mentionedUser = users.find((m) => m.full_name?.toLowerCase() === mentionLower);

      // If no exact match, try partial match (first name or last name)
      if (!mentionedUser) {
        mentionedUser = users.find((m) => {
          const fullName = m.full_name?.toLowerCase() || '';
          const nameParts = fullName.split(' ');
          return nameParts.some((part) => part === mentionLower) || fullName.includes(mentionLower);
        });
      }

      if (mentionedUser && !addedEmails.has(mentionedUser.email)) {
        mentions.push(mentionedUser.email);
        addedEmails.add(mentionedUser.email);
      }
    }

    return mentions;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !currentThread || !currentWorkspaceId) return;
    if (isSending) return; // Prevent duplicate sends

    const messageContent = newMessage;
    const replyTo = replyToMessage;

    // Optimistically clear input immediately for better UX
    setNewMessage('');
    setReplyToMessage(null);
    setIsSending(true);

    try {
      const messageData = {
        workspace_id: currentWorkspaceId,
        content: messageContent,
        assignment_id: currentAssignment?.id || null,
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        message_type: 'text',
        thread_id: currentThread.id,
        reply_to: replyTo?.id || null,
        mentioned_users: extractMentions(messageContent),
      };

      const createdMessage = await db.entities.Message.create(messageData);

      if (!createdMessage) {
        throw new Error('Message creation returned no data');
      }

      // Optimistically add message to local state instead of full reload
      setMessages((prev) => [...prev, createdMessage]);

      // Update thread metadata (use current count from server to avoid race)
      await db.entities.ConversationThread.update(currentThread.id, {
        last_activity: new Date().toISOString(),
        message_count: (currentThread.message_count || 0) + 1,
      });

      // Only reload threads, not everything
      const threadsData = await db.entities.ConversationThread.filter(
        { workspace_id: currentWorkspaceId },
        '-last_activity'
      );
      setThreads(threadsData);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      // Rollback: restore the message to the input
      setNewMessage(messageContent);
      if (replyTo) setReplyToMessage(replyTo);
    } finally {
      setIsSending(false);
    }
  };

  const handleEditMessage = async (message) => {
    if (!newMessage.trim() || !message) return;
    if (!currentUser) return;

    setOperationLoading((prev) => ({ ...prev, [`edit-${message.id}`]: true }));

    try {
      const editHistory = message.edit_history || [];
      editHistory.push({
        content: message.content,
        edited_at: new Date().toISOString(),
        edited_by: currentUser.email,
      });

      await db.entities.Message.update(message.id, {
        content: newMessage,
        is_edited: true,
        last_edited_at: new Date().toISOString(),
        edit_history: editHistory,
      });

      // Optimistically update local state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                content: newMessage,
                is_edited: true,
                last_edited_at: new Date().toISOString(),
              }
            : m
        )
      );

      setNewMessage('');
      setEditingMessage(null);
      toast.success('Message updated');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
    } finally {
      setOperationLoading((prev) => ({ ...prev, [`edit-${message.id}`]: false }));
    }
  };

  const handleDeleteMessage = async (messageId) => {
    setOperationLoading((prev) => ({ ...prev, [`delete-${messageId}`]: true }));

    // Store for potential rollback
    const deletedMessage = messages.find((m) => m.id === messageId);

    // Optimistic update
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      await db.entities.Message.delete(messageId);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
      // Rollback
      if (deletedMessage) {
        setMessages((prev) =>
          [...prev, deletedMessage].sort(
            (a, b) => new Date(a.created_date) - new Date(b.created_date)
          )
        );
      }
    } finally {
      setOperationLoading((prev) => ({ ...prev, [`delete-${messageId}`]: false }));
    }
  };

  const handlePinMessage = async (messageId) => {
    if (!currentUser) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    setOperationLoading((prev) => ({ ...prev, [`pin-${messageId}`]: true }));

    const newPinState = !message.is_pinned;

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              is_pinned: newPinState,
              pinned_by: currentUser.email,
              pinned_at: new Date().toISOString(),
            }
          : m
      )
    );

    try {
      await db.entities.Message.update(messageId, {
        is_pinned: newPinState,
        pinned_by: currentUser.email,
        pinned_at: new Date().toISOString(),
      });

      toast.success(message.is_pinned ? 'Message unpinned' : 'Message pinned');
    } catch (error) {
      console.error('Error pinning message:', error);
      toast.error('Failed to pin message');
      // Rollback
      setMessages((prev) => prev.map((m) => (m.id === messageId ? message : m)));
    } finally {
      setOperationLoading((prev) => ({ ...prev, [`pin-${messageId}`]: false }));
    }
  };

  const handleBookmarkMessage = async (messageId) => {
    if (!currentUser) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    setOperationLoading((prev) => ({ ...prev, [`bookmark-${messageId}`]: true }));

    const bookmarkedBy = message.is_bookmarked_by || [];
    const isBookmarked = bookmarkedBy.includes(currentUser.email);
    const newBookmarkedBy = isBookmarked
      ? bookmarkedBy.filter((email) => email !== currentUser.email)
      : [...bookmarkedBy, currentUser.email];

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_bookmarked_by: newBookmarkedBy } : m))
    );

    try {
      await db.entities.Message.update(messageId, {
        is_bookmarked_by: newBookmarkedBy,
      });

      toast.success(isBookmarked ? 'Bookmark removed' : 'Message bookmarked');
    } catch (error) {
      console.error('Error bookmarking message:', error);
      toast.error('Failed to bookmark message');
      // Rollback
      setMessages((prev) => prev.map((m) => (m.id === messageId ? message : m)));
    } finally {
      setOperationLoading((prev) => ({ ...prev, [`bookmark-${messageId}`]: false }));
    }
  };

  const handleAddReaction = async (messageId, emoji) => {
    if (!currentUser) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const newReaction = {
      emoji,
      user_email: currentUser.email,
      user_name: currentUser.full_name,
      timestamp: new Date().toISOString(),
    };
    const newReactions = [...(message.reactions || []), newReaction];

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions: newReactions } : m))
    );

    try {
      await db.entities.Message.update(messageId, { reactions: newReactions });
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Failed to add reaction');
      // Rollback
      setMessages((prev) => prev.map((m) => (m.id === messageId ? message : m)));
    }
  };

  const handleRemoveReaction = async (messageId, emoji) => {
    if (!currentUser) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const newReactions = (message.reactions || []).filter(
      (r) => !(r.emoji === emoji && r.user_email === currentUser.email)
    );

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions: newReactions } : m))
    );

    try {
      await db.entities.Message.update(messageId, { reactions: newReactions });
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast.error('Failed to remove reaction');
      // Rollback
      setMessages((prev) => prev.map((m) => (m.id === messageId ? message : m)));
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentThread || !currentWorkspaceId || !currentUser) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploadingFile(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });

      const messageData = {
        workspace_id: currentWorkspaceId,
        content: `Shared a file: ${file.name}`,
        assignment_id: currentAssignment?.id || null,
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        message_type: 'file',
        thread_id: currentThread.id,
        file_url,
        file_name: file.name,
      };

      const createdMessage = await db.entities.Message.create(messageData);

      // Optimistic update
      if (createdMessage) {
        setMessages((prev) => [...prev, createdMessage]);
      }

      toast.success('File uploaded');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileUploadFromDrop = async (file) => {
    if (!currentThread || !currentUser || !currentWorkspaceId) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setUploadingFile(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });

      const messageData = {
        workspace_id: currentWorkspaceId,
        content: `Shared a file: ${file.name}`,
        assignment_id: currentAssignment?.id || null,
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        message_type: 'file',
        thread_id: currentThread.id,
        file_url,
        file_name: file.name,
      };

      const createdMessage = await db.entities.Message.create(messageData);

      // Optimistic update
      if (createdMessage) {
        setMessages((prev) => [...prev, createdMessage]);
      }

      toast.success('File uploaded');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
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
    let newContextId;
    if (contextValue === 'general') {
      newContextId = 'general';
    } else if (contextValue.type === 'project') {
      newContextId = `project:${contextValue.id}`;
    } else if (contextValue.type === 'assignment' || contextValue.name) {
      newContextId = `assignment:${contextValue.id}`;
    } else {
      newContextId = 'general';
    }
    // Keep ref in sync with state
    selectedContextIdRef.current = newContextId;
    setSelectedContextId(newContextId);
    setCurrentThread(null);
  };

  const handleThreadSelect = (thread) => {
    setCurrentThread(thread);
    setReplyToMessage(null);
    setEditingMessage(null);
  };

  const handleNewThread = async (topic, description) => {
    if (!currentUser) {
      toast.error('Unable to create thread: User not logged in');
      return;
    }
    if (!currentWorkspaceId) {
      toast.error('Unable to create thread: No workspace selected');
      return;
    }

    try {
      const threadData = {
        workspace_id: currentWorkspaceId,
        name: topic,
        description: description || null,
        assignment_id:
          contextType === 'assignment' ? selectedContextId.replace('assignment:', '') : null,
        project_id: contextType === 'project' ? selectedContextId.replace('project:', '') : null,
        status: 'active',
        last_activity: new Date().toISOString(),
        message_count: 0,
        is_pinned: false,
        participants: [currentUser.email],
        created_by: currentUser.email,
      };

      const newThread = await db.entities.ConversationThread.create(threadData);

      if (!newThread) {
        throw new Error('Thread creation returned no data');
      }

      await loadData(true);
      setCurrentThread(newThread);
      setIsThreadFormOpen(false);
      setNewThreadTopic('');
      setNewThreadDescription('');
      toast.success('Thread created successfully!');
    } catch (error) {
      console.error('Error creating thread:', error);
      const errorMessage = error?.message || error?.details || 'Unknown error occurred';
      toast.error(`Failed to create thread: ${errorMessage}`);
    }
  };

  const handlePinThread = async (thread) => {
    try {
      await db.entities.ConversationThread.update(thread.id, {
        is_pinned: !thread.is_pinned,
        pinned_by: currentUser.email,
        pinned_at: new Date().toISOString(),
      });
      loadData(true);
      toast.success(thread.is_pinned ? 'Thread unpinned' : 'Thread pinned');
    } catch (error) {
      console.error('Error pinning thread:', error);
      toast.error('Failed to pin thread');
    }
  };

  const handleArchiveThread = async (thread) => {
    try {
      await db.entities.ConversationThread.update(thread.id, {
        status: thread.status === 'archived' ? 'active' : 'archived',
      });
      loadData(true);
      toast.success(thread.status === 'archived' ? 'Thread restored' : 'Thread archived');
    } catch (error) {
      console.error('Error archiving thread:', error);
      toast.error('Failed to archive thread');
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
    isSending, // New: prevent duplicate sends
    operationLoading, // New: track individual operation loading states

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
