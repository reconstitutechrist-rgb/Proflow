import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  CheckSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/api/db';
import { Task } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';
import MessageBubble from './AIMessageBubble';
import SmartContextDetector from './SmartContextDetector';
import TaskProposalPanel from './TaskProposalPanel';
import {
  parseDateString,
  validateTaskStructure,
  checkForDuplicates,
  validateRecurrencePattern,
  validateSubtasks,
  TASK_TEMPLATES,
  saveTaskDraft,
  loadTaskDraft,
  clearTaskDraft,
} from '@/utils/taskUtils';

const showToast = {
  success: (message) => console.log('✅', message),
  error: (message) => console.error('❌', message),
};

const classNames = (...classes) => classes.filter(Boolean).join(' ');

export default function AIAssistantWidget({ currentPageName, workspaceId }) {
  // Added workspaceId prop
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [messageFeedback, setMessageFeedback] = useState({});
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [smartSuggestion, setSmartSuggestion] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [agentConversation, setAgentConversation] = useState(null); // New state for agent conversation object
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  // Task proposal workflow state
  const [proposedTasks, setProposedTasks] = useState([]);
  const [existingTasks, setExistingTasks] = useState([]);
  const [failedTasks, setFailedTasks] = useState([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);
  const [isTaskCreating, setIsTaskCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState({
    current: 0,
    total: 0,
    currentTask: '',
  });
  const [showTaskTemplates, setShowTaskTemplates] = useState(false);

  // Context data for task creation
  const [contextAssignments, setContextAssignments] = useState([]);
  const [contextProjects, setContextProjects] = useState([]);
  const [contextUsers, setContextUsers] = useState([]);

  const [seenTips, setSeenTips] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_assistant_seen_tips');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [feedbackDialog, setFeedbackDialog] = useState({
    isOpen: false,
    messageId: null,
    rating: null,
    comment: '',
  });

  const [editDialog, setEditDialog] = useState({
    isOpen: false,
    messageId: null,
    originalContent: '',
    editedContent: '',
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
        const user = await db.auth.me(); // Changed from db.entities.User.me()
        if (isMountedRef.current) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error loading user:', error);
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

    if (urlParams.has('project')) {
      context.current_entity_type = 'project';
      context.current_entity_id = urlParams.get('project');
    } else if (urlParams.has('assignment')) {
      context.current_entity_type = 'assignment';
      context.current_entity_id = urlParams.get('assignment');
    } else if (urlParams.has('doc') || urlParams.has('document')) {
      context.current_entity_type = 'document';
      context.current_entity_id = urlParams.get('doc') || urlParams.get('document');
    } else if (urlParams.has('task')) {
      context.current_entity_type = 'task';
      context.current_entity_id = urlParams.get('task');
    } else if (urlParams.has('thread')) {
      context.current_entity_type = 'conversation_thread';
      context.current_entity_id = urlParams.get('thread');
    }

    return context;
  }, [currentPageName]);

  const pageTips = useCallback(
    () => ({
      Dashboard:
        '💡 Tip: You can quickly access key metrics and recent activity here. Try asking me about your assignment statistics!',
      Assignments:
        '💡 Tip: After creating an assignment, you can auto-generate tasks using workflow patterns. Just ask me how!',
      Documents:
        '💡 Tip: You can use AI to analyze any document for key points, compliance issues, or generate summaries. Want to try?',
      Tasks:
        '💡 Tip: Drag tasks between columns to update their status, or ask me to create tasks based on your assignment needs.',
      Chat: '💡 Tip: You can capture important decisions from conversations and convert them to action items automatically!',
      AskAI:
        '💡 Tip: Upload documents here and ask specific questions. The AI will search through your documents to answer!',
      Research:
        '💡 Tip: Use this for complex research like permits, licenses, or compliance requirements. The AI searches the web for you!',
      Generate:
        '💡 Tip: You can generate professional documents from templates or even have a conversation to build content iteratively.',
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
        localStorage.setItem('ai_assistant_seen_tips', JSON.stringify(updatedSeenTips));
      } catch (err) {
        console.error('Failed to save seen tips:', err);
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
      const conversation = await db.agents.createConversation({
        agent_name: 'ProjectFlowExpert',
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
        id: 'welcome',
        role: 'assistant',
        content: `👋 Hi! I'm your ProjectFlow AI Assistant. I can **create, update, and manage** your work items directly.

**What I can do for you:**

📁 **Create Projects** - "Create a project called Marketing Campaign"
📋 **Create Assignments** - "Create an assignment called Homepage Design"
✅ **Create Tasks** - Full task creation with advanced features:
   - Recurring tasks: "Create a weekly task to review metrics every Monday"
   - Subtasks: "Break down the onboarding process into subtasks"
   - Checklists: "Create a task with a checklist for code review"
   - Due dates: "Create a task due next Friday" or "in 2 weeks"
📝 **Create Notes** - "Create a note called Meeting Summary"

🔄 **Update Items** - "Update task [id] status to done"
🗑️ **Delete Items** - "Delete task [id]" (I'll confirm first)
👥 **Assign Team Members** - Tag anyone on your team to tasks

**Quick Examples:**
- "Create a high priority recurring task for Sarah to check reports weekly"
- "Break down the new feature into subtasks with a checklist"
- "What's my current status?"

What would you like me to do?`,
        timestamp: new Date().toISOString(),
      };

      setMessages([welcomeMessage]);
      setShowTaskTemplates(true); // Auto-show templates on first open

      const unsubscribe = db.agents.subscribeToConversation(conversation.id, (data) => {
        if (isMountedRef.current) {
          const agentMessages = data.messages
            .filter((msg) => msg.id !== 'welcome')
            .map((msg) => ({
              id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Ensure unique ID
              role: msg.role,
              content: msg.content || '',
              timestamp: msg.timestamp || new Date().toISOString(),
              tool_calls: msg.tool_calls || undefined,
              is_tool_call: !!msg.tool_calls, // Flag for rendering, if MessageBubble needs it
            }));

          setMessages((prev) => {
            const currentWelcome = prev.find((m) => m.id === 'welcome');
            return currentWelcome ? [currentWelcome, ...agentMessages] : [...agentMessages];
          });

          if (data.status === 'processing' || data.status === 'awaiting_tool_code') {
            setIsLoading(true);
          } else {
            setIsLoading(false);
          }

          if (data.status === 'failed') {
            setError(data.error_message || 'An error occurred with the AI assistant.');
            showToast.error('AI Assistant encountered an error.');
          } else {
            setError(null);
          }
        }
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (error) {
      console.error('Error initializing conversation:', error);
      showToast.error('Failed to initialize AI assistant');
      if (isMountedRef.current) {
        setIsLoading(false);
        setError('Failed to initialize AI assistant. Please try again.');
      }
    }
  }, [currentPageName]);

  useEffect(() => {
    if (isOpen) {
      let cleanup = null;
      let cancelled = false;

      const init = async () => {
        const result = await initConversation();
        if (cancelled) {
          // Component unmounted before init finished, cleanup immediately
          if (typeof result === 'function') {
            result();
          }
        } else {
          cleanup = result;
        }
      };

      init();

      return () => {
        cancelled = true;
        if (typeof cleanup === 'function') {
          cleanup();
        }
      };
    }
  }, [isOpen, initConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      setInputValue('');
    }

    if (!agentConversation) {
      showToast.error('AI Assistant not ready. Please refresh.');
      return;
    }

    const userMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    setSmartSuggestion(null);

    try {
      const context = getEnhancedContext();

      // Use Promise.allSettled to ensure all promises complete even if some fail
      const results = await Promise.allSettled([
        workspaceId
          ? db.entities.Task.filter({ workspace_id: workspaceId }, '-updated_date', 50)
          : Promise.resolve([]),
        workspaceId
          ? db.entities.Assignment.filter({ workspace_id: workspaceId })
          : Promise.resolve([]),
        workspaceId
          ? db.entities.Project.filter({ workspace_id: workspaceId })
          : Promise.resolve([]),
        workspaceId
          ? db.entities.Note.filter({ workspace_id: workspaceId }, '-updated_date', 20)
          : Promise.resolve([]),
        db.auth.me(),
        workspaceId ? db.entities.User.filter({ workspace_id: workspaceId }) : Promise.resolve([]),
      ]);

      // Extract values, using fallbacks for rejected promises
      const tasks = results[0].status === 'fulfilled' ? results[0].value : [];
      const assignments = results[1].status === 'fulfilled' ? results[1].value : [];
      const projects = results[2].status === 'fulfilled' ? results[2].value : [];
      const notes = results[3].status === 'fulfilled' ? results[3].value : [];
      const user = results[4].status === 'fulfilled' ? results[4].value : null;
      const teamMembers = results[5].status === 'fulfilled' ? results[5].value : [];

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const names = ['tasks', 'assignments', 'projects', 'notes', 'user', 'teamMembers'];
          console.warn(`Failed to fetch ${names[index]}:`, result.reason);
        }
      });

      // Store context data for task proposal panel
      setContextAssignments(assignments);
      setContextProjects(projects);
      setContextUsers(teamMembers);
      setExistingTasks(tasks);

      // Find current project if viewing one
      const currentProject =
        context.current_entity_type === 'project' && context.current_entity_id
          ? projects.find((p) => p.id === context.current_entity_id)
          : null;

      const contextInfo = `
Current System Context:
- Page: ${context.current_page}
- URL: ${context.url}
- workspace_id: ${workspaceId || 'none'}
${
  context.current_entity_type
    ? `- Viewing: ${context.current_entity_type} (ID: ${context.current_entity_id})`
    : ''
}
${currentProject ? `- Current Project: ${currentProject.name} (Status: ${currentProject.status || 'N/A'})` : ''}
- User Email: ${user?.email || 'Unknown'}
- User ID: ${user?.id || 'Unknown'}
- User Role: ${user?.user_role || 'Unknown'}

Team Members (${teamMembers.length > 0 ? teamMembers.length : 'none'}) - Use these for task assignment:
${
  teamMembers.map((m) => `- ${m.full_name || m.email} (${m.email})`).join('\n') ||
  'No team members found'
}

Recent Projects (${projects.length > 0 ? projects.length : 'none'}):
${projects
  .slice(0, 5)
  .map((p) => `- ${p.name} (ID: ${p.id}, Status: ${p.status || 'N/A'})`)
  .join('\n')}

Recent Assignments (${assignments.length > 0 ? assignments.length : 'none'}):
${assignments
  .slice(0, 10)
  .map(
    (a) =>
      `- ${a.name} (ID: ${a.id}, Status: ${a.status || 'N/A'}, Project ID: ${
        a.project_id || 'None'
      })`
  )
  .join('\n')}

Recent Tasks (${tasks.length > 0 ? tasks.length : 'none'}):
${tasks
  .slice(0, 10)
  .map(
    (t) =>
      `- [${t.status}] ${t.title} (ID: ${t.id}, Assigned: ${
        t.assigned_to_email || t.assigned_to || 'Unassigned'
      }, Project ID: ${t.project_id || 'None'})`
  )
  .join('\n')}

Recent Notes (${notes.length > 0 ? notes.length : 'none'}):
${notes
  .slice(0, 10)
  .map((n) => `- ${n.title} (ID: ${n.id}, Tags: ${(n.tags || []).join(', ') || 'none'})`)
  .join('\n')}

User Input: ${textToSend}

IMPORTANT INSTRUCTIONS:
1. You can CREATE projects, assignments, tasks, and notes using the workspace_id above.
2. You can UPDATE any entity by its ID.
3. You can DELETE entities (ask for confirmation first).
4. When assigning tasks, match the user's input to a team member from the list above.
5. If the user mentions a name like "John" or "@sarah", find the matching team member email.
${currentProject ? `6. The user is viewing project "${currentProject.name}" - prioritize actions for this project.` : ''}

Respond helpfully and execute the requested action if possible.
`;

      await db.agents.addMessage(agentConversation, {
        role: 'user',
        content: contextInfo,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      if (isMountedRef.current) {
        setError('Failed to get response from AI Assistant. Please try again.');
        showToast.error('Failed to send message to AI Assistant');

        const errorMessage = {
          id: 'msg_' + (Date.now() + 1),
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      // setIsLoading(false) is now handled by the subscription based on agent status
    }
  };

  // Process task creation requests with structured LLM response
  const processTaskCreation = async (userRequest) => {
    if (!workspaceId || contextAssignments.length === 0) {
      showToast.error('No assignments available. Please create an assignment first.');
      return;
    }

    setIsLoading(true);

    try {
      const assignmentsList = contextAssignments
        .slice(0, 10)
        .map((a) => `- ${a.name || a.title} (ID: ${a.id})`)
        .join('\n');

      const projectsList = contextProjects
        .slice(0, 10)
        .map((p) => `- ${p.name} (ID: ${p.id})`)
        .join('\n');

      const usersList = contextUsers
        .slice(0, 20)
        .map((u) => `- ${u.full_name || u.email} (${u.email})`)
        .join('\n');

      const systemPrompt = `You are a task creation assistant. Parse the user's natural language request and create structured task objects.

**Available Assignments (required for each task):**
${assignmentsList || 'No assignments available'}

**Available Projects (optional):**
${projectsList || 'No projects available'}

**Available Team Members (for assignment):**
${usersList || 'No team members available'}

**Current User:** ${currentUser?.email || 'Unknown'}
**Today's Date:** ${format(new Date(), 'yyyy-MM-dd')}

**User Request:** "${userRequest}"

Parse the request and extract all tasks. For each task, determine:
- title (required)
- description (optional)
- assignment_id (required - pick the most relevant from the list)
- project_id (optional - if mentioned or relevant)
- assigned_to (email - pick from team members)
- priority (low, medium, high, urgent)
- due_date (natural language like "next Friday" or ISO format)
- is_recurring (boolean)
- recurrence_pattern (if recurring: { frequency: daily|weekly|monthly|yearly, interval: number, days_of_week: [0-6] })
- subtasks (array of { title, description })
- checklist_items (array of strings)

Return a JSON response with analysis and tasks array.`;

      const response = await InvokeLLM({
        prompt: systemPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            analysis: { type: 'string' },
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  assignment_id: { type: 'string' },
                  project_id: { type: 'string' },
                  assigned_to: { type: 'string' },
                  priority: { type: 'string' },
                  due_date: { type: 'string' },
                  is_recurring: { type: 'boolean' },
                  recurrence_pattern: { type: 'object' },
                  subtasks: { type: 'array' },
                  checklist_items: { type: 'array' },
                },
                required: ['title'],
              },
            },
            suggestions: { type: 'array' },
            warnings: { type: 'array' },
          },
          required: ['analysis', 'tasks'],
        },
      });

      if (!response || !Array.isArray(response.tasks) || response.tasks.length === 0) {
        showToast.error('Could not extract tasks from request. Please try again with more detail.');
        return;
      }

      // Validate and prepare tasks
      const validatedTasks = [];
      const warnings = [];

      for (const task of response.tasks) {
        const validation = validateTaskStructure(task, {
          assignments: contextAssignments,
          projects: contextProjects,
          users: contextUsers,
          currentUser,
        });

        if (validation.isValid) {
          // Check for duplicates
          const duplicates = checkForDuplicates(validation.validatedTask, existingTasks);
          if (duplicates.length > 0) {
            warnings.push(`"${task.title}" may duplicate existing task`);
            setDuplicateWarnings((prev) => [
              ...prev,
              { task: validation.validatedTask, duplicates },
            ]);
          }
          validatedTasks.push(validation.validatedTask);
        } else {
          // Add with errors for user to fix
          validatedTasks.push({ ...task, _validationErrors: validation.errors });
          warnings.push(...validation.errors);
        }
      }

      // Add tasks to proposals
      setProposedTasks((prev) => [...prev, ...validatedTasks]);

      // Add AI response to messages
      const aiMessage = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content:
          response.analysis +
          (warnings.length > 0
            ? `\n\n⚠️ **Notes:** ${warnings.join(', ')}`
            : '\n\n✅ Tasks are ready for review below.'),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      showToast.success(`Prepared ${validatedTasks.length} task(s) for review`);
    } catch (error) {
      console.error('Error processing task creation:', error);
      showToast.error('Failed to process task request');
    } finally {
      setIsLoading(false);
    }
  };

  // Detect task creation intent
  const isTaskCreationIntent = (text) => {
    const taskKeywords = [
      'create task',
      'add task',
      'new task',
      'make task',
      'create a task',
      'add a task',
      'new a task',
      'recurring task',
      'weekly task',
      'daily task',
      'monthly task',
      'break down',
      'subtask',
      'checklist',
      'create tasks',
      'add tasks',
      'generate tasks',
    ];
    const lowerText = text.toLowerCase();
    return taskKeywords.some((keyword) => lowerText.includes(keyword));
  };

  // Enhanced send message that detects task intent
  const handleSendWithTaskDetection = async (messageText = null) => {
    const textToSend = messageText || inputValue.trim();
    if (!textToSend || isLoading) return;

    // Check for task creation intent
    if (isTaskCreationIntent(textToSend)) {
      setInputValue('');

      const userMessage = {
        id: 'msg_' + Date.now(),
        role: 'user',
        content: textToSend,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      await processTaskCreation(textToSend);
    } else {
      // Use regular agent-based message handling
      await handleSendMessage(messageText);
    }
  };

  const handleCopyMessage = async (messageContent) => {
    try {
      await navigator.clipboard.writeText(messageContent);
      showToast.success('Message copied to clipboard!');
      setCopiedMessageId(Date.now().toString());
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      showToast.error('Failed to copy message');
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
      showToast.error('Message cannot be empty');
      return;
    }

    // Update the message locally for immediate feedback
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, content: editedContent, edited: true } : msg
      )
    );

    // Close dialog
    setEditDialog({
      isOpen: false,
      messageId: null,
      originalContent: '',
      editedContent: '',
    });

    // Resend the conversation with edited message
    handleSendWithTaskDetection(editedContent);
  };

  const handleDeleteMessage = (messageId) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    showToast.success('Message deleted');
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
        behavior: 'smooth',
        block: 'center',
      });
    } else {
      setHighlightedMessageId(null);
    }
  };

  const filteredMessages = searchQuery
    ? messages.filter((msg) => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const handleFeedback = async (messageId, isPositive) => {
    const rating = isPositive ? 'positive' : 'negative';

    setMessageFeedback((prev) => ({
      ...prev,
      [messageId]: rating,
    }));

    setFeedbackDialog({
      isOpen: true,
      messageId,
      rating,
      comment: '',
    });
  };

  const saveFeedback = async () => {
    const { messageId, rating, comment } = feedbackDialog;

    if (!currentUser || !conversationId || !messageId) {
      showToast.error('Unable to save feedback: Missing user, conversation, or message info.');
      return;
    }
    // P0 Critical Fix: Workspace scoping validation
    if (!workspaceId) {
      showToast.error('Unable to save feedback: Workspace context missing.');
      console.error('Critical: workspaceId is null or undefined when trying to save feedback.');
      return;
    }

    try {
      const message = messages.find((m) => m.id === messageId);
      const messageContent = message?.content || '';
      const enhancedContext = getEnhancedContext();

      await db.entities.AIAssistantFeedback.create({
        // Changed to db.entities.AIAssistantFeedback
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
        agent_name: 'ProjectFlowExpert',
      });

      showToast.success(
        rating === 'positive'
          ? 'Thanks for the feedback! 👍'
          : "Thanks for the feedback. I'll try to improve! 👎"
      );

      setFeedbackDialog({
        isOpen: false,
        messageId: null,
        rating: null,
        comment: '',
      });
    } catch (error) {
      console.error('Error saving feedback:', error);
      showToast.error('Failed to save feedback');
    }
  };

  const handleNewConversation = async () => {
    setMessages([]);
    setConversationId(null);
    setAgentConversation(null);
    setMessageFeedback({});
    setError(null);
    setSmartSuggestion(null);
    setSearchQuery('');
    setShowSearch(false);
    // Clear task state
    setProposedTasks([]);
    setFailedTasks([]);
    setDuplicateWarnings([]);
    setShowTaskTemplates(false);
    clearTaskDraft();
    await initConversation();
  };

  // Load existing tasks for duplicate detection
  const loadExistingTasks = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const tasks = await Task.list({ workspace_id: workspaceId });
      setExistingTasks(tasks);
    } catch (error) {
      console.error('Error loading existing tasks:', error);
    }
  }, [workspaceId]);

  // Restore task draft on open
  useEffect(() => {
    if (isOpen && workspaceId) {
      loadExistingTasks();
      const draft = loadTaskDraft();
      if (draft && draft.proposedTasks?.length > 0) {
        const resume = window.confirm(
          `You have ${draft.proposedTasks.length} unsaved task(s) from ${new Date(draft.timestamp).toLocaleTimeString()}.\n\nWould you like to restore them?`
        );
        if (resume) {
          setProposedTasks(draft.proposedTasks);
          showToast.success('Task draft restored');
        } else {
          clearTaskDraft();
        }
      }
    }
  }, [isOpen, workspaceId, loadExistingTasks]);

  // Save task draft when proposed tasks change
  useEffect(() => {
    if (proposedTasks.length > 0) {
      saveTaskDraft({ proposedTasks });
    }
  }, [proposedTasks]);

  // Create tasks from proposals
  const handleCreateTasks = async () => {
    if (!workspaceId || proposedTasks.length === 0) {
      showToast.error('No tasks to create');
      return;
    }

    setIsTaskCreating(true);
    setCreationProgress({ current: 0, total: proposedTasks.length, currentTask: '' });
    setFailedTasks([]);

    const results = { successful: [], failed: [] };

    try {
      for (let i = 0; i < proposedTasks.length; i++) {
        const taskData = proposedTasks[i];

        setCreationProgress({
          current: i + 1,
          total: proposedTasks.length,
          currentTask: taskData.title,
        });

        try {
          const taskToCreate = {
            workspace_id: workspaceId,
            title: taskData.title,
            description: taskData.description || '',
            assignment_id: taskData.assignment_id,
            project_id: taskData.project_id || null,
            assigned_to: taskData.assigned_to,
            assigned_by: currentUser?.email || '',
            status: taskData.status || 'todo',
            priority: taskData.priority || 'medium',
            due_date: taskData.due_date ? parseDateString(taskData.due_date) : null,
            estimated_effort: taskData.estimated_effort || null,
            auto_generated: true,
            generation_source: {
              source_type: 'ai_assistant',
              confidence: 95,
              reasoning: taskData.reasoning || 'Created via AI Assistant',
            },
            skill_requirements: taskData.skill_requirements || [],
          };

          // Add checklist if provided
          if (taskData.checklist_items && taskData.checklist_items.length > 0) {
            taskToCreate.checklist = taskData.checklist_items.map((item, idx) => ({
              id: `check_${Date.now()}_${idx}`,
              text: typeof item === 'string' ? item : item.text,
              completed: false,
            }));
          }

          // Add recurrence if provided
          if (taskData.is_recurring && taskData.recurrence_pattern) {
            const recurrenceValidation = validateRecurrencePattern(taskData.recurrence_pattern);
            if (recurrenceValidation.isValid) {
              taskToCreate.is_recurring = true;
              taskToCreate.recurrence_pattern = taskData.recurrence_pattern;
            }
          }

          const createdTask = await Task.create(taskToCreate);
          results.successful.push(createdTask);

          // Create subtasks if provided
          if (taskData.subtasks && taskData.subtasks.length > 0) {
            const subtasksValidation = validateSubtasks(taskData.subtasks);
            if (subtasksValidation.isValid) {
              const subtaskPromises = taskData.subtasks.map((subtask) =>
                Task.create({
                  workspace_id: workspaceId,
                  title: subtask.title,
                  description: subtask.description || '',
                  assignment_id: taskToCreate.assignment_id,
                  project_id: taskToCreate.project_id,
                  assigned_to: taskToCreate.assigned_to,
                  assigned_by: currentUser?.email || '',
                  status: 'todo',
                  priority: taskToCreate.priority,
                  parent_task_id: createdTask.id,
                  auto_generated: true,
                })
              );

              const subtaskResults = await Promise.allSettled(subtaskPromises);
              const createdSubtasks = subtaskResults
                .filter((r) => r.status === 'fulfilled')
                .map((r) => r.value);

              if (createdSubtasks.length > 0) {
                await Task.update(createdTask.id, {
                  subtask_ids: createdSubtasks.map((st) => st.id),
                });
                results.successful.push(...createdSubtasks);
              }
            }
          }
        } catch (taskError) {
          results.failed.push({
            task: taskData,
            error: taskError.message || 'Unknown error',
          });
        }
      }

      const successCount = results.successful.filter((t) => !t.parent_task_id).length;
      const subtaskCount = results.successful.filter((t) => t.parent_task_id).length;

      if (results.failed.length === 0) {
        let message = `Created ${successCount} task(s)`;
        if (subtaskCount > 0) message += ` with ${subtaskCount} subtask(s)`;
        showToast.success(message);
        clearTaskDraft();
        setProposedTasks([]);
        setDuplicateWarnings([]);
        loadExistingTasks();
      } else {
        showToast.error(`Created ${successCount} task(s), ${results.failed.length} failed.`);
        setFailedTasks(results.failed);
        setProposedTasks((prev) =>
          prev.filter(
            (pTask) =>
              !results.successful.some(
                (sTask) =>
                  sTask.title === pTask.title && sTask.assignment_id === pTask.assignment_id
              )
          )
        );
      }
    } catch (error) {
      console.error('Error in task creation:', error);
      showToast.error('Unexpected error during task creation');
    } finally {
      setIsTaskCreating(false);
      setCreationProgress({ current: 0, total: 0, currentTask: '' });
    }
  };

  // Retry a failed task
  const handleRetryFailed = (taskToRetry) => {
    setFailedTasks((prev) => prev.filter((f) => f.task !== taskToRetry));
    setProposedTasks((prev) => [...prev, taskToRetry]);
    showToast.success(`"${taskToRetry.title}" added back for retry.`);
  };

  // Clear all task proposals
  const handleClearTasks = () => {
    if (proposedTasks.length > 0 || failedTasks.length > 0) {
      const confirmed = window.confirm(
        `Clear ${proposedTasks.length} proposed and ${failedTasks.length} failed task(s)?`
      );
      if (!confirmed) return;
    }
    setProposedTasks([]);
    setFailedTasks([]);
    setDuplicateWarnings([]);
    clearTaskDraft();
  };

  // Handle template click
  const handleTemplateClick = (template) => {
    setInputValue(template.example);
    setShowTaskTemplates(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendWithTaskDetection();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowSearch(false);
    setSearchQuery('');
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
                    {smartSuggestion.actions && smartSuggestion.actions.length > 0 && (
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
                                handleSendWithTaskDetection(action.prompt);
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
                  <p className="text-xs text-gray-700 dark:text-gray-300">{currentTip}</p>
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
            'fixed bottom-6 right-6 shadow-2xl border-0 bg-white dark:bg-gray-900 z-50 flex flex-col',
            'w-[calc(100vw-3rem)] sm:w-96',
            'max-w-[500px]',
            isMinimized ? 'h-16' : 'h-[600px] max-h-[80vh]'
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
              <p className="text-xs opacity-90 truncate">Create & manage everything</p>
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
                  'h-8 w-8 text-white hover:bg-white/20 flex-shrink-0',
                  showSearch && 'bg-white/20'
                )}
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (!showSearch) {
                    setSearchQuery('');
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
                aria-label={isMinimized ? 'Maximize' : 'Minimize'}
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
                          setSearchQuery('');
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
                      {filteredMessages.length !== 1 ? 's' : ''}
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
                      'space-y-2 transition-all',
                      highlightedMessageId === message.id &&
                        'bg-yellow-100 dark:bg-yellow-900/20 -mx-2 px-2 py-1 rounded-lg'
                    )}
                  >
                    <MessageBubble message={message} />

                    {message.role === 'user' && message.id !== 'welcome' && (
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
                          onClick={() => handleEditMessage(message.id, message.content)}
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

                    {message.role === 'assistant' && message.id !== 'welcome' && (
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
                            'h-6 w-6',
                            messageFeedback[message.id] === 'positive' && 'text-green-600'
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
                            'h-6 w-6',
                            messageFeedback[message.id] === 'negative' && 'text-red-600'
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
                        style={{ animationDelay: '0ms' }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                )}

                {/* Message Limit Warning */}
                {messages.length >= 40 && (
                  <div className="text-xs text-yellow-700 dark:text-yellow-400 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 mx-2">
                    <strong>Note:</strong> Conversation history is limited to 50 messages. Consider
                    starting a new chat for better performance.
                  </div>
                )}

                <div ref={messagesEndRef} />

                {/* Task Templates */}
                {showTaskTemplates && messages.length <= 1 && (
                  <div className="space-y-3 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                      Quick Task Templates
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {TASK_TEMPLATES.map((template, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleTemplateClick(template)}
                          className="text-left p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all duration-200 group"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg">{template.icon}</span>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-xs text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {template.title}
                              </h4>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                {template.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Task Proposal Panel */}
              <TaskProposalPanel
                proposedTasks={proposedTasks}
                failedTasks={failedTasks}
                duplicateWarnings={duplicateWarnings}
                assignments={contextAssignments}
                projects={contextProjects}
                users={contextUsers}
                currentUser={currentUser}
                isCreating={isTaskCreating}
                creationProgress={creationProgress}
                onTasksChange={setProposedTasks}
                onCreateTasks={handleCreateTasks}
                onClear={handleClearTasks}
                onRetryFailed={handleRetryFailed}
              />

              {/* Input */}
              <div className="p-4 border-t bg-gray-50 dark:bg-gray-800/50 shrink-0">
                <div className="flex gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handleNewConversation}
                    disabled={isLoading || isTaskCreating}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    New Chat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setShowTaskTemplates(!showTaskTemplates)}
                  >
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Tasks
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setShowTip(true)}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Tips
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Create projects, tasks, assignments, or ask anything..."
                    className="flex-1 bg-white dark:bg-gray-800"
                    disabled={isLoading}
                    aria-label="Message input"
                  />
                  <Button
                    onClick={() => handleSendWithTaskDetection()}
                    disabled={!inputValue.trim() || isLoading || isTaskCreating}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shrink-0"
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
              comment: '',
            });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {feedbackDialog.rating === 'positive'
                ? '👍 Thanks for the positive feedback!'
                : '👎 Help us improve'}
            </DialogTitle>
            <DialogDescription>
              {feedbackDialog.rating === 'positive'
                ? 'Would you like to add any comments about what worked well?'
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
                  comment: '',
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
              originalContent: '',
              editedContent: '',
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
                  originalContent: '',
                  editedContent: '',
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
