
import React, { useState, useEffect, useRef, useCallback } from "react";
import { InvokeLLM } from "@/api/integrations";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  Users,
  Hash,
  CheckCircle2,
  Link2,
  MessageCircle,
  Bot, // Ensure Bot icon is imported for AI suggestions
  Calendar
} from "lucide-react";
// NEW: Import useWorkspace for workspace context
import { useWorkspace } from "../workspace/WorkspaceContext";
// NEW: Import toast for notifications
import { toast } from "react-hot-toast"; // Assuming react-hot-toast or similar

// NOTE: 'base44' is used for entity operations and is assumed to be an SDK or API client
// available globally or implicitly. If it requires an explicit import, please add it here,
// e.g., `import * as base44 from "@/lib/base44";`

export default function ContextAwareChat({
  assignmentId,
  currentUser, // Retained as a prop, as its usage is critical and no alternative source provided in outline
  onContextUpdate // Retained as a prop, as it's called within generateContextSuggestions
}) {
  // Original state declarations
  const messagesEndRef = useRef(null);

  // NEW: Internal state for messages, documents, and selected thread
  const [messages, setMessages] = useState([]);
  const [relatedDocuments, setRelatedDocuments] = useState([]); // Renamed from 'documents' to 'relatedDocuments' as per outline
  const [threads, setThreads] = useState([]); // To store all conversation threads for the assignment
  const [selectedThread, setSelectedThread] = useState(null); // Internal state for the currently selected thread
  const [loading, setLoading] = useState(false); // New loading state for data fetching

  // Initialize contextSuggestions as null to distinguish from an empty object
  const [contextSuggestions, setContextSuggestions] = useState(null);

  // NEW: Use workspace context to get the current workspace ID
  const { currentWorkspaceId } = useWorkspace();

  // Memoized function to load all chat-related data for the given assignment and workspace
  const loadChatData = useCallback(async () => {
    // Only proceed if both assignmentId and currentWorkspaceId are available
    if (!assignmentId || !currentWorkspaceId) {
      // Clear data and suggestions if IDs are missing
      setMessages([]);
      setThreads([]);
      setRelatedDocuments([]);
      setContextSuggestions(null);
      if (onContextUpdate) onContextUpdate({}); // Notify parent about cleared context
      return;
    }

    try {
      setLoading(true); // Set loading to true before fetching data
      const [messagesData, threadsData, documentsData] = await Promise.all([
        // Filter messages by workspace_id and assignment_id, ordered by creation date
        base44.entities.Message.filter({
          workspace_id: currentWorkspaceId,
          assignment_id: assignmentId
        }, "created_date"),
        // Filter threads by workspace_id and assignment_id, ordered by last activity
        base44.entities.ConversationThread.filter({
          workspace_id: currentWorkspaceId,
          assignment_id: assignmentId
        }, "-last_activity"),
        // Filter documents by workspace_id and those assigned to the current assignment
        base44.entities.Document.filter({
          workspace_id: currentWorkspaceId,
          assigned_to_assignments: { $in: [assignmentId] }
        }, "-updated_date")
      ]);

      setMessages(messagesData);
      setThreads(threadsData);
      setRelatedDocuments(documentsData);
      // NOTE: `selectedThread` is an internal state now. This `loadChatData` function
      // does not explicitly set `selectedThread`. If a specific thread needs to be
      // pre-selected or dynamically selected, additional logic or a mechanism
      // (e.g., a prop like `onSelectThread` or internal UI) would be required.

    } catch (error) {
      console.error("Error loading chat data:", error);
      toast.error("Failed to load chat data."); // Display an error toast
    } finally {
      setLoading(false); // Set loading to false after data fetching (success or failure)
    }
  }, [assignmentId, currentWorkspaceId, onContextUpdate]); // Dependencies for useCallback

  // NEW: Effect to trigger data loading whenever assignmentId or currentWorkspaceId changes
  useEffect(() => {
    loadChatData();
  }, [loadChatData]); // `loadChatData` is already memoized and handles its own dependencies

  // Memoize generateContextSuggestions to prevent unnecessary re-renders and
  // ensure stable function reference for useEffect dependency.
  const generateContextSuggestions = useCallback(async () => {
    // Only generate suggestions if we have an assignment, messages, and a workspace
    if (!assignmentId || messages.length === 0 || !currentWorkspaceId) {
      setContextSuggestions(null); // Clear suggestions
      if (onContextUpdate) onContextUpdate({}); // Notify parent about cleared context
      return;
    }

    try {
      const recentMessages = messages.slice(-5).map(msg => ({
        content: msg.content,
        author: msg.author_name,
        timestamp: msg.created_date,
        type: msg.message_type
      }));

      // Use `relatedDocuments` from internal state
      const documentTitles = relatedDocuments.map(doc => ({
        id: doc.id,
        title: doc.title,
        type: doc.document_type,
        keywords: doc.ai_analysis?.key_points || []
      }));

      const response = await InvokeLLM({
        prompt: `You are an intelligent conversation assistant. Based on the recent conversation messages, suggest relevant documents and tags that would be helpful in this context.

Recent Messages:
${JSON.stringify(recentMessages, null, 2)}

Available Documents:
${JSON.stringify(documentTitles, null, 2)}

Based on the conversation context, suggest:
1. Relevant documents that might be useful (return document IDs)
2. Appropriate tags for organizing this conversation
3. Related conversation topics that might emerge

Be contextually relevant and helpful.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_documents: {
              type: "array",
              items: { type: "string" },
              description: "Document IDs that are relevant to the conversation"
            },
            suggested_tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags that would help categorize this conversation"
            },
            conversation_insights: {
              type: "array",
              items: { type: "string" },
              description: "Key insights or themes from the conversation"
            }
          }
        }
      });

      setContextSuggestions(response);
      if (onContextUpdate) onContextUpdate(response); // Pass context update to parent if provided

    } catch (error) {
      console.error("Error generating context suggestions:", error);
      setContextSuggestions(null); // Reset or indicate error
      if (onContextUpdate) onContextUpdate({}); // Clear context on error
    }
  }, [messages, relatedDocuments, onContextUpdate, assignmentId, currentWorkspaceId]); // Dependencies for useCallback

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Generate context suggestions when messages change, and only if valid IDs are present
    if (messages.length > 0 && assignmentId && currentWorkspaceId) {
      generateContextSuggestions();
    } else {
      // Clear suggestions if messages are empty or no valid assignment/workspace
      setContextSuggestions(null);
      if (onContextUpdate) onContextUpdate({});
    }
  }, [messages.length, generateContextSuggestions, onContextUpdate, assignmentId, currentWorkspaceId]); // Dependencies for this useEffect

  // NEW: Function to handle sending a message
  const handleSendMessage = async (content) => {
    // Basic validation for content, current user, assignment, and workspace
    if (!content.trim() || !currentUser || !assignmentId || !currentWorkspaceId) {
      toast.error("Cannot send message: Missing content, user, assignment, or workspace context.");
      return;
    }

    try {
      const messageData = {
        workspace_id: currentWorkspaceId, // Add workspace ID
        content: content,
        assignment_id: assignmentId, // Add assignment ID
        thread_id: selectedThread?.id || null, // Use internal selectedThread state
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        message_type: 'text',
        created_date: new Date().toISOString() // Ensure created_date is set
      };

      await base44.entities.Message.create(messageData);

      // If a thread is selected, update its last_activity and message_count
      if (selectedThread) {
        // Find the current state of the thread to ensure message_count is accurate before updating
        const currentThread = threads.find(t => t.id === selectedThread.id);
        await base44.entities.ConversationThread.update(selectedThread.id, {
          last_activity: new Date().toISOString(),
          message_count: (currentThread?.message_count || 0) + 1 // Increment message count
        });
      }

      // Reload chat data to display the new message and reflect any thread updates
      await loadChatData();
      // NOTE: Clearing the message input field typically happens in the parent component
      // that manages the input, not within ContextAwareChat.

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message"); // Display an error toast on failure
    }
  };

  const renderMessage = (msg, index) => {
    const isOwnMessage = msg.author_email === currentUser?.email;

    return (
      <div key={msg.id || index} className={`flex gap-3 mb-6 ${isOwnMessage ? 'justify-end' : ''}`}>
        {!isOwnMessage && (
          <Avatar className="mt-1">
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm">
              {msg.author_name?.split(' ').map(n => n[0]).join('') || '?'}
            </AvatarFallback>
          </Avatar>
        )}

        <div className={`max-w-lg rounded-lg ${
          isOwnMessage
            ? 'bg-blue-600 text-white'
            : 'bg-white shadow-sm border'
        }`}>
          {/* Message Header */}
          <div className={`px-4 pt-3 pb-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-600'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{msg.author_name}</span>
                {msg.message_type === 'decision' && (
                  <Badge className="bg-green-500 text-white text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Decision
                  </Badge>
                )}
                {/* Use internal selectedThread state for thread badge visibility */}
                {msg.thread_id && selectedThread && (
                  <Badge className="text-xs" variant="outline">
                    <Hash className="w-3 h-3 mr-1" />
                    Thread
                  </Badge>
                )}
              </div>
              <span className="text-xs opacity-75">
                {new Date(msg.created_date).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Message Content */}
          <div className="px-4 pb-3">
            {msg.message_type === 'file' ? (
              <div>
                <div className={`flex items-center gap-3 p-3 rounded-lg ${
                  isOwnMessage ? 'bg-blue-700' : 'bg-gray-50'
                }`}>
                  <FileText className={`w-5 h-5 ${isOwnMessage ? 'text-blue-200' : 'text-gray-500'}`} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{msg.file_name}</p>
                    <p className="text-xs opacity-75">{msg.content}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`w-8 h-8 ${
                      isOwnMessage
                        ? 'text-blue-200 hover:text-white hover:bg-blue-800'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    asChild
                  >
                    <a href={msg.file_url} download={msg.file_name} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : msg.message_type === 'decision' ? (
              <div>
                <p className="font-medium mb-2">{msg.content}</p>
                {msg.decision_details && (
                  <div className={`p-3 rounded-lg ${isOwnMessage ? 'bg-blue-700' : 'bg-green-50'}`}>
                    <div className="space-y-2">
                      <p className="font-medium text-sm">
                        {msg.decision_details.decision_title}
                      </p>
                      <p className="text-sm opacity-90">
                        {msg.decision_details.decision_summary}
                      </p>
                      {msg.decision_details.participants?.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4" />
                          <span>{msg.decision_details.participants.length} participants</span>
                        </div>
                      )}
                      {msg.decision_details.due_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {new Date(msg.decision_details.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="leading-relaxed">{msg.content}</p>
            )}

            {/* Message Tags */}
            {msg.tags && msg.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {msg.tags.map(tag => (
                  <Badge
                    key={tag}
                    className={`text-xs ${
                      isOwnMessage
                        ? 'bg-blue-500 text-blue-100'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Linked Documents */}
            {msg.linked_documents && msg.linked_documents.length > 0 && (
              <div className="mt-3">
                <div className={`flex items-center gap-2 text-xs mb-2 ${
                  isOwnMessage ? 'text-blue-200' : 'text-gray-600'
                }`}>
                  <Link2 className="w-3 h-3" />
                  <span>Linked documents:</span>
                </div>
                <div className="space-y-1">
                  {msg.linked_documents.slice(0, 3).map(docId => {
                    // Use `relatedDocuments` from internal state
                    const doc = relatedDocuments.find(d => d.id === docId);
                    return doc ? (
                      <div key={docId} className={`flex items-center gap-2 text-xs p-2 rounded ${
                        isOwnMessage ? 'bg-blue-700' : 'bg-gray-50'
                      }`}>
                        <FileText className="w-3 h-3" />
                        <span className="text-gray-700 text-xs font-medium truncate">{doc.title}</span>
                        {/* Optional: Add a link or button to view the document */}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {isOwnMessage && (
          <Avatar className="mt-1">
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm">
              {currentUser?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  // Show a loading spinner if data is being fetched and no messages are displayed yet
  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.length === 0 && !loading ? ( // Display "No messages" only if not loading and no messages
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">
              {/* Uses internal selectedThread state */}
              {selectedThread ? `Start the ${selectedThread.topic} discussion` : 'No messages yet'}
            </p>
            <p className="text-sm mt-1">
              {/* Uses internal selectedThread state */}
              {selectedThread
                ? 'Be the first to contribute to this thread'
                : 'Send a message to get the conversation started'
              }
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg, index) => renderMessage(msg, index))}

          {/* AI Context Suggestions Display */}
          {contextSuggestions && (contextSuggestions.conversation_insights?.length > 0 || contextSuggestions.suggested_tags?.length > 0 || contextSuggestions.suggested_documents?.length > 0) && (
            <div className="mt-8 p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-500" />
                AI Context Suggestions
              </h3>
              {contextSuggestions.conversation_insights?.length > 0 && (
                <div className="mb-4">
                  <p className="font-medium text-gray-700 mb-1">Key Insights:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 pl-4">
                    {contextSuggestions.conversation_insights.map((insight, i) => (
                      <li key={`insight-${i}`}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
              {contextSuggestions.suggested_tags?.length > 0 && (
                <div className="mb-4">
                  <p className="font-medium text-gray-700 mb-1">Suggested Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {contextSuggestions.suggested_tags.map((tag, i) => (
                      <Badge key={`tag-${i}`} variant="secondary" className="text-xs">
                        <Hash className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {contextSuggestions.suggested_documents?.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700 mb-1">Suggested Documents:</p>
                  <div className="space-y-2">
                    {contextSuggestions.suggested_documents.map(docId => {
                      // Use `relatedDocuments` from internal state
                      const doc = relatedDocuments.find(d => d.id === docId);
                      return doc ? (
                        <div key={docId} className="flex items-center gap-2 p-2 rounded-md bg-white border border-gray-100 shadow-sm">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-700 text-xs font-medium truncate">{doc.title}</span>
                          {/* Optional: Add a link or button to view the document */}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </>
      )}
      {/* NOTE: The chat input component is NOT part of ContextAwareChat's rendering.
          A parent component should render the input and call `handleSendMessage` using a prop.
          For example: <ChatInput onSendMessage={handleSendMessage} />
      */}
    </div>
  );
}
