import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Loader2 } from "lucide-react";
import { User } from "@/api/entities";
import { db } from "@/api/db";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { toast } from "sonner";

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
  entityId, // ID of the entity to share
  entityName, // Name/title of the entity
  currentSharedWith = [], // Array of user identifiers (e.g., emails) already shared with
  onShareComplete, // Callback when sharing is complete
}) {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const { currentWorkspace, currentWorkspaceId } = useWorkspace();

  // Load real users from workspace when dialog opens
  useEffect(() => {
    if (open) {
      loadWorkspaceUsers();
    }
  }, [open, currentWorkspaceId]);

  const loadWorkspaceUsers = async () => {
    try {
      setLoading(true);

      // Get current user
      const currentUser = await db.auth.me();

      // Get all users
      const allUsers = await User.list();

      // Filter to workspace members only (excluding current user)
      const workspaceMembers = currentWorkspace?.members || [];
      const filteredUsers = allUsers.filter(
        (user) =>
          workspaceMembers.includes(user.email) &&
          user.email !== currentUser.email &&
          !currentSharedWith.includes(user.email)
      );

      setUsers(filteredUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedUser) {
      toast.error("Please select a team member to share with");
      return;
    }

    try {
      setSharing(true);

      // Get the entity and update its shared_with field
      const entityManager =
        db.entities[
          entityType.charAt(0).toUpperCase() + entityType.slice(1)
        ];

      if (entityManager && entityId) {
        const entity = await entityManager.get(entityId);
        const currentShared = entity?.shared_with || [];

        if (!currentShared.includes(selectedUser)) {
          await entityManager.update(entityId, {
            shared_with: [...currentShared, selectedUser],
            last_shared_date: new Date().toISOString(),
            last_shared_by: (await db.auth.me()).email,
          });
        }
      }

      const sharedWithUser = users.find((u) => u.email === selectedUser);
      toast.success(
        `Shared "${entityName}" with ${
          sharedWithUser?.full_name || selectedUser
        }`
      );

      if (onShareComplete) {
        onShareComplete(selectedUser);
      }

      setOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error sharing:", error);
      toast.error("Failed to share. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
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
            Share "{entityName}" with your team members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label
              htmlFor="team-member-select"
              className="text-sm font-medium mb-2 block"
            >
              Select Team Member
            </label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">
                  Loading team members...
                </span>
              </div>
            ) : (
              <Select
                value={selectedUser || "none"}
                onValueChange={(value) =>
                  setSelectedUser(value === "none" ? null : value)
                }
              >
                <SelectTrigger id="team-member-select">
                  <SelectValue placeholder="Select a team member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Select Team Member --</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                  {users.length === 0 && (
                    <SelectItem value="no-users" disabled>
                      No other team members available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {currentSharedWith.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Currently Shared With:</p>
              <div className="flex flex-wrap gap-2">
                {currentSharedWith.map((email) => (
                  <span
                    key={email}
                    className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs rounded-full"
                  >
                    {email}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleShare}
            disabled={!selectedUser || sharing}
          >
            {sharing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              "Share"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
