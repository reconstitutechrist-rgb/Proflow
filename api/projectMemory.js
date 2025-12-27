import { db } from './db';
import { InvokeLLM } from './integrations';

/**
 * Get or create project memory bank
 * @param {string} projectId - The project ID
 * @param {string} workspaceId - The workspace ID
 * @returns {Promise<Object>} The project memory object
 */
export async function getProjectMemory(projectId, workspaceId) {
  try {
    const memories = await db.entities.ProjectMemory.filter({ project_id: projectId });

    if (!memories || memories.length === 0) {
      // Create a new memory bank for this project
      const newMemory = await db.entities.ProjectMemory.create({
        workspace_id: workspaceId,
        project_id: projectId,
        summary: '',
        key_insights: '[]',
        technical_decisions: '[]',
        document_summaries: '[]',
        accumulated_context: '',
        conversation_count: 0,
        document_count: 0,
      });
      return newMemory;
    }

    return memories[0];
  } catch (error) {
    console.error('Error getting project memory:', error);
    // Return a default empty memory object if there's an error
    return {
      summary: '',
      key_insights: '[]',
      technical_decisions: '[]',
      document_summaries: '[]',
      accumulated_context: '',
      conversation_count: 0,
      document_count: 0,
    };
  }
}

/**
 * Update project memory after a chat session
 * @param {string} projectId - The project ID
 * @param {string} workspaceId - The workspace ID
 * @param {Array} messages - Array of chat messages
 * @param {Array} documents - Array of uploaded documents
 * @param {string} sessionId - The chat session ID
 */
export async function updateProjectMemoryFromChat(
  projectId,
  workspaceId,
  messages,
  documents,
  sessionId
) {
  try {
    const memory = await getProjectMemory(projectId, workspaceId);

    // Build conversation text from non-excluded messages
    const conversationText = messages
      .filter((m) => !m.excludedFromContext && m.content)
      .map((m) => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    // Skip if no meaningful conversation
    if (!conversationText.trim() || conversationText.length < 50) {
      return;
    }

    // Build document context
    const documentContext = documents
      ?.filter((d) => d.content)
      .map((d) => `Document "${d.name}": ${d.content.substring(0, 500)}...`)
      .join('\n\n');

    // Use AI to extract key insights and update context
    const extractionPrompt = `You are analyzing a project conversation to extract and preserve important information.

CURRENT PROJECT MEMORY:
${memory.accumulated_context || 'No prior context stored.'}

CURRENT KEY INSIGHTS (JSON array):
${memory.key_insights || '[]'}

CURRENT TECHNICAL DECISIONS (JSON array):
${memory.technical_decisions || '[]'}

---

NEW CONVERSATION TO ANALYZE:
${conversationText}

${documentContext ? `\nDOCUMENTS REFERENCED:\n${documentContext}` : ''}

---

INSTRUCTIONS:
1. Extract any NEW key insights from this conversation (things learned, discoveries, important facts)
2. Extract any NEW technical decisions made (choices, rationales, approaches decided)
3. Create an updated summary of the project's current state
4. Create a comprehensive accumulated context that combines the old context with new information (max 20000 characters)

The accumulated_context should be a coherent narrative that the AI can use in future conversations to understand the full project history.

Return a JSON object with this exact structure:
{
  "new_insights": ["insight 1", "insight 2"],
  "new_decisions": ["decision 1: rationale", "decision 2: rationale"],
  "updated_summary": "Brief 2-3 sentence summary of project state",
  "accumulated_context": "Full narrative context combining old and new information (max 20000 chars)"
}

Return ONLY valid JSON, no other text.`;

    try {
      const extraction = await InvokeLLM({
        prompt: extractionPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            new_insights: { type: 'array', items: { type: 'string' } },
            new_decisions: { type: 'array', items: { type: 'string' } },
            updated_summary: { type: 'string' },
            accumulated_context: { type: 'string' },
          },
          required: ['new_insights', 'new_decisions', 'updated_summary', 'accumulated_context'],
        },
      });

      // Parse the extraction response
      let parsed;
      if (typeof extraction === 'string') {
        // Try to extract JSON from the response
        const jsonMatch = extraction.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          console.warn('Could not parse LLM response as JSON, skipping memory update');
          return;
        }
      } else if (extraction && typeof extraction === 'object') {
        // Handle case where InvokeLLM returns an object
        parsed = extraction.response || extraction;
      } else {
        console.warn('Unexpected LLM response format, skipping memory update');
        return;
      }

      // Merge new insights with existing
      const existingInsights = JSON.parse(memory.key_insights || '[]');
      const existingDecisions = JSON.parse(memory.technical_decisions || '[]');

      const updatedInsights = [...existingInsights, ...(parsed.new_insights || [])].slice(-100);
      const updatedDecisions = [...existingDecisions, ...(parsed.new_decisions || [])].slice(-60);

      // Update the memory
      if (memory.id) {
        await db.entities.ProjectMemory.update(memory.id, {
          summary: parsed.updated_summary || memory.summary,
          key_insights: JSON.stringify(updatedInsights),
          technical_decisions: JSON.stringify(updatedDecisions),
          accumulated_context: (parsed.accumulated_context || '').substring(0, 20000),
          conversation_count: (memory.conversation_count || 0) + 1,
          document_count: (memory.document_count || 0) + (documents?.length || 0),
          last_chat_session_id: sessionId,
        });
      }
    } catch (llmError) {
      console.error('Error calling LLM for memory extraction:', llmError);
      // If LLM fails, still update basic stats
      if (memory.id) {
        await db.entities.ProjectMemory.update(memory.id, {
          conversation_count: (memory.conversation_count || 0) + 1,
          document_count: (memory.document_count || 0) + (documents?.length || 0),
          last_chat_session_id: sessionId,
        });
      }
    }
  } catch (error) {
    console.error('Error updating project memory:', error);
  }
}

