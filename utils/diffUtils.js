/**
 * Utility functions for text diff computation and change application
 */

/**
 * Generate a unique ID for a change
 */
export function generateChangeId() {
  return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Find the position of text in HTML content
 * @param {string} html - The HTML content to search in
 * @param {string} searchText - The text to find
 * @returns {{ start: number, end: number } | null} - Position or null if not found
 */
export function findTextInHtml(html, searchText) {
  if (!html || !searchText) return null;

  // Strip HTML tags for text-only search
  const textContent = html.replace(/<[^>]+>/g, '');
  const textIndex = textContent.indexOf(searchText);

  if (textIndex === -1) return null;

  // Map text position back to HTML position
  let htmlPos = 0;
  let textPos = 0;
  let inTag = false;

  while (textPos < textIndex && htmlPos < html.length) {
    if (html[htmlPos] === '<') {
      inTag = true;
    } else if (html[htmlPos] === '>') {
      inTag = false;
    } else if (!inTag) {
      textPos++;
    }
    htmlPos++;
  }

  const startPos = htmlPos;

  // Find end position
  let remainingTextLength = searchText.length;
  while (remainingTextLength > 0 && htmlPos < html.length) {
    if (html[htmlPos] === '<') {
      inTag = true;
    } else if (html[htmlPos] === '>') {
      inTag = false;
    } else if (!inTag) {
      remainingTextLength--;
    }
    htmlPos++;
  }

  return { start: startPos, end: htmlPos };
}

/**
 * Apply accepted changes to content
 * @param {string} content - Original content
 * @param {Array} changes - Array of change objects
 * @param {Set} appliedIds - Set of change IDs to apply
 * @returns {string} - Content with applied changes
 */
export function applyChangesToContent(content, changes, appliedIds) {
  if (!changes || changes.length === 0 || appliedIds.size === 0) {
    return content;
  }

  // Filter to only applied changes
  const changesToApply = changes.filter(c => appliedIds.has(c.id));

  if (changesToApply.length === 0) return content;

  // Sort by position descending to apply from end to start (preserves positions)
  const sortedChanges = [...changesToApply].sort((a, b) => {
    const posA = findTextInHtml(content, a.originalText);
    const posB = findTextInHtml(content, b.originalText);
    if (!posA || !posB) return 0;
    return posB.start - posA.start;
  });

  let result = content;

  for (const change of sortedChanges) {
    // Simple string replacement for now
    result = result.replace(change.originalText, change.suggestedText);
  }

  return result;
}

/**
 * Create highlighted diff HTML for a single change
 * @param {string} original - Original text
 * @param {string} suggested - Suggested replacement
 * @returns {{ removed: string, added: string }} - HTML strings with highlighting
 */
export function createDiffHighlight(original, suggested) {
  return {
    removed: `<span class="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 line-through px-1 rounded">${escapeHtml(original)}</span>`,
    added: `<span class="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1 rounded">${escapeHtml(suggested)}</span>`
  };
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get a preview of content with a specific change highlighted
 * @param {string} content - Original content
 * @param {object} change - The change to highlight
 * @param {boolean} showSuggested - Whether to show suggested (true) or original (false)
 * @returns {string} - HTML with highlighted change
 */
export function getContentWithHighlight(content, change, showSuggested = true) {
  if (!change || !change.originalText) return content;

  const highlight = createDiffHighlight(change.originalText, change.suggestedText);

  if (showSuggested) {
    return content.replace(
      change.originalText,
      highlight.added
    );
  } else {
    return content.replace(
      change.originalText,
      highlight.removed
    );
  }
}

/**
 * Parse AI response to extract changes
 * @param {string} responseText - Raw AI response
 * @returns {Array} - Array of parsed change objects
 */
export function parseAIChanges(responseText) {
  try {
    // Try to find JSON in the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    const changes = parsed.changes || [];

    return changes.map(change => ({
      id: generateChangeId(),
      type: change.type || 'general',
      originalText: change.originalText || '',
      suggestedText: change.suggestedText || '',
      reason: change.reason || '',
      status: 'pending'
    })).filter(c => c.originalText && c.suggestedText && c.originalText !== c.suggestedText);

  } catch (error) {
    console.error('Failed to parse AI changes:', error);
    return [];
  }
}

/**
 * Get change type badge color
 */
export function getChangeTypeBadgeColor(type) {
  const colors = {
    grammar: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    spelling: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    clarity: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    structure: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    punctuation: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
    general: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
  };
  return colors[type] || colors.general;
}
