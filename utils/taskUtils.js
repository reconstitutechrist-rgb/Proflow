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

const SIMILARITY_THRESHOLD = 0.7;

/**
 * Parse natural language date strings into ISO format
 * Supports: "today", "tomorrow", "next Monday", "in 2 weeks", "end of month", etc.
 */
export function parseDateString(dateStr) {
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
      } catch {
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
}

/**
 * Validate recurrence pattern for recurring tasks
 */
export function validateRecurrencePattern(pattern) {
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
}

/**
 * Validate subtasks array
 */
export function validateSubtasks(subtasks) {
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
}

/**
 * Calculate word-based similarity between two strings (Jaccard similarity)
 */
export function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Check for potential duplicate tasks
 */
export function checkForDuplicates(newTask, existingTasks, threshold = SIMILARITY_THRESHOLD) {
  const duplicates = [];

  for (const existingTask of existingTasks) {
    if (existingTask.status === 'completed') continue;

    const titleSimilarity = calculateSimilarity(newTask.title, existingTask.title);
    const sameAssignment = existingTask.assignment_id === newTask.assignment_id;
    const sameAssignee = existingTask.assigned_to === newTask.assigned_to;

    if (titleSimilarity > threshold && sameAssignment) {
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
}

/**
 * Validate complete task structure
 */
export function validateTaskStructure(task, { assignments = [], projects = [], users = [], currentUser = null } = {}) {
  const errors = [];

  if (!task.title || typeof task.title !== 'string' || !task.title.trim()) {
    errors.push("Task must have a title");
  }

  // Validate assignment_id
  const validatedAssignment = task.assignment_id && assignments.find(a => a.id === task.assignment_id);
  if (!validatedAssignment) {
    if (assignments.length === 0) {
      errors.push("No assignments available. Please create an assignment first.");
    } else {
      errors.push(`Invalid assignment: ${task.assignment_id || 'none specified'}`);
    }
  }

  // Validate project_id if provided (optional)
  const validatedProject = task.project_id ? projects.find(p => p.id === task.project_id) : null;
  if (task.project_id && !validatedProject) {
    errors.push(`Invalid project: ${task.project_id}`);
  }

  // Validate assigned_to
  const validatedUser = task.assigned_to && users.find(u => u.email === task.assigned_to);
  if (!validatedUser) {
    if (users.length === 0) {
      errors.push("No users available.");
    } else {
      errors.push(`Invalid user: ${task.assigned_to || 'none specified'}`);
    }
  }

  // Validate priority
  if (task.priority && !['low', 'medium', 'high', 'urgent'].includes(task.priority)) {
    errors.push(`Invalid priority: ${task.priority}`);
  }

  // Validate status
  if (task.status && !['todo', 'in_progress', 'review', 'completed'].includes(task.status)) {
    errors.push(`Invalid status: ${task.status}`);
  }

  // Validate recurrence pattern
  if (task.is_recurring && task.recurrence_pattern) {
    const recurrenceValidation = validateRecurrencePattern(task.recurrence_pattern);
    if (!recurrenceValidation.isValid) {
      errors.push(...recurrenceValidation.errors.map(e => `Recurrence: ${e}`));
    }
  }

  // Validate subtasks
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
      assignment_id: validatedAssignment?.id || (assignments[0]?.id || ""),
      project_id: validatedProject?.id || null,
      assigned_to: validatedUser?.email || (currentUser?.email || ""),
      due_date: task.due_date ? parseDateString(task.due_date) : null
    }
  };
}

/**
 * Quick start templates for task creation
 */
export const TASK_TEMPLATES = [
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

/**
 * Get priority color classes
 */
export function getPriorityColor(priority) {
  const colors = {
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
  };
  return colors[priority] || colors.medium;
}

/**
 * Draft storage utilities
 */
const DRAFT_STORAGE_KEY = "ai_assistant_task_draft";

export function saveTaskDraft(data) {
  try {
    const draft = {
      ...data,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error("Error saving task draft:", error);
  }
}

export function loadTaskDraft() {
  try {
    const draftStr = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!draftStr) return null;

    const draft = JSON.parse(draftStr);
    const draftAge = Date.now() - new Date(draft.timestamp).getTime();
    const ONE_HOUR = 60 * 60 * 1000;

    if (draftAge < ONE_HOUR && draft.proposedTasks?.length > 0) {
      return draft;
    }

    localStorage.removeItem(DRAFT_STORAGE_KEY);
    return null;
  } catch (error) {
    console.error("Error loading task draft:", error);
    return null;
  }
}

export function clearTaskDraft() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing task draft:", error);
  }
}
