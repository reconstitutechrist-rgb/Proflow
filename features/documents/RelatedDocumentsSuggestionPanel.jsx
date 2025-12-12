import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  FileText,
  FolderOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Archive,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * Panel displaying AI-suggested related documents that may be outdated
 * Used during document upload/creation to identify documents to replace
 */
export default function RelatedDocumentsSuggestionPanel({
  suggestions = [],
  isLoading = false,
  selectedDocuments = new Set(),
  onToggleDocument,
  onSelectAll,
  onDeselectAll,
  onMarkOutdated,
  error = null,
  className = '',
}) {
  const selectedCount = selectedDocuments.size;
  const hasSelections = selectedCount > 0;

  // Format match reason for display
  const formatMatchReason = (reason) => {
    switch (reason) {
      case 'content_similar':
        return { label: 'Content Match', variant: 'default' };
      case 'title_similar':
        return { label: 'Title Match', variant: 'secondary' };
      case 'same_project':
        return { label: 'Same Project', variant: 'outline' };
      case 'same_assignment':
        return { label: 'Same Assignment', variant: 'outline' };
      default:
        return { label: reason, variant: 'outline' };
    }
  };

  // Format confidence score for display
  const getConfidenceColor = (score) => {
    if (score >= 0.7) return 'text-green-600 dark:text-green-400';
    if (score >= 0.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  if (error) {
    return (
      <Card className={cn('border-destructive/50', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Related Documents Found</CardTitle>
          </div>
          {suggestions.length > 0 && (
            <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30">
              {suggestions.length} found
            </Badge>
          )}
        </div>
        <CardDescription>
          These documents may be outdated versions. Select any to mark as outdated and move to the
          Outdated folder.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
              <span className="text-sm text-muted-foreground">
                Searching for related documents...
              </span>
            </div>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <span className="text-sm">No related documents found</span>
            </div>
          </div>
        ) : (
          <>
            {/* Selection controls */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSelectAll}
                  disabled={selectedCount === suggestions.length}
                >
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={onDeselectAll} disabled={!hasSelections}>
                  Clear
                </Button>
              </div>
              {hasSelections && (
                <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
              )}
            </div>

            {/* Suggestions list */}
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {suggestions.map((suggestion) => {
                  const isSelected = selectedDocuments.has(suggestion.documentId);

                  return (
                    <div
                      key={suggestion.documentId}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                        isSelected
                          ? 'border-amber-500 bg-amber-100/50 dark:bg-amber-900/30'
                          : 'border-transparent bg-background hover:bg-muted/50'
                      )}
                      onClick={() => onToggleDocument(suggestion.documentId)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleDocument(suggestion.documentId)}
                        className="mt-1"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium text-sm truncate">{suggestion.title}</span>
                          </div>

                          {/* Confidence score */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={cn(
                                'text-xs font-medium',
                                getConfidenceColor(suggestion.confidenceScore)
                              )}
                            >
                              {Math.round(suggestion.confidenceScore * 100)}%
                            </span>
                            <Progress
                              value={suggestion.confidenceScore * 100}
                              className="w-12 h-1.5"
                            />
                          </div>
                        </div>

                        {/* Match reasons */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {suggestion.matchReasons.map((reason, idx) => {
                            const { label, variant } = formatMatchReason(reason);
                            return (
                              <Badge key={idx} variant={variant} className="text-xs px-1.5 py-0">
                                {label}
                              </Badge>
                            );
                          })}
                        </div>

                        {/* Preview snippet */}
                        {suggestion.previewSnippet && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                            {suggestion.previewSnippet}
                          </p>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {suggestion.folderPath && suggestion.folderPath !== '/' && (
                            <div className="flex items-center gap-1">
                              <FolderOpen className="h-3 w-3" />
                              <span>{suggestion.folderPath}</span>
                            </div>
                          )}
                          {suggestion.lastUpdated && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDistanceToNow(new Date(suggestion.lastUpdated))}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Action button */}
            {hasSelections && (
              <div className="mt-4 pt-3 border-t">
                <Button
                  onClick={onMarkOutdated}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Mark {selectedCount} Document{selectedCount > 1 ? 's' : ''} as Outdated
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
