import { useState, useCallback } from 'react';
import { db } from '@/api/db';
import { toast } from 'sonner';

// Action phrases that indicate tasks
const ACTION_PHRASES = [
  'we need to',
  "we'll need to",
  'we should',
  "let's",
  'lets',
  "i'll",
  'i will',
  "you'll",
  'you will',
  'you should',
  'someone needs to',
  'someone should',
  'make sure to',
  'make sure we',
  "don't forget to",
  'dont forget to',
  'remember to',
  'need to',
  'have to',
  'must',
  'action item:',
  'todo:',
  'task:',
];

/**
 * Custom hook for AI features in team chat
 */
export function useTeamChatAI() {
  const [summarizing, setSummarizing] = useState(false);
  const [extractingTasks, setExtractingTasks] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState([]);
  const [summary, setSummary] = useState(null);

  /**
   * Summarize a conversation
   */
  const summarizeConversation = useCallback(async (messages, chatId) => {
    if (!messages?.length) {
      toast.error('No messages to summarize');
      return null;
    }

    setSummarizing(true);
    try {
      // Format messages for summarization
      const messageContent = messages
        .filter(m => m.message_type === 'text' && m.content)
        .map(m => `${m.author_name || m.author_email}: ${m.content}`)
        .join('\n');

      if (!messageContent) {
        toast.error('No text messages to summarize');
        return null;
      }

      // Call LLM for summarization
      const response = await db.integrations.Core.InvokeLLM({
        prompt: `Summarize this team conversation. Focus on:
1. Key discussion points
2. Decisions made
3. Action items mentioned
4. Any pending questions or issues

Conversation:
${messageContent}

Provide a concise but comprehensive summary.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string', description: 'Overall summary of the conversation' },
            key_points: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of key discussion points'
            },
            decisions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Decisions made during the conversation'
            },
            action_items: {
              type: 'array',
              items: { type: 'string' },
              description: 'Action items or tasks mentioned'
            },
            pending_items: {
              type: 'array',
              items: { type: 'string' },
              description: 'Unresolved questions or pending items'
            }
          }
        }
      });

      // Handle stub response
      if (response?.message === 'LLM integration not configured.') {
        // Generate a basic summary without LLM
        const basicSummary = generateBasicSummary(messages);
        setSummary(basicSummary);

        // Save to chat if chatId provided
        if (chatId) {
          await db.entities.TeamChat.update(chatId, {
            summary: basicSummary.summary,
            summary_generated_at: new Date().toISOString(),
          });
        }

        toast.success('Summary generated');
        return basicSummary;
      }

      setSummary(response);

      // Save to chat
      if (chatId && response?.summary) {
        await db.entities.TeamChat.update(chatId, {
          summary: response.summary,
          summary_generated_at: new Date().toISOString(),
        });
      }

      toast.success('Summary generated');
      return response;
    } catch (error) {
      console.error('Error summarizing conversation:', error);
      toast.error('Failed to generate summary');
      return null;
    } finally {
      setSummarizing(false);
    }
  }, []);

  /**
   * Generate a basic summary without LLM
   */
  const generateBasicSummary = (messages) => {
    const textMessages = messages.filter(m => m.message_type === 'text' && m.content);
    const participants = [...new Set(textMessages.map(m => m.author_name || m.author_email))];
    const messageCount = textMessages.length;

    // Extract potential action items using regex
    const actionItems = [];
    textMessages.forEach(m => {
      ACTION_PHRASES.forEach(phrase => {
        const regex = new RegExp(`${phrase}\\s+([^.!?]+[.!?]?)`, 'gi');
        const matches = m.content.match(regex);
        if (matches) {
          matches.forEach(match => {
            const item = match.replace(new RegExp(`^${phrase}\\s+`, 'i'), '').trim();
            if (item && !actionItems.includes(item)) {
              actionItems.push(item);
            }
          });
        }
      });
    });

    return {
      summary: `Conversation with ${participants.length} participant(s) containing ${messageCount} messages.`,
      key_points: [`${messageCount} messages exchanged`],
      decisions: [],
      action_items: actionItems.slice(0, 5),
      pending_items: [],
    };
  };

  /**
   * Extract tasks from conversation
   */
  const extractTasks = useCallback(async (messages, defaultProjectId, projects, users) => {
    if (!messages?.length) {
      toast.error('No messages to analyze');
      return [];
    }

    setExtractingTasks(true);
    try {
      // Format messages for task extraction
      const messageContent = messages
        .filter(m => m.message_type === 'text' && m.content)
        .map(m => `${m.author_name || m.author_email}: ${m.content}`)
        .join('\n');

      if (!messageContent) {
        toast.error('No text messages to analyze');
        return [];
      }

      // Build context about projects and users
      const projectContext = projects?.length
        ? `Available projects: ${projects.map(p => p.name).join(', ')}`
        : '';
      const userContext = users?.length
        ? `Team members: ${users.map(u => u.full_name || u.email).join(', ')}`
        : '';

      // Call LLM for task extraction
      const response = await db.integrations.Core.InvokeLLM({
        prompt: `Extract action items and tasks from this team conversation. Look for phrases like "we need to", "let's", "I'll", "you should", "someone needs to", etc.

${projectContext}
${userContext}

Conversation:
${messageContent}

For each task, identify:
- Task title (clear, actionable)
- Description (optional details)
- Suggested assignee (if mentioned or implied)
- Priority (based on urgency in conversation)
- Mentioned project (if any project name is referenced)`,
        response_json_schema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  assignee_hint: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                  mentioned_project: { type: 'string' }
                }
              }
            }
          }
        }
      });

      // Handle stub response - extract tasks manually
      if (response?.message === 'LLM integration not configured.') {
        const manualTasks = extractTasksManually(messages);
        setExtractedTasks(manualTasks);
        return manualTasks;
      }

      const tasks = response?.tasks || [];

      // Enrich tasks with project IDs
      const enrichedTasks = tasks.map(task => {
        let projectId = defaultProjectId;

        // Try to match mentioned project to actual project
        if (task.mentioned_project && projects?.length) {
          const matchedProject = projects.find(p =>
            p.name.toLowerCase().includes(task.mentioned_project.toLowerCase()) ||
            task.mentioned_project.toLowerCase().includes(p.name.toLowerCase())
          );
          if (matchedProject) {
            projectId = matchedProject.id;
          }
        }

        // Try to match assignee hint to actual user
        let assignedTo = null;
        if (task.assignee_hint && users?.length) {
          const matchedUser = users.find(u =>
            u.full_name?.toLowerCase().includes(task.assignee_hint.toLowerCase()) ||
            u.email?.toLowerCase().includes(task.assignee_hint.toLowerCase()) ||
            task.assignee_hint.toLowerCase().includes(u.full_name?.toLowerCase() || '')
          );
          if (matchedUser) {
            assignedTo = matchedUser.email;
          }
        }

        return {
          ...task,
          project_id: projectId,
          assigned_to: assignedTo,
          status: 'todo',
        };
      });

      setExtractedTasks(enrichedTasks);
      return enrichedTasks;
    } catch (error) {
      console.error('Error extracting tasks:', error);
      toast.error('Failed to extract tasks');
      return [];
    } finally {
      setExtractingTasks(false);
    }
  }, []);

  /**
   * Manually extract tasks without LLM
   */
  const extractTasksManually = (messages) => {
    const tasks = [];
    const textMessages = messages.filter(m => m.message_type === 'text' && m.content);

    textMessages.forEach(message => {
      const content = message.content.toLowerCase();

      ACTION_PHRASES.forEach(phrase => {
        const phraseIndex = content.indexOf(phrase);
        if (phraseIndex !== -1) {
          // Extract the text after the action phrase
          const afterPhrase = message.content.substring(phraseIndex + phrase.length).trim();

          // Get the first sentence or clause
          const endMatch = afterPhrase.match(/[.!?\n,;]/);
          const taskText = endMatch
            ? afterPhrase.substring(0, endMatch.index).trim()
            : afterPhrase.substring(0, 100).trim();

          if (taskText && taskText.length > 3) {
            // Check for duplicate
            const isDuplicate = tasks.some(t =>
              t.title.toLowerCase() === taskText.toLowerCase()
            );

            if (!isDuplicate) {
              tasks.push({
                title: taskText.charAt(0).toUpperCase() + taskText.slice(1),
                description: `From: "${message.author_name || message.author_email}"`,
                assignee_hint: null,
                priority: 'medium',
                mentioned_project: null,
                project_id: null,
                assigned_to: null,
                status: 'todo',
              });
            }
          }
        }
      });
    });

    return tasks.slice(0, 10); // Limit to 10 tasks
  };

  /**
   * Create tasks from extracted tasks
   */
  const createTasks = useCallback(async (tasks, workspaceId, currentUser) => {
    if (!tasks?.length || !workspaceId) {
      return { created: 0, failed: 0 };
    }

    let created = 0;
    let failed = 0;

    for (const task of tasks) {
      try {
        await db.entities.Task.create({
          workspace_id: workspaceId,
          title: task.title,
          description: task.description || '',
          status: task.status || 'todo',
          priority: task.priority || 'medium',
          project_id: task.project_id || null,
          assigned_to: task.assigned_to || null,
          created_by: currentUser?.email || 'AI Assistant',
        });
        created++;
      } catch (error) {
        console.error('Error creating task:', error);
        failed++;
      }
    }

    if (created > 0) {
      toast.success(`Created ${created} task${created > 1 ? 's' : ''}`);
    }
    if (failed > 0) {
      toast.error(`Failed to create ${failed} task${failed > 1 ? 's' : ''}`);
    }

    return { created, failed };
  }, []);

  /**
   * Detect project mentions in a message
   */
  const detectProjectMentions = useCallback((message, projects) => {
    if (!message || !projects?.length) return [];

    const mentionedProjects = [];
    const lowerMessage = message.toLowerCase();

    projects.forEach(project => {
      const projectName = project.name.toLowerCase();
      if (lowerMessage.includes(projectName)) {
        mentionedProjects.push(project);
      }
    });

    return mentionedProjects;
  }, []);

  /**
   * Clear extracted tasks
   */
  const clearExtractedTasks = useCallback(() => {
    setExtractedTasks([]);
  }, []);

  /**
   * Clear summary
   */
  const clearSummary = useCallback(() => {
    setSummary(null);
  }, []);

  return {
    // State
    summarizing,
    extractingTasks,
    extractedTasks,
    summary,

    // Actions
    summarizeConversation,
    extractTasks,
    createTasks,
    detectProjectMentions,
    clearExtractedTasks,
    clearSummary,
  };
}

export default useTeamChatAI;
