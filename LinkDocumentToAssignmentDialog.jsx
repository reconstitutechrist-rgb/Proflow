
import React, { useState, useEffect } from "react";
import { Document } from "@/api/entities";
import { Assignment } from "@/api/entities"; // Assuming Assignment entity exists and is imported like Document
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Link,
  FolderPlus,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { validateSameWorkspace } from "@/CrossWorkspaceValidator";
import { useToast } from "@/components/ui/use-toast"; // Assuming useToast is available for shadcn/ui toasts

export default function LinkDocumentToAssignmentDialog({ 
  document, 
  isOpen, // Replaces 'open' state for external control
  onClose, // Replaces 'setOpen(false)' for external control
  onLinked // Replaces 'onLink' and is called after successful linking
}) {
  const [selectedAssignment, setSelectedAssignment] = useState(null); // Stores the single selected assignment ID
  const [isUpdating, setIsUpdating] = useState(false);
  const [assignments, setAssignments] = useState([]); // State to store assignments fetched from the workspace
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const { currentWorkspaceId } = useWorkspace();
  const { toast } = useToast();

  // Effect to reset state when dialog opens and load assignments
  useEffect(() => {
    if (isOpen) {
      setSelectedAssignment(null); // Reset single selection
      setIsUpdating(false);
      
      if (currentWorkspaceId) {
        loadAssignments();
      }
    }
    // Dependency on document.id added to ensure reset if document changes while dialog is open
  }, [isOpen, currentWorkspaceId, document?.id]); 

  const loadAssignments = async () => {
    if (!currentWorkspaceId) {
      console.warn("No currentWorkspaceId available to load assignments.");
      return;
    }

    setLoadingAssignments(true);
    try {
      // Only load assignments from the current workspace
      const assignmentsData = await Assignment.filter({
        workspace_id: currentWorkspaceId
      }, "-updated_date"); // Assuming Assignment.filter works like Document.filter
      setAssignments(assignmentsData);
    } catch (error) {
      console.error("Error loading assignments:", error);
      toast({
        title: "Failed to load assignments",
        description: "There was an error fetching assignments for this workspace.",
        variant: "destructive",
      });
      setAssignments([]); // Clear assignments on error
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Don't render if no document
  if (!document) {
    return null;
  }
  
  // No longer need currentlyLinked and availableAssignments as separate concepts
  // for the selection UI, but currentlyLinked is still used for the update logic.
  const currentlyLinked = Array.isArray(document.assigned_to_assignments) 
    ? document.assigned_to_assignments 
    : [];

  const handleLink = async () => {
    if (!selectedAssignment) {
      toast({
        title: "No assignment selected",
        description: "Please select an assignment to link the document.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const assignmentToLink = assignments.find(a => a.id === selectedAssignment);
      
      if (!assignmentToLink) {
          throw new Error("Selected assignment not found.");
      }

      // Validate all entities are in the same workspace
      await validateSameWorkspace([document, assignmentToLink]);

      // Create new assignments array - add the selected one, ensuring uniqueness
      const currentAssignments = document.assigned_to_assignments || [];
      const updatedAssignments = [
        ...new Set([...currentAssignments, selectedAssignment])
      ];
      
      await Document.update(document.id, {
        assigned_to_assignments: updatedAssignments
      });

      toast({
        title: "Document linked!",
        description: `Successfully linked document to "${assignmentToLink.name}".`,
      });

      // Call success callback and close after showing success message
      setTimeout(() => {
        onLinked?.(); // Use onLinked prop
        onClose(); // Close dialog
        setSelectedAssignment(null); // Reset selection
      }, 500); // Shorter delay as toast handles visibility

    } catch (error) {
      console.error("Error linking document:", error);
      toast({
        title: "Failed to link document",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
      setSelectedAssignment(null); // Reset selection
      onClose(); // Close dialog
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}> {/* Controlled by isOpen and onClose props */}
      {/* DialogTrigger is removed as the dialog is externally controlled */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-blue-600" />
            Link Document to Assignment
          </DialogTitle>
          <DialogDescription>
            Associate "{document.title}" with an assignment for better organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Assignment</label>
            <Select 
              value={selectedAssignment || "none"} // Set value to "none" if no assignment is selected
              onValueChange={(value) => setSelectedAssignment(value === "none" ? null : value)}
              disabled={isUpdating || loadingAssignments}
            >
              <SelectTrigger>
                {loadingAssignments ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading assignments...
                    </div>
                ) : (
                    <SelectValue placeholder="Choose an assignment..." />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Assignment</SelectItem>
                {assignments.length === 0 && !loadingAssignments && (
                  <SelectItem value="no-available" disabled>No assignments available in this workspace.</SelectItem>
                )}
                {assignments.map(assignment => (
                  <SelectItem key={assignment.id} value={assignment.id} disabled={currentlyLinked.includes(assignment.id)}>
                    <div className="flex items-center justify-between w-full">
                      <span>{assignment.name}</span>
                      {currentlyLinked.includes(assignment.id) && (
                        <Badge variant="secondary" className="ml-2">Already linked</Badge>
                      )}
                      <Badge variant="outline" className="ml-2">{assignment.status?.replace('_', ' ')}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Removed updateStatus rendering, now using toast for feedback */}
        </div>

        {/* Footer with Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLink} // Renamed from handleLinkDocument
            disabled={isUpdating || !selectedAssignment} // Disable if no assignment selected
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Link className="w-4 h-4 mr-2" />
                Link to Assignment
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
