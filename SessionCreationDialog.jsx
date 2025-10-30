import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  FileText, 
  Hash,
  Sparkles,
  Loader2
} from "lucide-react";

export default function SessionCreationDialog({
  isOpen,
  onClose,
  onCreateSession,
  suggestedName = "",
  suggestedDescription = "",
  suggestedTags = [],
  assignmentName = null,
  documentCount = 0,
  messageCount = 0
}) {
  const [sessionName, setSessionName] = useState(suggestedName);
  const [description, setDescription] = useState(suggestedDescription);
  const [tags, setTags] = useState(suggestedTags);
  const [tagInput, setTagInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSessionName(suggestedName);
      setDescription(suggestedDescription);
      setTags(suggestedTags);
    }
  }, [isOpen, suggestedName, suggestedDescription, suggestedTags]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleCreate = async () => {
    if (!sessionName.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      await onCreateSession({
        name: sessionName.trim(),
        description: description.trim(),
        tags: tags
      });
      onClose();
    } catch (error) {
      console.error("Error creating session:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Create New Thread
          </DialogTitle>
          <DialogDescription>
            Give your conversation a name to help you find it later
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Context Summary */}
          {(assignmentName || documentCount > 0 || messageCount > 0) && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Thread Context:
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {assignmentName && (
                  <Badge variant="outline" className="bg-white dark:bg-gray-800">
                    📁 {assignmentName}
                  </Badge>
                )}
                {documentCount > 0 && (
                  <Badge variant="outline" className="bg-white dark:bg-gray-800">
                    <FileText className="w-3 h-3 mr-1" />
                    {documentCount} {documentCount === 1 ? 'document' : 'documents'}
                  </Badge>
                )}
                {messageCount > 0 && (
                  <Badge variant="outline" className="bg-white dark:bg-gray-800">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {messageCount} {messageCount === 1 ? 'message' : 'messages'}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Thread Name */}
          <div className="space-y-2">
            <Label htmlFor="session-name">
              Thread Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="session-name"
              placeholder="E.g., License Requirements Analysis"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-gray-500 text-xs">(Optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="What is this conversation about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">
              Tags <span className="text-gray-500 text-xs">(Optional)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleAddTag}
              >
                <Hash className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary"
                    className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    {tag}
                    <span className="ml-1 text-xs opacity-60">×</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!sessionName.trim() || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Thread
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}