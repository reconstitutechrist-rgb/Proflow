import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  X,
  Send,
  Minimize2,
  Maximize2,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  AlertTriangle,
  Search,
  Copy,
  Edit2,
  Trash2,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import MessageBubble from "./AIMessageBubble";
import SmartContextDetector from "./SmartContextDetector";

const showToast = {
  success: (message) => console.log("✅", message),
  error: (message) => console.error("❌", message),
};

const classNames = (...classes) => classes.filter(Boolean).join(" ");

export default function AIAssistantWidget({ currentPageName, workspaceId }) {
  // Added workspaceId prop
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [currentTip, setCurrentTip] = useState("");
  const [messageFeedback, setMessageFeedback] = useState({});
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [smartSuggestion, setSmartSuggestion] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [agentConversation, setAgentConversation] = useState(null); // New state for agent conversation object
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [seenTips, setSeenTips] = useState(() => {
    try {
      const saved = localStorage.getItem("ai_assistant_seen_tips");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [feedbackDialog, setFeedbackDialog] = useState({
    isOpen: false,
    messageId: null,
    rating: null,
    comment: "",
  });

  const [editDialog, setEditDialog] = useState({
    isOpen: false,
    messageId: null,
    originalContent: "",
    editedContent: "",
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isMountedRef = useRef(true);
  const searchInputRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me(); // Changed from base44.entities.User.me()
        if (isMountedRef.current) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const getEnhancedContext = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const context = {
      current_page: currentPageName,
      url: window.location.pathname,
      timestamp: new Date().toISOString(),
    };

    if (urlParams.has("assignment")) {
      context.current_entity_type = "assignment";
      context.current_entity_id = urlParams.get("assignment");
    } else if (urlParams.has("doc") || urlParams.has("document")) {
      context.current_entity_type = "document";
      context.current_entity_id =
        urlParams.get("doc") || urlParams.get("document");
    } else if (urlParams.has("task")) {
      context.current_entity_type = "task";
      context.current_entity_id = urlParams.get("task");
    } else if (urlParams.has("thread")) {
      context.current_entity_type = "conversation_thread";
      context.current_entity_id = urlParams.get("thread");
    }

    return context;
  }, [currentPageName]);

  const pageTips = useCallback(
    () => ({
      Dashboard:
        "💡 Tip: You can quickly access key metrics and recent activity here. Try asking me about your assignment statistics!",
      Assignments:
        "💡 Tip: After creating an assignment, you can auto-generate tasks using workflow patterns. Just ask me how!",
      Documents:
        "💡 Tip: You can use AI to analyze any document for key points, compliance issues, or generate summaries. Want to try?",
      Tasks:
        "💡 Tip: Drag tasks between columns to update their status, or ask me to create tasks based on your assignment needs.",
      Chat: "💡 Tip: You can capture important decisions from conversations and convert them to action items automatically!",
      AskAI:
        "💡 Tip: Upload documents here and ask specific questions. The AI will search through your documents to answer!",
      Research:
        "💡 Tip: Use this for complex research like permits, licenses, or compliance requirements. The AI searches the web for you!",
      Generate:
        "💡 Tip: You can generate professional documents from templates or even have a conversation to build content iteratively.",
    }),
    []
  );

  useEffect(() => {
    const tips = pageTips();
    if (
      currentPageName &&
      tips[currentPageName] &&
      !isOpen &&
      !seenTips.includes(currentPageName)
    ) {
      setCurrentTip(tips[currentPageName]);
      setShowTip(true);

      const updatedSeenTips = [...seenTips, currentPageName];
      setSeenTips(updatedSeenTips);
      try {
        localStorage.setItem(
          "ai_assistant_seen_tips",
          JSON.stringify(updatedSeenTips)
        );
      } catch (err) {
        console.error("Failed to save seen tips:", err);
      }

      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setShowTip(false);
        }
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [currentPageName, isOpen, seenTips, pageTips]);

  const initConversation = useCallback(async () => {
    try {
      const currentPage = currentPageName;
      const conversation = await base44.agents.createConversation({
        agent_name: "ProjectFlowExpert",
        metadata: {
          name: `ProjectFlow Session - ${new Date().toLocaleString()}`,
          description: `AI Assistant conversation on ${currentPage} page`,
          page: currentPage,
        },
      });

      if (!isMountedRef.current) return;

      setConversationId(conversation.id);
      setAgentConversation(conversation);

      const welcomeMessage = {
        id: "welcome",
        role: "assistant",
        content: `👋 Hi! I'm your ProjectFlow AI Assistant. I'm here to help you navigate the app, answer questions, and **execute tasks for you**.

**I can help you with:**
- Understanding features and how to use them
- **Creating, updating, and deleting projects, assignments, tasks, and notes**
- Finding specific items across the app
- Sending messages to team members
- Suggesting workflows and best practices
- Troubleshooting issues

**Just tell me what you want to do, and I'll handle it for you** (with your confirmation, of course)!

What can I help you with today?`,
        timestamp: new Date().toISOString(),
      };

      setMessages([welcomeMessage]);

      const unsubscribe = base44.agents.subscribeToConversation(
        conversation.id,
        (data) => {
          if (isMountedRef.current) {
            const agentMessages = data.messages
              .filter((msg) => msg.id !== "welcome")
              .map((msg) => ({
                id:
                  msg.id ||
                  `msg_${Date.now()}_${Math.random()
                    .toString(36)
                    .substring(7)}`, // Ensure unique ID
                role: msg.role,
                content: msg.content || "",
                timestamp: msg.timestamp || new Date().toISOString(),
                tool_calls: msg.tool_calls || undefined,
                is_tool_call: !!msg.tool_calls, // Flag for rendering, if MessageBubble needs it
              }));

            setMessages((prev) => {
              const currentWelcome = prev.find((m) => m.id === "welcome");
              return currentWelcome
                ? [currentWelcome, ...agentMessages]
                : [...agentMessages];
            });

            if (
              data.status === "processing" ||
              data.status === "awaiting_tool_code"
            ) {
              setIsLoading(true);
            } else {
              setIsLoading(false);
            }

            if (data.status === "failed") {
              setError(
                data.error_message || "An error occurred with the AI assistant."
              );
              showToast.error("AI Assistant encountered an error.");
            } else {
              setError(null);
            }
          }
        }
      );

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (error) {
      console.error("Error initializing conversation:", error);
      showToast.error("Failed to initialize AI assistant");
      if (isMountedRef.current) {
        setIsLoading(false);
        setError("Failed to initialize AI assistant. Please try again.");
      }
    }
  }, [currentPageName]);

  useEffect(() => {
    if (isOpen) {
      const cleanup = initConversation();
      return cleanup;
    }
  }, [isOpen, initConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current && !showSearch) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized, showSearch]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleSendMessage = async (messageText = null) => {
    const textToSend = messageText || inputValue.trim();
    if (!textToSend || isLoading) return;

    if (!messageText) {
      setInputValue("");
    }

    if (!agentConversation) {
      showToast.error("AI Assistant not ready. Please refresh.");
      return;
    }

    const userMessage = {
      id: "msg_" + Date.now(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    setSmartSuggestion(null);

    try {
      const context = getEnhancedContext();

      const [tasks, assignments, projects, user] = await Promise.all([
        base44.entities.Task.list("-updated_date", 50).catch((err) => {
          console.warn("Failed to fetch tasks:", err);
          return [];
        }),
        base44.entities.Assignment.list().catch((err) => {
          console.warn("Failed to fetch assignments:", err);
          return [];
        }),
        base44.entities.Project.list().catch((err) => {
          console.warn("Failed to fetch projects:", err);
          return [];
        }),
        base44.auth.me().catch((err) => {
          console.warn("Failed to fetch current user:", err);
          return null;
        }), // Changed from base44.entities.User.me()
      ]);

      const contextInfo = `
Current System Context:
- Page: ${context.current_page}
- URL: ${context.url}
${
  context.current_entity_type
    ? `- Viewing: ${context.current_entity_type} (ID: ${context.current_entity_id})`
    : ""
}
- User Email: ${user?.email || "Unknown"}
- User ID: ${user?.id || "Unknown"}
- User Role: ${user?.user_role || "Unknown"}

Recent Projects (${projects.length > 0 ? projects.length : "none"}):
${projects
  .slice(0, 5)
  .map((p) => `- ${p.name} (ID: ${p.id}, Status: ${p.status || "N/A"})`)
  .join("\n")}

Recent Assignments (${assignments.length > 0 ? assignments.length : "none"}):
${assignments
  .slice(0, 10)
  .map(
    (a) =>
      `- ${a.name} (ID: ${a.id}, Status: ${a.status || "N/A"}, Project ID: ${
        a.project_id || "None"
      })`
  )
  .join("\n")}

Recent Tasks (${tasks.length > 0 ? tasks.length : "none"}):
${tasks
  .slice(0, 10)
  .map(
    (t) =>
      `- [${t.status}] ${t.title} (ID: ${t.id}, Assigned: ${
        t.assigned_to_email || t.assigned_to || "Unassigned"
      })`
  )
  .join("\n")}

User Input: ${textToSend}

Based on the user's input and the provided system context, respond to the user.
If the user's input implies an action (like creating a task), use the available tools to perform that action.
Always confirm with the user before performing destructive actions like deletion.
Be specific and clear about what you are doing.
`;

      await base44.agents.addMessage(agentConversation, {
        role: "user",
        content: contextInfo,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      if (isMountedRef.current) {
        setError("Failed to get response from AI Assistant. Please try again.");
        showToast.error("Failed to send message to AI Assistant");

        const errorMessage = {
          id: "msg_" + (Date.now() + 1),
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      // setIsLoading(false) is now handled by the subscription based on agent status
    }
  };

  const handleCopyMessage = async (messageContent) => {
    try {
      await navigator.clipboard.writeText(messageContent);
      showToast.success("Message copied to clipboard!");
      setCopiedMessageId(Date.now().toString());
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      showToast.error("Failed to copy message");
    }
  };

  const handleEditMessage = (messageId, content) => {
    setEditDialog({
      isOpen: true,
      messageId,
      originalContent: content,
      editedContent: content,
    });
  };

  const handleSaveEdit = async () => {
    const { messageId, editedContent } = editDialog;

    if (!editedContent.trim()) {
      showToast.error("Message cannot be empty");
      return;
    }

    // Update the message locally for immediate feedback
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: editedContent, edited: true }
          : msg
      )
    );

    // Close dialog
    setEditDialog({
      isOpen: false,
      messageId: null,
      originalContent: "",
      editedContent: "",
    });

    // Resend the conversation with edited message
    handleSendMessage(editedContent);
  };

  const handleDeleteMessage = (messageId) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    showToast.success("Message deleted");
  };

  const handleSearch = (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setHighlightedMessageId(null);
      return;
    }

    // Find first matching message
    const matchingMessage = messages.find((msg) =>
      msg.content.toLowerCase().includes(query.toLowerCase())
    );

    if (matchingMessage) {
      setHighlightedMessageId(matchingMessage.id);
      // Scroll to message
      document.getElementById(`message-${matchingMessage.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } else {
      setHighlightedMessageId(null);
    }
  };

  const filteredMessages = searchQuery
    ? messages.filter((msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const handleFeedback = async (messageId, isPositive) => {
    const rating = isPositive ? "positive" : "negative";

    setMessageFeedback((prev) => ({
      ...prev,
      [messageId]: rating,
    }));

    setFeedbackDialog({
      isOpen: true,
      messageId,
      rating,
      comment: "",
    });
  };

  const saveFeedback = async () => {
    const { messageId, rating, comment } = feedbackDialog;

    if (!currentUser || !conversationId || !messageId) {
      showToast.error(
        "Unable to save feedback: Missing user, conversation, or message info."
      );
      return;
    }
    // P0 Critical Fix: Workspace scoping validation
    if (!workspaceId) {
      showToast.error("Unable to save feedback: Workspace context missing.");
      console.error(
        "Critical: workspaceId is null or undefined when trying to save feedback."
      );
      return;
    }

    try {
      const message = messages.find((m) => m.id === messageId);
      const messageContent = message?.content || "";
      const enhancedContext = getEnhancedContext();

      await base44.entities.AIAssistantFeedback.create({
        // Changed to base44.entities.AIAssistantFeedback
        workspace_id: workspaceId, // ADDED: Workspace scoping
        conversation_id: conversationId,
        message_id: messageId,
        message_content: messageContent.substring(0, 500),
        user_email: currentUser.email,
        rating: rating,
        feedback_comment: comment || undefined,
        context: {
          // Structured context as per outline
          page: enhancedContext.current_page,
          entity_type: enhancedContext.current_entity_type || null,
          entity_id: enhancedContext.current_entity_id || null,
        },
        agent_name: "ProjectFlowExpert",
      });

      showToast.success(
        rating === "positive"
          ? "Thanks for the feedback! 👍"
          : "Thanks for the feedback. I'll try to improve! 👎"
      );

      setFeedbackDialog({
        isOpen: false,
        messageId: null,
        rating: null,
        comment: "",
      });
    } catch (error) {
      console.error("Error saving feedback:", error);
      showToast.error("Failed to save feedback");
    }
  };

  const handleNewConversation = async () => {
    setMessages([]);
    setConversationId(null);
    setAgentConversation(null); // Clear agentConversation as well
    setMessageFeedback({});
    setError(null);
    setSmartSuggestion(null);
    setSearchQuery("");
    setShowSearch(false);
    await initConversation(); // Await the new async init
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowSearch(false);
    setSearchQuery("");
  };

  const handleSmartSuggestion = useCallback(
    (suggestion) => {
      if (!isOpen && suggestion) {
        // Ensure suggestion is only shown when widget is closed
        setSmartSuggestion(suggestion);
        setShowTip(true);
      }
    },
    [isOpen]
  );

  // The previous if (!isOpen) return (...) block is removed and its content is integrated below.

  return (
    <>
      <SmartContextDetector onSuggestion={handleSmartSuggestion} />

      {showTip && (currentTip || smartSuggestion) && !isOpen && (
        <div className="fixed bottom-24 right-6 z-40 max-w-sm animate-in slide-in-from-bottom-5">
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800 shadow-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {smartSuggestion ? (
                  <>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                      {smartSuggestion.title}
                    </h4>
                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line mb-3">
                      {smartSuggestion.message}
                    </p>
                    {smartSuggestion.actions &&
                      smartSuggestion.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {smartSuggestion.actions.map((action) => (
                            <Button
                              key={action.label}
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => {
                                setIsOpen(true);
                                setTimeout(() => {
                                  handleSendMessage(action.prompt);
                                }, 500);
                              }}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                  </>
                ) : (
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {currentTip}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => {
                  setShowTip(false);
                  setSmartSuggestion(null);
                }}
                aria-label="Close tip"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* This button should only be visible when the AI assistant is NOT open */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 z-50 group"
          aria-label="Open AI Assistant"
          title="Open AI Assistant"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white" />
            <div className="absolute -top-1 -right-1">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
            </div>
          </div>
        </Button>
      )}

      {/* Main AI Assistant Card, only visible when isOpen is true */}
      {isOpen && (
        <Card
          className={classNames(
            "fixed bottom-6 right-6 shadow-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl z-50 flex flex-col",
            "w-[calc(100vw-3rem)] sm:w-96",
            "max-w-[500px]",
            isMinimized ? "h-16" : "h-[600px] max-h-[80vh]"
          )}
          role="dialog"
          aria-label="AI Assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <Bot className="w-5 h-5" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 rounded-full border border-white"></div>
              </div>
              <h3 className="font-semibold text-sm truncate">ProjectFlow AI</h3>
              <p className="text-xs opacity-90 truncate">
                Can manage tasks & assignments
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge
                variant="secondary"
                className="text-[10px] bg-white/20 text-white border-0 hidden sm:inline-flex"
              >
                {currentPageName}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className={classNames(
                  "h-8 w-8 text-white hover:bg-white/20 flex-shrink-0",
                  showSearch && "bg-white/20"
                )}
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (!showSearch) {
                    setSearchQuery("");
                    setHighlightedMessageId(null);
                  }
                }}
                aria-label="Search conversation"
              >
                <Search className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0"
                onClick={() => setIsMinimized(!isMinimized)}
                aria-label={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0"
                onClick={handleClose}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Search Bar */}
              {showSearch && (
                <div className="p-3 border-b bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search in conversation..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-9 pr-8 bg-white dark:bg-gray-800"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => {
                          setSearchQuery("");
                          setHighlightedMessageId(null);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {searchQuery && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Found {filteredMessages.length} message
                      {filteredMessages.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50/50 to-white/50 dark:from-gray-900/50 dark:to-gray-800/50">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">Error</p>
                        <p className="text-xs mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    id={`message-${message.id}`}
                    className={classNames(
                      "space-y-2 transition-all",
                      highlightedMessageId === message.id &&
                        "bg-yellow-100 dark:bg-yellow-900/20 -mx-2 px-2 py-1 rounded-lg"
                    )}
                  >
                    <MessageBubble message={message} />

                    {message.role === "user" && message.id !== "welcome" && (
                      <div className="flex items-center gap-1 ml-11">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyMessage(message.content)}
                          title="Copy message"
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            handleEditMessage(message.id, message.content)
                          }
                          title="Edit and resend"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteMessage(message.id)}
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {message.role === "assistant" &&
                      message.id !== "welcome" && (
                        <div className="flex items-center gap-2 ml-11">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyMessage(message.content)}
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={classNames(
                              "h-6 w-6",
                              messageFeedback[message.id] === "positive" &&
                                "text-green-600"
                            )}
                            onClick={() => handleFeedback(message.id, true)}
                            title="Good response"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={classNames(
                              "h-6 w-6",
                              messageFeedback[message.id] === "negative" &&
                                "text-red-600"
                            )}
                            onClick={() => handleFeedback(message.id, false)}
                            title="Bad response"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                <div className="flex gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handleNewConversation}
                    disabled={isLoading}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    New Chat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setShowTip(true)}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Show Tip
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me to create, update, or delete tasks..."
                    className="flex-1 bg-white dark:bg-gray-800"
                    disabled={isLoading}
                    aria-label="Message input"
                  />
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() || isLoading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex-shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 text-center">
                  AI can make mistakes. Verify important information.
                </p>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Feedback Dialog */}
      <Dialog
        open={feedbackDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFeedbackDialog({
              isOpen: false,
              messageId: null,
              rating: null,
              comment: "",
            });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {feedbackDialog.rating === "positive"
                ? "👍 Thanks for the positive feedback!"
                : "👎 Help us improve"}
            </DialogTitle>
            <DialogDescription>
              {feedbackDialog.rating === "positive"
                ? "Would you like to add any comments about what worked well?"
                : "We'd love to know what we can improve. Your feedback helps us get better!"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Optional: Share your thoughts..."
              value={feedbackDialog.comment}
              onChange={(e) =>
                setFeedbackDialog((prev) => ({
                  ...prev,
                  comment: e.target.value,
                }))
              }
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setFeedbackDialog({
                  isOpen: false,
                  messageId: null,
                  rating: null,
                  comment: "",
                })
              }
            >
              Skip
            </Button>
            <Button onClick={saveFeedback}>Submit Feedback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Message Dialog */}
      <Dialog
        open={editDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditDialog({
              isOpen: false,
              messageId: null,
              originalContent: "",
              editedContent: "",
            });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
            <DialogDescription>
              Edit your message and resend it to continue the conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editDialog.editedContent}
              onChange={(e) =>
                setEditDialog((prev) => ({
                  ...prev,
                  editedContent: e.target.value,
                }))
              }
              className="min-h-[150px]"
              placeholder="Edit your message..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setEditDialog({
                  isOpen: false,
                  messageId: null,
                  originalContent: "",
                  editedContent: "",
                })
              }
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save & Resend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
