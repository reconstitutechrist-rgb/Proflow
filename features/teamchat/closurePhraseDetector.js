// Closure phrase detection with fuzzy matching for auto-archive feature

const CLOSURE_PHRASES = [
  'bye', 'goodbye', 'see you', 'talk later', 'catch you later',
  'sounds good', 'that sounds great', 'that sounds good', 'perfect', 'great',
  'lets get to it', "let's get to it", "let's do it", 'lets do it', 'lets do this',
  "let's do this", 'alright then', 'thanks everyone', 'thank you all',
  'take care', 'until next time', 'signing off', 'gotta go', 'got to go',
  'ttyl', 'cya', 'later', 'peace out', 'cheers', 'all done', "we're done",
  'wrap it up', 'wrapping up', 'thats all', "that's all", 'meeting adjourned'
];

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1
 * @param {string} str2
 * @returns {number} The edit distance
 */
const levenshteinDistance = (str1, str2) => {
  const m = str1.length;
  const n = str2.length;

  // Create a matrix to store distances
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
};

/**
 * Calculate similarity score between two strings (0 to 1)
 * @param {string} str1
 * @param {string} str2
 * @returns {number} Similarity score between 0 and 1
 */
const calculateSimilarity = (str1, str2) => {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  return 1 - (distance / maxLength);
};

/**
 * Detect if a message contains a closure phrase
 * @param {string} message - The message to check
 * @param {number} similarityThreshold - Minimum similarity for fuzzy match (default 0.7)
 * @returns {{ detected: boolean, phrase?: string, confidence: number, matchType: 'exact' | 'fuzzy' | 'none' }}
 */
export const detectClosurePhrase = (message, similarityThreshold = 0.7) => {
  if (!message || typeof message !== 'string') {
    return { detected: false, confidence: 0, matchType: 'none' };
  }

  const normalizedMessage = message.toLowerCase().trim();

  // Check for empty or very short messages
  if (normalizedMessage.length < 2) {
    return { detected: false, confidence: 0, matchType: 'none' };
  }

  // First, try exact substring match
  for (const phrase of CLOSURE_PHRASES) {
    if (normalizedMessage.includes(phrase)) {
      return {
        detected: true,
        phrase,
        confidence: 1.0,
        matchType: 'exact'
      };
    }
  }

  // For fuzzy matching, focus on the last portion of the message
  // (closure phrases typically come at the end)
  const words = normalizedMessage.split(/\s+/);
  const lastFewWords = words.slice(-6).join(' '); // Check last 6 words

  let bestMatch = { phrase: '', similarity: 0 };

  for (const phrase of CLOSURE_PHRASES) {
    // Check similarity with the full normalized message
    const fullSimilarity = calculateSimilarity(normalizedMessage, phrase);
    if (fullSimilarity > bestMatch.similarity) {
      bestMatch = { phrase, similarity: fullSimilarity };
    }

    // Check similarity with just the last few words
    const endSimilarity = calculateSimilarity(lastFewWords, phrase);
    if (endSimilarity > bestMatch.similarity) {
      bestMatch = { phrase, similarity: endSimilarity };
    }

    // Also check if the phrase is a subsequence at the end
    if (normalizedMessage.endsWith(phrase)) {
      return {
        detected: true,
        phrase,
        confidence: 0.95,
        matchType: 'exact'
      };
    }
  }

  // Return fuzzy match if above threshold
  if (bestMatch.similarity >= similarityThreshold) {
    return {
      detected: true,
      phrase: bestMatch.phrase,
      confidence: bestMatch.similarity,
      matchType: 'fuzzy'
    };
  }

  return { detected: false, confidence: 0, matchType: 'none' };
};

/**
 * Get all closure phrases (for display purposes)
 * @returns {string[]}
 */
export const getClosurePhrases = () => [...CLOSURE_PHRASES];

/**
 * Add a custom closure phrase
 * @param {string} phrase
 */
export const addClosurePhrase = (phrase) => {
  const normalized = phrase.toLowerCase().trim();
  if (normalized && !CLOSURE_PHRASES.includes(normalized)) {
    CLOSURE_PHRASES.push(normalized);
  }
};

export default {
  detectClosurePhrase,
  getClosurePhrases,
  addClosurePhrase,
  calculateSimilarity
};
