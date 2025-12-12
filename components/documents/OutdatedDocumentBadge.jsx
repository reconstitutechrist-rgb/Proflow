import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Archive, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { db } from '@/api/db';

/**
 * Badge component indicating a document is outdated
 * Shows tooltip with outdated info and optional link to replacement
 */
export default function OutdatedDocumentBadge({
  document,
  showTooltip = true,
  size = 'default',
  className = '',
}) {
  const [replacementDoc, setReplacementDoc] = useState(null);

  // Fetch replacement document info if available
  useEffect(() => {
    const fetchReplacement = async () => {
      if (document?.replaced_by) {
        try {
          const replacement = await db.entities.Document.get(document.replaced_by);
          setReplacementDoc(replacement);
        } catch (error) {
          console.error('Error fetching replacement document:', error);
        }
      }
    };

    fetchReplacement();
  }, [document?.replaced_by]);

  if (!document?.is_outdated) {
    return null;
  }

  const sizeClasses = {
    small: 'text-xs px-1.5 py-0',
    default: 'text-xs px-2 py-0.5',
    large: 'text-sm px-2.5 py-1',
  };

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700',
        sizeClasses[size],
        className
      )}
    >
      <Archive className={cn('mr-1', size === 'small' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      Outdated
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1.5">
            <p className="font-medium text-amber-600 dark:text-amber-400">Document Outdated</p>

            {document.outdated_date && (
              <p className="text-xs text-muted-foreground">
                Marked {formatDistanceToNow(new Date(document.outdated_date))} ago
              </p>
            )}

            {document.outdated_by && (
              <p className="text-xs text-muted-foreground">By: {document.outdated_by}</p>
            )}

            {document.replacement_reason && (
              <p className="text-xs mt-1">{document.replacement_reason}</p>
            )}

            {replacementDoc && (
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1">
                <ExternalLink className="h-3 w-3" />
                <span>Replaced by: {replacementDoc.title}</span>
              </div>
            )}

            {document.outdated_from_folder && document.outdated_from_folder !== '/' && (
              <p className="text-xs text-muted-foreground">
                Original location: {document.outdated_from_folder}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline version of the badge for use in lists/tables
 */
export function OutdatedIndicator({ isOutdated, className = '' }) {
  if (!isOutdated) return null;

  return (
    <span className={cn('inline-flex items-center text-amber-600 dark:text-amber-400', className)}>
      <Archive className="h-3.5 w-3.5" />
    </span>
  );
}
