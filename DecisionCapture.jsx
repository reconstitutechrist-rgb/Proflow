
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
  CheckCircle2,
  Plus,
  X,
  Users,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { toast } from 'react-hot-toast'; // Assuming react-hot-toast is used for notifications
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

// Assuming base44 is available globally or imported from a utility file
// Adjust the import path if necessary based on your project structure
import * as base44 from '@/lib/base44'; 

export default function DecisionCapture({
  isOpen,
  onClose,
  assignmentId,
  threadId,
  onDecisionCreated,
  currentUser, // New prop: user object with email and full_name
  availableParticipants = [], // New prop: list of all possible participants (emails)
}) {
  const [decisionTitle, setDecisionTitle] = useState("");
  const [decisionSummary, setDecisionSummary] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]); // This state holds participants for *this* decision
  const [dueDate, setDueDate] = useState("");
  const [actionItems, setActionItems] = useState([]);
  const [newActionItem, setNewActionItem] = useState({
    task: "",
    assignee: "",
    due_date: ""
  });
  const [loading, setLoading] = useState(false);

  const { currentWorkspaceId } = useWorkspace();

  const resetForm = () => {
    setDecisionTitle("");
    setDecisionSummary("");
    setSelectedParticipants([]);
    setDueDate("");
    setActionItems([]);
    setNewActionItem({ task: "", assignee: "", due_date: "" });
  };

  // Reset form whenever the dialog is opened (when isOpen changes to true)
  // or when it's closed and then reopened.
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleCaptureDecision = async () => {
    if (!decisionTitle.trim() || !decisionSummary.trim()) {
      toast.error("Please provide a decision title and summary.");
      return;
    }
    if (!currentUser || !currentUser.email || !currentUser.full_name) {
      toast.error("User information is missing. Cannot capture decision.");
      return;
    }
    if (!currentWorkspaceId) {
        toast.error("Workspace ID is missing. Cannot capture decision.");
        return;
    }

    try {
      setLoading(true);

      const decisionMessage = await base44.entities.Message.create({
        workspace_id: currentWorkspaceId,
        content: decisionSummary,
        assignment_id: assignmentId,
        thread_id: threadId,
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        message_type: 'decision',
        is_decision: true,
        decision_details: {
          decision_title: decisionTitle,
          decision_summary: decisionSummary,
          participants: selectedParticipants, // Using the new state variable
          due_date: dueDate,
          action_items: actionItems
        }
      });

      if (threadId) {
        // Assuming base44.entities.ConversationThread has methods like get and update
        const thread = await base44.entities.ConversationThread.get(threadId);
        const currentDecisions = thread.decisions || [];
        await base44.entities.ConversationThread.update(threadId, {
          decisions: [...currentDecisions, decisionMessage.id],
          last_activity: new Date().toISOString()
        });
      }

      toast.success("Decision captured successfully");

      if (onDecisionCreated) {
        onDecisionCreated(decisionMessage);
      }

      onClose(); // Use the onClose prop to close the dialog
      // The form will be reset by the useEffect when isOpen changes from true to false and then true again for a new capture.
    } catch (error) {
      console.error("Error capturing decision:", error);
      toast.error("Failed to capture decision");
    } finally {
      setLoading(false);
    }
  };

  const addActionItem = () => {
    if (newActionItem.task.trim()) {
      setActionItems([...actionItems, { ...newActionItem }]);
      setNewActionItem({ task: "", assignee: "", due_date: "" });
    }
  };

  const removeActionItem = (index) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const toggleParticipant = (email) => {
    if (selectedParticipants.includes(email)) {
      setSelectedParticipants(selectedParticipants.filter(p => p !== email));
    } else {
      setSelectedParticipants([...selectedParticipants, email]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Capture Team Decision
            {/* threadTopic badge removed as threadTopic is no longer a prop */}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Decision Title */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Decision Title *
            </label>
            <Input
              value={decisionTitle}
              onChange={(e) => setDecisionTitle(e.target.value)}
              placeholder="What was decided?"
              className="text-lg"
            />
          </div>

          {/* Decision Summary */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Decision Summary *
            </label>
            <Textarea
              value={decisionSummary}
              onChange={(e) => setDecisionSummary(e.target.value)}
              placeholder="Describe the decision, reasoning, and context..."
              rows={4}
            />
          </div>

          {/* Participants */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
              <Users className="w-4 h-4" />
              Decision Participants
            </label>
            <div className="space-y-2">
              {availableParticipants.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {availableParticipants.map(email => (
                    <div
                      key={email}
                      onClick={() => toggleParticipant(email)}
                      className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                        selectedParticipants.includes(email) // Check against new state
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm truncate">{email}</span>
                        {selectedParticipants.includes(email) && ( // Check against new state
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  No team members available to select
                </p>
              )}
            </div>
          </div>

          {/* Decision Due Date */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Implementation Due Date (Optional)
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Action Items */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Action Items
            </label>

            {/* Existing Action Items */}
            {actionItems.length > 0 && (
              <div className="space-y-2 mb-3">
                {actionItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.task}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        {item.assignee && (
                          <span>Assigned to: {item.assignee}</span>
                        )}
                        {item.due_date && (
                          <span>Due: {new Date(item.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeActionItem(index)}
                      className="w-8 h-8 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Action Item */}
            <div className="border border-gray-200 rounded-lg p-3 space-y-3">
              <Input
                value={newActionItem.task}
                onChange={(e) => setNewActionItem({
                  ...newActionItem,
                  task: e.target.value
                })}
                placeholder="What needs to be done?"
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={newActionItem.assignee}
                  onValueChange={(value) => setNewActionItem({
                    ...newActionItem,
                    assignee: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableParticipants.map(email => ( // Use availableParticipants for assignee options
                      <SelectItem key={email} value={email}>
                        {email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={newActionItem.due_date}
                  onChange={(e) => setNewActionItem({
                    ...newActionItem,
                    due_date: e.target.value
                  })}
                />
              </div>
              <Button
                onClick={addActionItem}
                disabled={!newActionItem.task.trim()}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Action Item
              </Button>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important Note</p>
                <p>This decision will be permanently recorded in the project conversation history and can be referenced by all team members.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleCaptureDecision}
              disabled={!decisionTitle.trim() || !decisionSummary.trim() || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Saving..." : <><CheckCircle2 className="w-4 h-4 mr-2" /> Save Decision</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
