
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Assignment } from "@/api/entities";
import { Message } from "@/api/entities";
import { Document } from "@/api/entities";
import { ConversationThread } from "@/api/entities";
import { User } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Send,
  Users,
  Plus,
  Hash,
  Paperclip,
  Smile,
  MoreVertical,
  Pin,
  X,
  Search,
  Bookmark,
  Archive,
  Settings,
  Mic,
  Image as ImageIcon,
  File,
  ChevronDown,
  Eye,
  EyeOff,
  Reply,
  Edit,
  FolderOpen
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

import ConversationSidebar from "../components/chat/ConversationSidebar";
import EnhancedMessage from "../components/chat/EnhancedMessage";
import RichTextEditor from "../components/chat/RichTextEditor";
import ThreadSearch from "../components/chat/ThreadSearch";
import ChatSummaryButton from "../components/chat/ChatSummaryButton";
import { toast } from "sonner";
import { UploadFile } from "@/api/integrations";
import { useWorkspace } from "../components/workspace/WorkspaceContext";

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
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("general"); // Changed: Default to "general"
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null); // Renamed from selectedThread
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]); // Renamed from teamMembers
  const [documents, setDocuments] = useState([]); // New state for documents
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isThreadFormOpen, setIsThreadFormOpen] = useState(false);
  const [newThreadTopic, setNewThreadTopic] = useState("");
  const [newThreadDescription, setNewThreadDescription] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState('comfortable'); // 'compact' or 'comfortable'
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [isDraggingFile, setIsDraggingFile] = useState(false); // New state for drag-drop visual feedback
  const [replyToMessageData, setReplyToMessageData] = useState({}); // Store reply-to message data map

  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const dragCounter = useRef(0); // New ref for drag-drop
  const pollingIntervalRef = useRef(null); // New ref for polling interval

  const { currentWorkspaceId } = useWorkspace();

  // Derive the full assignment object from its ID
  const currentAssignment = useMemo(() => {
    if (selectedAssignmentId === "general") return null;
    return assignments.find(a => a.id === selectedAssignmentId);
  }, [selectedAssignmentId, assignments]);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!currentWorkspaceId) {
      setAssignments([]);
      setUsers([]);
      setDocuments([]);
      setThreads([]);
      setCurrentUser(null);
      setSelectedAssignmentId("general");
      setCurrentThread(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [threadsData, assignmentsData, documentsData, usersData, user] = await Promise.all([
        base44.entities.ConversationThread.filter({ workspace_id: currentWorkspaceId }, "-last_activity"),
        base44.entities.Assignment.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        base44.entities.Document.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        base44.entities.User.list(),
        base44.auth.me()
      ]);

      setAssignments(assignmentsData);
      setUsers(usersData);
      setDocuments(documentsData);
      setThreads(threadsData);
      setCurrentUser(user);

      // Handle active thread/assignment selection after data load
      let newSelectedAssignmentId = selectedAssignmentId || "general";
      let newCurrentThread = null;

      // Keep current selection if valid
      if (newSelectedAssignmentId !== "general" && !assignmentsData.some(a => a.id === newSelectedAssignmentId)) {
        newSelectedAssignmentId = "general";
      }
      
      setSelectedAssignmentId(newSelectedAssignmentId);

      // Try to keep current thread if still valid
      if (currentThread && threadsData.some(t => t.id === currentThread.id)) {
        newCurrentThread = currentThread;
      } else {
        // Select first thread for current context
        if (newSelectedAssignmentId === "general") {
          newCurrentThread = threadsData.find(t => !t.assignment_id) || null;
        } else {
          newCurrentThread = threadsData.find(t => t.assignment_id === newSelectedAssignmentId) || null;
        }
      }
      setCurrentThread(newCurrentThread);

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load initial data");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, selectedAssignmentId, currentThread]); // Re-run if workspace, selected assignment, or current thread changes

  // Load messages for current thread
  const loadMessages = useCallback(async () => {
    if (!currentThread?.id || !currentWorkspaceId) {
      setMessages([]);
      setReplyToMessageData({});
      return;
    }

    try {
      const threadMessages = await base44.entities.Message.filter({
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
              const messages = await base44.entities.Message.filter({ id: id }, "created_date", 1);
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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const markThreadAsRead = useCallback(async () => {
    if (!currentThread || !currentUser) return;

    try {
      // Update unread counts
      const updatedUnreadCounts = (currentThread.unread_counts || []).map(uc =>
        uc.user_email === currentUser.email ? { ...uc, unread_count: 0 } : uc
      );

      await base44.entities.ConversationThread.update(currentThread.id, {
        unread_counts: updatedUnreadCounts
      });

      // Mark all messages as read - batch update for better performance
      const threadMessages = messages.filter(m => m.thread_id === currentThread.id);
      const unreadMessages = threadMessages.filter(msg => {
        const readBy = msg.read_by || [];
        return !readBy.some(r => r.user_email === currentUser.email);
      });

      // Use Promise.all to update messages in parallel instead of sequentially
      if (unreadMessages.length > 0) {
        await Promise.all(
          unreadMessages.map(msg =>
            base44.entities.Message.update(msg.id, {
              read_by: [...(msg.read_by || []), { user_email: currentUser.email, read_at: new Date().toISOString() }]
            })
          )
        );
      }

      loadData(); // Reload threads to update unread counts on sidebar
    } catch (error) {
      console.error("Error marking thread as read:", error);
    }
  }, [currentThread, currentUser, messages, loadData]);

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

      await base44.entities.Message.create(messageData);
      setNewMessage("");
      setReplyToMessage(null);

      // Update thread activity and message count
      await base44.entities.ConversationThread.update(currentThread.id, {
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

      await base44.entities.Message.update(message.id, {
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
      await base44.entities.Message.delete(messageId);
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

      await base44.entities.Message.update(messageId, {
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

      await base44.entities.Message.update(messageId, {
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

      await base44.entities.Message.update(messageId, { reactions });
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

      await base44.entities.Message.update(messageId, { reactions });
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
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

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

      await base44.entities.Message.create(messageData);
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
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

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

      await base44.entities.Message.create(messageData);
      loadMessages();
      toast.success("File uploaded");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleTyping = () => {
    if (!currentThread || !currentUser) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update typing status
    updateTypingStatus(true);

    // Set new timeout to clear typing status
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 3000);
  };

  const updateTypingStatus = async (isTyping) => {
    if (!currentThread || !currentUser) return;

    try {
      const typingUsers = currentThread.typing_users || [];
      const updatedTypingUsers = isTyping
        ? [
            ...typingUsers.filter(u => u.user_email !== currentUser.email),
            {
              user_email: currentUser.email,
              user_name: currentUser.full_name,
              last_typing_at: new Date().toISOString()
            }
          ]
        : typingUsers.filter(u => u.user_email !== currentUser.email);

      await base44.entities.ConversationThread.update(currentThread.id, {
        typing_users: updatedTypingUsers
      });

      loadData(); // Reload threads to update typing indicators in sidebar or header
    } catch (error) {
      console.error("Error updating typing status:", error);
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleEditMessage(editingMessage);
      } else {
        handleSendMessage();
      }
    }
  };

  const handleAssignmentSelect = (assignmentOrGeneral) => {
    if (assignmentOrGeneral === "general") {
      setSelectedAssignmentId("general");
    } else {
      setSelectedAssignmentId(assignmentOrGeneral.id);
    }
    setCurrentThread(null); // Clear selected thread when assignment changes
  };

  const handleThreadSelect = (thread) => {
    setCurrentThread(thread); // Set the full thread object
    setReplyToMessage(null);
    setEditingMessage(null);
  };

  const handleNewThread = async (topic, description) => {
    if (!currentUser || !currentWorkspaceId) return; // Removed !currentAssignment check

    try {
      const threadData = {
        workspace_id: currentWorkspaceId,
        topic,
        description,
        assignment_id: selectedAssignmentId === "general" ? null : selectedAssignmentId, // Can be null
        creator_email: currentUser.email,
        participants: [currentUser.email],
        status: "active",
        message_count: 0, // Added based on outline
        last_activity: new Date().toISOString() // Added based on outline
      };

      const newThread = await base44.entities.ConversationThread.create(threadData);
      loadData(); // Reload threads to update sidebar
      setCurrentThread(newThread); // Set the newly created thread as current
      setIsThreadFormOpen(false);
      setNewThreadTopic("");
      setNewThreadDescription("");
      toast.success("Thread created");
    } catch (error) {
      console.error("Error creating thread:", error);
      toast.error("Failed to create thread");
    }
  };

  const handlePinThread = async (thread) => {
    try {
      await base44.entities.ConversationThread.update(thread.id, {
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
      await base44.entities.ConversationThread.update(thread.id, {
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

  // Memoize filtered message lists to prevent recalculation on every render
  const currentThreadMessages = useMemo(() => 
    currentThread ? messages.filter((m) => m.thread_id === currentThread.id) : [],
    [currentThread?.id, messages]
  );

  const pinnedMessages = useMemo(() => 
    currentThreadMessages.filter(m => m.is_pinned),
    [currentThreadMessages]
  );
  
  const regularMessages = useMemo(() => 
    currentThreadMessages.filter(m => !m.is_pinned),
    [currentThreadMessages]
  );

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
              selectedAssignment={currentAssignment}
              selectedAssignmentId={selectedAssignmentId} // Pass selectedAssignmentId
              onAssignmentSelect={handleAssignmentSelect}
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
                        {currentThread.topic}
                        {!currentThread.assignment_id && (
                          <Badge variant="outline" className="text-sm font-normal bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                            General Workspace Chat
                          </Badge>
                        )}
                        {currentThread.assignment_id && ( // Only show status badge for assignment-specific threads
                          <Badge variant="outline" className="text-sm font-normal bg-indigo-100/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">
                            {currentThread.status}
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
                      {currentThread.participants?.slice(0, 5).map((email, idx) => {
                        const member = users.find(m => m.email === email);
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

                  {/* Typing Indicator */}
                  {currentThread.typing_users?.filter(u => u.user_email !== currentUser.email).length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span>
                        {currentThread.typing_users.filter(u => u.user_email !== currentUser.email)[0]?.user_name} is typing...
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
                        placeholder={`Message ${currentThread.topic}... (or drag & drop files)`}
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
      {selectedAssignmentId !== "general" && !currentAssignment && assignments.length === 0 && (
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
              {selectedAssignmentId === "general"
                ? "Create a new general workspace conversation thread."
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
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg shadow-md"
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
