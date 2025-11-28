
import React, { useState, useEffect } from "react";
import { db } from "@/api/db";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Share2 } from "lucide-react"; // Removed Upload, File, X; Added Share2
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { toast } from "sonner";

export default function FileShareDialog({ file, isOpen, onClose, onShared }) {
  const [selectedThread, setSelectedThread] = useState("");
  const [threads, setThreads] = useState([]);
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(false);

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (isOpen && currentWorkspaceId) {
      loadThreads();
    }
  }, [isOpen, currentWorkspaceId]);

  const loadThreads = async () => {
    try {
      setLoading(true);
      // CRITICAL: Only load threads from current workspace
      const threadsData = await db.entities.ConversationThread.filter(
        {
          workspace_id: currentWorkspaceId,
          status: "active"
        },
        "-last_activity",
        50
      );
      setThreads(threadsData);
    } catch (error) {
      console.error("Error loading threads:", error);
      toast.error("Failed to load conversation threads");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedThread) {
      toast.error("Please select a conversation thread");
      return;
    }

    if (!currentWorkspaceId) {
      toast.error("No workspace selected");
      return;
    }

    try {
      setSharing(true);

      // CRITICAL SECURITY CHECK: Validate file is in current workspace
      // Assuming 'file' prop has a 'workspace_id' property for an existing file
      if (file?.workspace_id && file.workspace_id !== currentWorkspaceId) {
        toast.error("Cannot share files from other workspaces");
        console.error("Security violation: Attempted cross-workspace file share", {
          fileWorkspace: file.workspace_id,
          currentWorkspace: currentWorkspaceId
        });
        return;
      }

      // CRITICAL SECURITY CHECK: Validate thread is in current workspace
      const thread = threads.find(t => t.id === selectedThread);
      if (!thread) {
        toast.error("Selected thread not found");
        return;
      }

      if (thread.workspace_id !== currentWorkspaceId) {
        toast.error("Cannot share to threads in other workspaces");
        console.error("Security violation: Attempted cross-workspace thread share", {
          threadWorkspace: thread.workspace_id,
          currentWorkspace: currentWorkspaceId
        });
        return;
      }

      const user = await db.auth.me();

      // Create message with file attachment in current workspace
      const messageData = {
        workspace_id: currentWorkspaceId,  // CRITICAL: Explicit workspace_id
        content: message || `Shared file: ${file?.title || file?.file_name}`,
        assignment_id: thread.assignment_id,
        thread_id: selectedThread,
        author_email: user.email,
        author_name: user.full_name,
        message_type: "file",
        file_url: file?.file_url || file?.url,
        file_name: file?.title || file?.file_name,
        linked_documents: file?.id ? [file.id] : []
      };

      await db.entities.Message.create(messageData);

      // Update thread activity
      await db.entities.ConversationThread.update(selectedThread, {
        last_activity: new Date().toISOString(),
        message_count: (thread.message_count || 0) + 1
      });

      toast.success("File shared successfully");
      onClose();
      if (onShared) onShared();
    } catch (error) {
      console.error("Error sharing file:", error);
      toast.error("Failed to share file");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share File to Chat</DialogTitle>
          <DialogDescription>
            Share "{file?.title || file?.file_name}" to a conversation thread
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="thread">Select Conversation</Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <Select value={selectedThread} onValueChange={setSelectedThread}>
                <SelectTrigger id="thread">
                  <SelectValue placeholder="Choose a conversation..." />
                </SelectTrigger>
                <SelectContent>
                  {threads.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No active conversations found in this workspace
                    </div>
                  ) : (
                    threads.map((thread) => (
                      <SelectItem key={thread.id} value={thread.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{thread.topic}</span>
                          {thread.description && (
                            <span className="text-xs text-gray-500">{thread.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message with the file..."
              rows={3}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              🔒 Files can only be shared within the current workspace
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sharing}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={sharing || !selectedThread}>
            {sharing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Share File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
