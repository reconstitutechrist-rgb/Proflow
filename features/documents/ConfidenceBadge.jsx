/**
 * ConfidenceBadge Component
 *
 * Displays a confidence score as a colored badge.
 * Green = high confidence, Yellow = medium, Red = low
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CONFIDENCE_THRESHOLDS } from './documentControlTypes';

export default function ConfidenceBadge({ confidence, showLabel = true, size = 'default' }) {
  const score = confidence?.overall ?? confidence ?? 0;
  const percentage = Math.round(score * 100);

  // Determine color based on thresholds
  let variant = 'default';
  let colorClass = '';

  if (score >= CONFIDENCE_THRESHOLDS.STANDARD_PROPOSAL) {
    variant = 'default';
    colorClass = 'bg-green-100 text-green-800 border-green-200';
  } else if (score >= CONFIDENCE_THRESHOLDS.FLAGGED_FOR_REVIEW) {
    variant = 'secondary';
    colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
  } else {
    variant = 'destructive';
    colorClass = 'bg-red-100 text-red-800 border-red-200';
  }

  const sizeClass = size === 'small' ? 'text-xs px-1.5 py-0' : '';

  return (
    <Badge variant={variant} className={cn(colorClass, sizeClass, 'border')}>
      {percentage}%{showLabel && ' confidence'}
    </Badge>
  );
}
