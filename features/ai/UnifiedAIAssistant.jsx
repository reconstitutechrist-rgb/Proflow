import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Brain,
  Send,
  Loader2,
  X,
  Sparkles,
  FileText,
  CheckSquare,
  FolderOpen,
  MessageSquare,
  Target,
  ChevronDown,
  Pin,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { db } from '@/api/db';

// Page context mapping
const pageContextMap = {
  '/Dashboard': { type: 'dashboard', label: 'Dashboard', icon: Target },
  '/Projects': { type: 'projects', label: 'Projects', icon: FolderOpen },
  '/Assignments': { type: 'assignments', label: 'Assignments', icon: FolderOpen },
  '/Tasks': { type: 'tasks', label: 'Tasks', icon: CheckSquare },
  '/Documents': { type: 'documents', label: 'Documents', icon: FileText },
  '/DocumentsHub': { type: 'documents', label: 'Documents', icon: FileText },
  '/AIHub': { type: 'ai', label: 'AI Hub', icon: Brain },
  '/Chat': { type: 'chat', label: 'Chat', icon: MessageSquare },
};

// Quick actions based on current page
const getQuickActions = (pageType) => {
  const actions = {
    dashboard: [
      { label: "What should I focus on today?", query: "Based on my current tasks and deadlines, what should I prioritize today?" },
      { label: "Summarize my progress", query: "Give me a summary of my progress this week" },
    ],
    projects: [
      { label: "Create a project plan", query: "Help me create a project plan" },
      { label: "Suggest project milestones", query: "What milestones should I set for my project?" },
    ],
    assignments: [
      { label: "Break down this assignment", query: "Help me break down this assignment into tasks" },
      { label: "Suggest next steps", query: "What should be my next steps for this assignment?" },
    ],
    tasks: [
      { label: "Prioritize my tasks", query: "Help me prioritize my current tasks" },
      { label: "Create subtasks", query: "Break down this task into smaller subtasks" },
    ],
    documents: [
      { label: "Summarize this document", query: "Give me a summary of this document" },
      { label: "Suggest improvements", query: "How can I improve this document?" },
    ],
    ai: [
      { label: "What can you help with?", query: "What are the different ways you can help me?" },
      { label: "Research a topic", query: "Help me research" },
    ],
    chat: [
      { label: "Draft a message", query: "Help me draft a message" },
      { label: "Summarize conversation", query: "Summarize this conversation" },
    ],
  };
  return actions[pageType] || actions.dashboard;
};

export default function UnifiedAIAssistant() {
  const location = useLocation();
  const { currentWorkspaceId, currentWorkspace } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentContext, setCurrentContext] = useState(null);
  const messagesEndRef = useRef(null);

  // Get page context
  const pageContext = pageContextMap[location.pathname] || { type: 'general', label: 'General', icon: Brain };
  const quickActions = getQuickActions(pageContext.type);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load context based on current page
  useEffect(() => {
    const loadContext = async () => {
      if (!currentWorkspaceId) return;

      try {
        let context = {
          workspaceName: currentWorkspace?.name || 'Current Workspace',
          pageType: pageContext.type,
        };

        // Load additional context based on page
        if (pageContext.type === 'tasks') {
          const tasks = await db.entities.Task.filter({ workspace_id: currentWorkspaceId }, "-updated_date", 10);
          context.recentTasks = tasks.slice(0, 5);
          context.taskCount = tasks.length;
        } else if (pageContext.type === 'projects') {
          const projects = await db.entities.Project.filter({ workspace_id: currentWorkspaceId }, "-updated_date", 10);
          context.recentProjects = projects.slice(0, 5);
          context.projectCount = projects.length;
        } else if (pageContext.type === 'assignments') {
          const assignments = await db.entities.Assignment.filter({ workspace_id: currentWorkspaceId }, "-updated_date", 10);
          context.recentAssignments = assignments.slice(0, 5);
          context.assignmentCount = assignments.length;
        }

        setCurrentContext(context);
      } catch (error) {
        console.error('Error loading context:', error);
      }
    };

    loadContext();
  }, [currentWorkspaceId, currentWorkspace, pageContext.type, location.pathname]);

  const handleSendMessage = async (messageText = inputValue) => {
    if (!messageText.trim() || isProcessing) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      // Build context prompt
      let contextPrompt = `You are an AI assistant for the Proflow project management application.
      The user is currently on the ${pageContext.label} page in the "${currentContext?.workspaceName || 'workspace'}" workspace.`;

      if (currentContext?.recentTasks) {
        contextPrompt += `\n\nRecent tasks: ${currentContext.recentTasks.map(t => t.title).join(', ')}`;
      }
      if (currentContext?.recentProjects) {
        contextPrompt += `\n\nRecent projects: ${currentContext.recentProjects.map(p => p.name).join(', ')}`;
      }
      if (currentContext?.recentAssignments) {
        contextPrompt += `\n\nRecent assignments: ${currentContext.recentAssignments.map(a => a.name).join(', ')}`;
      }

      // Call AI API
      const response = await db.integrations.Core.InvokeLLM({
        prompt: `${contextPrompt}\n\nUser question: ${messageText}`,
        response_json_schema: null,
        add_context_from_internet: false
      });

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response || "I couldn't generate a response. Please try again.",
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get AI response');

      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
        error: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAction = (query) => {
    handleSendMessage(query);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const PageIcon = pageContext.icon;

  return (
    <>
      {/* Floating Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            className="fixed bottom-20 md:bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 z-40"
            size="icon"
          >
            <Brain className="w-6 h-6 text-white" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-left">AI Assistant</SheetTitle>
                  <SheetDescription className="text-left flex items-center gap-1">
                    <PageIcon className="w-3 h-3" />
                    {pageContext.label}
                  </SheetDescription>
                </div>
              </div>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearChat}>
                  Clear
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    How can I help you?
                  </h3>
                  <p className="text-sm text-gray-500">
                    Ask me anything about your {pageContext.label.toLowerCase()}
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">Quick Actions</p>
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => handleQuickAction(action.query)}
                    >
                      <Sparkles className="w-4 h-4 mr-2 text-purple-500 shrink-0" />
                      <span className="truncate">{action.label}</span>
                    </Button>
                  ))}
                </div>

                {/* Context Info */}
                {currentContext && (
                  <Card className="mt-4">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Pin className="w-4 h-4" />
                        Current Context
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <p>Workspace: {currentContext.workspaceName}</p>
                        {currentContext.taskCount > 0 && (
                          <p>Tasks: {currentContext.taskCount}</p>
                        )}
                        {currentContext.projectCount > 0 && (
                          <p>Projects: {currentContext.projectCount}</p>
                        )}
                        {currentContext.assignmentCount > 0 && (
                          <p>Assignments: {currentContext.assignmentCount}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : message.error
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-purple-200' : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-white dark:bg-gray-900">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything..."
                disabled={isProcessing}
                className="flex-1"
              />
              <Button type="submit" disabled={isProcessing || !inputValue.trim()}>
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
