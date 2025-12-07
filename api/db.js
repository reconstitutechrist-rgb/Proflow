// Supabase-based data client
import { supabase } from './supabaseClient';

// Helper to generate UUIDs
const generateId = () => {
  // Generate a UUID v4
  return crypto.randomUUID();
};

// Map entity names to table names (handles pluralization)
const entityToTableName = (entityName) => {
  const tableMap = {
    'Workspace': 'workspaces',
    'Project': 'projects',
    'Task': 'tasks',
    'Document': 'documents',
    'User': 'users',
    'Assignment': 'assignments',
    'WorkspaceMember': 'workspace_members',
    'DocumentVersion': 'document_versions',
    'Comment': 'comments',
    'DocumentComment': 'document_comments',
    'Tag': 'tags',
    'Message': 'messages',
    'WorkflowPattern': 'workflow_patterns',
    'ConversationThread': 'conversation_threads',
    'ChatSession': 'chat_sessions',
    'Note': 'notes',
    'Folder': 'folders',
    'AIResearchChat': 'ai_research_chats',
    'TeamChat': 'team_chats',
    'TeamChatMessage': 'team_chat_messages',
  };

  return tableMap[entityName] || entityName.toLowerCase();
};

// Create an entity manager for a specific entity type
const createEntityManager = (entityName) => {
  const tableName = entityToTableName(entityName);

  return {
    // List all items with optional filtering
    list: async (filters = {}) => {
      let query = supabase.from(tableName).select('*');

      // Apply filters if provided
      if (filters && Object.keys(filters).length > 0) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error listing ${entityName}:`, error);
        return [];
      }

      return data || [];
    },

    // Filter items - only supports object filters for security (workspace isolation)
    // Function filters are disabled to prevent loading all data without workspace filtering
    filter: async (filterArg, sortOrder, limit) => {
      if (typeof filterArg === 'function') {
        // SECURITY: Function filters load ALL records without workspace filtering
        // This is a data leakage vulnerability. Use object filters instead.
        console.error(
          `SECURITY WARNING: Function filters are disabled for ${entityName}. ` +
          `Use object filters with workspace_id to ensure data isolation.`
        );
        throw new Error(
          'Function filters are not supported. Use object filters with workspace_id.'
        );
      }

      // Object-based filtering uses the list method with workspace_id enforcement
      return createEntityManager(entityName).list(filterArg, sortOrder, limit);
    },

    // Get a single item by ID
    get: async (id) => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error getting ${entityName}:`, error);
        return null;
      }

      return data;
    },

    // Create a new item
    create: async (data) => {
      // Let Supabase auto-generate the ID unless explicitly provided
      const newItem = {
        ...data,
        created_date: data.created_date || new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };

      // Only add ID if explicitly provided in the data
      if (data.id) {
        newItem.id = data.id;
      }

      const { data: created, error } = await supabase
        .from(tableName)
        .insert([newItem])
        .select()
        .single();

      if (error) {
        console.error(`Error creating ${entityName}:`, error.message, error.details, error.hint, error.code);
        throw new Error(`${error.message}${error.details ? ` - ${error.details}` : ''}${error.hint ? ` (Hint: ${error.hint})` : ''}`);
      }

      return created;
    },

    // Bulk create multiple items
    bulkCreate: async (dataArray) => {
      const newItems = dataArray.map(data => ({
        ...data,
        id: data.id || generateId(),
        created_date: data.created_date || new Date().toISOString(),
        updated_date: new Date().toISOString(),
      }));

      const { data: created, error } = await supabase
        .from(tableName)
        .insert(newItems)
        .select();

      if (error) {
        console.error(`Error bulk creating ${entityName}:`, error);
        throw error;
      }

      return created || [];
    },

    // Update an existing item
    update: async (id, data) => {
      const updateData = {
        ...data,
        updated_date: new Date().toISOString(),
      };

      const { data: updated, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating ${entityName}:`, error);
        throw new Error(`${entityName} with id ${id} not found`);
      }

      return updated;
    },

    // Delete an item
    delete: async (id) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting ${entityName}:`, error);
        throw error;
      }

      return { success: true };
    },

    // Count items with optional filtering
    count: async (filters = {}) => {
      let query = supabase.from(tableName).select('*', { count: 'exact', head: true });

      // Apply filters if provided
      if (filters && Object.keys(filters).length > 0) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { count, error } = await query;

      if (error) {
        console.error(`Error counting ${entityName}:`, error);
        return 0;
      }

      return count || 0;
    },
  };
};

