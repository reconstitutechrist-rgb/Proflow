/**
 * ChangeDiffView Component
 *
 * Displays a diff between original and proposed text.
 * Shows deletions in red, additions in green.
 */

import { cn } from '@/lib/utils';

/**
 * Simple word-level diff algorithm
 * Returns array of {type: 'same'|'removed'|'added', text: string}
 */
function computeWordDiff(original, proposed) {
  const originalWords = original.split(/(\s+)/);
  const proposedWords = proposed.split(/(\s+)/);

  // Simple LCS-based diff
  const result = [];
  let i = 0;
  let j = 0;

  while (i < originalWords.length || j < proposedWords.length) {
    if (i >= originalWords.length) {
      // Rest of proposed is additions
      result.push({ type: 'added', text: proposedWords.slice(j).join('') });
      break;
    }
    if (j >= proposedWords.length) {
      // Rest of original is deletions
      result.push({ type: 'removed', text: originalWords.slice(i).join('') });
      break;
    }

    if (originalWords[i] === proposedWords[j]) {
      result.push({ type: 'same', text: originalWords[i] });
      i++;
      j++;
    } else {
      // Look ahead to find if there's a match
      let foundInOriginal = proposedWords.slice(j, j + 5).indexOf(originalWords[i]);
      let foundInProposed = originalWords.slice(i, i + 5).indexOf(proposedWords[j]);

      if (
        foundInProposed !== -1 &&
        (foundInOriginal === -1 || foundInProposed <= foundInOriginal)
      ) {
        // Original word appears later in proposed - add proposed words as additions
        result.push({ type: 'added', text: proposedWords[j] });
        j++;
      } else if (foundInOriginal !== -1) {
        // Proposed word appears later in original - add original words as deletions
        result.push({ type: 'removed', text: originalWords[i] });
        i++;
      } else {
        // Neither found - both are different
        result.push({ type: 'removed', text: originalWords[i] });
        result.push({ type: 'added', text: proposedWords[j] });
        i++;
        j++;
      }
    }
  }

  // Merge consecutive same-type segments
  const merged = [];
  for (const segment of result) {
    const last = merged[merged.length - 1];
    if (last && last.type === segment.type) {
      last.text += segment.text;
    } else {
      merged.push({ ...segment });
    }
  }

  return merged;
}

export default function ChangeDiffView({ originalText, proposedText, mode = 'inline' }) {
  if (mode === 'side-by-side') {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground uppercase">Current</div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm font-mono whitespace-pre-wrap">
            {originalText}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground uppercase">Proposed</div>
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm font-mono whitespace-pre-wrap">
            {proposedText}
          </div>
        </div>
      </div>
    );
  }

  // Inline diff mode
  const diff = computeWordDiff(originalText, proposedText);

  return (
    <div className="p-3 bg-muted/30 border rounded-md text-sm font-mono whitespace-pre-wrap">
      {diff.map((segment, index) => (
        <span
          key={index}
          className={cn(
            segment.type === 'removed' && 'bg-red-200 text-red-800 line-through',
            segment.type === 'added' && 'bg-green-200 text-green-800'
          )}
        >
          {segment.text}
        </span>
      ))}
    </div>
  );
}
