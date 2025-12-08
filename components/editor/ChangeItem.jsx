import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, ArrowRight, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getChangeTypeBadgeColor } from '@/utils/diffUtils';

/**
 * ChangeItem - Individual change component with accept/reject buttons
 * Shows original text, suggested replacement, and reason
 */
export default function ChangeItem({
  change,
  isAccepted = false,
  isRejected = false,
  onAccept,
  onReject,
  showControls = true,
  compact = false,
}) {
  const { type, originalText, suggestedText, reason } = change;

  // Truncate long text for display
  const truncate = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const statusClass = isAccepted
    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
    : isRejected
      ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 opacity-60'
      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';

  if (compact) {
    return (
      <div className={`p-3 rounded-lg border ${statusClass} transition-colors`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`text-xs ${getChangeTypeBadgeColor(type)}`}>{type}</Badge>
              {isAccepted && (
                <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  <Check className="w-3 h-3 mr-1" />
                  Accepted
                </Badge>
              )}
              {isRejected && (
                <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  <X className="w-3 h-3 mr-1" />
                  Rejected
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="line-through text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                {truncate(originalText, 50)}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                {truncate(suggestedText, 50)}
              </span>
            </div>
          </div>
          {showControls && !isAccepted && !isRejected && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAccept(change.id)}
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReject(change.id)}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${statusClass} transition-colors`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${getChangeTypeBadgeColor(type)}`}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
          {isAccepted && (
            <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              <Check className="w-3 h-3 mr-1" />
              Accepted
            </Badge>
          )}
          {isRejected && (
            <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <X className="w-3 h-3 mr-1" />
              Rejected
            </Badge>
          )}
        </div>

        {showControls && !isAccepted && !isRejected && (
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAccept(change.id)}
                    className="h-8 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/30"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Apply this change</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReject(change.id)}
                    className="h-8 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Dismiss this change</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* Change content */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Original:</p>
            <p className="text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-2 rounded border border-red-200 dark:border-red-800 line-through">
              {originalText}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Suggested:</p>
            <p className="text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-2 rounded border border-green-200 dark:border-green-800">
              {suggestedText}
            </p>
          </div>
        </div>
      </div>

      {/* Reason */}
      {reason && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{reason}</span>
          </div>
        </div>
      )}
    </div>
  );
}