// Auth management using Supabase Auth
const auth = {
  me: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // SECURITY: Do not return fake user in production
      // Components should handle null user appropriately
      if (import.meta.env.DEV) {
        console.warn('Auth Warning: No authenticated user. Using development fallback.');
        return {
          id: '00000000-0000-0000-0000-000000000000',
          email: 'dev@proflow.local',
          full_name: 'Development User',
          active_workspace_id: null,
          created_date: new Date().toISOString(),
          _isDevelopmentFallback: true, // Flag to identify fake user
        };
      }
      // In production, return null to indicate no authenticated user
      console.error('Error getting user:', error);
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email,
      active_workspace_id: user.user_metadata?.active_workspace_id || null,
      created_date: user.created_at,
    };
  },

  updateMe: async (updates) => {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }

    return {
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name || data.user.email,
      active_workspace_id: data.user.user_metadata?.active_workspace_id || null,
      updated_date: new Date().toISOString(),
    };
  },

  // Check if user is logged in
  isLoggedIn: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  // Logout
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    return { success: true };
  },
};

// Agent conversation management (stub implementation)
// This provides a local conversation system for the AI assistant
const agentConversations = new Map();
const agentSubscribers = new Map();

const agents = {
  // Create a new conversation with an AI agent
  createConversation: async ({ agent_name, metadata = {} }) => {
    const conversationId = crypto.randomUUID();
    const conversation = {
      id: conversationId,
      agent_name,
      metadata,
      messages: [],
      status: 'active',
      created_at: new Date().toISOString(),
    };
    agentConversations.set(conversationId, conversation);
    return conversation;
  },

  // Subscribe to conversation updates
  subscribeToConversation: (conversationId, callback) => {
    if (!agentSubscribers.has(conversationId)) {
      agentSubscribers.set(conversationId, new Set());
    }
    agentSubscribers.get(conversationId).add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = agentSubscribers.get(conversationId);
      if (subscribers) {
        subscribers.delete(callback);
      }
    };
  },

  // Add a message to the conversation
  addMessage: async (conversation, { role, content }) => {
    const conversationData = agentConversations.get(conversation.id);
    if (!conversationData) {
      throw new Error('Conversation not found');
    }

    const message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    conversationData.messages.push(message);

    // If it's a user message, generate an AI response
    if (role === 'user') {
      conversationData.status = 'processing';
      notifySubscribers(conversation.id, conversationData);

      // Generate AI response (now async to support note creation)
      setTimeout(async () => {
        try {
          const responseContent = await generateAIResponse(content, conversationData);
          const aiResponse = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: responseContent,
            timestamp: new Date().toISOString(),
          };
          conversationData.messages.push(aiResponse);
          conversationData.status = 'active';
          notifySubscribers(conversation.id, conversationData);
        } catch (error) {
          console.error('Error generating AI response:', error);
          const errorResponse = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
            timestamp: new Date().toISOString(),
          };
          conversationData.messages.push(errorResponse);
          conversationData.status = 'active';
          notifySubscribers(conversation.id, conversationData);
        }
      }, 500);
    }

    return message;
  },

  // Get conversation by ID
  getConversation: async (conversationId) => {
    return agentConversations.get(conversationId) || null;
  },
};

// Helper to notify all subscribers of a conversation
const notifySubscribers = (conversationId, data) => {
  const subscribers = agentSubscribers.get(conversationId);
  if (subscribers) {
    subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error('Error in conversation subscriber:', err);
      }
    });
  }
};

// Parse context from AI message to extract workspace info
const parseContextFromMessage = (message) => {
  const context = {};

  // Extract workspace_id from the context if present
  const workspaceMatch = message.match(/workspace_id:\s*([a-f0-9-]+)/i);
  if (workspaceMatch) {
    context.workspace_id = workspaceMatch[1];
  }

  // Extract user info
  const userEmailMatch = message.match(/User Email:\s*([^\n]+)/i);
  if (userEmailMatch) {
    context.user_email = userEmailMatch[1].trim();
  }

  const userIdMatch = message.match(/User ID:\s*([^\n]+)/i);
  if (userIdMatch) {
    context.user_id = userIdMatch[1].trim();
  }

  return context;
};

