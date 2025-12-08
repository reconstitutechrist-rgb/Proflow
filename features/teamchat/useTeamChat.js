import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/api/db';
import { supabase } from '@/api/supabaseClient';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';
import { detectClosurePhrase } from './closurePhraseDetector';

// File upload validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Validate image file before upload
 */
const validateImageFile = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Only images are supported.`,
    };
  }
  return { valid: true };
};

/**
 * Custom hook for team chat functionality with real-time subscriptions
 */
export function useTeamChat() {
  // Core state
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false);
  const [detectedClosurePhrase, setDetectedClosurePhrase] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const messageChannelRef = useRef(null);
  const typingChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const subscriptionActiveRef = useRef(false);
  const pollingIntervalRef = useRef(null);

  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  /**
   * Load initial data (chats, projects, users)
   */
  const loadData = useCallback(async () => {
    if (!currentWorkspaceId || workspaceLoading) {
      setChats([]);
      setProjects([]);
      setUsers([]);
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [chatsData, projectsData, usersData, user] = await Promise.all([
        db.entities.TeamChat.filter(
          { workspace_id: currentWorkspaceId, status: 'active' },
          '-last_activity'
        ),
        db.entities.Project.filter({ workspace_id: currentWorkspaceId }, '-updated_date'),
        db.entities.User.list(),
        db.auth.me(),
      ]);

      setChats(chatsData || []);
      setProjects(projectsData || []);
      setUsers(usersData || []);
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading team chat data:', error);
      toast.error('Failed to load team chat data');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, workspaceLoading]);

  /**
   * Load messages for current chat
   */
  const loadMessages = useCallback(async () => {
    if (!currentChat?.id || !currentWorkspaceId) {
      setMessages([]);
      return;
    }

    try {
      const messagesData = await db.entities.TeamChatMessage.filter(
        {
          workspace_id: currentWorkspaceId,
          team_chat_id: currentChat.id,
        },
        'created_date'
      );

      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  }, [currentChat?.id, currentWorkspaceId]);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time message subscription
  useEffect(() => {
    // Clean up previous subscriptions
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (messageChannelRef.current) {
      messageChannelRef.current.unsubscribe();
      messageChannelRef.current = null;
    }
    subscriptionActiveRef.current = false;

    if (!currentChat?.id || !currentWorkspaceId) {
      return;
    }

    // Initial load
    loadMessages();

    // Set up real-time subscription
    const channelName = `team-chat-messages:${currentChat.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_chat_messages',
          filter: `team_chat_id=eq.${currentChat.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
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
          console.warn('Real-time subscription failed, falling back to polling');
          subscriptionActiveRef.current = false;
          if (!pollingIntervalRef.current) {
            pollingIntervalRef.current = setInterval(() => {
              loadMessages();
            }, 2000); // Fast polling for live chat feel
          }
        }
      });

    // Backup polling (less frequent when realtime is active)
    pollingIntervalRef.current = setInterval(() => {
      if (!subscriptionActiveRef.current) {
        loadMessages();
      }
    }, 10000);

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
  }, [currentChat?.id, currentWorkspaceId, loadMessages]);

  // Typing indicator presence channel
  useEffect(() => {
    if (!currentChat?.id || !currentUser?.email) {
      setTypingUsers([]);
      return;
    }

    let isMounted = true;
    let channel = null;

    try {
      const channelName = `team-chat-typing:${currentChat.id}`;

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
        setTypingUsers((prev) =>
          prev.filter((u) => !leftPresences.find((l) => l.email === u.email))
        );
      });

      channel.subscribe((status) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') {
          typingChannelRef.current = channel;
        }
      });
    } catch (error) {
      console.error('Error setting up typing indicator channel:', error);
    }

    return () => {
      isMounted = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (channel) {
        channel.unsubscribe();
      }
      typingChannelRef.current = null;
      setTypingUsers([]);
    };
  }, [currentChat?.id, currentUser?.email]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  /**
   * Create a new team chat
   */
  const createChat = async (name, defaultProjectId = null) => {
    if (!currentWorkspaceId || !currentUser) {
      toast.error('Cannot create chat: not logged in or no workspace selected');
      return null;
    }

    try {
      const chatData = {
        workspace_id: currentWorkspaceId,
        name: name || 'Team Chat',
        default_project_id: defaultProjectId,
        status: 'active',
        participant_emails: [currentUser.email],
        last_activity: new Date().toISOString(),
        created_by: currentUser.email,
      };

      const newChat = await db.entities.TeamChat.create(chatData);

      if (newChat) {
        setChats((prev) => [newChat, ...prev]);
        toast.success('Chat created!');
        return newChat;
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create chat');
    }
    return null;
  };

  /**
   * Send a text message
   */
  const sendMessage = async (content) => {
    if (!content?.trim() || !currentChat || !currentUser || !currentWorkspaceId) {
      return false;
    }
    if (sendingMessage) return false;

    setSendingMessage(true);

    try {
      const messageData = {
        workspace_id: currentWorkspaceId,
        team_chat_id: currentChat.id,
        content: content.trim(),
        author_email: currentUser.email,
        author_name: currentUser.full_name || currentUser.email,
        message_type: 'text',
        mentioned_users: extractMentions(content),
      };

      const newMessage = await db.entities.TeamChatMessage.create(messageData);

      if (newMessage) {
        // Optimistically add to local state
        setMessages((prev) => [...prev, newMessage]);

        // Update chat last activity
        await db.entities.TeamChat.update(currentChat.id, {
          last_activity: new Date().toISOString(),
          message_count: (currentChat.message_count || 0) + 1,
        });

        // Check for closure phrase
        const closureCheck = detectClosurePhrase(content);
        if (closureCheck.detected && closureCheck.confidence >= 0.7) {
          setDetectedClosurePhrase(closureCheck);
          setShowArchiveConfirmation(true);
        }

        return true;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
    return false;
  };

  /**
   * Send an image message
   */
  const sendImage = async (file) => {
    if (!file || !currentChat || !currentUser || !currentWorkspaceId) {
      return false;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return false;
    }

    setUploadingImage(true);

    try {
      // Upload to Supabase Storage
      const { file_url, file_name } = await db.integrations.Core.UploadFile({ file });

      const messageData = {
        workspace_id: currentWorkspaceId,
        team_chat_id: currentChat.id,
        content: '',
        author_email: currentUser.email,
        author_name: currentUser.full_name || currentUser.email,
        message_type: 'image',
        file_url,
        file_name: file_name || file.name,
        file_type: file.type,
        file_size: file.size,
      };

      const newMessage = await db.entities.TeamChatMessage.create(messageData);

      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);

        await db.entities.TeamChat.update(currentChat.id, {
          last_activity: new Date().toISOString(),
          message_count: (currentChat.message_count || 0) + 1,
        });

        toast.success('Image sent!');
        return true;
      }
    } catch (error) {
      console.error('Error sending image:', error);
      toast.error('Failed to send image');
    } finally {
      setUploadingImage(false);
    }
    return false;
  };

  /**
   * Extract @mentions from message content
   */
  const extractMentions = (text) => {
    const mentionRegex = /@(?:"([^"]+)"|'([^']+)'|\[([^\]]+)\]|(\w+))/g;
    const mentions = [];
    const addedEmails = new Set();

    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionName = match[1] || match[2] || match[3] || match[4];
      if (!mentionName) continue;

      const mentionLower = mentionName.toLowerCase();
      let mentionedUser = users.find(
        (m) =>
          m.full_name?.toLowerCase() === mentionLower || m.email?.toLowerCase() === mentionLower
      );

      if (!mentionedUser) {
        mentionedUser = users.find((m) => {
          const fullName = m.full_name?.toLowerCase() || '';
          return fullName.includes(mentionLower);
        });
      }

      if (mentionedUser && !addedEmails.has(mentionedUser.email)) {
        mentions.push(mentionedUser.email);
        addedEmails.add(mentionedUser.email);
      }
    }

    return mentions;
  };

  /**
   * Handle typing indicator
   */
  const handleTyping = useCallback(() => {
    if (!currentChat || !currentUser || !typingChannelRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      typingChannelRef.current.track({
        email: currentUser.email,
        name: currentUser.full_name,
        isTyping: true,
      });
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      if (typingChannelRef.current && currentUser) {
        typingChannelRef.current.track({
          email: currentUser.email,
          name: currentUser.full_name,
          isTyping: false,
        });
      }
    }, 3000);
  }, [currentChat?.id, currentUser]);

  /**
   * Archive the current chat
   */
  const archiveChat = async () => {
    if (!currentChat) return;

    try {
      await db.entities.TeamChat.update(currentChat.id, {
        status: 'archived',
      });

      setChats((prev) => prev.filter((c) => c.id !== currentChat.id));
      setCurrentChat(null);
      setMessages([]);
      setShowArchiveConfirmation(false);
      setDetectedClosurePhrase(null);
      toast.success('Chat archived');
    } catch (error) {
      console.error('Error archiving chat:', error);
      toast.error('Failed to archive chat');
    }
  };

  /**
   * Update the default project for a chat
   */
  const updateDefaultProject = async (projectId) => {
    if (!currentChat) return;

    try {
      await db.entities.TeamChat.update(currentChat.id, {
        default_project_id: projectId,
      });

      setCurrentChat((prev) => ({ ...prev, default_project_id: projectId }));
      toast.success('Default project updated');
    } catch (error) {
      console.error('Error updating default project:', error);
      toast.error('Failed to update default project');
    }
  };

  /**
   * Dismiss archive confirmation
   */
  const dismissArchiveConfirmation = () => {
    setShowArchiveConfirmation(false);
    setDetectedClosurePhrase(null);
  };

  /**
   * Delete a message
   */
  const deleteMessage = async (messageId) => {
    if (!messageId || !currentUser) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message || message.author_email !== currentUser.email) {
      toast.error('Cannot delete this message');
      return;
    }

    try {
      await db.entities.TeamChatMessage.delete(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  /**
   * Select a chat to view
   */
  const selectChat = (chat) => {
    setCurrentChat(chat);
    setMessages([]);
    setShowArchiveConfirmation(false);
    setDetectedClosurePhrase(null);
  };

  return {
    // State
    chats,
    currentChat,
    messages,
    projects,
    users,
    currentUser,
    loading,
    sendingMessage,
    uploadingImage,
    typingUsers,
    showArchiveConfirmation,
    detectedClosurePhrase,

    // Refs
    messagesEndRef,

    // Actions
    loadData,
    createChat,
    selectChat,
    sendMessage,
    sendImage,
    deleteMessage,
    handleTyping,
    archiveChat,
    updateDefaultProject,
    dismissArchiveConfirmation,
  };
}

export default useTeamChat;
