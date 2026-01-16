/**
 * ChangeEditModal Component
 *
 * Modal for editing a proposed change's text before applying.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

export default function ChangeEditModal({ change, isOpen, onClose, onSave }) {
  const [editedText, setEditedText] = useState('');

  // Reset text when change changes
  useEffect(() => {
    if (change) {
      setEditedText(change.userEditedText || change.proposedText || '');
    }
  }, [change]);

  const handleSave = () => {
    onSave(change.id, editedText);
    onClose();
  };

  const handleReset = () => {
    setEditedText(change.proposedText || '');
  };

  if (!change) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Edit Proposed Change
          </DialogTitle>
          <DialogDescription>
            Modify the proposed text before applying. The original text will be replaced with your
            edited version.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{change.documentTitle}</Badge>
            <span>•</span>
            <span>{change.sectionName}</span>
          </div>

          {/* Original text (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Original Text (read-only)</Label>
            <div className="p-3 bg-muted/50 border rounded-md text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
              {change.originalText}
            </div>
          </div>

          {/* Editable proposed text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="editedText">New Text (editable)</Label>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Reset to AI suggestion
              </Button>
            </div>
            <Textarea
              id="editedText"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="min-h-[120px] font-mono text-sm"
              placeholder="Enter the replacement text..."
            />
          </div>

          {/* Evidence citation */}
          {change.evidence?.sourceQuote && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Evidence from uploaded document</Label>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm italic">
                "{change.evidence.sourceQuote}"
                {change.evidence.sourceLocation && (
                  <span className="block mt-1 text-xs text-muted-foreground not-italic">
                    Source: {change.evidence.sourceLocation}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!editedText.trim()}>
            Save & Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