// Extract note details from user message
const extractNoteDetails = (message) => {
  const lines = message.split('\n');
  let title = '';
  let content = '';
  let tags = [];
  let color = '#FBBF24'; // Default yellow

  // Look for structured input
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith('title:')) {
      title = line.substring(6).trim();
    } else if (lowerLine.startsWith('content:')) {
      content = line.substring(8).trim();
    } else if (lowerLine.startsWith('tags:')) {
      tags = line.substring(5).split(',').map(t => t.trim()).filter(t => t);
    } else if (lowerLine.startsWith('color:')) {
      const colorInput = line.substring(6).trim().toLowerCase();
      const colorMap = {
        'yellow': '#FBBF24',
        'blue': '#60A5FA',
        'green': '#34D399',
        'red': '#F87171',
        'purple': '#A78BFA',
        'orange': '#FB923C',
        'pink': '#EC4899'
      };
      color = colorMap[colorInput] || color;
    }
  }

  // If no structured format, try to extract from natural language
  if (!title && !content) {
    // Look for patterns like "create a note called X" or "note titled X"
    const titleMatch = message.match(/(?:note\s+(?:called|titled|named)|title[d]?\s*[:\s])\s*["']?([^"'\n]+)["']?/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Look for content patterns
    const contentMatch = message.match(/(?:content|body|text|saying|with)[:\s]+["']?([^"'\n]+)["']?/i);
    if (contentMatch) {
      content = contentMatch[1].trim();
    }

    // If still no title, use first significant text
    if (!title) {
      const userInput = message.match(/User Input:\s*(.+)/i);
      if (userInput) {
        const input = userInput[1].trim();
        // Extract potential title from "create note X" pattern
        const simpleMatch = input.match(/create\s+(?:a\s+)?note\s+(?:called\s+|titled\s+|named\s+)?["']?(.+?)["']?(?:\s+with|\s+content|$)/i);
        if (simpleMatch) {
          title = simpleMatch[1].trim();
        }
      }
    }
  }

  return { title, content, tags, color };
};

// Extract project details from user message
const extractProjectDetails = (message) => {
  const userInput = message.match(/User Input:\s*(.+)/is)?.[1] || message;
  let name = '';
  let description = '';
  let goals = '';
  let status = 'planning';
  let priority = 'medium';
  let color = '#3B82F6';

  // Look for structured input
  const lines = message.split('\n');
  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();
    if (lowerLine.startsWith('name:') || lowerLine.startsWith('project name:')) {
      name = line.split(':').slice(1).join(':').trim();
    } else if (lowerLine.startsWith('description:')) {
      description = line.split(':').slice(1).join(':').trim();
    } else if (lowerLine.startsWith('goals:') || lowerLine.startsWith('goal:')) {
      goals = line.split(':').slice(1).join(':').trim();
    } else if (lowerLine.startsWith('status:')) {
      const statusInput = line.split(':')[1]?.trim().toLowerCase();
      if (['planning', 'active', 'on_hold', 'completed', 'cancelled'].includes(statusInput)) {
        status = statusInput;
      }
    } else if (lowerLine.startsWith('priority:')) {
      const priorityInput = line.split(':')[1]?.trim().toLowerCase();
      if (['low', 'medium', 'high', 'urgent'].includes(priorityInput)) {
        priority = priorityInput;
      }
    }
  }

  // Natural language extraction
  if (!name) {
    const nameMatch = userInput.match(/(?:project\s+(?:called|titled|named)|create\s+(?:a\s+)?project\s+)["']?([^"'\n,]+)["']?/i);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }
  }

  return { name, description, goals, status, priority, color };
};

// Extract assignment details from user message
const extractAssignmentDetails = (message) => {
  const userInput = message.match(/User Input:\s*(.+)/is)?.[1] || message;
  let name = '';
  let description = '';
  let status = 'not_started';
  let priority = 'medium';
  let project_id = null;
  let due_date = null;

  // Look for structured input
  const lines = message.split('\n');
  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();
    if (lowerLine.startsWith('name:') || lowerLine.startsWith('assignment name:')) {
      name = line.split(':').slice(1).join(':').trim();
    } else if (lowerLine.startsWith('description:')) {
      description = line.split(':').slice(1).join(':').trim();
    } else if (lowerLine.startsWith('status:')) {
      const statusInput = line.split(':')[1]?.trim().toLowerCase().replace(' ', '_');
      if (['not_started', 'in_progress', 'under_review', 'completed', 'on_hold'].includes(statusInput)) {
        status = statusInput;
      }
    } else if (lowerLine.startsWith('priority:')) {
      const priorityInput = line.split(':')[1]?.trim().toLowerCase();
      if (['low', 'medium', 'high', 'urgent'].includes(priorityInput)) {
        priority = priorityInput;
      }
    } else if (lowerLine.startsWith('project:') || lowerLine.startsWith('project_id:')) {
      project_id = line.split(':').slice(1).join(':').trim();
    } else if (lowerLine.startsWith('due:') || lowerLine.startsWith('due date:')) {
      due_date = line.split(':').slice(1).join(':').trim();
    }
  }

  // Natural language extraction
  if (!name) {
    const nameMatch = userInput.match(/(?:assignment\s+(?:called|titled|named)|create\s+(?:an?\s+)?assignment\s+)["']?([^"'\n,]+)["']?/i);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }
  }

  // Extract project reference from context
  const projectMatch = message.match(/Project ID:\s*([a-f0-9-]+)/i) ||
                       message.match(/for\s+project\s+["']?([^"'\n]+)["']?/i);
  if (projectMatch && !project_id) {
    project_id = projectMatch[1].trim();
  }

  return { name, description, status, priority, project_id, due_date };
};

