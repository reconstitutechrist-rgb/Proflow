
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

// Import UI components from shadcn/ui
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ShareButton({
  entityType, // e.g., "document", "task", "assignment"
  entityId,   // ID of the entity to share
  entityName, // Name/title of the entity
  currentSharedWith = [] // Array of user identifiers (e.g., emails) already shared with
}) {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // Stores the email of the user to share with

  // Mock data for available users. In a real application, this would be fetched from an API.
  const allAvailableUsers = [
    { email: "john.doe@example.com", full_name: "John Doe" },
    { email: "jane.smith@example.com", full_name: "Jane Smith" },
    { email: "bob.johnson@example.com", full_name: "Bob Johnson" },
    { email: "alice.williams@example.com", full_name: "Alice Williams" },
    { email: "charlie.brown@example.com", full_name: "Charlie Brown" },
  ];

  // Filter out users who are already in the currentSharedWith list
  const availableUsers = allAvailableUsers.filter(user =>
    !currentSharedWith.includes(user.email)
  );

  const handleShare = () => {
    if (selectedUser) {
      // Logic to perform the sharing action
      console.log(`Sharing ${entityType} "${entityName}" (ID: ${entityId}) with ${selectedUser}`);
      // Here you would typically make an API call to share the entity
      // On success:
      setOpen(false); // Close the dialog
      setSelectedUser(null); // Reset the selected user
      // You might also want to trigger a refresh of currentSharedWith in the parent component
    } else {
      console.warn("No user selected to share with.");
      // Optionally show a toast or error message to the user
    }
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    // Reset selected user when dialog closes without sharing
    if (!isOpen) {
      setSelectedUser(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {entityType}</DialogTitle>
          <DialogDescription>
            Share "{entityName}" with team members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label htmlFor="team-member-select" className="text-sm font-medium mb-2 block">Add Team Member</label>
            <Select
              value={selectedUser || "none"} // Use "none" as a placeholder for null/empty selection
              onValueChange={(value) => setSelectedUser(value === "none" ? null : value)}
            >
              <SelectTrigger id="team-member-select">
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Select User --</SelectItem>
                {availableUsers.map(user => (
                  <SelectItem key={user.email} value={user.email}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
                {availableUsers.length === 0 && (
                    <SelectItem value="no-users" disabled>No other users available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {currentSharedWith.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Currently Shared With:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                {currentSharedWith.map((email, index) => (
                  <li key={index}>{email}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleOpenChange(false)} // Use handleOpenChange to reset state
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleShare}
            disabled={!selectedUser} // Disable if no user is selected
          >
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
