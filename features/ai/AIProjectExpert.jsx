import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Send, Loader2, FileText, User, Sparkles, MessageSquare } from 'lucide-react';
import { InvokeLLM } from '@/api/integrations'; // This import is used directly for LLM invocation
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';
import { db } from '@/api/db';

// The db client provides access to entities and authentication functions
// (e.g., `db.entities.Assignment`, `db.auth.me()`).

export default function AIProjectExpert({ assignmentId }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false); // Indicates if AI is currently generating a response
  const [chatHistory, setChatHistory] = useState([]); // Stores all chat messages
  const [context, setContext] = useState(null); // Stores assignment, tasks, and documents
  const [currentAuthUser, setCurrentAuthUser] = useState(null); // Stores authenticated user details
  const [isContextLoading, setIsContextLoading] = useState(true); // Tracks initial context loading state

  const messagesEndRef = useRef(null);

  const { currentWorkspaceId } = useWorkspace();

  // Effect to fetch current authenticated user details once on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await db.auth.me(); // Assumes db.auth.me() exists and returns user info
        setCurrentAuthUser(user);
      } catch (error) {
        console.error('Error fetching current user:', error);
        toast.error('Failed to load user information.');
      }
    };
    fetchUser();
  }, []);

  // Effect to load project context and chat history when dependencies change
  useEffect(() => {
    if (assignmentId && currentWorkspaceId && currentAuthUser) {
      setIsContextLoading(true);
      loadContext();
      loadChatHistory();
    } else if (!assignmentId || !currentWorkspaceId || !currentAuthUser) {
      // Clear context and history if essential IDs or user are missing
      setContext(null);
      setChatHistory([]);
      setIsContextLoading(false);
    }
  }, [assignmentId, currentWorkspaceId, currentAuthUser, loadChatHistory, loadContext]); // Dependencies for re-fetching

  // Effect to scroll to the bottom of the chat when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // useCallback for loadContext to prevent unnecessary re-creations
  const loadContext = useCallback(async () => {
    if (!assignmentId || !currentWorkspaceId) {
      console.warn('loadContext called without assignmentId or currentWorkspaceId');
      setIsContextLoading(false);
      return;
    }
    try {
      // CRITICAL: Only load data from the current workspace for security
      const [assignments, tasks, documents] = await Promise.all([
        db.entities.Assignment.filter(
          {
            workspace_id: currentWorkspaceId,
            id: assignmentId,
          },
          '-updated_date',
          1
        ), // Fetching a single assignment
        db.entities.Task.filter(
          {
            workspace_id: currentWorkspaceId,
            assignment_id: assignmentId,
          },
          '-updated_date'
        ),
        db.entities.Document.filter(
          {
            workspace_id: currentWorkspaceId,
            assigned_to_assignments: { $in: [assignmentId] },
          },
          '-updated_date'
        ),
      ]);

      const currentAssignment = assignments[0];

      // CRITICAL: Validate that the fetched assignment belongs to the current workspace
      if (!currentAssignment || currentAssignment.workspace_id !== currentWorkspaceId) {
        console.error('Security violation: Assignment not in current workspace or not found.');
        toast.error('Cannot access assignment from other workspaces or assignment not found.');
        setContext(null); // Clear context if security violation or not found
        setIsContextLoading(false);
        return;
      }

      setContext({
        assignment: currentAssignment,
        tasks: tasks,
        documents: documents,
      });
      setIsContextLoading(false);
    } catch (error) {
      console.error('Error loading context:', error);
      toast.error('Failed to load assignment context.');
      setContext(null);
      setIsContextLoading(false);
    }
  }, [assignmentId, currentWorkspaceId]); // Dependencies for loadContext

  // useCallback for loadChatHistory to prevent unnecessary re-creations
  const loadChatHistory = useCallback(async () => {
    if (!assignmentId || !currentWorkspaceId || !currentAuthUser) {
      console.warn(
        'loadChatHistory called without assignmentId, currentWorkspaceId, or currentAuthUser'
      );
      return;
    }
    try {
      // CRITICAL: Only load chat history from the current workspace for security
      const history = await db.entities.AIChat.filter(
        {
          workspace_id: currentWorkspaceId,
          assignment_id: assignmentId,
        },
        '-created_date',
        100
      ); // Fetching up to 100 recent messages

      // Map to add `isUser` flag for rendering, and reverse to display chronologically ascending
      const formattedHistory = history
        .map((msg) => ({
          ...msg,
          isUser: msg.user_email === currentAuthUser?.email,
        }))
        .reverse();

      setChatHistory(formattedHistory);
    } catch (error) {
      console.error('Error loading chat history:', error);
      toast.error('Failed to load chat history.');
    }
  }, [assignmentId, currentWorkspaceId, currentAuthUser]); // Dependencies for loadChatHistory

  const handleAskQuestion = async () => {
    // Basic validations
    if (!question.trim() || !context?.assignment || !currentWorkspaceId || !currentAuthUser) {
      toast.error(
        'Please provide a question, ensure project context is loaded, and you are logged in.'
      );
      return;
    }
    if (loading) return; // Prevent multiple submissions

    // CRITICAL: Validate assignment context for security before proceeding
    if (context.assignment.workspace_id !== currentWorkspaceId) {
      toast.error('Cannot query assignments from other workspaces.');
      return;
    }

    const userQuestion = question.trim();
    setQuestion(''); // Clear input field
    setLoading(true); // Start loading state

    // Add a temporary user message to the chat history for immediate UI feedback
    const tempUserMessage = {
      id: `temp-user-${Date.now()}`, // Unique ID for temporary message
      question: userQuestion,
      response: '', // Will be filled by AI
      user_email: currentAuthUser.email,
      assignment_id: assignmentId, // Use assignmentId
      chat_type: 'assignment_question',
      created_date: new Date().toISOString(),
      isUser: true,
      confidence_score: 100, // User messages are 100% confident
    };
    setChatHistory((prev) => [...prev, tempUserMessage]);
    scrollToBottom(); // Scroll to show the new message

    try {
      // Prepare context for the AI prompt
      const documentContext = context.documents
        .filter((doc) => doc.ai_analysis?.summary)
        .map(
          (doc) =>
            `Document: ${doc.title}\nSummary: ${
              doc.ai_analysis.summary
            }\nKey Points: ${doc.ai_analysis.key_points?.join(', ') || 'None'}`
        )
        .join('\n\n');

      const projectContext = `Project: ${context.assignment.name}\nDescription: ${context.assignment.description}\nStatus: ${context.assignment.status}\nPriority: ${context.assignment.priority}`;

      // Include recent chat history in the prompt for conversational context
      const recentChatHistoryForPrompt = chatHistory
        .slice(-5)
        .map((msg) => {
          if (msg.isUser) return `User: ${msg.question}`;
          return `AI: ${msg.response}`;
        })
        .join('\n');

      const prompt = `You are an AI project expert assistant helping team members understand their project. Answer the user's question based on the project information and uploaded documents.

Project Context:
${projectContext}

Document Context:
${documentContext}

Recent Chat History (for context, do not repeat previous answers unless explicitly asked):
${recentChatHistoryForPrompt}

User Question: "${userQuestion}"

Please provide a helpful, accurate answer based on the available information. If you don't have enough information to answer fully, mention what additional documents or information would be helpful. Be conversational and friendly while being informative.

If this is a new team member asking basic questions, provide extra context to help them understand the project better.`;

      // Invoke LLM with a structured response schema to get detailed AI output
      const aiResponse = await InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            confidence: { type: 'number' },
            source_documents: {
              type: 'array',
              items: { type: 'string' },
            },
            suggestions: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['answer'], // 'answer' is always required
        },
      });

      // Save the AI chat record to the database
      const aiChatRecord = await db.entities.AIChat.create({
        workspace_id: currentWorkspaceId, // CRITICAL: Ensure workspace scoping for saved chats
        assignment_id: assignmentId,
        user_email: currentAuthUser.email,
        question: userQuestion,
        response: aiResponse.answer, // Use the structured answer from AI
        source_documents: aiResponse.source_documents || [], // Use source documents from AI
        confidence_score: aiResponse.confidence || 85, // Use confidence from AI, or default
        chat_type: 'assignment_question',
        created_date: new Date().toISOString(), // Record creation date for sorting
      });

      // Update chat history: remove the temporary user message and add the final AI response
      // `suggestions` are not persisted in `AIChat` entity, so they are merged for immediate display.
      setChatHistory((prev) => {
        const updatedHistory = prev.filter((msg) => msg.id !== tempUserMessage.id);
        return [
          ...updatedHistory,
          {
            ...aiChatRecord,
            isUser: false,
            suggestions: aiResponse.suggestions || [], // Add suggestions to the latest AI message object
          },
        ];
      });
      scrollToBottom();
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get AI response. Please try again.');

      // If an error occurs, update chat history with an error message
      setChatHistory((prev) => {
        const updatedHistory = prev.filter((msg) => msg.id !== tempUserMessage.id); // Remove temporary user message
        return [
          ...updatedHistory,
          {
            id: `error-${Date.now()}`, // Unique ID for error message
            question: userQuestion,
            response:
              "I'm sorry, I encountered an error while processing your question. Please try again.",
            user_email: 'ai-error',
            assignment_id: assignmentId, // Use assignmentId
            created_date: new Date().toISOString(),
            isUser: false,
            confidence_score: 0,
          },
        ];
      });
      scrollToBottom();
    } finally {
      setLoading(false); // End loading state
    }
  };

  const suggestedQuestions = [
    'What are the main goals of this project?',
    'What are our key deliverables and deadlines?',
    'Who are the main stakeholders?',
    'What features are we building?',
    'What are the technical requirements?',
    'Tell me about the project timeline',
  ];

  // Render loading state while user or workspace information is being fetched
  if (!assignmentId || !currentWorkspaceId || !currentAuthUser) {
    return (
      <Card className="border-0 shadow-lg h-[600px] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
        <p className="text-gray-600">Loading user and workspace information...</p>
      </Card>
    );
  }

  // Render loading state while project context is being fetched
  if (isContextLoading) {
    return (
      <Card className="border-0 shadow-lg h-[600px] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
        <p className="text-gray-600">Loading project context...</p>
      </Card>
    );
  }

  // Render if no assignment is found or selected
  if (!context?.assignment) {
    return (
      <Card className="border-0 shadow-lg h-[600px] flex flex-col items-center justify-center">
        <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="font-semibold text-gray-900 mb-2">No Project Selected or Found</h3>
        <p className="text-gray-600">
          Please select an assignment to start chatting with the AI expert.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg h-[600px] flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-600" />
          AI Project Expert
          <Badge className="bg-purple-100 text-purple-700 ml-2">
            <Sparkles className="w-3 h-3 mr-1" />
            Powered by AI
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Ask me anything about {context.assignment.name}. I've analyzed all project documents to
          help answer your questions.
        </p>
        {/* The 'Analyze Project' button and insights display have been removed as per the new outline. */}
      </CardHeader>

      {/* Chat Messages Display Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-16 h-16 mx-auto mb-4 text-purple-300" />
            <h3 className="font-semibold text-gray-900 mb-2">Welcome to AI Project Expert!</h3>
            <p className="text-gray-600 mb-6">
              I can help you understand this project. Try asking:
            </p>
            <div className="space-y-2">
              {suggestedQuestions.slice(0, 3).map((questionText) => (
                <Button
                  key={questionText}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuestion(questionText)}
                  className="text-sm"
                >
                  {questionText}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          chatHistory.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.isUser ? 'justify-end' : ''}`}>
              {!message.isUser && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-purple-100">
                    <Bot className="w-4 h-4 text-purple-600" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={`max-w-md rounded-lg p-3 ${
                  message.isUser ? 'bg-blue-600 text-white' : 'bg-white border shadow-sm'
                }`}
              >
                {message.isUser ? (
                  <p>{message.question}</p>
                ) : (
                  <div>
                    <p className="text-gray-900 mb-2">{message.response}</p>

                    {message.confidence_score !== undefined && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                        <Badge variant="secondary" className="text-xs">
                          {message.confidence_score}% confidence
                        </Badge>
                        {message.source_documents?.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            {message.source_documents.length} sources
                          </Badge>
                        )}
                      </div>
                    )}

                    {message.suggestions?.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">You might also ask:</p>
                        <div className="space-y-1">
                          {message.suggestions.slice(0, 2).map((suggestion) => (
                            <Button
                              key={suggestion}
                              variant="ghost"
                              size="sm"
                              onClick={() => setQuestion(suggestion)}
                              className="text-xs h-auto p-1 text-blue-600 hover:text-blue-700"
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs opacity-75 mt-2">
                  {new Date(message.created_date).toLocaleTimeString()}
                </p>
              </div>

              {message.isUser && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    {currentAuthUser?.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('') || currentAuthUser?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-purple-100">
                <Bot className="w-4 h-4 text-purple-600" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-white border shadow-sm rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span className="text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about features, requirements, deadlines..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
            disabled={loading || !context?.assignment} // Disable if loading or no assignment context
            className="flex-1"
          />
          <Button
            onClick={handleAskQuestion}
            disabled={loading || !question.trim() || !context?.assignment}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}
