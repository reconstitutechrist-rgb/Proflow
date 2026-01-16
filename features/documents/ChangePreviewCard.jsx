/**
 * ChangePreviewCard Component
 *
 * Displays a document with its proposed changes.
 * Can be collapsed (showing summary) or expanded (showing all changes).
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
  X,
  Pencil,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ChangeDiffView from './ChangeDiffView';
import ConfidenceBadge from './ConfidenceBadge';
import ChangeEditModal from './ChangeEditModal';
import { CHANGE_STATUS, CONFIDENCE_THRESHOLDS } from './documentControlTypes';

export default function ChangePreviewCard({
  documentId,
  documentTitle,
  changes,
  isExpanded,
  onToggleExpand,
  onApproveChange,
  onRejectChange,
  onEditChange,
  onApproveAll,
  onRejectAll,
}) {
  const [editingChange, setEditingChange] = useState(null);

  // Calculate stats
  const totalChanges = changes.length;
  const approvedCount = changes.filter((c) => c.status === CHANGE_STATUS.APPROVED).length;
  const rejectedCount = changes.filter((c) => c.status === CHANGE_STATUS.REJECTED).length;
  const pendingCount = changes.filter((c) => c.status === CHANGE_STATUS.PENDING).length;

  // Average confidence
  const avgConfidence =
    changes.reduce((sum, c) => sum + (c.evidence?.confidence?.overall || 0), 0) / totalChanges;

  // Check for low confidence changes
  const hasLowConfidence = changes.some(
    (c) => (c.evidence?.confidence?.overall || 0) < CONFIDENCE_THRESHOLDS.FLAGGED_FOR_REVIEW
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case CHANGE_STATUS.APPROVED:
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case CHANGE_STATUS.REJECTED:
        return <XCircle className="w-4 h-4 text-red-600" />;
      case CHANGE_STATUS.APPLIED:
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  // Build validation checks from evidence and scope justification
  const getValidationChecks = (change) => {
    const evidence = change.evidence || {};
    const confidence = evidence.confidence || {};
    const scope = change.scopeJustification || {};

    return [
      {
        label: 'Evidence exists',
        passed: Boolean(evidence.sourceQuote && evidence.sourceQuote.trim().length > 0),
      },
      {
        label: 'Subject match verified',
        passed:
          (confidence.subjectMatch || 0) >= 0.7 || evidence.matchReason === 'exact_subject_match',
      },
      {
        label: 'Within stated scope',
        passed: scope.withinStatedScope !== false,
      },
      {
        label: 'Within primary subject',
        passed: scope.withinPrimarySubject !== false,
      },
      {
        label: 'Within specific area',
        passed: scope.withinSpecificArea !== false,
      },
      {
        label: 'No boundary crossing',
        passed: scope.crossesFeatureBoundary !== true,
      },
      {
        label: 'Factual alignment',
        passed: (confidence.factualAlignment || 0) >= 0.6,
      },
      {
        label: 'Minimal change',
        passed: (confidence.changeMinimality || 0) >= 0.5,
      },
    ];
  };

  // Validation popover component
  const ValidationPopover = ({ change }) => {
    const checks = getValidationChecks(change);
    const passedCount = checks.filter((c) => c.passed).length;
    const allPassed = passedCount === checks.length;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'p-1 rounded hover:bg-muted/50 transition-colors',
              allPassed ? 'text-green-600' : 'text-yellow-600'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end">
          <div className="space-y-2">
            <div className="font-medium text-sm border-b pb-2">
              Validation Checklist ({passedCount}/{checks.length})
            </div>
            <div className="space-y-1">
              {checks.map((check, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-2 text-xs',
                    check.passed ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  <span>{check.passed ? '✓' : '✗'}</span>
                  <span>{check.label}</span>
                </div>
              ))}
            </div>
            {!allPassed && (
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Review flagged items before approving
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <>
      <Card className={cn('transition-shadow', isExpanded && 'ring-2 ring-primary/20')}>
        {/* Header - always visible */}
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onToggleExpand(documentId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">{documentTitle}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {totalChanges} {totalChanges === 1 ? 'change' : 'changes'}
                  </span>
                  <span>•</span>
                  <ConfidenceBadge confidence={avgConfidence} size="small" showLabel={false} />
                  {hasLowConfidence && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                        Review needed
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick status summary */}
              <div className="flex items-center gap-1 text-sm">
                {approvedCount > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {approvedCount} approved
                  </Badge>
                )}
                {rejectedCount > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-700">
                    {rejectedCount} rejected
                  </Badge>
                )}
                {pendingCount > 0 && <Badge variant="secondary">{pendingCount} pending</Badge>}
              </div>

              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>

        {/* Expanded content */}
        {isExpanded && (
          <CardContent className="pt-0 space-y-4">
            {/* Bulk actions */}
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm text-muted-foreground">
                Review each change or use bulk actions
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApproveAll(documentId)}
                  disabled={pendingCount === 0}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRejectAll(documentId)}
                  disabled={pendingCount === 0}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject All
                </Button>
              </div>
            </div>

            <Separator />

            {/* Individual changes */}
            <div className="space-y-4">
              {changes.map((change) => (
                <div
                  key={change.id}
                  className={cn(
                    'p-4 border rounded-lg space-y-3',
                    change.status === CHANGE_STATUS.APPROVED && 'bg-green-50/50 border-green-200',
                    change.status === CHANGE_STATUS.REJECTED && 'bg-red-50/50 border-red-200',
                    change.status === CHANGE_STATUS.APPLIED && 'bg-blue-50/50 border-blue-200'
                  )}
                >
                  {/* Change header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(change.status)}
                      <span className="font-medium text-sm">
                        {change.sectionName}
                        {change.pageNumber && (
                          <span className="text-muted-foreground"> (Page {change.pageNumber})</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ConfidenceBadge confidence={change.evidence?.confidence} size="small" />
                      <ValidationPopover change={change} />
                    </div>
                  </div>

                  {/* Diff view */}
                  <ChangeDiffView
                    originalText={change.originalText}
                    proposedText={change.userEditedText || change.proposedText}
                    mode="inline"
                  />

                  {/* Evidence */}
                  {change.evidence?.sourceQuote && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      <span className="font-medium">Evidence: </span>
                      <span className="italic">"{change.evidence.sourceQuote}"</span>
                    </div>
                  )}

                  {/* Actions */}
                  {change.status !== CHANGE_STATUS.APPLIED && (
                    <div className="flex gap-2">
                      <Button
                        variant={change.status === CHANGE_STATUS.APPROVED ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onApproveChange(change.id)}
                        disabled={change.status === CHANGE_STATUS.APPROVED}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant={
                          change.status === CHANGE_STATUS.REJECTED ? 'destructive' : 'outline'
                        }
                        size="sm"
                        onClick={() => onRejectChange(change.id)}
                        disabled={change.status === CHANGE_STATUS.REJECTED}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingChange(change)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Edit modal */}
      <ChangeEditModal
        change={editingChange}
        isOpen={!!editingChange}
        onClose={() => setEditingChange(null)}
        onSave={(changeId, newText) => {
          onEditChange(changeId, newText);
          setEditingChange(null);
        }}
      />
    </>
  );
}
