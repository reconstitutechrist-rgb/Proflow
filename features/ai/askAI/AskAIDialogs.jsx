import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  FileText,
  MessageSquare,
  Save,
  Trash2,
  Download,
  FileDown,
  CheckCircle2,
  DollarSign,
} from "lucide-react";

export function AskAIDialogs({
  // Save dialog
  isSaveDialogOpen,
  setIsSaveDialogOpen,
  sessionName,
  setSessionName,
  sessionDescription,
  setSessionDescription,
  currentSession,
  messages,
  uploadedDocuments,
  totalEmbeddingCost,
  handleSaveSession,

  // Export dialog
  isExportDialogOpen,
  setIsExportDialogOpen,
  exportFormat,
  setExportFormat,
  isExporting,
  handleExportSession,
  selectedProject,
  selectedAssignment,

  // Delete confirmation dialog
  deleteConfirmSession,
  setDeleteConfirmSession,
  handleDeleteSession,

  // Load session confirmation dialog
  isLoadNewSessionDialogOpen,
  setIsLoadNewSessionDialogOpen,
  pendingSessionToLoad,
  setPendingSessionToLoad,
  sessionModified,
  confirmLoadSession,
}) {
  return (
    <>
      {/* Save Session Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentSession ? "Update Session" : "Save Session"}
            </DialogTitle>
            <DialogDescription>
              {currentSession
                ? 'Update the session name and description'
                : 'Give your conversation a name to save it for later'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="session-name">Session Name *</Label>
              <Input
                id="session-name"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Project Requirements Analysis"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="session-description">Description (Optional)</Label>
              <Textarea
                id="session-description"
                value={sessionDescription}
                onChange={(e) => setSessionDescription(e.target.value)}
                placeholder="Brief description of what this conversation is about..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>{messages.length} messages</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{uploadedDocuments.length} documents</span>
              </div>
              {totalEmbeddingCost > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>${totalEmbeddingCost.toFixed(4)} estimated cost</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSession} disabled={!sessionName.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {currentSession ? "Update" : "Save"} Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Session</DialogTitle>
            <DialogDescription>
              Download your conversation as a document
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="markdown">
                    <div className="flex items-center gap-2">
                      <FileDown className="w-4 h-4" />
                      Markdown (.md)
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      PDF Document
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium mb-2 text-gray-900 dark:text-white">Export will include:</p>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                All {messages.length} messages
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Document list ({uploadedDocuments.length} files)
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Context exclusion markers
              </div>
              {selectedProject && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Project context
                </div>
              )}
              {selectedAssignment && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Assignment context
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleExportSession(exportFormat)}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmSession} onOpenChange={() => setDeleteConfirmSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteConfirmSession?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmSession(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteSession(deleteConfirmSession.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load New Session Confirmation */}
      <Dialog open={isLoadNewSessionDialogOpen} onOpenChange={setIsLoadNewSessionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Session?</DialogTitle>
            <DialogDescription>
              {sessionModified && currentSession
                ? 'You have unsaved changes. Loading a new session will discard them.'
                : 'Your current unsaved conversation will be discarded.'}
              <br />
              Are you sure you want to load &ldquo;{pendingSessionToLoad?.name}&rdquo;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsLoadNewSessionDialogOpen(false);
                setPendingSessionToLoad(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (pendingSessionToLoad) {
                  confirmLoadSession(pendingSessionToLoad);
                }
              }}
            >
              Load Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AskAIDialogs;
