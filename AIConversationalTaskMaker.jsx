
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Copy
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
import { useWorkspace } from "@/components/workspace/WorkspaceContext"; // ADDED: Workspace Context

const MAX_CONVERSATION_MESSAGES = 50;
const DRAFT_STORAGE_KEY = "ai_task_maker_draft";
const SIMILARITY_THRESHOLD = 0.7; // For duplicate detection

export default function AIConversationalTaskMaker({
  isOpen,
  onClose,
  assignmentId, // ADDED: Specific assignment ID for tasks
  assignments = [], // KEPT: for display and dropdowns, but tasks will use assignmentId prop
  users = [],
  currentUser,
  onTaskCreated // CHANGED: Singular callback for created tasks
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [proposedTasks, setProposedTasks] = useState([]);
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState({ current: 0, total: 0, currentTask: "" });
  const [failedTasks, setFailedTasks] = useState([]); // NEW: Track failed tasks
  const [existingTasks, setExistingTasks] = useState([]); // NEW: For duplicate detection
  const [duplicateWarnings, setDuplicateWarnings] = useState([]); // NEW: Track potential duplicates

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const { currentWorkspaceId } = useWorkspace(); // ADDED: Workspace scoping

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadDraftFromStorage(); // NEW: Load draft on open
      loadExistingTasks(); // NEW: Load existing tasks for duplicate detection
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // NEW: Save draft to localStorage whenever it changes
  useEffect(() => {
    if (isOpen && (messages.length > 0 || proposedTasks.length > 0)) {
      saveDraftToStorage();
    }
  }, [messages, proposedTasks, isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // NEW: Load existing tasks for duplicate detection
  const loadExistingTasks = async () => {
    try {
      // Filter existing tasks by the target assignmentId and currentWorkspaceId
      const tasks = await Task.list("-created_date", 100, {
        workspace_id: currentWorkspaceId,
        assignment_id: assignmentId
      });
      setExistingTasks(tasks);
    } catch (error) {
      console.error("Error loading existing tasks:", error);
    }
  };

  // NEW: Save draft to localStorage
  const saveDraftToStorage = () => {
    try {
      const draft = {
        messages: messages.slice(-20), // Save last 20 messages only
        proposedTasks,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };

  // NEW: Load draft from localStorage
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
        // Ask user if they want to resume
        const resume = window.confirm(
          `You have an unsaved draft from ${new Date(draft.timestamp).toLocaleTimeString()}.\n\n` +
          `${draft.proposedTasks.length} proposed task(s) found.\n\n` +
          `Would you like to resume?`
        );

        if (resume) {
          setMessages(draft.messages || []);
          setProposedTasks(draft.proposedTasks || []);
          toast.success("Draft restored");
          return;
        }
      }

      // Clear old draft and start fresh
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      initializeConversation();
    } catch (error) {
      console.error("Error loading draft:", error);
      initializeConversation();
    }
  };

  // NEW: Clear draft from storage
  const clearDraftFromStorage = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing draft:", error);
    }
  };

  const initializeConversation = () => {
    const welcomeMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `👋 Hi! I'm your AI Task Assistant. I can help you create tasks intelligently within this assignment.

**Just describe what you need to do in natural language. For example:**

• "Create a task to review the Q3 budget report, assign it to Sarah, high priority, due next Friday"
• "I need to onboard the new developer - setup environment, access, and team intro"
• "Weekly task to check social media metrics every Monday"
• "Prepare marketing materials for the product launch in 2 weeks, estimate 8 hours"

I'll extract all the details, suggest subtasks, identify dependencies, and let you review before creating anything.

**What would you like to work on?**`,
      timestamp: new Date().toISOString()
    };

    setMessages([welcomeMessage]);
  };

  // Validation functions
  // validateAssignmentId is no longer strictly needed as `assignmentId` prop is authoritative
  // const validateAssignmentId = (assignmentId) => {
  //   if (!assignmentId) return null;
  //   const assignment = assignments.find(a => a.id === assignmentId);
  //   return assignment ? assignmentId : null;
  // };

  const validateUserEmail = (email) => {
    if (!email) return null;
    const user = users.find(u => u.email === email);
    return user ? email : null;
  };

  // NEW: Improved date parsing with better patterns
  const parseDateString = (dateStr) => {
    if (!dateStr) return null;

    try {
      // Try parsing as ISO date first
      let date = new Date(dateStr);
      if (isValid(date) && dateStr.includes('-')) {
        return format(date, 'yyyy-MM-dd');
      }

      // Try common formats
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

      // Today/Tomorrow
      if (lowerDate === 'today') return format(today, 'yyyy-MM-dd');
      if (lowerDate === 'tomorrow') return format(addDays(today, 1), 'yyyy-MM-dd');

      // Next week/month/year
      if (lowerDate === 'next week') return format(addWeeks(today, 1), 'yyyy-MM-dd');
      if (lowerDate === 'next month') return format(addMonths(today, 1), 'yyyy-MM-dd');
      if (lowerDate === 'next year') return format(addYears(today, 1), 'yyyy-MM-dd');

      // End of week/month
      if (lowerDate.includes('end of week') || lowerDate.includes('end of this week')) {
        return format(endOfWeek(today), 'yyyy-MM-dd');
      }
      if (lowerDate.includes('end of month') || lowerDate.includes('end of this month')) {
        return format(endOfMonth(today), 'yyyy-MM-dd');
      }

      // Start of week/month
      if (lowerDate.includes('start of next week')) {
        return format(startOfWeek(addWeeks(today, 1)), 'yyyy-MM-dd');
      }
      if (lowerDate.includes('start of next month')) {
        return format(startOfMonth(addMonths(today, 1)), 'yyyy-MM-dd');
      }

      // Next specific day of week
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

      // This/This coming [day]
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

      // In X days/weeks/months/years
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

      // X days/weeks/months from now
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

  // NEW: Calculate similarity between two strings (simple Levenshtein-based)
  const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    // Simple word-based similarity
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  };

  // NEW: Check for duplicate tasks
  const checkForDuplicates = (newTask) => {
    const duplicates = [];

    for (const existingTask of existingTasks) {
      // Skip completed tasks
      if (existingTask.status === 'completed') continue;

      // Check title similarity
      const titleSimilarity = calculateSimilarity(newTask.title, existingTask.title);

      // Check if same assignment and assignee
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

    // Workspace ID validation
    if (!currentWorkspaceId) {
        errors.push("Current workspace ID is missing. Cannot create task.");
    }

    // Assignment ID validation (enforce the prop value)
    if (!assignmentId) {
        errors.push("Target assignment ID is missing from component props. Cannot create task.");
    } else if (task.assignment_id && task.assignment_id !== assignmentId) {
        // AI suggested a different assignment, warn but enforce the prop
        errors.push(`AI suggested assignment "${task.assignment_id}" but tasks must be created for "${assignmentId}". Overriding.`);
    }

    const validatedUser = validateUserEmail(task.assigned_to);
    if (!validatedUser && task.assigned_to) { // Only add error if an assignee was specified but invalid
      errors.push(`Invalid user: ${task.assigned_to}. Please use an email from the available team members.`);
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

    // ADDED: Skill requirements validation (basic array check)
    if (task.skill_requirements && !Array.isArray(task.skill_requirements)) {
      errors.push("Skill requirements must be an array of strings.");
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedTask: {
        ...task,
        workspace_id: currentWorkspaceId, // Ensure workspace_id is always set
        assignment_id: assignmentId, // Ensure assignment_id is always set from prop
        assigned_to: validatedUser || (currentUser?.email || ""), // Default to current user if invalid or not specified
        due_date: task.due_date ? parseDateString(task.due_date) : null,
        skill_requirements: Array.isArray(task.skill_requirements) ? task.skill_requirements : [], // Ensure it's an array
      }
    };
  };

  const handleSendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isProcessing) return;

    if (!assignmentId || !currentWorkspaceId) {
      toast.error("Component is not properly configured (missing assignment ID or workspace ID).");
      return;
    }

    if (users.length === 0) {
      toast.error("No users available. Please check your team setup.");
      return;
    }

    setInputValue("");

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
      // The AI should not select assignments, it should use the provided assignmentId
      const targetAssignment = assignments.find(a => a.id === assignmentId);
      const targetAssignmentInfo = targetAssignment
        ? `- Current Target Assignment: ${targetAssignment.name} (ID: ${targetAssignment.id})`
        : `- Current Target Assignment ID: ${assignmentId} (Name Unknown)`;

      const usersList = users.slice(0, 20).map(u =>
        `- ${u.full_name || u.email} (${u.email})`
      ).join('\n');

      const systemPrompt = `You are an intelligent task creation assistant for ProjectFlow. Your job is to parse natural language task descriptions and create structured task objects.

${targetAssignmentInfo}
**All tasks you generate MUST have assignment_id set to:** "${assignmentId}"
**All tasks you generate MUST have workspace_id set to:** "${currentWorkspaceId}"

**Available Team Members:**
${usersList}

**Current User:** ${currentUser?.email || 'Unknown'}
**Today's Date:** ${format(new Date(), 'yyyy-MM-dd')}
**Current Workspace ID:** ${currentWorkspaceId}

**Task Request:** "${text}"

**Your Task:**
1. Parse the user's request and extract all task-related information
2. Identify if this is one task or multiple tasks
3. For each task, extract:
   - title (required - clear, actionable)
   - description (detailed explanation)
   - assignment_id (MUST be "${assignmentId}", ignore any other assignment mentioned in the user's request)
   - assigned_to (match to team member EMAIL addresses exactly, default to current user email if not specified)
   - status (default: "todo")
   - priority (low/medium/high/urgent - infer from language)
   - due_date (format as YYYY-MM-DD. Parse relative dates correctly based on today's date)
   - estimated_effort (hours as a number, e.g., 8 for 8 hours)
   - skill_requirements (array of strings, e.g., ["JavaScript", "React"])
   - subtasks (if complex, break into 2-5 subtasks with title and description each)
   - is_recurring (true only if explicitly mentioned: "daily", "weekly", "monthly")
   - recurrence_pattern (if recurring, specify frequency and interval)
   - checklist_items (simple list of todo items, 3-7 items max)
   - dependencies (if task depends on others, note it)
   - reasoning (explain your choices briefly)

4. Be smart about:
   - Using the provided assignment_id "${assignmentId}" for ALL tasks.
   - Matching user names to EMAIL addresses (use exact email from list)
   - Converting relative dates ("next Friday", "in 2 weeks") to YYYY-MM-DD format
   - Breaking complex requests into subtasks
   - Identifying recurring patterns

**Response Format (JSON only, no markdown):**
{
  "analysis": "Brief explanation of what you understood",
  "tasks": [
    {
      "title": "Clear, actionable task title",
      "description": "Detailed description",
      "assignment_id": "${assignmentId}", // MUST be this ID
      "assigned_to": "exact_email@from.list",
      "status": "todo",
      "priority": "medium",
      "due_date": "YYYY-MM-DD",
      "estimated_effort": 8,
      "skill_requirements": ["Skill 1", "Skill 2"], // ADDED
      "subtasks": [
        {"title": "Subtask 1", "description": "Details"}
      ],
      "is_recurring": false,
      "recurrence_pattern": {
        "frequency": "weekly",
        "interval": 1,
        "days_of_week": [1]
      },
      "checklist_items": ["Item 1", "Item 2"],
      "dependencies": [],
      "reasoning": "Why these choices were made"
    }
  ],
  "suggestions": ["Additional suggestion 1"],
  "warnings": ["Warning if something unclear"]
}

**IMPORTANT:**
- Return ONLY valid JSON, no markdown code blocks
- Use exact user emails from the provided lists
- Convert all dates to YYYY-MM-DD format
- If unsure, ask for clarification instead of guessing
- Include warnings array if you need more information`;

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
                  skill_requirements: { // ADDED: skill_requirements to schema
                    type: "array",
                    items: { type: "string" }
                  },
                  subtasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" }
                      }
                    }
                  },
                  is_recurring: { type: "boolean" },
                  recurrence_pattern: {
                    type: "object",
                    properties: {
                      frequency: { type: "string" },
                      interval: { type: "number" },
                      days_of_week: {
                        type: "array",
                        items: { type: "number" }
                      }
                    }
                  },
                  checklist_items: {
                    type: "array",
                    items: { type: "string" }
                  },
                  dependencies: {
                    type: "array",
                    items: { type: "string" }
                  },
                  reasoning: { type: "string" }
                },
                required: ["title"]
              }
            },
            suggestions: {
              type: "array",
              items: { type: "string" }
            },
            warnings: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["analysis", "tasks"]
        }
      });

      if (!response || typeof response !== 'object') {
        throw new Error("Invalid AI response: not an object");
      }

      if (!Array.isArray(response.tasks)) {
        throw new Error("Invalid AI response: tasks is not an array");
      }

      const validatedTasks = [];
      const validationErrors = [];
      const detectedDuplicates = []; // NEW: Track duplicates

      for (let i = 0; i < response.tasks.length; i++) {
        const task = response.tasks[i];
        const validation = validateTaskStructure(task);

        if (validation.isValid) {
          const validatedTask = validation.validatedTask;

          // NEW: Check for duplicates
          const duplicates = checkForDuplicates(validatedTask);
          if (duplicates.length > 0) {
            detectedDuplicates.push({
              task: validatedTask,
              duplicates
            });
          }

          validatedTasks.push(validatedTask);
        } else {
          validationErrors.push(`Task ${i + 1} ("${task.title || 'untitled'}"): ${validation.errors.join(', ')}`);
          if (task.title) {
            // Push even invalid tasks to proposedTasks for user to review/edit
            // The validatedTask will contain the enforced assignment_id and workspace_id
            validatedTasks.push(validation.validatedTask);
          }
        }
      }

      if (validatedTasks.length === 0) {
        throw new Error("No valid tasks could be extracted from your request. Please try being more specific.");
      }

      // NEW: Add duplicate warnings
      if (detectedDuplicates.length > 0) {
        detectedDuplicates.forEach(({ task, duplicates }) => {
          duplicates.forEach(dup => {
            validationErrors.push(
              `⚠️ "${task.title}" might be a duplicate of "${dup.existingTask.title}" (${dup.reasons.join(', ')})`
            );
          });
        });
      }

      setDuplicateWarnings(detectedDuplicates); // NEW: Store duplicate warnings

      const aiMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        content: response.analysis || "I've analyzed your request and prepared the following tasks:",
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
        content: error.message || "I apologize, but I encountered an error processing your request. Please try rephrasing or simplifying your request.",
        timestamp: new Date().toISOString(),
        error: true
      };

      setMessages(prev => {
        const updated = [...prev, errorMessage];
        if (updated.length > MAX_CONVERSATION_MESSAGES) {
          return updated.slice(-MAX_CONVERSATION_MESSAGES);
        }
        return updated;
      });
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
      return;
    }

    setProposedTasks(prev => {
      const updated = [...prev];
      updated[index] = validation.validatedTask;
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
    if (proposedTasks.length === 0) {
      toast.error("No tasks to create");
      return;
    }

    // Pre-validate all tasks before starting creation
    const invalidTasks = proposedTasks.filter(task => {
      const validation = validateTaskStructure(task);
      return !validation.isValid;
    });

    if (invalidTasks.length > 0) {
      toast.error(`${invalidTasks.length} task(s) have validation errors. Please review and fix them.`);
      return;
    }

    // Ensure we have workspaceId before proceeding
    if (!currentWorkspaceId) {
      toast.error("Cannot create tasks: Workspace ID is not available.");
      return;
    }
    if (!assignmentId) {
      toast.error("Cannot create tasks: Target Assignment ID is not available.");
      return;
    }

    setIsCreating(true);
    setCreationProgress({ current: 0, total: proposedTasks.length, currentTask: "" });
    setFailedTasks([]); // NEW: Reset failed tasks

    const results = {
      successful: [],
      failed: []
    };

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
            workspace_id: currentWorkspaceId, // ADDED: Workspace scoping
            title: taskData.title,
            description: taskData.description || "",
            assignment_id: assignmentId, // ENFORCED: Use the prop assignmentId
            assigned_to: taskData.assigned_to,
            assigned_by: currentUser?.email || "",
            status: taskData.status || "todo",
            priority: taskData.priority || "medium",
            due_date: taskData.due_date || null,
            estimated_effort: taskData.estimated_effort || null,
            skill_requirements: taskData.skill_requirements || [], // ADDED: Skill requirements
            auto_generated: true,
            generation_source: {
              source_type: "ai_conversation",
              confidence: 95,
              reasoning: taskData.reasoning || "Created via AI Conversational Task Maker"
            }
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
            } else {
              console.warn(`Skipping invalid recurrence pattern for task "${taskData.title}":`, recurrenceValidation.errors);
            }
          }

          const createdTask = await Task.create(taskToCreate);
          results.successful.push(createdTask);

          // Call onTaskCreated for each successfully created parent task
          if (onTaskCreated) {
            onTaskCreated(createdTask);
          }

          // NEW: Better subtask failure handling
          if (taskData.subtasks && taskData.subtasks.length > 0) {
            const subtasksValidation = validateSubtasks(taskData.subtasks);
            if (!subtasksValidation.isValid) {
              console.warn(`Skipping subtasks for "${taskData.title}":`, subtasksValidation.errors);
              results.failed.push({
                task: taskData,
                error: `Subtask validation failed: ${subtasksValidation.errors.join(', ')}`,
                parentCreated: true
              });
            } else {
              const subtaskPromises = taskData.subtasks.map(subtask =>
                Task.create({
                  workspace_id: currentWorkspaceId, // ADDED: Workspace scoping for subtasks
                  title: subtask.title,
                  description: subtask.description || "",
                  assignment_id: assignmentId, // ENFORCED: Use the prop assignmentId for subtasks
                  assigned_to: taskToCreate.assigned_to,
                  assigned_by: currentUser?.email || "",
                  status: "todo",
                  priority: taskToCreate.priority,
                  due_date: taskToCreate.due_date,
                  parent_task_id: createdTask.id,
                  auto_generated: true,
                  generation_source: {
                    source_type: "ai_conversation",
                    confidence: 90,
                    reasoning: `Subtask of: ${taskData.title}`
                  }
                })
              );

              const subtaskResults = await Promise.allSettled(subtaskPromises);
              const createdSubtasks = [];
              const failedSubtasks = [];

              subtaskResults.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                  createdSubtasks.push(result.value);
                } else {
                  failedSubtasks.push({
                    subtask: taskData.subtasks[idx],
                    error: result.reason?.message || 'Unknown error'
                  });
                }
              });

              // Update parent with successful subtask IDs
              if (createdSubtasks.length > 0) {
                await Task.update(createdTask.id, {
                  subtask_ids: createdSubtasks.map(st => st.id)
                });
                results.successful.push(...createdSubtasks);
              }

              // Track failed subtasks
              if (failedSubtasks.length > 0) {
                results.failed.push({
                  task: taskData,
                  error: `${failedSubtasks.length} subtask(s) failed to create`,
                  failedSubtasks,
                  parentCreated: true
                });
              }
            }
          }

        } catch (taskError) {
          console.error(`Error creating task "${taskData.title}":`, taskError);
          results.failed.push({
            task: taskData,
            error: taskError.message || "Unknown error",
            parentCreated: false
          });
        }
      }

      const successCount = results.successful.filter(t => !t.parent_task_id).length;
      const subtaskCount = results.successful.filter(t => t.parent_task_id).length;
      const failCount = results.failed.length;

      if (failCount === 0) {
        let message = `Successfully created ${successCount} task(s)`;
        if (subtaskCount > 0) {
          message += ` with ${subtaskCount} subtask(s)`;
        }
        toast.success(message);
        clearDraftFromStorage(); // NEW: Clear draft on success
        handleClose(); // Close if all succeeded
      } else if (successCount > 0) {
        toast.warning(`Created ${successCount} task(s), but ${failCount} had issues.`);
        setFailedTasks(results.failed); // NEW: Store failed tasks for retry
      } else {
        toast.error(`Failed to create all ${failCount} task(s).`);
        setFailedTasks(results.failed); // NEW: Store failed tasks for retry
      }


    } catch (error) {
      console.error("Error in task creation process:", error);
      toast.error("An unexpected error occurred during task creation");
    } finally {
      setIsCreating(false);
      setCreationProgress({ current: 0, total: 0, currentTask: "" });
    }
  };

  // NEW: Retry failed tasks
  const handleRetryFailed = async () => {
    if (failedTasks.length === 0) return;

    const tasksToRetry = failedTasks.filter(f => !f.parentCreated).map(f => f.task);
    setProposedTasks(tasksToRetry);
    setFailedTasks([]);
    toast.info(`${tasksToRetry.length} task(s) ready to retry`);
  };

  const handleClose = () => {
    if (proposedTasks.length > 0 && !isCreating) {
      const confirmed = window.confirm(
        `You have ${proposedTasks.length} proposed task(s) that haven't been created. Are you sure you want to close?`
      );

      if (!confirmed) {
        return;
      }
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    clearDraftFromStorage(); // NEW: Clear draft on close
    setMessages([]);
    setInputValue("");
    setProposedTasks([]);
    setEditingTaskIndex(null);
    setIsProcessing(false);
    setIsCreating(false);
    setCreationProgress({ current: 0, total: 0, currentTask: "" });
    setFailedTasks([]); // NEW: Clear failed tasks
    setDuplicateWarnings([]); // NEW: Clear duplicate warnings
    onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">AI Task Assistant</DialogTitle>
                <DialogDescription>
                  Describe your tasks in natural language, and I'll create them intelligently
                </DialogDescription>
              </div>
            </div>

            {/* NEW: Draft saved indicator */}
            <Badge variant="outline" className="text-xs">
              <Save className="w-3 h-3 mr-1" />
              Auto-saving
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Chat Section */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : message.error
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-800'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {message.warnings && message.warnings.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
                        <p className="text-xs font-semibold mb-2 flex items-center gap-1 text-yellow-700 dark:text-yellow-300">
                          <AlertCircle className="w-3 h-3" />
                          Warnings:
                        </p>
                        <div className="space-y-1">
                          {message.warnings.map((warning, idx) => (
                            <p key={idx} className="text-xs text-yellow-600 dark:text-yellow-400">• {warning}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Suggestions:
                        </p>
                        <div className="space-y-1">
                          {message.suggestions.map((suggestion, idx) => (
                            <p key={idx} className="text-xs opacity-80">• {suggestion}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Analyzing your request...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe the task(s) you need to create..."
                className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                disabled={isProcessing || isCreating}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing || isCreating}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Proposed Tasks Panel */}
          <div className="w-96 flex flex-col border-l pl-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Proposed Tasks</h3>
              <Badge variant="secondary">{proposedTasks.length}</Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {proposedTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No tasks proposed yet.</p>
                  <p className="text-xs mt-1">Describe what you need in the chat.</p>
                </div>
              ) : (
                proposedTasks.map((task, index) => (
                  <TaskProposalCard
                    key={index}
                    task={task}
                    index={index}
                    isEditing={editingTaskIndex === index}
                    onEdit={() => handleEditTask(index)}
                    onSave={(updatedTask) => handleSaveEdit(index, updatedTask)}
                    onCancel={() => setEditingTaskIndex(null)}
                    onDelete={() => handleDeleteTask(index)}
                    getPriorityColor={getPriorityColor}
                    assignments={assignments} // KEPT: for dropdown and display
                    users={users}
                  />
                ))
              )}
            </div>

            {/* NEW: Failed tasks retry */}
            {failedTasks.length > 0 && (
              <div className="mb-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                  {failedTasks.length} task(s) failed to create
                </p>
                <Button
                  onClick={handleRetryFailed}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Retry Failed Tasks
                </Button>
              </div>
            )}

            {proposedTasks.length > 0 && (
              <div className="space-y-2">
                {isCreating && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Creating tasks...
                      </span>
                      <span className="text-xs text-blue-700 dark:text-blue-300">
                        {creationProgress.current} / {creationProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 mb-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(creationProgress.current / creationProgress.total) * 100}%` }}
                      />
                    </div>
                    {creationProgress.currentTask && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
                        {creationProgress.currentTask}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleCreateTasks}
                  disabled={isCreating}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Tasks...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Create {proposedTasks.length} Task(s)
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Task Proposal Card Component
function TaskProposalCard({
  task,
  index,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  getPriorityColor,
  assignments, // KEPT: for dropdown and display
  users
}) {
  const [editedTask, setEditedTask] = useState(task);

  useEffect(() => {
    if (isEditing) {
      setEditedTask(task);
    }
  }, [isEditing]);

  // Handle skill_requirements editing (basic text input for now)
  const handleSkillRequirementsChange = (e) => {
    setEditedTask({
      ...editedTask,
      skill_requirements: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
    });
  };

  if (isEditing) {
    return (
      <Card className="border-2 border-indigo-500">
        <CardContent className="p-4 space-y-3">
          <Input
            value={editedTask.title}
            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
            placeholder="Task title"
            className="font-semibold"
          />

          <Textarea
            value={editedTask.description || ""}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
            placeholder="Description"
            className="min-h-[60px]"
          />

          <div className="grid grid-cols-2 gap-2">
            <Select
              value={editedTask.priority || "medium"}
              onValueChange={(value) => setEditedTask({ ...editedTask, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={editedTask.due_date || ""}
              onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value })}
            />
          </div>

          <Input
            type="number"
            value={editedTask.estimated_effort || ""}
            onChange={(e) => setEditedTask({ ...editedTask, estimated_effort: parseFloat(e.target.value) || null })}
            placeholder="Estimated effort (hours)"
          />

          {/* ADDED: Skill Requirements Input */}
          <Input
            value={Array.isArray(editedTask.skill_requirements) ? editedTask.skill_requirements.join(', ') : ''}
            onChange={handleSkillRequirementsChange}
            placeholder="Skill requirements (comma-separated)"
          />

          <Select
            value={editedTask.assignment_id || ""}
            onValueChange={(value) => setEditedTask({ ...editedTask, assignment_id: value })}
            disabled // Assignment ID is now fixed by prop, not editable here
          >
            <SelectTrigger>
              <SelectValue placeholder="Select assignment" />
            </SelectTrigger>
            <SelectContent>
              {assignments.map(assignment => (
                <SelectItem key={assignment.id} value={assignment.id}>
                  {assignment.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={editedTask.assigned_to || ""}
            onValueChange={(value) => setEditedTask({ ...editedTask, assigned_to: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Assign to" />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.email} value={user.email}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => onSave(editedTask)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <Badge className={getPriorityColor(task.priority || 'medium')}>
              {task.priority || 'medium'}
            </Badge>
            {task.due_date && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {format(new Date(task.due_date), 'MMM d')}
              </Badge>
            )}
            {task.estimated_effort && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {task.estimated_effort}h
              </Badge>
            )}
            {task.is_recurring && (
              <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/20">
                <Repeat className="w-3 h-3 mr-1" />
                {task.recurrence_pattern?.frequency || 'recurring'}
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="w-3 h-3 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600 dark:text-red-400">
                <Trash2 className="w-3 h-3 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">
            {task.title}
          </h4>

          {task.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {task.description}
            </p>
          )}

          {task.assigned_to && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <UserIcon className="w-3 h-3" />
              <span className="truncate">
                {users.find(u => u.email === task.assigned_to)?.full_name || task.assigned_to}
              </span>
            </div>
          )}

          {task.assignment_id && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              📁 {assignments.find(a => a.id === task.assignment_id)?.name || task.assignment_id}
            </div>
          )}

          {task.skill_requirements && task.skill_requirements.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.skill_requirements.map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs font-normal">
                  {skill}
                </Badge>
              ))}
            </div>
          )}

          {task.subtasks && task.subtasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                <Plus className="w-3 h-3" />
                {task.subtasks.length} Subtask(s)
              </p>
              <div className="space-y-1">
                {task.subtasks.map((subtask, idx) => (
                  <p key={idx} className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                    • {subtask.title}
                  </p>
                ))}
              </div>
            </div>
          )}

          {task.checklist && task.checklist.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                <CheckSquare className="w-3 h-3" />
                Checklist ({task.checklist.length})
              </p>
              <div className="space-y-1">
                {task.checklist.slice(0, 3).map((item, idx) => (
                  <p key={idx} className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                    ☐ {typeof item === 'string' ? item : item.text}
                  </p>
                ))}
                {task.checklist.length > 3 && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">+{task.checklist.length - 3} more</p>
                )}
              </div>
            </div>
          )}

          {task.checklist_items && task.checklist_items.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                <CheckSquare className="w-3 h-3" />
                Checklist ({task.checklist_items.length})
              </p>
              <div className="space-y-1">
                {task.checklist_items.slice(0, 3).map((item, idx) => (
                  <p key={idx} className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                    ☐ {item}
                  </p>
                ))}
                {task.checklist_items.length > 3 && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">+{task.checklist_items.length - 3} more</p>
                )}
              </div>
            </div>
          )}

          {task.reasoning && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                💡 {task.reasoning}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
