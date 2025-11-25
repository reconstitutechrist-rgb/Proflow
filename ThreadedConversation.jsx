
import React, { useState, useEffect } from "react";
import { Message } from "@/api/entities";
import { ConversationThread } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Reply,
  Hash,
  Users,
  Clock,
  X // Added X icon for close button
} from "lucide-react";
import { useWorkspace } from "@/components/workspace/WorkspaceContext"; // Added WorkspaceContext import
import { toast } from "sonner"; // Assuming sonner for toasts
import { base44 } from "@/lib/base44"; // Assuming base44 SDK is imported from here

export default function ThreadedConversation({
  thread,
  currentUser, // Retained as it's used in the new functions
  onClose,
  onUpdate
}) {
  const [messages, setMessages] = useState([]); // New state to manage messages fetched for this thread
  const [newMessage, setNewMessage] = useState(""); // New state for the reply input box
  const [loading, setLoading] = useState(false); // New state for loading indicator

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    // Load messages when the thread or currentWorkspaceId changes
    if (thread && currentWorkspaceId) {
      loadMessages();
    }
  }, [thread, currentWorkspaceId]); // Dependencies for useEffect

  // Function to load messages specific to this thread and workspace
  const loadMessages = async () => {
    if (!thread || !currentWorkspaceId) return; // Guard clause
    try {
      setLoading(true);
      const messagesData = await base44.entities.Message.filter(
        {
          workspace_id: currentWorkspaceId,
          thread_id: thread.id
        },
        "created_date" // Order by creation date
      );
      setMessages(messagesData);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  // Function to handle sending a new message to the thread
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !currentWorkspaceId) return; // Ensure message, user, and workspace are available

    try {
      const messageData = {
        workspace_id: currentWorkspaceId,
        content: newMessage,
        assignment_id: thread.assignment_id, // Assuming thread has assignment_id
        thread_id: thread.id,
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        message_type: 'text'
      };

      await base44.entities.Message.create(messageData); // Create the new message

      // Update the conversation thread's last activity and message count
      await base44.entities.ConversationThread.update(thread.id, {
        last_activity: new Date().toISOString(),
        message_count: (thread.message_count || 0) + 1
      });

      setNewMessage(""); // Clear the input field
      loadMessages(); // Reload messages to display the new one
      if (onUpdate) onUpdate(); // Notify parent component of update
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  // Function to handle adding or removing a reaction to a message
  const handleReaction = async (messageId, emoji) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const reactions = message.reactions || [];
      const existingReaction = reactions.find(
        r => r.user_email === currentUser.email && r.emoji === emoji
      );

      let updatedReactions;
      if (existingReaction) {
        // If user already reacted with this emoji, remove it
        updatedReactions = reactions.filter(r => !(r.user_email === currentUser.email && r.emoji === emoji));
      } else {
        // Otherwise, add the new reaction
        updatedReactions = [
          ...reactions,
          {
            emoji,
            user_email: currentUser.email,
            user_name: currentUser.full_name,
            timestamp: new Date().toISOString()
          }
        ];
      }

      await base44.entities.Message.update(messageId, {
        reactions: updatedReactions
      });

      loadMessages(); // Reload messages to reflect reaction change
    } catch (error) {
      console.error("Error updating reaction:", error);
      toast.error("Failed to update reaction");
    }
  };

  // Function to handle pinning or unpinning a message
  const handlePinMessage = async (messageId) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      await base44.entities.Message.update(messageId, {
        is_pinned: !message.is_pinned,
        pinned_by: message.is_pinned ? null : currentUser.email,
        pinned_at: message.is_pinned ? null : new Date().toISOString()
      });

      loadMessages(); // Reload messages to reflect pin status change
      toast.success(message.is_pinned ? "Message unpinned" : "Message pinned");
    } catch (error) {
      console.error("Error pinning message:", error);
      toast.error("Failed to pin message");
    }
  };

  // Helper function for status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    // The component is now assumed to be a detailed view, always "expanded"
    <Card className="border-l-4 border-blue-500 h-full flex flex-col"> {/* Added flex-col for layout */}
      <CardHeader
        className="flex-shrink-0" // Prevent header from shrinking
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Hash className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">{thread.topic}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{messages.length} messages</span> {/* Use fetched messages count */}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{thread.participants?.length || 0} participants</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{thread.last_activity ? new Date(thread.last_activity).toLocaleDateString() : 'No activity'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(thread.status)}>
              {thread.status}
            </Badge>
            {thread.priority !== 'medium' && (
              <Badge variant="outline" className={
                thread.priority === 'urgent' ? 'border-red-500 text-red-700' :
                thread.priority === 'high' ? 'border-orange-500 text-orange-700' :
                'border-green-500 text-green-700'
              }>
                {thread.priority}
              </Badge>
            )}
            {/* Close button for the detailed thread view */}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close thread">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden"> {/* Added flex and overflow-hidden */}
        {/* Thread Description */}
        {thread.description && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg flex-shrink-0"> {/* Prevent description from shrinking */}
            <p className="text-sm text-gray-700">{thread.description}</p>
          </div>
        )}

        {/* Thread Messages */}
        <div className="space-y-3 mb-4 flex-1 overflow-y-auto pr-2"> {/* Added flex-1 and overflow for scrolling messages */}
          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading messages...</div>
          ) : messages.length > 0 ? (
            messages.map((message) => ( // Render fetched messages
              <div key={message.id} className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    {message.author_name?.split(' ').map(n => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {message.author_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.created_date).toLocaleTimeString()}
                    </span>
                    {message.reply_to && (
                      <Reply className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-sm text-gray-700">{message.content}</p>
                    {message.tags && message.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {/* Placeholder for reactions/pinning. Implementation details for these not in outline, but functions are defined. */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                          {message.reactions.map((reaction, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                  {reaction.emoji} {reaction.user_name}
                              </Badge>
                          ))}
                      </div>
                    )}
                    {message.is_pinned && (
                      <Badge variant="secondary" className="text-xs mt-2">
                        📌 Pinned by {message.pinned_by}
                      </Badge>
                    )}
                    {/* Example UI for reaction/pin actions - these would typically be interactive buttons */}
                    <div className="flex gap-2 mt-2">
                        <Button variant="ghost" size="xs" onClick={() => handleReaction(message.id, '👍')}>👍</Button>
                        <Button variant="ghost" size="xs" onClick={() => handleReaction(message.id, '❤️')}>❤️</Button>
                        <Button variant="ghost" size="xs" onClick={() => handlePinMessage(message.id)}>
                            {message.is_pinned ? "Unpin" : "Pin"}
                        </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No messages in this thread yet.</p>
            </div>
          )}
        </div>

        {/* Reply Box - always shown in this detailed view */}
        <div className="mt-auto pt-3 border-t flex-shrink-0"> {/* Stick to bottom, prevent shrinking */}
          <div className="flex gap-2">
            <Input
              value={newMessage} // Use newMessage state
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Reply to ${thread.topic}...`}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} // Call handleSendMessage on Enter
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
