
import React, { useState, useEffect, useCallback } from "react";
import { Message } from "@/api/entities";
import { Assignment } from "@/api/entities";
import { ConversationThread } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Share2, 
  MessageSquare, 
  Loader2, 
  Sparkles,
  FileText,
  CheckCircle,
  Hash,
  Users
} from "lucide-react";

export default function ShareToChatDialog({ 
  isOpen, 
  onClose, 
  item, 
  itemType, // "document", "task", "assignment"
  currentUser 
}) {
  const [assignments, setAssignments] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [customMessage, setCustomMessage] = useState("");
  const [includeAISummary, setIncludeAISummary] = useState(true);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [shareTarget, setShareTarget] = useState("assignment"); // "assignment" or "thread"

  useEffect(() => {
    if (isOpen) {
      loadAssignments();
    } else {
      // Reset state when dialog closes
      setSelectedAssignment(null);
      setSelectedThread(null);
      setCustomMessage("");
      setAiSummary("");
      setShareTarget("assignment");
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedAssignment) {
      loadThreads(selectedAssignment);
    } else {
      setThreads([]);
      setSelectedThread(null);
    }
  }, [selectedAssignment]);

  const generateAISummary = useCallback(async () => {
    if (!item) return;

    setIsGeneratingSummary(true);
    try {
      let prompt = "";
      // itemData was declared but not used inside the useCallback, so it can be removed
      // let itemData = {}; 

      switch (itemType) {
        case "document":
          // itemData assignment was removed as it's not used
          prompt = `Create a brief, shareable summary for this document that would be useful in a team chat:

Document: ${item.title}
Type: ${item.document_type}
Description: ${item.description || 'No description'}
${item.ai_analysis?.summary ? `AI Analysis: ${item.ai_analysis.summary}` : ''}

Create a 2-3 sentence summary that:
1. Explains what this document is
2. Highlights why it's relevant
3. Mentions key points if available

Keep it conversational and chat-friendly.`;
          break;

        case "task":
          // itemData assignment was removed as it's not used
          prompt = `Create a brief, shareable summary for this task that would be useful in a team chat:

Task: ${item.title}
Status: ${item.status}
Priority: ${item.priority}
Assigned to: ${item.assigned_to}
Due: ${item.due_date || 'No due date'}
Description: ${item.description || 'No description'}

Create a 2-3 sentence summary that:
1. Explains what needs to be done
2. Highlights urgency or importance
3. Mentions any blockers or dependencies

Keep it conversational and action-oriented.`;
          break;

        case "assignment":
          // itemData assignment was removed as it's not used
          prompt = `Create a brief, shareable summary for this assignment that would be useful in a team chat:

Assignment: ${item.name}
Status: ${item.status}
Priority: ${item.priority}
Team Size: ${item.team_members?.length || 0} members
Timeline: ${item.start_date || 'TBD'} to ${item.end_date || 'TBD'}
Description: ${item.description || 'No description'}

Create a 2-3 sentence summary that:
1. Explains the assignment scope
2. Highlights current status
3. Mentions any critical information

Keep it conversational and informative.`;
          break;
      }

      const response = await InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_highlights: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setAiSummary(response.summary);
    } catch (error) {
      console.error("Error generating AI summary:", error);
      setAiSummary("");
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [item, itemType]); // Dependencies for useCallback

  useEffect(() => {
    if (includeAISummary && item && selectedAssignment) {
      generateAISummary();
    } else {
      setAiSummary("");
    }
  }, [includeAISummary, item, selectedAssignment, generateAISummary]); // Added generateAISummary to dependencies

  const loadAssignments = async () => {
    try {
      const assignmentList = await Assignment.list();
      setAssignments(assignmentList);
      if (assignmentList.length > 0) {
        setSelectedAssignment(assignmentList[0].id);
      }
    } catch (error) {
      console.error("Error loading assignments:", error);
    }
  };

  const loadThreads = async (assignmentId) => {
    try {
      const threadList = await ConversationThread.filter({ 
        assignment_id: assignmentId,
        status: "active"
      }, "-last_activity");
      setThreads(threadList);
    } catch (error) {
      console.error("Error loading threads:", error);
    }
  };

  const handleShare = async () => {
    if (!selectedAssignment) {
      alert("Please select an assignment to share to");
      return;
    }

    setIsSharing(true);
    try {
      // assignment variable was declared but not used, so it can be removed
      // const assignment = assignments.find(a => a.id === selectedAssignment); 
      
      // Build the message content
      let messageContent = "";
      
      // Add custom message if provided
      if (customMessage.trim()) {
        messageContent += `${customMessage}\n\n`;
      }

      // Add item reference with icon/badge
      const itemTypeLabel = itemType.charAt(0).toUpperCase() + itemType.slice(1);
      messageContent += `📎 Shared ${itemTypeLabel}: **${item.title || item.name}**\n`;

      // Add AI summary if generated
      if (includeAISummary && aiSummary) {
        messageContent += `\n${aiSummary}\n`;
      }

      // Add key metadata based on item type
      if (itemType === "document") {
        messageContent += `\n📄 Type: ${item.document_type} | Size: ${(item.file_size / 1024).toFixed(1)} KB`;
      } else if (itemType === "task") {
        messageContent += `\n✅ Status: ${item.status} | Priority: ${item.priority} | Due: ${item.due_date || 'TBD'}`;
      } else if (itemType === "assignment") {
        messageContent += `\n📊 Status: ${item.status} | Team: ${item.team_members?.length || 0} members`;
      }

      // Create the message
      const messageData = {
        content: messageContent,
        assignment_id: selectedAssignment,
        author_email: currentUser?.email,
        author_name: currentUser?.full_name,
        message_type: "shared_item",
        thread_id: shareTarget === "thread" && selectedThread ? selectedThread : null,
        linked_documents: itemType === "document" ? [item.id] : [],
        tags: [itemType, "shared"]
      };

      await Message.create(messageData);

      // Success feedback
      alert(`${itemTypeLabel} shared successfully to ${shareTarget === "thread" ? "thread" : "assignment chat"}!`);
      onClose();

    } catch (error) {
      console.error("Error sharing to chat:", error);
      alert("Failed to share. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  if (!item) return null;

  const selectedAssignmentObj = assignments.find(a => a.id === selectedAssignment);
  const selectedThreadObj = threads.find(t => t.id === selectedThread);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            Share to Chat
          </DialogTitle>
          <DialogDescription>
            Share this {itemType} with your team via chat
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Item Preview */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
              {itemType === "document" && <FileText className="w-5 h-5 text-blue-600 mt-0.5" />}
              {itemType === "task" && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />}
              {itemType === "assignment" && <Users className="w-5 h-5 text-purple-600 mt-0.5" />}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900">{item.title || item.name}</h4>
                {item.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{itemType}</Badge>
                  {item.status && <Badge variant="outline">{item.status}</Badge>}
                  {item.priority && <Badge variant="outline">{item.priority}</Badge>}
                </div>
              </div>
            </div>
          </div>

          {/* Share Destination */}
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Share to Assignment</Label>
              <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignment" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map(assignment => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      <div className="flex items-center gap-2">
                        <span>{assignment.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {assignment.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Thread Selection (Optional) */}
            {threads.length > 0 && (
              <Tabs value={shareTarget} onValueChange={setShareTarget}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="assignment">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    General Chat
                  </TabsTrigger>
                  <TabsTrigger value="thread">
                    <Hash className="w-4 h-4 mr-2" />
                    Specific Thread
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="thread" className="mt-4">
                  <Select value={selectedThread} onValueChange={setSelectedThread}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a thread" />
                    </SelectTrigger>
                    <SelectContent>
                      {threads.map(thread => (
                        <SelectItem key={thread.id} value={thread.id}>
                          <div className="flex items-center gap-2">
                            <Hash className="w-3 h-3" />
                            <span>{thread.topic}</span>
                            <Badge variant="outline" className="text-xs">
                              {thread.message_count || 0} messages
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* AI Summary Option */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ai-summary"
                checked={includeAISummary}
                onCheckedChange={setIncludeAISummary}
              />
              <Label htmlFor="ai-summary" className="flex items-center gap-2 cursor-pointer">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Include AI-generated summary
              </Label>
            </div>

            {includeAISummary && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                {isGeneratingSummary ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating summary...
                  </div>
                ) : aiSummary ? (
                  <p className="text-sm text-gray-700">{aiSummary}</p>
                ) : (
                  <p className="text-sm text-gray-500">No summary available</p>
                )}
              </div>
            )}
          </div>

          {/* Custom Message */}
          <div>
            <Label htmlFor="custom-message" className="mb-2 block">
              Add a message (optional)
            </Label>
            <Textarea
              id="custom-message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add context or instructions for your team..."
              rows={3}
            />
          </div>

          {/* Preview of what will be shared */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-900 mb-2">Preview:</p>
            <div className="text-sm text-gray-700 space-y-1">
              {customMessage && <p className="font-medium">{customMessage}</p>}
              <p>📎 Shared {itemType}: <strong>{item.title || item.name}</strong></p>
              {includeAISummary && aiSummary && (
                <p className="text-gray-600 italic">{aiSummary}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Sharing to: {selectedAssignmentObj?.name} 
                {shareTarget === "thread" && selectedThreadObj && ` → ${selectedThreadObj.topic}`}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSharing}>
            Cancel
          </Button>
          <Button 
            onClick={handleShare} 
            disabled={isSharing || !selectedAssignment}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSharing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Share to Chat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
