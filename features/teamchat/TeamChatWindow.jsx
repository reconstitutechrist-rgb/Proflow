import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus,
  Send,
  Image as ImageIcon,
  Sparkles,
  ListTodo,
  Archive,
  MoreVertical,
  ArrowLeft,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import TeamChatMessage from './TeamChatMessage';
import TeamChatImageUpload from './TeamChatImageUpload';
import ProjectSelector from './ProjectSelector';
import ArchiveConfirmationDialog from './ArchiveConfirmationDialog';
import TaskExtractionPanel from './TaskExtractionPanel';
import { useTeamChatAI } from './useTeamChatAI';

export default function TeamChatWindow({ teamChat, onResetPosition, projectFilter = null }) {
  const [messageInput, setMessageInput] = useState('');
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [showTaskExtraction, setShowTaskExtraction] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const { summarizing, summary, summarizeConversation, clearSummary } = useTeamChatAI();

  const {
    chats: allChats,
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
    messagesEndRef,
    createChat,
    selectChat,
    sendMessage,
    sendImage,
    deleteMessage,
    handleTyping,
    archiveChat,
    updateDefaultProject,
    dismissArchiveConfirmation,
  } = teamChat;

  // Filter chats based on projectFilter prop
  const chats = projectFilter
    ? allChats?.filter((chat) => chat.default_project_id === projectFilter) || []
    : allChats || [];

  /**
   * Handle sending a message
   */
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageInput.trim() || sendingMessage) return;

    const success = await sendMessage(messageInput);
    if (success) {
      setMessageInput('');
    }
  };

  /**
   * Handle creating a new chat
   */
  const handleCreateChat = async (e) => {
    e?.preventDefault();
    if (!newChatName.trim()) return;

    const newChat = await createChat(newChatName);
    if (newChat) {
      selectChat(newChat);
      setShowNewChatForm(false);
      setNewChatName('');
    }
  };

  /**
   * Handle image upload from file input
   */
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await sendImage(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Handle drag and drop for images
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await sendImage(file);
    }
  };

  /**
   * Handle input change with typing indicator
   */
  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    handleTyping();
  };

  /**
   * Handle summarizing the conversation
   */
  const handleSummarize = async () => {
    if (!messages?.length || summarizing) return;

    await summarizeConversation(messages, currentChat?.id);
    setShowSummaryDialog(true);
  };

  /**
   * Close summary dialog
   */
  const handleCloseSummary = () => {
    setShowSummaryDialog(false);
    clearSummary();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Chat list view (no chat selected)
  if (!currentChat) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Chat List Header */}
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Active Chats ({chats.length})
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNewChatForm(true)}
            className="h-8"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Chat
          </Button>
        </div>

        {/* New Chat Form */}
        {showNewChatForm && (
          <form onSubmit={handleCreateChat} className="p-3 border-b bg-gray-50 dark:bg-gray-800/50">
            <Input
              placeholder="Chat name..."
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              className="mb-2"
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={!newChatName.trim()}>
                Create
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowNewChatForm(false);
                  setNewChatName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Chat List */}
        <ScrollArea className="flex-1">
          {chats.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p className="text-sm">No active chats</p>
              <p className="text-xs mt-1">Start a new chat to collaborate with your team</p>
            </div>
          ) : (
            <div className="divide-y">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => selectChat(chat)}
                  className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="font-medium text-sm truncate">{chat.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {chat.message_count || 0} messages
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Active chat view
  return (
    <div
      className={`flex-1 flex flex-col relative ${isDragOver ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Chat Header */}
      <div className="p-2 border-b flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => selectChat(null)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{currentChat.name}</div>
            <ProjectSelector
              projects={projects}
              selectedProjectId={currentChat.default_project_id}
              onSelect={updateDefaultProject}
            />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowTaskExtraction(true)}>
              <ListTodo className="w-4 h-4 mr-2" />
              Extract Tasks
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSummarize} disabled={summarizing || !messages?.length}>
              {summarizing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {summarizing ? 'Summarizing...' : 'Summarize Chat'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={archiveChat} className="text-orange-600">
              <Archive className="w-4 h-4 mr-2" />
              Archive Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <TeamChatMessage
                key={message.id}
                message={message}
                currentUser={currentUser}
                onDelete={deleteMessage}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="text-xs text-gray-500 mt-2 animate-pulse">
            {typingUsers.map((u) => u.name || u.email).join(', ')}{' '}
            {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </ScrollArea>

      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-emerald-500/10 border-2 border-dashed border-emerald-500 rounded-lg flex items-center justify-center pointer-events-none z-10">
          <div className="text-emerald-600 dark:text-emerald-400 text-center">
            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">Drop image to upload</p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-3 border-t bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <TeamChatImageUpload
            onUpload={sendImage}
            uploading={uploadingImage}
            fileInputRef={fileInputRef}
            onFileSelect={handleImageSelect}
          />
          <Input
            placeholder="Type a message..."
            value={messageInput}
            onChange={handleInputChange}
            disabled={sendingMessage}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!messageInput.trim() || sendingMessage}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {sendingMessage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>

      {/* Archive Confirmation Dialog */}
      <ArchiveConfirmationDialog
        open={showArchiveConfirmation}
        onOpenChange={dismissArchiveConfirmation}
        onConfirm={archiveChat}
        detectedPhrase={detectedClosurePhrase}
      />

      {/* Task Extraction Panel */}
      <TaskExtractionPanel
        open={showTaskExtraction}
        onOpenChange={setShowTaskExtraction}
        messages={messages}
        currentChat={currentChat}
        projects={projects}
        users={users}
      />

      {/* Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={handleCloseSummary}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Conversation Summary
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {summary ? (
              <div className="space-y-4 py-2">
                {/* Overall Summary */}
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{summary.summary}</p>
                </div>

                {/* Key Points */}
                {summary.key_points?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      Key Points
                    </h4>
                    <ul className="space-y-1">
                      {summary.key_points.map((point, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-600 dark:text-gray-400 pl-4 relative before:content-['•'] before:absolute before:left-0"
                        >
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Decisions */}
                {summary.decisions?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Decisions Made
                    </h4>
                    <ul className="space-y-1">
                      {summary.decisions.map((decision, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-600 dark:text-gray-400 pl-4 relative before:content-['•'] before:absolute before:left-0"
                        >
                          {decision}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {summary.action_items?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      Action Items
                    </h4>
                    <ul className="space-y-1">
                      {summary.action_items.map((item, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-600 dark:text-gray-400 pl-4 relative before:content-['→'] before:absolute before:left-0"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pending Items */}
                {summary.pending_items?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <HelpCircle className="w-4 h-4 text-purple-500" />
                      Pending Questions
                    </h4>
                    <ul className="space-y-1">
                      {summary.pending_items.map((item, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-600 dark:text-gray-400 pl-4 relative before:content-['?'] before:absolute before:left-0"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Generating summary...</p>
              </div>
            )}
          </ScrollArea>
          <div className="pt-4 border-t flex justify-end">
            <Button onClick={handleCloseSummary}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