/**
 * Build system prompt with project memory
 * @param {Object} memory - The project memory object
 * @returns {string} Formatted memory prompt for AI context
 */
export function buildProjectMemoryPrompt(memory) {
  if (!memory) return '';

  let prompt = '';

  // Add accumulated context (the main memory)
  if (memory.accumulated_context && memory.accumulated_context.trim()) {
    prompt += '\n\n=== PROJECT MEMORY BANK ===\n';
    prompt += memory.accumulated_context;
  }

  // Add key insights
  try {
    const insights = JSON.parse(memory.key_insights || '[]');
    if (insights.length > 0) {
      prompt += '\n\nKey Project Insights:\n';
      prompt += insights
        .slice(-10)
        .map((i) => `• ${i}`)
        .join('\n');
    }
  } catch (e) {
    console.warn('Error parsing key_insights:', e);
  }

  // Add technical decisions
  try {
    const decisions = JSON.parse(memory.technical_decisions || '[]');
    if (decisions.length > 0) {
      prompt += '\n\nTechnical Decisions Made:\n';
      prompt += decisions
        .slice(-10)
        .map((d) => `• ${d}`)
        .join('\n');
    }
  } catch (e) {
    console.warn('Error parsing technical_decisions:', e);
  }

  // Add summary if available
  if (memory.summary && memory.summary.trim()) {
    prompt += `\n\nProject Summary: ${memory.summary}`;
  }

  if (prompt) {
    prompt += '\n=== END PROJECT MEMORY ===\n';
  }

  return prompt;
}

/**
 * Clear project memory (for manual reset)
 * @param {string} projectId - The project ID
 */
export async function clearProjectMemory(projectId) {
  try {
    const memories = await db.entities.ProjectMemory.filter({ project_id: projectId });
    if (memories && memories.length > 0) {
      await db.entities.ProjectMemory.update(memories[0].id, {
        summary: '',
        key_insights: '[]',
        technical_decisions: '[]',
        document_summaries: '[]',
        accumulated_context: '',
        conversation_count: 0,
        document_count: 0,
        last_chat_session_id: null,
      });
    }
  } catch (error) {
    console.error('Error clearing project memory:', error);
  }
}

/**
 * Get memory stats for display
 * @param {Object} memory - The project memory object
 * @returns {Object} Memory statistics
 */
export function getMemoryStats(memory) {
  if (!memory) {
    return {
      hasMemory: false,
      conversationCount: 0,
      documentCount: 0,
      insightCount: 0,
      decisionCount: 0,
      contextLength: 0,
    };
  }

  let insightCount = 0;
  let decisionCount = 0;

  try {
    insightCount = JSON.parse(memory.key_insights || '[]').length;
  } catch (_e) {
    // Ignore JSON parse errors, use default count of 0
  }

  try {
    decisionCount = JSON.parse(memory.technical_decisions || '[]').length;
  } catch (_e) {
    // Ignore JSON parse errors, use default count of 0
  }

  return {
    hasMemory: !!(memory.accumulated_context || memory.summary),
    conversationCount: memory.conversation_count || 0,
    documentCount: memory.document_count || 0,
    insightCount,
    decisionCount,
    contextLength: (memory.accumulated_context || '').length,
    lastUpdated: memory.updated_date,
  };
}
