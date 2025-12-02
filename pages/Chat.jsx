import React, { Component } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Target,
  AlertCircle,
  Loader2
} from "lucide-react";

// Error Boundary for message list
class MessageListErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("MessageList error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Unable to display messages. Please try refreshing.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onRetry?.();
            }}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";

import ConversationSidebar from "@/features/chat/ConversationSidebar";
import EnhancedMessage from "@/features/chat/EnhancedMessage";
import RichTextEditor from "@/components/editor/RichTextEditor";
import ThreadSearch from "@/features/chat/ThreadSearch";
import { useChat } from "@/hooks/useChat";
import { ChatHeader, ChatNewThreadDialog } from "@/features/chat/chatPage";

// VirtualizedMessageList component with actual virtualization
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
  const containerRef = React.useRef(null);
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 50 });

  // Estimated heights for virtualization
  const ITEM_HEIGHT = viewMode === 'compact' ? 60 : 100;
  const BUFFER_SIZE = 10;
  const TOTAL_HEIGHT = messages.length * ITEM_HEIGHT;

  // Handle scroll to update visible range
  const handleScroll = React.useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, clientHeight } = containerRef.current;
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const endIndex = Math.min(
      messages.length,
      Math.ceil((scrollTop + clientHeight) / ITEM_HEIGHT) + BUFFER_SIZE
    );

    setVisibleRange({ start: startIndex, end: endIndex });
  }, [messages.length, ITEM_HEIGHT]);

  // Set up scroll listener
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial calculation
    handleScroll();

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Recalculate when messages change
  React.useEffect(() => {
    handleScroll();
  }, [messages.length, handleScroll]);

  // For small lists, render all messages without virtualization
  if (messages.length <= 50) {
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
                repliedToMessage={repliedToMessage}
                viewMode={viewMode}
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
  }

  // Virtualized rendering for large lists
  const visibleMessages = messages.slice(visibleRange.start, visibleRange.end);
  const topSpacer = visibleRange.start * ITEM_HEIGHT;
  const bottomSpacer = Math.max(0, (messages.length - visibleRange.end) * ITEM_HEIGHT);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      style={{ position: 'relative' }}
    >
      <div style={{ height: TOTAL_HEIGHT, position: 'relative' }}>
        {/* Top spacer */}
        <div style={{ height: topSpacer }} aria-hidden="true" />

        {/* Visible messages */}
        <div className="space-y-1">
          {visibleMessages.map((message, index) => {
            const actualIndex = visibleRange.start + index;
            const previousMessage = actualIndex > 0 ? messages[actualIndex - 1] : null;
            const repliedToMessage = message.reply_to ? replyToMessageData[message.reply_to] : null;
            return (
              <div
                key={message.id}
                id={`message-${message.id}`}
                style={{ minHeight: ITEM_HEIGHT }}
              >
                <EnhancedMessage
                  message={message}
                  previousMessage={previousMessage}
                  currentUser={currentUser}
                  repliedToMessage={repliedToMessage}
                  viewMode={viewMode}
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

        {/* Bottom spacer */}
        <div style={{ height: bottomSpacer }} aria-hidden="true" />
      </div>
    </div>
  );
});

export default function ChatPage() {
  const { currentWorkspaceId } = useWorkspace();

  const {
    // State
    assignments,
    projects,
    selectedContextId,
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
    isSending,
    operationLoading,

    // Derived
    currentProject,
    currentAssignment,
    currentThreadMessages,
    pinnedMessages,
    regularMessages,

    // Refs
    messagesEndRef,
    messageListRef,
    fileInputRef,

    // Setters
    setNewMessage,
    setIsThreadFormOpen,
    setNewThreadTopic,
    setNewThreadDescription,
    setIsSearchOpen,
    setViewMode,
    setReplyToMessage,
    setEditingMessage,
    setShowPinnedMessages,

    // Handlers
    loadMessages,
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
    handlePinThread,
    handleArchiveThread,
    handleNewThreadSubmit,
  } = useChat();

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
      {/* Header */}
      <ChatHeader
        currentThread={currentThread}
        currentThreadMessages={currentThreadMessages}
        currentAssignment={currentAssignment}
        setIsThreadFormOpen={setIsThreadFormOpen}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100%-120px)]">
        {/* Conversation Sidebar */}
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

        {/* Chat Area */}
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
                        aria-label="Search messages"
                        aria-pressed={isSearchOpen}
                      >
                        <Search className="w-4 h-4" />
                      </Button>

                      {pinnedMessages.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                          title="View pinned messages"
                          aria-label={`${showPinnedMessages ? 'Hide' : 'Show'} pinned messages (${pinnedMessages.length})`}
                          aria-pressed={showPinnedMessages}
                        >
                          <Pin className={`w-4 h-4 ${showPinnedMessages ? 'text-yellow-600' : ''}`} />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMode(viewMode === 'compact' ? 'comfortable' : 'compact')}
                        title="Toggle view density"
                        aria-label={`Switch to ${viewMode === 'compact' ? 'comfortable' : 'compact'} view`}
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

                {/* Messages Area */}
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

                  <MessageListErrorBoundary onRetry={loadMessages}>
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
                  </MessageListErrorBoundary>
                  <div ref={messagesEndRef} />

                  {/* Typing Indicator */}
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

                {/* Message Input */}
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
                      disabled={!newMessage.trim() || !currentThread || uploadingFile || isSending}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md h-12 px-6"
                      aria-label={editingMessage ? "Update message" : "Send message"}
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
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

      {/* No Context Warning */}
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

      {/* New Thread Dialog */}
      <ChatNewThreadDialog
        isThreadFormOpen={isThreadFormOpen}
        setIsThreadFormOpen={setIsThreadFormOpen}
        newThreadTopic={newThreadTopic}
        setNewThreadTopic={setNewThreadTopic}
        newThreadDescription={newThreadDescription}
        setNewThreadDescription={setNewThreadDescription}
        handleNewThreadSubmit={handleNewThreadSubmit}
        selectedContextId={selectedContextId}
        currentProject={currentProject}
        currentUser={currentUser}
        currentWorkspaceId={currentWorkspaceId}
      />
    </div>
  );
}
