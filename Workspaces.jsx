import React, { useState } from "react";
import { db } from "@/api/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Briefcase,
  Users,
  Building2,
  Plus,
  MoreVertical,
  Settings,
  Trash2,
  UserPlus,
  UserMinus,
  Star,
  CheckCircle2,
  Loader2,
  Mail,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

export default function WorkspacesPage() {
  // Use context instead of duplicating logic
  const { 
    availableWorkspaces, 
    currentWorkspace, 
    currentUser, 
    loading, 
    switchWorkspace,
    refreshWorkspaces 
  } = useWorkspace();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: "",
    description: "",
    type: "personal"
  });
  const [creating, setCreating] = useState(false);

  // Invite members state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteWorkspace, setInviteWorkspace] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // Manage members state
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [membersWorkspace, setMembersWorkspace] = useState(null);
  const [removingMember, setRemovingMember] = useState(null);

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    if (!currentUser) {
      toast.error("User information not available");
      return;
    }

    try {
      setCreating(true);
      const createdWorkspace = await db.entities.Workspace.create({
        name: newWorkspace.name,
        description: newWorkspace.description,
        type: newWorkspace.type,
        owner_email: currentUser.email,
        members: [currentUser.email],
        is_default: false,
        settings: {
          color: "#3B82F6",
          icon: newWorkspace.type === "personal" ? "👤" : newWorkspace.type === "team" ? "👥" : "🤝"
        }
      });

      // Add creator to workspace_members table
      try {
        await db.entities.WorkspaceMember.create({
          workspace_id: createdWorkspace.id,
          user_id: currentUser.id,
          role: 'owner',
        });
      } catch (memberError) {
        console.warn('Could not add workspace member record:', memberError);
      }

      toast.success("Workspace created successfully");
      setIsCreateDialogOpen(false);
      setNewWorkspace({ name: "", description: "", type: "personal" });
      
      // Refresh workspaces from context
      await refreshWorkspaces();
    } catch (error) {
      console.error("Error creating workspace:", error);
      toast.error("Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  const handleSetActiveWorkspace = async (workspaceId) => {
    try {
      await switchWorkspace(workspaceId);
      toast.success("Switched workspace successfully");
    } catch (error) {
      console.error("Error setting active workspace:", error);
      toast.error("Failed to switch workspace");
    }
  };

  const handleDeleteWorkspace = async (workspace) => {
    if (workspace.is_default) {
      toast.error("Cannot delete your default personal workspace");
      return;
    }

    if (workspace.owner_email !== currentUser?.email) {
      toast.error("Only the workspace owner can delete it");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await db.entities.Workspace.delete(workspace.id);
      toast.success("Workspace deleted successfully");

      // If the deleted workspace was active, context will handle switching
      await refreshWorkspaces();
    } catch (error) {
      console.error("Error deleting workspace:", error);
      toast.error("Failed to delete workspace");
    }
  };

  const openInviteDialog = (workspace) => {
    setInviteWorkspace(workspace);
    setInviteEmail("");
    setIsInviteDialogOpen(true);
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!inviteWorkspace) {
      toast.error("No workspace selected");
      return;
    }

    const email = inviteEmail.trim().toLowerCase();

    // Check if already a member
    if (inviteWorkspace.members?.includes(email)) {
      toast.error("This user is already a member of this workspace");
      return;
    }

    try {
      setInviting(true);

      // Add the email to the members array
      const updatedMembers = [...(inviteWorkspace.members || []), email];

      await db.entities.Workspace.update(inviteWorkspace.id, {
        members: updatedMembers
      });

      // Try to add to workspace_members table if user exists
      try {
        // Look up user by email to get their ID
        const users = await db.entities.User.list();
        const invitedUser = users.find(u => u.email?.toLowerCase() === email);
        if (invitedUser) {
          await db.entities.WorkspaceMember.create({
            workspace_id: inviteWorkspace.id,
            user_id: invitedUser.id,
            role: 'member',
            invited_by: currentUser?.id,
          });
        }
      } catch (memberError) {
        console.warn('Could not add workspace member record:', memberError);
      }

      toast.success(`Invited ${email} to ${inviteWorkspace.name}`);
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteWorkspace(null);

      // Refresh workspaces to show updated member count
      await refreshWorkspaces();
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error("Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  const openMembersDialog = (workspace) => {
    setMembersWorkspace(workspace);
    setIsMembersDialogOpen(true);
  };

  const handleRemoveMember = async (email) => {
    if (!membersWorkspace) return;

    // Cannot remove the owner
    if (email === membersWorkspace.owner_email) {
      toast.error("Cannot remove the workspace owner");
      return;
    }

    // Cannot remove yourself if you're not the owner
    if (email === currentUser?.email && membersWorkspace.owner_email !== currentUser?.email) {
      toast.error("You cannot remove yourself from this workspace");
      return;
    }

    try {
      setRemovingMember(email);

      const updatedMembers = (membersWorkspace.members || []).filter(m => m !== email);

      await db.entities.Workspace.update(membersWorkspace.id, {
        members: updatedMembers
      });

      // Try to remove from workspace_members table
      try {
        const users = await db.entities.User.list();
        const removedUser = users.find(u => u.email?.toLowerCase() === email);
        if (removedUser) {
          // Find and delete the workspace_member record
          const members = await db.entities.WorkspaceMember.list();
          const memberRecord = members.find(
            m => m.workspace_id === membersWorkspace.id && m.user_id === removedUser.id
          );
          if (memberRecord) {
            await db.entities.WorkspaceMember.delete(memberRecord.id);
          }
        }
      } catch (memberError) {
        console.warn('Could not remove workspace member record:', memberError);
      }

      // Update local state
      setMembersWorkspace({
        ...membersWorkspace,
        members: updatedMembers
      });

      toast.success(`Removed ${email} from the workspace`);

      // Refresh workspaces
      await refreshWorkspaces();
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    } finally {
      setRemovingMember(null);
    }
  };

  const getWorkspaceIcon = (type) => {
    switch (type) {
      case 'personal': return <Briefcase className="w-5 h-5" />;
      case 'team': return <Users className="w-5 h-5" />;
      case 'client': return <Building2 className="w-5 h-5" />;
      default: return <Briefcase className="w-5 h-5" />;
    }
  };

  const getWorkspaceColor = (type) => {
    switch (type) {
      case 'personal': return 'from-blue-500 to-indigo-600';
      case 'team': return 'from-green-500 to-emerald-600';
      case 'client': return 'from-purple-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Workspaces</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your personal and team workspaces
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Workspace
        </Button>
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableWorkspaces.map((workspace) => {
          const isActive = currentWorkspace?.id === workspace.id;
          const isOwner = workspace.owner_email === currentUser?.email;

          return (
            <Card
              key={workspace.id}
              className={`relative overflow-hidden transition-all duration-200 ${
                isActive
                  ? 'ring-2 ring-blue-500 shadow-lg'
                  : 'hover:shadow-md'
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getWorkspaceColor(workspace.type)}`} />
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${getWorkspaceColor(workspace.type)} text-white`}>
                      {getWorkspaceIcon(workspace.type)}
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {workspace.name}
                        {workspace.is_default && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                        {isActive && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {workspace.type}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!isActive && (
                        <>
                          <DropdownMenuItem onClick={() => handleSetActiveWorkspace(workspace.id)}>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Set as Active
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {isOwner && (
                        <>
                          <DropdownMenuItem onClick={() => openInviteDialog(workspace)}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Invite Members
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openMembersDialog(workspace)}>
                            <Users className="w-4 h-4 mr-2" />
                            Manage Members
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                          </DropdownMenuItem>
                          {!workspace.is_default && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteWorkspace(workspace)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Workspace
                              </DropdownMenuItem>
                            </>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {workspace.description || "No description provided"}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{workspace.members?.length || 0} member{workspace.members?.length !== 1 ? 's' : ''}</span>
                  </div>
                  {isOwner && (
                    <Badge variant="secondary" className="text-xs">
                      Owner
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {availableWorkspaces.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Briefcase className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No workspaces found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first workspace to get started
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Workspace
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Workspace Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Set up a new workspace for your projects and team collaboration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Workspace Name *</Label>
              <Input
                id="name"
                placeholder="e.g., My Personal Projects"
                value={newWorkspace.name}
                onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this workspace for?"
                value={newWorkspace.description}
                onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="type">Workspace Type</Label>
              <Select
                value={newWorkspace.type}
                onValueChange={(value) => setNewWorkspace({ ...newWorkspace, type: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Personal - For individual projects
                    </div>
                  </SelectItem>
                  <SelectItem value="team">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Team - For collaborative work
                    </div>
                  </SelectItem>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Client - For client projects
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workspace
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Members Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Add a new member to {inviteWorkspace?.name || "this workspace"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address *</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInviteMember();
                    }
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                The user will be added to the workspace and can access all shared content.
              </p>
            </div>

            {/* Show current members */}
            {inviteWorkspace?.members && inviteWorkspace.members.length > 0 && (
              <div>
                <Label className="text-sm text-gray-600">Current Members ({inviteWorkspace.members.length})</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {inviteWorkspace.members.slice(0, 5).map((email) => (
                    <Badge key={email} variant="secondary" className="text-xs">
                      {email}
                      {email === inviteWorkspace.owner_email && (
                        <Star className="w-3 h-3 ml-1 text-yellow-500 fill-yellow-500" />
                      )}
                    </Badge>
                  ))}
                  {inviteWorkspace.members.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{inviteWorkspace.members.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteMember} disabled={inviting}>
              {inviting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Inviting...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Members</DialogTitle>
            <DialogDescription>
              View and manage members of {membersWorkspace?.name || "this workspace"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {membersWorkspace?.members?.length === 0 && (
              <p className="text-center text-gray-500 py-4">No members in this workspace</p>
            )}
            {membersWorkspace?.members?.map((email) => {
              const isOwner = email === membersWorkspace.owner_email;
              const isCurrentUser = email === currentUser?.email;

              return (
                <div
                  key={email}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                        {email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {email}
                        {isCurrentUser && <span className="text-gray-500 ml-1">(you)</span>}
                      </p>
                      {isOwner && (
                        <Badge variant="secondary" className="text-xs mt-0.5">
                          <Star className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500" />
                          Owner
                        </Badge>
                      )}
                    </div>
                  </div>

                  {!isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemoveMember(email)}
                      disabled={removingMember === email}
                    >
                      {removingMember === email ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserMinus className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setIsMembersDialogOpen(false);
                openInviteDialog(membersWorkspace);
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite More
            </Button>
            <Button onClick={() => setIsMembersDialogOpen(false)} className="w-full sm:w-auto">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}