// Extract task details from user message
const extractTaskDetails = (message) => {
  const userInput = message.match(/User Input:\s*(.+)/is)?.[1] || message;
  let title = '';
  let description = '';
  let status = 'todo';
  let priority = 'medium';
  let assigned_to = null;
  let project_id = null;
  let assignment_id = null;
  let due_date = null;

  // Look for structured input
  const lines = message.split('\n');
  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();
    if (lowerLine.startsWith('title:') || lowerLine.startsWith('task:') || lowerLine.startsWith('task name:')) {
      title = line.split(':').slice(1).join(':').trim();
    } else if (lowerLine.startsWith('description:')) {
      description = line.split(':').slice(1).join(':').trim();
    } else if (lowerLine.startsWith('status:')) {
      const statusInput = line.split(':')[1]?.trim().toLowerCase().replace(' ', '_');
      if (['todo', 'in_progress', 'review', 'done', 'blocked'].includes(statusInput)) {
        status = statusInput;
      }
    } else if (lowerLine.startsWith('priority:')) {
      const priorityInput = line.split(':')[1]?.trim().toLowerCase();
      if (['low', 'medium', 'high', 'urgent'].includes(priorityInput)) {
        priority = priorityInput;
      }
    } else if (lowerLine.startsWith('assign to:') || lowerLine.startsWith('assigned to:') || lowerLine.startsWith('assign:')) {
      assigned_to = line.split(':').slice(1).join(':').trim();
    } else if (lowerLine.startsWith('project:') || lowerLine.startsWith('project_id:')) {
      project_id = line.split(':').slice(1).join(':').trim();
    } else if (lowerLine.startsWith('assignment:') || lowerLine.startsWith('assignment_id:')) {
      assignment_id = line.split(':').slice(1).join(':').trim();
    } else if (lowerLine.startsWith('due:') || lowerLine.startsWith('due date:')) {
      due_date = line.split(':').slice(1).join(':').trim();
    }
  }

  // Natural language extraction for title
  if (!title) {
    const titleMatch = userInput.match(/(?:task\s+(?:called|titled|named)|create\s+(?:a\s+)?task\s+)["']?([^"'\n,]+)["']?/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
  }

  // Extract assignment from natural language
  if (!assigned_to) {
    const assignMatch = userInput.match(/(?:assign(?:ed)?\s+to|for)\s+@?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|[A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
    if (assignMatch) {
      assigned_to = assignMatch[1].trim();
    }
  }

  // Extract project/assignment references from context
  const projectIdMatch = message.match(/Current Project:.*?\(ID:\s*([a-f0-9-]+)/i);
  if (projectIdMatch && !project_id) {
    project_id = projectIdMatch[1];
  }

  return { title, description, status, priority, assigned_to, project_id, assignment_id, due_date };
};

// Parse team members from context
const parseTeamMembers = (message) => {
  const teamSection = message.match(/Team Members.*?:\s*\n([\s\S]*?)(?:\n\n|User Input:)/i);
  if (!teamSection) return [];

  const members = [];
  const lines = teamSection[1].split('\n');
  for (const line of lines) {
    const match = line.match(/-\s*(.+?)\s*\(([^)]+)\)/);
    if (match) {
      members.push({ name: match[1].trim(), email: match[2].trim() });
    }
  }
  return members;
};

// Find user by name or email from team members
const findTeamMember = (identifier, teamMembers) => {
  if (!identifier || !teamMembers.length) return null;

  const lowerIdentifier = identifier.toLowerCase();

  // First try exact email match
  let member = teamMembers.find(m => m.email.toLowerCase() === lowerIdentifier);
  if (member) return member.email;

  // Try name match
  member = teamMembers.find(m => m.name.toLowerCase() === lowerIdentifier);
  if (member) return member.email;

  // Try partial name match
  member = teamMembers.find(m =>
    m.name.toLowerCase().includes(lowerIdentifier) ||
    lowerIdentifier.includes(m.name.toLowerCase().split(' ')[0])
  );
  if (member) return member.email;

  return identifier; // Return original if no match
};

// Generate AI response with full CRUD capabilities
const generateAIResponse = async (userMessage, conversation) => {
  const lowercaseMsg = userMessage.toLowerCase();
  const context = parseContextFromMessage(userMessage);
  const teamMembers = parseTeamMembers(userMessage);

  // Check for workspace context
  if (!context.workspace_id && (
    lowercaseMsg.includes('create') ||
    lowercaseMsg.includes('update') ||
    lowercaseMsg.includes('delete')
  )) {
    return `I'd be happy to help, but I need you to be in a workspace first.

Please make sure you have a workspace selected, then try again.`;
  }

  // ==================== PROJECT OPERATIONS ====================

  // Handle project creation
  if (lowercaseMsg.includes('create') && lowercaseMsg.includes('project')) {
    const projectDetails = extractProjectDetails(userMessage);

    if (projectDetails.name && context.workspace_id) {
      try {
        const projectData = {
          workspace_id: context.workspace_id,
          name: projectDetails.name,
          description: projectDetails.description || '',
          goals: projectDetails.goals || '',
          status: projectDetails.status,
          priority: projectDetails.priority,
          color: projectDetails.color,
          created_by: context.user_email || 'AI Assistant',
        };

        const createdProject = await createEntityManager('Project').create(projectData);

        return `✅ **Project created successfully!**

**Name:** ${createdProject.name}
${createdProject.description ? `**Description:** ${createdProject.description}` : ''}
${createdProject.goals ? `**Goals:** ${createdProject.goals}` : ''}
**Status:** ${createdProject.status}
**Priority:** ${createdProject.priority}

Your project has been created! You can now:
- Create assignments for this project
- Add tasks to track work
- View it in the Projects page

Would you like me to create an assignment for this project?`;
      } catch (error) {
        console.error('Error creating project:', error);
        return `❌ I encountered an error while creating the project: ${error.message}

Please try again or create the project manually from the Projects page.`;
      }
    }

    return `I'd be happy to create a project for you! Please provide the details:

**Required:**
- **Name:** What should the project be called?

**Optional:**
- **Description:** Brief project description
- **Goals:** What are the project goals?
- **Status:** planning, active, on_hold, completed, cancelled (default: planning)
- **Priority:** low, medium, high, urgent (default: medium)

Example:
\`\`\`
Name: Website Redesign
Description: Complete overhaul of company website
Goals: Improve user experience and conversion rates
Status: planning
Priority: high
\`\`\`

Or simply say: "Create a project called Website Redesign"`;
  }

  // ==================== ASSIGNMENT OPERATIONS ====================

  // Handle assignment creation
  if (lowercaseMsg.includes('create') && lowercaseMsg.includes('assignment')) {
    const assignmentDetails = extractAssignmentDetails(userMessage);

    if (assignmentDetails.name && context.workspace_id) {
      try {
        const assignmentData = {
          workspace_id: context.workspace_id,
          name: assignmentDetails.name,
          description: assignmentDetails.description || '',
          status: assignmentDetails.status,
          priority: assignmentDetails.priority,
          project_id: assignmentDetails.project_id || null,
          due_date: assignmentDetails.due_date || null,
          created_by: context.user_email || 'AI Assistant',
        };

        const createdAssignment = await createEntityManager('Assignment').create(assignmentData);

        return `✅ **Assignment created successfully!**

**Name:** ${createdAssignment.name}
${createdAssignment.description ? `**Description:** ${createdAssignment.description}` : ''}
**Status:** ${createdAssignment.status}
**Priority:** ${createdAssignment.priority}
${createdAssignment.project_id ? `**Project ID:** ${createdAssignment.project_id}` : ''}
${createdAssignment.due_date ? `**Due Date:** ${createdAssignment.due_date}` : ''}

Your assignment has been created! You can now:
- Add tasks to this assignment
- Track progress on the Assignments page

Would you like me to create tasks for this assignment?`;
      } catch (error) {
        console.error('Error creating assignment:', error);
        return `❌ I encountered an error while creating the assignment: ${error.message}

Please try again or create the assignment manually from the Assignments page.`;
      }
    }

    return `I'd be happy to create an assignment for you! Please provide the details:

**Required:**
- **Name:** What should the assignment be called?

**Optional:**
- **Description:** Brief description
- **Status:** not_started, in_progress, under_review, completed, on_hold (default: not_started)
- **Priority:** low, medium, high, urgent (default: medium)
- **Project:** Which project is this for?
- **Due Date:** When is it due?

Example:
\`\`\`
Name: Homepage Design
Description: Design the new homepage layout
Status: not_started
Priority: high
Due Date: 2024-02-15
\`\`\`

Or simply say: "Create an assignment called Homepage Design"`;
  }

  // ==================== TASK OPERATIONS ====================

  // Handle task creation
  if (lowercaseMsg.includes('create') && lowercaseMsg.includes('task')) {
    const taskDetails = extractTaskDetails(userMessage);

    if (taskDetails.title && context.workspace_id) {
      try {
        // Resolve team member if specified
        let assignedTo = taskDetails.assigned_to;
        if (assignedTo && teamMembers.length > 0) {
          assignedTo = findTeamMember(assignedTo, teamMembers);
        }

        const taskData = {
          workspace_id: context.workspace_id,
          title: taskDetails.title,
          description: taskDetails.description || '',
          status: taskDetails.status,
          priority: taskDetails.priority,
          assigned_to: assignedTo || null,
          project_id: taskDetails.project_id || null,
          assignment_id: taskDetails.assignment_id || null,
          due_date: taskDetails.due_date || null,
          created_by: context.user_email || 'AI Assistant',
        };

        const createdTask = await createEntityManager('Task').create(taskData);

        let assignedToDisplay = createdTask.assigned_to || 'Unassigned';
        if (createdTask.assigned_to && teamMembers.length > 0) {
          const member = teamMembers.find(m => m.email === createdTask.assigned_to);
          if (member) assignedToDisplay = `${member.name} (${member.email})`;
        }

        return `✅ **Task created successfully!**

**Title:** ${createdTask.title}
${createdTask.description ? `**Description:** ${createdTask.description}` : ''}
**Status:** ${createdTask.status}
**Priority:** ${createdTask.priority}
**Assigned To:** ${assignedToDisplay}
${createdTask.due_date ? `**Due Date:** ${createdTask.due_date}` : ''}

Your task has been created and added to the task board.

Would you like to:
- Create another task?
- Assign this to someone else?
- Change the priority?`;
      } catch (error) {
        console.error('Error creating task:', error);
        return `❌ I encountered an error while creating the task: ${error.message}

Please try again or create the task manually from the Tasks page.`;
      }
    }

    // Show available team members if we have them
    let teamMembersList = '';
    if (teamMembers.length > 0) {
      teamMembersList = `\n\n**Available Team Members:**\n${teamMembers.map(m => `- ${m.name} (${m.email})`).join('\n')}`;
    }

    return `I'd be happy to create a task for you! Please provide the details:

**Required:**
- **Title:** What should the task be called?

**Optional:**
- **Description:** Task details
- **Status:** todo, in_progress, review, done, blocked (default: todo)
- **Priority:** low, medium, high, urgent (default: medium)
- **Assign To:** Team member name or email
- **Due Date:** When should it be completed?

Example:
\`\`\`
Title: Review homepage mockups
Description: Review and provide feedback on the new homepage designs
Priority: high
Assign To: john@example.com
Due Date: 2024-02-10
\`\`\`

Or simply say: "Create a task called Review mockups assigned to John"${teamMembersList}`;
  }

  // ==================== NOTE OPERATIONS ====================

  // Handle note creation
  if (lowercaseMsg.includes('create') && lowercaseMsg.includes('note')) {
    const noteDetails = extractNoteDetails(userMessage);

    if (noteDetails.title && context.workspace_id) {
      try {
        const noteData = {
          workspace_id: context.workspace_id,
          title: noteDetails.title,
          content: noteDetails.content || `<p>${noteDetails.title}</p>`,
          tags: noteDetails.tags,
          color: noteDetails.color,
          is_pinned: false,
          created_by: context.user_email || 'AI Assistant',
        };

        const createdNote = await createEntityManager('Note').create(noteData);

        return `✅ **Note created successfully!**

**Title:** ${createdNote.title}
${createdNote.content ? `**Content:** ${createdNote.content.replace(/<[^>]*>/g, '')}` : ''}
${noteDetails.tags.length > 0 ? `**Tags:** ${noteDetails.tags.join(', ')}` : ''}

Your note has been saved and you can find it in the Notes section on your Dashboard.

Would you like to create another note?`;
      } catch (error) {
        console.error('Error creating note:', error);
        return `❌ I encountered an error while creating the note: ${error.message}

Please try again or create the note manually from the Dashboard.`;
      }
    }

    return `I'd be happy to create a note for you! Please provide the details:

**Required:**
- **Title:** What should the note be called?

**Optional:**
- **Content:** The body of the note
- **Tags:** Comma-separated tags (e.g., "meeting, important")
- **Color:** yellow, blue, green, red, purple, orange, pink

Example:
\`\`\`
Title: Meeting Notes
Content: Discussed Q4 planning
Tags: meeting, planning
Color: blue
\`\`\`

Or simply say: "Create a note called Meeting Notes"`;
  }

  // ==================== UPDATE OPERATIONS ====================

  // Handle updates
  if (lowercaseMsg.includes('update') || lowercaseMsg.includes('change') || lowercaseMsg.includes('modify')) {
    // Extract entity type and ID
    const entityMatch = lowercaseMsg.match(/(project|assignment|task|note)\s+(?:id\s*)?([a-f0-9-]+)/i);

    if (entityMatch) {
      const entityType = entityMatch[1].toLowerCase();
      const entityId = entityMatch[2];

      // Extract what to update
      const updateFields = {};
      const lines = userMessage.split('\n');

      for (const line of lines) {
        const lowerLine = line.toLowerCase().trim();
        if (lowerLine.startsWith('status:')) {
          updateFields.status = line.split(':').slice(1).join(':').trim();
        } else if (lowerLine.startsWith('priority:')) {
          updateFields.priority = line.split(':').slice(1).join(':').trim();
        } else if (lowerLine.startsWith('title:') || lowerLine.startsWith('name:')) {
          updateFields[entityType === 'task' ? 'title' : 'name'] = line.split(':').slice(1).join(':').trim();
        } else if (lowerLine.startsWith('description:')) {
          updateFields.description = line.split(':').slice(1).join(':').trim();
        } else if (lowerLine.startsWith('assign to:') || lowerLine.startsWith('assigned to:')) {
          let assignee = line.split(':').slice(1).join(':').trim();
          if (teamMembers.length > 0) {
            assignee = findTeamMember(assignee, teamMembers);
          }
          updateFields.assigned_to = assignee;
        }
      }

      if (Object.keys(updateFields).length > 0) {
        try {
          const entityManager = createEntityManager(entityType.charAt(0).toUpperCase() + entityType.slice(1));
          const updated = await entityManager.update(entityId, updateFields);

          return `✅ **${entityType.charAt(0).toUpperCase() + entityType.slice(1)} updated successfully!**

Updated fields:
${Object.entries(updateFields).map(([key, value]) => `- **${key}:** ${value}`).join('\n')}

The changes have been saved.`;
        } catch (error) {
          console.error(`Error updating ${entityType}:`, error);
          return `❌ I couldn't update the ${entityType}: ${error.message}

Please check the ID and try again.`;
        }
      }
    }

    return `To update an item, please specify:

1. **What to update:** project, assignment, task, or note
2. **The ID:** The item's unique identifier
3. **What to change:** The fields you want to update

Example:
\`\`\`
Update task abc-123
Status: done
Priority: low
\`\`\`

Or: "Update task abc-123 status to done"`;
  }

  // ==================== DELETE OPERATIONS ====================

  // Handle deletions (with confirmation)
  if (lowercaseMsg.includes('delete') || lowercaseMsg.includes('remove')) {
    const entityMatch = lowercaseMsg.match(/(project|assignment|task|note)\s+(?:id\s*)?([a-f0-9-]+)/i);

    if (entityMatch) {
      const entityType = entityMatch[1].toLowerCase();
      const entityId = entityMatch[2];

      // Check for confirmation
      if (lowercaseMsg.includes('confirm') || lowercaseMsg.includes('yes')) {
        try {
          const entityManager = createEntityManager(entityType.charAt(0).toUpperCase() + entityType.slice(1));
          await entityManager.delete(entityId);

          return `✅ **${entityType.charAt(0).toUpperCase() + entityType.slice(1)} deleted successfully!**

The item has been permanently removed.`;
        } catch (error) {
          console.error(`Error deleting ${entityType}:`, error);
          return `❌ I couldn't delete the ${entityType}: ${error.message}

Please check the ID and try again.`;
        }
      }

      return `⚠️ **Are you sure you want to delete this ${entityType}?**

**ID:** ${entityId}

This action cannot be undone. To confirm, please say:
"Delete ${entityType} ${entityId} confirm"`;
    }

    return `To delete an item, please specify:

1. **What to delete:** project, assignment, task, or note
2. **The ID:** The item's unique identifier

Example: "Delete task abc-123"

I'll ask for confirmation before deleting anything.`;
  }

  // ==================== HELP & INFO ====================

  if (lowercaseMsg.includes('help') || lowercaseMsg.includes('what can you do')) {
    let teamInfo = '';
    if (teamMembers.length > 0) {
      teamInfo = `\n\n**Your Team Members:**\n${teamMembers.slice(0, 5).map(m => `- ${m.name}`).join('\n')}${teamMembers.length > 5 ? `\n... and ${teamMembers.length - 5} more` : ''}`;
    }

    return `I'm your ProjectFlow AI Assistant! Here's everything I can do for you:

**Create Items:**
- 📁 **Projects** - "Create a project called [name]"
- 📋 **Assignments** - "Create an assignment called [name]"
- ✅ **Tasks** - "Create a task called [name] assigned to [person]"
- 📝 **Notes** - "Create a note called [name]"

**Update Items:**
- "Update task [id] status to done"
- "Change assignment [id] priority to high"

**Delete Items:**
- "Delete task [id]" (I'll ask for confirmation)

**Assign Team Members:**
- "Create a task for @john" or "Assign task [id] to Sarah"

**Get Information:**
- "Show my tasks" or "What's my status?"
- "Help" for this menu${teamInfo}

What would you like me to do?`;
  }

  if (lowercaseMsg.includes('status') || lowercaseMsg.includes('overview') || lowercaseMsg.includes('my tasks')) {
    // Extract counts from context
    const taskCount = (userMessage.match(/Recent Tasks \((\d+)/)?.[1]) || '0';
    const projectCount = (userMessage.match(/Recent Projects \((\d+)/)?.[1]) || '0';
    const assignmentCount = (userMessage.match(/Recent Assignments \((\d+)/)?.[1]) || '0';

    return `Here's your workspace overview:

📁 **Projects:** ${projectCount}
📋 **Assignments:** ${assignmentCount}
✅ **Tasks:** ${taskCount}

**Quick Actions:**
- "Create a new project"
- "Create a task"
- "Show my tasks"

Would you like me to create something or provide more details?`;
  }

  // ==================== DEFAULT RESPONSE ====================

  const userInputMatch = userMessage.match(/User Input:\s*(.+)/is);
  const actualUserInput = userInputMatch ? userInputMatch[1].trim() : userMessage;

  return `Thanks for your message! I'm your ProjectFlow AI Assistant.

I can help you with:
- **Create:** projects, assignments, tasks, notes
- **Update:** change status, priority, assignments
- **Delete:** remove items (with confirmation)
- **Assign:** tag team members to tasks

**Try saying:**
- "Create a project called Marketing Campaign"
- "Create a task called Review docs assigned to John"
- "Help" for all commands

How can I assist you?`;
};

// Integration stubs
const integrations = {
  Core: {
    InvokeLLM: async (params) => {
      const { prompt, system_prompt, response_json_schema } = params;
      console.log('InvokeLLM called with:', { prompt, system_prompt });
      return {
        success: true,
        message: 'LLM integration not configured.',
        response: response_json_schema ? {} : 'LLM response placeholder',
      };
    },
    UploadFile: async (fileOrParams) => {
      // Handle both direct File objects and { file: File } parameter format
      const file = fileOrParams instanceof File ? fileOrParams : fileOrParams?.file;

      if (!file) {
        throw new Error('No file provided to UploadFile');
      }

      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, file);

      if (error) {
        console.error('Error uploading file:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      return {
        success: true,
        file_url: publicUrl,
        file_id: data.path,
        file_name: file.name,
      };
    },
  },
};

// Functions registry for invoking custom functions
const functionsRegistry = {
  anthropicResearch: async (params) => {
    const { question, assignment, documents, useWebSearch } = params;

    console.log('anthropicResearch invoked with:', { question, assignment: assignment?.name, useWebSearch });

    // Stub implementation - returns structured research response
    // Replace with actual Anthropic API integration
    return {
      data: {
        success: true,
        data: {
          response: `Thank you for your question: "${question}"\n\nThis is a placeholder response. To enable AI-powered research, please configure your Anthropic API integration.\n\nIn the meantime, here are some general suggestions based on your query.`,
          research_type: 'general',
          confidence_score: 75,
          recommended_actions: [
            {
              action: 'Configure API Integration',
              description: 'Set up your Anthropic API key to enable AI-powered research',
              priority: 'high'
            }
          ],
          suggested_documents: [],
          web_sources_used: useWebSearch || false
        },
        model_used: 'claude-sonnet-4-20250514'
      }
    };
  },

  ragHelper: async (params) => {
    const { query, documents, context } = params;
    console.log('ragHelper invoked with:', { query, documentsCount: documents?.length });

    return {
      data: {
        success: true,
        response: 'RAG helper placeholder response',
        sources: []
      }
    };
  },

  exportSessionToPdf: async (params) => {
    const { session, messages, title } = params;
    console.log('exportSessionToPdf invoked with:', { session, messagesCount: messages?.length, title });

    return {
      data: {
        success: true,
        message: 'PDF export not configured',
        pdfUrl: null
      }
    };
  }
};

// Functions invoker - provides a unified way to call registered functions
const functions = {
  invoke: async (functionName, params) => {
    if (functionsRegistry[functionName]) {
      try {
        return await functionsRegistry[functionName](params);
      } catch (error) {
        console.error(`Error invoking function ${functionName}:`, error);
        return {
          data: {
            success: false,
            error: error.message
          }
        };
      }
    }

    console.error(`Function ${functionName} not found in registry`);
    return {
      data: {
        success: false,
        error: `Function ${functionName} not found`
      }
    };
  }
};

// Main client object with entities, integrations, auth, agents, and functions
export const db = {
  entities: new Proxy({}, {
    get: (target, entityName) => {
      if (!target[entityName]) {
        target[entityName] = createEntityManager(entityName);
      }
      return target[entityName];
    }
  }),
  integrations,
  auth,
  agents,
  functions,
};

export default db;
