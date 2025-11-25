
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bot,
  Send,
  Loader2,
  CheckCircle2,
  Edit2,
  Trash2,
  Plus,
  Sparkles,
  Calendar,
  User as UserIcon,
  AlertCircle,
  Clock,
  CheckSquare,
  Repeat,
  MoreVertical,
  X,
  RefreshCw,
  Save,
  Minimize2,
  Maximize2
} from "lucide-react";
import { InvokeLLM } from "@/api/integrations";
import { Task } from "@/api/entities";
import { toast } from "sonner";
import {
  format,
  parse,
  isValid,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
  endOfWeek,
  endOfMonth,
  startOfWeek,
  startOfMonth,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  getDay,
  setDay
} from "date-fns";
import ReactMarkdown from 'react-markdown';
import { useWorkspace } from "@/components/workspace/WorkspaceContext"; // Added import

const MAX_CONVERSATION_MESSAGES = 50;
const DRAFT_STORAGE_KEY = "ai_task_maker_draft";
const SIMILARITY_THRESHOLD = 0.7;

export default function AITaskAssistantPanel({
  assignments = [],
  users = [],
  currentUser,
  onTasksCreated,
  isCollapsed = false,
  onToggleCollapse
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [proposedTasks, setProposedTasks] = useState([]);
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState({ current: 0, total: 0, currentTask: "" });
  const [failedTasks, setFailedTasks] = useState([]);
  const [existingTasks, setExistingTasks] = useState([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);
  const [showTemplates, setShowTemplates] = useState(true); // NEW: Show templates initially

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const { currentWorkspaceId } = useWorkspace(); // Added useWorkspace hook

  useEffect(() => {
    if (!isCollapsed && messages.length === 0) {
      loadDraftFromStorage();
      loadExistingTasks();
    }
  }, [isCollapsed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isCollapsed && (messages.length > 0 || proposedTasks.length > 0)) {
      saveDraftToStorage();
    }
  }, [messages, proposedTasks, isCollapsed]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadExistingTasks = async () => {
    try {
      const tasks = await Task.list("-created_date", 100);
      setExistingTasks(tasks);
    } catch (error) {
      console.error("Error loading existing tasks:", error);
    }
  };

  const saveDraftToStorage = () => {
    try {
      const draft = {
        messages: messages.slice(-20),
        proposedTasks,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };

  const loadDraftFromStorage = () => {
    try {
      const draftStr = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!draftStr) {
        initializeConversation();
        return;
      }

      const draft = JSON.parse(draftStr);
      const draftAge = Date.now() - new Date(draft.timestamp).getTime();
      const ONE_HOUR = 60 * 60 * 1000;

      if (draftAge < ONE_HOUR && draft.proposedTasks?.length > 0) {
        const resume = window.confirm(
          `You have an unsaved draft from ${new Date(draft.timestamp).toLocaleTimeString()}.\n\n` +
          `${draft.proposedTasks.length} proposed task(s) found.\n\n` +
          `Would you like to resume?`
        );

        if (resume) {
          setMessages(draft.messages || []);
          setProposedTasks(draft.proposedTasks || []);
          toast.success("Draft restored");
          setShowTemplates(false); // If restoring draft, hide templates
          return;
        }
      }

      localStorage.removeItem(DRAFT_STORAGE_KEY);
      initializeConversation();
    } catch (error) {
      console.error("Error loading draft:", error);
      initializeConversation();
    }
  };

  const clearDraftFromStorage = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing draft:", error);
    }
  };

  // NEW: Quick start templates
  const quickStartTemplates = [
    {
      icon: "📝",
      title: "Single Task",
      description: "Create one task with all details",
      example: "Create a task to review the Q3 budget report by Friday, assign it to john@company.com, high priority"
    },
    {
      icon: "🔄",
      title: "Recurring Task",
      description: "Set up a repeating task",
      example: "Create a weekly task to check social media metrics every Monday, medium priority"
    },
    {
      icon: "📋",
      title: "Task Breakdown",
      description: "Break down a project into subtasks",
      example: "I need to onboard the new developer. Help me break this down into subtasks with a checklist"
    },
    {
      icon: "⚡",
      title: "Quick Add",
      description: "Just the basics, I'll add details later",
      example: "Add task: Call client about proposal"
    }
  ];

  const initializeConversation = () => {
    const welcomeMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `# 👋 Welcome to AI Task Assistant!

I'll help you create tasks from natural language. Just describe what you need to do, and I'll handle the details.

**What I can do:**
✓ Extract due dates, priorities, and assignments
✓ Create recurring tasks with custom schedules
✓ Break down projects into subtasks with checklists
✓ Detect and warn about potential duplicates
✓ Validate against your team and assignments

**Try a template below, or just start typing!** 💬`,
      timestamp: new Date().toISOString()
    };

    setMessages([welcomeMessage]);
    setShowTemplates(true);
  };

  const handleTemplateClick = (template) => {
    setInputValue(template.example);
    setShowTemplates(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const validateAssignmentId = (assignmentId) => {
    if (!assignmentId) return null;
    const assignment = assignments.find(a => a.id === assignmentId);
    return assignment ? assignmentId : null;
  };

  const validateUserEmail = (email) => {
    if (!email) return null;
    const user = users.find(u => u.email === email);
    return user ? email : null;
  };

  const parseDateString = (dateStr) => {
    if (!dateStr) return null;

    try {
      let date = new Date(dateStr);
      if (isValid(date) && dateStr.includes('-')) {
        return format(date, 'yyyy-MM-dd');
      }

      const formats = ['yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy', 'MMM d, yyyy', 'MMMM d, yyyy'];
      for (const fmt of formats) {
        try {
          date = parse(dateStr, fmt, new Date());
          if (isValid(date)) {
            return format(date, 'yyyy-MM-dd');
          }
        } catch (e) {
          continue;
        }
      }

      const today = startOfDay(new Date());
      const lowerDate = dateStr.toLowerCase().trim();

      if (lowerDate === 'today') return format(today, 'yyyy-MM-dd');
      if (lowerDate === 'tomorrow') return format(addDays(today, 1), 'yyyy-MM-dd');
      if (lowerDate === 'next week') return format(addWeeks(today, 1), 'yyyy-MM-dd');
      if (lowerDate === 'next month') return format(addMonths(today, 1), 'yyyy-MM-dd');
      if (lowerDate === 'next year') return format(addYears(today, 1), 'yyyy-MM-dd');

      if (lowerDate.includes('end of week') || lowerDate.includes('end of this week')) {
        return format(endOfWeek(today), 'yyyy-MM-dd');
      }
      if (lowerDate.includes('end of month') || lowerDate.includes('end of this month')) {
        return format(endOfMonth(today), 'yyyy-MM-dd');
      }

      if (lowerDate.includes('start of next week')) {
        return format(startOfWeek(addWeeks(today, 1)), 'yyyy-MM-dd');
      }
      if (lowerDate.includes('start of next month')) {
        return format(startOfMonth(addMonths(today, 1)), 'yyyy-MM-dd');
      }

      const dayMatch = lowerDate.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
      if (dayMatch) {
        const dayName = dayMatch[1];
        const dayFunctions = {
          'monday': nextMonday,
          'tuesday': nextTuesday,
          'wednesday': nextWednesday,
          'thursday': nextThursday,
          'friday': nextFriday,
          'saturday': nextSaturday,
          'sunday': nextSunday
        };

        if (dayFunctions[dayName]) {
          return format(dayFunctions[dayName](today), 'yyyy-MM-dd');
        }
      }

      const thisDayMatch = lowerDate.match(/(?:this|this coming)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
      if (thisDayMatch) {
        const dayName = thisDayMatch[1];
        const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName);
        const currentDay = getDay(today);

        if (targetDay >= currentDay) {
          return format(setDay(today, targetDay), 'yyyy-MM-dd');
        } else {
          return format(setDay(addWeeks(today, 1), targetDay), 'yyyy-MM-dd');
        }
      }

      const inDaysMatch = lowerDate.match(/in\s+(\d+)\s+(day|days)/);
      if (inDaysMatch) {
        return format(addDays(today, parseInt(inDaysMatch[1])), 'yyyy-MM-dd');
      }

      const inWeeksMatch = lowerDate.match(/in\s+(\d+)\s+(week|weeks)/);
      if (inWeeksMatch) {
        return format(addWeeks(today, parseInt(inWeeksMatch[1])), 'yyyy-MM-dd');
      }

      const inMonthsMatch = lowerDate.match(/in\s+(\d+)\s+(month|months)/);
      if (inMonthsMatch) {
        return format(addMonths(today, parseInt(inMonthsMatch[1])), 'yyyy-MM-dd');
      }

      const inYearsMatch = lowerDate.match(/in\s+(\d+)\s+(year|years)/);
      if (inYearsMatch) {
        return format(addYears(today, parseInt(inYearsMatch[1])), 'yyyy-MM-dd');
      }

      const fromNowDaysMatch = lowerDate.match(/(\d+)\s+(day|days)\s+from\s+now/);
      if (fromNowDaysMatch) {
        return format(addDays(today, parseInt(fromNowDaysMatch[1])), 'yyyy-MM-dd');
      }

      const fromNowWeeksMatch = lowerDate.match(/(\d+)\s+(week|weeks)\s+from\s+now/);
      if (fromNowWeeksMatch) {
        return format(addWeeks(today, parseInt(fromNowWeeksMatch[1])), 'yyyy-MM-dd');
      }

      return null;
    } catch (error) {
      console.error("Date parsing error:", error);
      return null;
    }
  };

  const validateRecurrencePattern = (pattern) => {
    if (!pattern) return { isValid: false, errors: ["Recurrence pattern is missing"] };

    const errors = [];

    const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!pattern.frequency || !validFrequencies.includes(pattern.frequency)) {
      errors.push(`Invalid frequency: "${pattern.frequency}". Must be one of: ${validFrequencies.join(', ')}`);
    }

    if (pattern.interval !== undefined) {
      if (typeof pattern.interval !== 'number' || pattern.interval < 1 || pattern.interval > 365) {
        errors.push(`Invalid interval: ${pattern.interval}. Must be a number between 1 and 365`);
      }
    }

    if (pattern.frequency === 'weekly' && pattern.days_of_week) {
      if (!Array.isArray(pattern.days_of_week)) {
        errors.push("days_of_week must be an array");
      } else {
        const invalidDays = pattern.days_of_week.filter(day =>
          typeof day !== 'number' || day < 0 || day > 6
        );
        if (invalidDays.length > 0) {
          errors.push(`Invalid days_of_week: ${invalidDays.join(', ')}. Must be numbers 0-6 (0=Sunday)`);
        }
      }
    }

    if (pattern.frequency === 'monthly' && pattern.day_of_month !== undefined) {
      if (typeof pattern.day_of_month !== 'number' || pattern.day_of_month < 1 || pattern.day_of_month > 31) {
        errors.push(`Invalid day_of_month: ${pattern.day_of_month}. Must be between 1 and 31`);
      }
    }

    if (pattern.end_date) {
      const parsedDate = parseDateString(pattern.end_date);
      if (!parsedDate) {
        errors.push(`Invalid end_date: ${pattern.end_date}`);
      }
    }

    if (pattern.occurrences !== undefined) {
      if (typeof pattern.occurrences !== 'number' || pattern.occurrences < 1 || pattern.occurrences > 1000) {
        errors.push(`Invalid occurrences: ${pattern.occurrences}. Must be between 1 and 1000`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const validateSubtasks = (subtasks) => {
    if (!subtasks || !Array.isArray(subtasks)) {
      return { isValid: true, errors: [] };
    }

    const errors = [];

    subtasks.forEach((subtask, index) => {
      if (!subtask.title || typeof subtask.title !== 'string' || !subtask.title.trim()) {
        errors.push(`Subtask ${index + 1} is missing a title`);
      }

      if (subtask.title && subtask.title.length > 200) {
        errors.push(`Subtask ${index + 1} title is too long (max 200 characters)`);
      }
    });

    if (subtasks.length > 10) {
      errors.push(`Too many subtasks (${subtasks.length}). Maximum is 10 per task`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  };

  const checkForDuplicates = (newTask) => {
    const duplicates = [];

    for (const existingTask of existingTasks) {
      if (existingTask.status === 'completed') continue;

      const titleSimilarity = calculateSimilarity(newTask.title, existingTask.title);

      const sameAssignment = existingTask.assignment_id === newTask.assignment_id;
      const sameAssignee = existingTask.assigned_to === newTask.assigned_to;

      if (titleSimilarity > SIMILARITY_THRESHOLD && sameAssignment) {
        duplicates.push({
          existingTask,
          similarity: titleSimilarity,
          reasons: [
            `${Math.round(titleSimilarity * 100)}% title match`,
            sameAssignment && "Same assignment",
            sameAssignee && "Same assignee"
          ].filter(Boolean)
        });
      }
    }

    return duplicates;
  };

  const validateTaskStructure = (task) => {
    const errors = [];

    if (!task.title || typeof task.title !== 'string' || !task.title.trim()) {
      errors.push("Task must have a title");
    }

    const validatedAssignment = validateAssignmentId(task.assignment_id);
    if (!validatedAssignment) {
      if (assignments.length === 0) {
        errors.push("No assignments available. Please create an assignment first.");
      } else {
        errors.push(`Invalid assignment: ${task.assignment_id || 'none specified'}`);
      }
    }

    const validatedUser = validateUserEmail(task.assigned_to);
    if (!validatedUser) {
      if (users.length === 0) {
        errors.push("No users available.");
      } else {
        errors.push(`Invalid user: ${task.assigned_to || 'none specified'}`);
      }
    }

    if (task.priority && !['low', 'medium', 'high', 'urgent'].includes(task.priority)) {
      errors.push(`Invalid priority: ${task.priority}`);
    }

    if (task.status && !['todo', 'in_progress', 'review', 'completed'].includes(task.status)) {
      errors.push(`Invalid status: ${task.status}`);
    }

    if (task.is_recurring && task.recurrence_pattern) {
      const recurrenceValidation = validateRecurrencePattern(task.recurrence_pattern);
      if (!recurrenceValidation.isValid) {
        errors.push(...recurrenceValidation.errors.map(e => `Recurrence: ${e}`));
      }
    }

    if (task.subtasks) {
      const subtasksValidation = validateSubtasks(task.subtasks);
      if (!subtasksValidation.isValid) {
        errors.push(...subtasksValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedTask: {
        ...task,
        assignment_id: validatedAssignment || (assignments[0]?.id || ""),
        assigned_to: validatedUser || (currentUser?.email || ""),
        due_date: task.due_date ? parseDateString(task.due_date) : null
      }
    };
  };

  const handleSendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isProcessing) return;

    if (!currentWorkspaceId) {
      toast.error("No active workspace found. Please select a workspace.");
      return;
    }

    if (assignments.length === 0) {
      toast.error("No assignments available in this workspace. Please create an assignment first.");
      return;
    }

    if (users.length === 0) {
      toast.error("No users available in this workspace. Please check your team setup.");
      return;
    }

    setInputValue("");
    setShowTemplates(false); // Hide templates after first message

    const userMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => {
      const updated = [...prev, userMessage];
      if (updated.length > MAX_CONVERSATION_MESSAGES) {
        return updated.slice(-MAX_CONVERSATION_MESSAGES);
      }
      return updated;
    });

    setIsProcessing(true);
    abortControllerRef.current = new AbortController();

    try {
      const assignmentsList = assignments.slice(0, 10).map(a =>
        `- ${a.name} (ID: ${a.id}, Status: ${a.status || 'unknown'})`
      ).join('\n');

      const usersList = users.slice(0, 20).map(u =>
        `- ${u.full_name || u.email} (${u.email})`
      ).join('\n');

      const systemPrompt = `You are an intelligent task creation assistant for ProjectFlow. Parse natural language and create structured task objects.

**Available Assignments (Workspace: ${currentWorkspaceId}):**
${assignmentsList}

**Available Team Members:**
${usersList}

**Current User:** ${currentUser?.email || 'Unknown'}
**Today's Date:** ${format(new Date(), 'yyyy-MM-dd')}

**Task Request:** "${text}"

Extract all task information and return JSON with analysis, tasks array, suggestions, and warnings. Keep your response concise and actionable.`;

      const response = await InvokeLLM({
        prompt: systemPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            analysis: { type: "string" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  assignment_id: { type: "string" },
                  assigned_to: { type: "string" },
                  status: { type: "string" },
                  priority: { type: "string" },
                  due_date: { type: "string" },
                  estimated_effort: { type: "number" },
                  subtasks: { type: "array" },
                  is_recurring: { type: "boolean" },
                  recurrence_pattern: { type: "object" },
                  checklist_items: { type: "array" },
                  reasoning: { type: "string" },
                  skill_requirements: { // Added skill_requirements to schema
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["title"]
              }
            },
            suggestions: { type: "array" },
            warnings: { type: "array" }
          },
          required: ["analysis", "tasks"]
        }
      });

      if (!response || !Array.isArray(response.tasks)) {
        throw new Error("Invalid AI response format");
      }

      const validatedTasks = [];
      const validationErrors = [];
      const detectedDuplicates = [];

      for (let i = 0; i < response.tasks.length; i++) {
        const task = response.tasks[i];
        const validation = validateTaskStructure(task);

        if (validation.isValid) {
          const validatedTask = validation.validatedTask;

          const duplicates = checkForDuplicates(validatedTask);
          if (duplicates.length > 0) {
            detectedDuplicates.push({ task: validatedTask, duplicates });
          }

          validatedTasks.push(validatedTask);
        } else {
          validationErrors.push(`Task ${i + 1}: ${validation.errors.join(', ')}`);
          if (task.title) {
            // Even if invalid, push to proposed tasks for editing, but mark it with error
            validatedTasks.push({ ...validation.validatedTask, _validationErrors: validation.errors });
          }
        }
      }

      if (validatedTasks.length === 0 && validationErrors.length === response.tasks.length) {
        throw new Error("No valid tasks extracted. Please be more specific or check your inputs.");
      }

      if (detectedDuplicates.length > 0) {
        detectedDuplicates.forEach(({ task, duplicates }) => {
          duplicates.forEach(dup => {
            validationErrors.push(
              `⚠️ "${task.title}" might duplicate "${dup.existingTask.title}"`
            );
          });
        });
      }

      setDuplicateWarnings(detectedDuplicates);

      const aiMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        content: response.analysis || "I've prepared the following tasks:",
        timestamp: new Date().toISOString(),
        tasks: validatedTasks,
        suggestions: response.suggestions || [],
        warnings: [...(response.warnings || []), ...validationErrors].filter(Boolean)
      };

      setMessages(prev => {
        const updated = [...prev, aiMessage];
        if (updated.length > MAX_CONVERSATION_MESSAGES) {
          return updated.slice(-MAX_CONVERSATION_MESSAGES);
        }
        return updated;
      });

      setProposedTasks(validatedTasks);

      if (validationErrors.length > 0) {
        toast.warning("Some tasks had validation issues. Please review.");
      }

    } catch (error) {
      console.error("Error processing request:", error);

      const errorMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        content: error.message || "Error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
        error: true
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error("Failed to process request");
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleEditTask = (index) => {
    setEditingTaskIndex(index);
  };

  const handleSaveEdit = (index, updatedTask) => {
    const validation = validateTaskStructure(updatedTask);

    if (!validation.isValid) {
      toast.error(`Validation failed: ${validation.errors.join(', ')}`);
      setProposedTasks(prev => {
        const newTasks = [...prev];
        newTasks[index] = { ...updatedTask, _validationErrors: validation.errors };
        return newTasks;
      });
      return;
    }

    setProposedTasks(prev => {
      const updated = [...prev];
      updated[index] = { ...validation.validatedTask, _validationErrors: undefined }; // Clear errors on successful validation
      return updated;
    });
    setEditingTaskIndex(null);
    toast.success("Task updated");
  };

  const handleDeleteTask = (index) => {
    setProposedTasks(prev => prev.filter((_, i) => i !== index));
    toast.success("Task removed");
  };

  const handleCreateTasks = async () => {
    if (!currentWorkspaceId) {
      toast.error("No active workspace found. Please select a workspace.");
      return;
    }
    if (proposedTasks.length === 0) {
      toast.error("No tasks to create");
      return;
    }

    const invalidTasks = proposedTasks.filter(task => {
      const validation = validateTaskStructure(task);
      return !validation.isValid;
    });

    if (invalidTasks.length > 0) {
      toast.error(`${invalidTasks.length} task(s) have validation errors. Please fix them before creating.`);
      return;
    }

    setIsCreating(true);
    setCreationProgress({ current: 0, total: proposedTasks.length, currentTask: "" });
    setFailedTasks([]); // Clear previous failed tasks before a new creation attempt

    const results = { successful: [], failed: [] };

    try {
      for (let i = 0; i < proposedTasks.length; i++) {
        const taskData = proposedTasks[i];

        setCreationProgress({
          current: i + 1,
          total: proposedTasks.length,
          currentTask: taskData.title
        });

        try {
          const taskToCreate = {
            workspace_id: currentWorkspaceId, // Added workspace_id
            title: taskData.title,
            description: taskData.description || "",
            assignment_id: taskData.assignment_id,
            assigned_to: taskData.assigned_to,
            assigned_by: currentUser?.email || "",
            status: taskData.status || "todo",
            priority: taskData.priority || "medium",
            due_date: taskData.due_date || null,
            estimated_effort: taskData.estimated_effort || null,
            auto_generated: true,
            generation_source: {
              source_type: "ai_conversation",
              confidence: 95, // Kept 95 as in original code
              reasoning: taskData.reasoning || "Created via AI Task Assistant"
            },
            skill_requirements: taskData.skill_requirements || [] // Added skill_requirements
          };

          if (taskData.checklist_items && taskData.checklist_items.length > 0) {
            taskToCreate.checklist = taskData.checklist_items.map((item, idx) => ({
              id: `check_${Date.now()}_${idx}`,
              text: item,
              completed: false
            }));
          }

          if (taskData.is_recurring && taskData.recurrence_pattern) {
            const recurrenceValidation = validateRecurrencePattern(taskData.recurrence_pattern);
            if (recurrenceValidation.isValid) {
              taskToCreate.is_recurring = true;
              taskToCreate.recurrence_pattern = taskData.recurrence_pattern;
            }
          }

          const createdTask = await Task.create(taskToCreate);
          results.successful.push(createdTask);

          if (taskData.subtasks && taskData.subtasks.length > 0) {
            const subtasksValidation = validateSubtasks(taskData.subtasks);
            if (subtasksValidation.isValid) {
              const subtaskPromises = taskData.subtasks.map(subtask =>
                Task.create({
                  workspace_id: currentWorkspaceId, // Added workspace_id for subtasks
                  title: subtask.title,
                  description: subtask.description || "",
                  assignment_id: taskToCreate.assignment_id,
                  assigned_to: taskToCreate.assigned_to,
                  assigned_by: currentUser?.email || "",
                  status: "todo",
                  priority: taskToCreate.priority,
                  parent_task_id: createdTask.id,
                  auto_generated: true
                })
              );

              const subtaskResults = await Promise.allSettled(subtaskPromises);
              const createdSubtasks = subtaskResults
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value);

              if (createdSubtasks.length > 0) {
                await Task.update(createdTask.id, {
                  subtask_ids: createdSubtasks.map(st => st.id)
                });
                results.successful.push(...createdSubtasks);
              }
            }
          }

        } catch (taskError) {
          results.failed.push({
            task: taskData,
            error: taskError.message || "Unknown error"
          });
        }
      }

      const successCount = results.successful.filter(t => !t.parent_task_id).length;
      const subtaskCount = results.successful.filter(t => t.parent_task_id).length;

      if (results.failed.length === 0) {
        let message = `Created ${successCount} task(s)`;
        if (subtaskCount > 0) message += ` with ${subtaskCount} subtask(s)`;
        toast.success(message);
        clearDraftFromStorage();
        setProposedTasks([]);
        setMessages([]);
        initializeConversation(); // Re-initialize convo, will show templates
      } else {
        toast.warning(`Created ${successCount} task(s), ${results.failed.length} failed.`);
        setFailedTasks(results.failed);
        // Do not clear proposedTasks if there are failures, to allow retries
        // Filter out successful tasks from proposedTasks
        setProposedTasks(prev => prev.filter(pTask =>
          !results.successful.some(sTask => sTask.title === pTask.title && sTask.assignment_id === pTask.assignment_id)
        ));
      }

      if (results.successful.length > 0 && onTasksCreated) {
        onTasksCreated(results.successful.filter(t => !t.parent_task_id));
      }

    } catch (error) {
      console.error("Error in task creation:", error);
      toast.error("Unexpected error during task creation");
    } finally {
      setIsCreating(false);
      setCreationProgress({ current: 0, total: 0, currentTask: "" });
    }
  };

  const retryFailedTask = (taskToRetry) => {
    setFailedTasks(prev => prev.filter(f => f.task !== taskToRetry)); // Remove from failed
    setProposedTasks(prev => [...prev, taskToRetry]); // Add back to proposed
    toast.info(`"${taskToRetry.title}" added back to proposed tasks for retry.`);
  };

  const handleClearConversation = () => {
    if (proposedTasks.length > 0 || failedTasks.length > 0) {
      const confirmed = window.confirm(
        `You have ${proposedTasks.length} proposed task(s) and ${failedTasks.length} failed task(s). Clear conversation?`
      );
      if (!confirmed) return;
    }

    setMessages([]);
    setProposedTasks([]);
    setFailedTasks([]);
    setDuplicateWarnings([]);
    clearDraftFromStorage();
    initializeConversation(); // Re-initialize convo, will show templates
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
    };
    return colors[priority] || colors.medium;
  };

  if (isCollapsed) {
    return null; // As per new outline, fully hide when collapsed
  }

  return (
    <Card className="flex flex-col h-full border-0 shadow-lg">
      {/* Header */}
      <CardHeader className="border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">AI Task Assistant</CardTitle>
              <p className="text-xs text-purple-100 mt-0.5">Powered by natural language processing</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={onToggleCollapse}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                  : 'bg-white border border-gray-200'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-100">{children}</h2>,
                      p: ({ children }) => <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 my-2 list-none pl-0">{children}</ul>,
                      li: ({ children }) => <li className="flex items-start gap-2 before:content-[''] before:block before:w-1.5 before:h-1.5 before:mt-1.5 before:rounded-full before:bg-purple-500">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                  {message.warnings && message.warnings.length > 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      <p className="font-semibold">Warnings:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {message.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              )}
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center flex-shrink-0 shadow-md">
                <UserIcon className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {/* Quick Start Templates */}
        {showTemplates && messages.length <= 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-3">✨ Quick Start Templates</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {quickStartTemplates.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTemplateClick(template)}
                  className="text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">{template.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-purple-600 transition-colors">
                        {template.title}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-700 font-mono overflow-auto max-w-full">
                        "{template.example}"
                      </div>
                    </div>
                    <Sparkles className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-800">
                <strong>💡 Tip:</strong> You can also just type naturally! I'll understand context and extract the details.
              </p>
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Proposed Tasks & Failed Tasks (Combined into one section as per new design) */}
      {(proposedTasks.length > 0 || failedTasks.length > 0) && (
        <div className="border-t bg-gray-50 p-4 space-y-3 max-h-[40%] overflow-y-auto flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">
                Review Tasks ({proposedTasks.length + failedTasks.length})
              </h3>
            </div>
            {!isCreating && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearConversation} // Now clears proposed and failed
                  className="text-xs h-8"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
                {proposedTasks.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleCreateTasks}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-xs h-8"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Create {proposedTasks.length} Task{proposedTasks.length !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Proposed tasks list */}
          {proposedTasks.length > 0 && (
            <div className="space-y-2">
              {proposedTasks.map((task, index) => (
                <div
                  key={index}
                  className={`bg-white border ${task._validationErrors ? 'border-red-400 bg-red-50' : 'border-gray-200'} rounded-lg p-3 shadow-sm flex items-center justify-between gap-3`}
                >
                  {editingTaskIndex === index ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        value={task.title}
                        onChange={(e) =>
                          setProposedTasks((prev) =>
                            prev.map((t, i) =>
                              i === index ? { ...t, title: e.target.value } : t
                            )
                          )
                        }
                        className="h-8 text-sm"
                      />
                      <div className="flex gap-2">
                        <Select
                          value={task.assignment_id || assignments[0]?.id || ""}
                          onValueChange={(val) =>
                            setProposedTasks((prev) =>
                              prev.map((t, i) =>
                                i === index ? { ...t, assignment_id: val } : t
                              )
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-xs w-1/2">
                            <SelectValue placeholder="Assignment" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignments.map((assignment) => (
                              <SelectItem key={assignment.id} value={assignment.id}>
                                {assignment.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={task.assigned_to || currentUser?.email || ""}
                          onValueChange={(val) =>
                            setProposedTasks((prev) =>
                              prev.map((t, i) =>
                                i === index ? { ...t, assigned_to: val } : t
                              )
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-xs w-1/2">
                            <SelectValue placeholder="Assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.email} value={user.email}>
                                {user.full_name || user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        {task.assignment_id && (
                          <Badge variant="secondary" className="px-1 py-0.5">
                            <Plus className="w-2.5 h-2.5 mr-1" />
                            {assignments.find(a => a.id === task.assignment_id)?.name || task.assignment_id}
                          </Badge>
                        )}
                        {task.assigned_to && (
                          <Badge variant="secondary" className="px-1 py-0.5">
                            <UserIcon className="w-2.5 h-2.5 mr-1" />
                            {users.find(u => u.email === task.assigned_to)?.full_name?.split(' ')[0] || task.assigned_to.split('@')[0]}
                          </Badge>
                        )}
                        {task.due_date && (
                          <Badge variant="secondary" className="px-1 py-0.5">
                            <Calendar className="w-2.5 h-2.5 mr-1" />
                            {format(new Date(task.due_date), 'MMM d')}
                          </Badge>
                        )}
                        {task.priority && (
                          <Badge className={`px-1 py-0.5 ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </Badge>
                        )}
                        {task.is_recurring && (
                          <Badge variant="secondary" className="px-1 py-0.5">
                            <Repeat className="w-2.5 h-2.5 mr-1" />
                            Recurring
                          </Badge>
                        )}
                      </div>
                      {duplicateWarnings.find(dw => dw.task === task) && (
                        <div className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span>Potential duplicate.</span>
                        </div>
                      )}
                       {task._validationErrors && task._validationErrors.length > 0 && (
                        <div className="text-xs text-red-700 mt-1 flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span className="font-medium">Error: {task._validationErrors[0]}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-1 flex-shrink-0">
                    {editingTaskIndex === index ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSaveEdit(index, proposedTasks[index])}
                        className="h-7 w-7 text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTask(index)}
                        className="h-7 w-7"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTask(index)}
                      className="h-7 w-7 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Failed Tasks UI - NEW */}
          {failedTasks.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <p className="font-semibold text-sm">
                  {failedTasks.length} task{failedTasks.length !== 1 ? 's' : ''} failed to create
                </p>
              </div>
              {failedTasks.map((ft, idx) => (
                <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-red-900">{ft.task.title}</p>
                      <p className="text-xs text-red-700 mt-1">{ft.error}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryFailedTask(ft.task)}
                      className="text-xs border-red-300 text-red-700 hover:bg-red-100 h-8"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Creation Progress */}
          {isCreating && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-900">
                  Creating tasks... {creationProgress.current} of {creationProgress.total}
                </span>
                <span className="text-xs text-purple-700">
                  {Math.round((creationProgress.current / creationProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full transition-all duration-300"
                  style={{ width: `${(creationProgress.current / creationProgress.total) * 100}%` }}
                />
              </div>
              {creationProgress.currentTask && (
                <p className="text-xs text-purple-700 mt-2 truncate">
                  Current: {creationProgress.currentTask}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-white p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Describe the tasks you need to create..."
            className="flex-1 min-h-[80px] max-h-[120px] resize-none"
            disabled={isProcessing || isCreating}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing || isCreating}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 self-end h-[80px] w-[50px] p-0"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>💡 Press Enter to send</span>
            <span>|</span>
            <span>Shift + Enter for new line</span>
          </div>
          <span>{messages.length} / {MAX_CONVERSATION_MESSAGES} messages</span>
        </div>

        {/* Message limit warning - NEW */}
        {messages.length >= MAX_CONVERSATION_MESSAGES - 10 && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Conversation history is limited to {MAX_CONVERSATION_MESSAGES} messages.
              Older messages will be automatically archived.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
