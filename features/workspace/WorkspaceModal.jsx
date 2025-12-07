import { useState } from 'react';
import PropTypes from 'prop-types';
import { db } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Briefcase,
  Users,
  Building2,
  Plus,
  Settings,
  Trash2,
  UserPlus,
  UserMinus,
  Star,
  Loader2,
  Mail,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';

export default function WorkspaceModal({ open, onOpenChange }) {
  const { availableWorkspaces, currentWorkspace, currentUser, switchWorkspace, refreshWorkspaces } =
    useWorkspace();

  const [activeTab, setActiveTab] = useState('workspaces');
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    description: '',
    type: 'personal',
  });
  const [creating, setCreating] = useState(false);

  // Invite members state
  const [inviteWorkspace, setInviteWorkspace] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Manage members state
  const [membersWorkspace, setMembersWorkspace] = useState(null);
  const [removingMember, setRemovingMember] = useState(null);

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }

    if (!currentUser) {
      toast.error('User information not available');
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
          color: '#3B82F6',
          icon:
            newWorkspace.type === 'personal'
              ? 'user'
              : newWorkspace.type === 'team'
                ? 'users'
                : 'building',
        },
      });

      try {
        await db.entities.WorkspaceMember.create({
          workspace_id: createdWorkspace.id,
          user_email: currentUser.email,
          role: 'owner',
        });
      } catch (memberError) {
        console.warn('Could not add workspace member record:', memberError);
      }

      toast.success('Workspace created successfully');
      setIsCreateMode(false);
      setNewWorkspace({ name: '', description: '', type: 'personal' });
      await refreshWorkspaces();
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast.error('Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleSetActiveWorkspace = async (workspaceId) => {
    try {
      await switchWorkspace(workspaceId);
      toast.success('Switched workspace successfully');
    } catch (error) {
      console.error('Error setting active workspace:', error);
      toast.error('Failed to switch workspace');
    }
  };

  const handleDeleteWorkspace = async (workspace) => {
    if (workspace.is_default) {
      toast.error('Cannot delete your default personal workspace');
      return;
    }

    if (workspace.owner_email !== currentUser?.email) {
      toast.error('Only the workspace owner can delete it');
      return;
    }

    if (
      !confirm(`Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`)
    ) {
      return;
    }

    try {
      await db.entities.Workspace.delete(workspace.id);
      toast.success('Workspace deleted successfully');
      await refreshWorkspaces();
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast.error('Failed to delete workspace');
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!inviteWorkspace) {
      toast.error('No workspace selected');
      return;
    }

    const email = inviteEmail.trim().toLowerCase();

    if (inviteWorkspace.members?.includes(email)) {
      toast.error('This user is already a member of this workspace');
      return;
    }

    try {
      setInviting(true);
      const updatedMembers = [...(inviteWorkspace.members || []), email];

      await db.entities.Workspace.update(inviteWorkspace.id, {
        members: updatedMembers,
      });

      try {
        const users = await db.entities.User.list();
        const invitedUser = users.find((u) => u.email?.toLowerCase() === email);
        if (invitedUser) {
          await db.entities.WorkspaceMember.create({
            workspace_id: inviteWorkspace.id,
            user_email: invitedUser.email,
            role: 'member',
            invited_by: currentUser?.email,
          });
        }
      } catch (memberError) {
        console.warn('Could not add workspace member record:', memberError);
      }

      toast.success(`Invited ${email} to ${inviteWorkspace.name}`);
      setInviteEmail('');
      setInviteWorkspace(null);
      await refreshWorkspaces();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (email) => {
    if (!membersWorkspace) return;

    if (email === membersWorkspace.owner_email) {
      toast.error('Cannot remove the workspace owner');
      return;
    }

    try {
      setRemovingMember(email);
      const updatedMembers = (membersWorkspace.members || []).filter((m) => m !== email);

      await db.entities.Workspace.update(membersWorkspace.id, {
        members: updatedMembers,
      });

      setMembersWorkspace({
        ...membersWorkspace,
        members: updatedMembers,
      });

      toast.success(`Removed ${email} from the workspace`);
      await refreshWorkspaces();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    } finally {
      setRemovingMember(null);
    }
  };

  const getWorkspaceIcon = (type) => {
    switch (type) {
      case 'personal':
        return <Briefcase className="w-5 h-5" />;
      case 'team':
        return <Users className="w-5 h-5" />;
      case 'client':
        return <Building2 className="w-5 h-5" />;
      default:
        return <Briefcase className="w-5 h-5" />;
    }
  };

  const getWorkspaceColor = (type) => {
    switch (type) {
      case 'personal':
        return 'from-blue-500 to-indigo-600';
      case 'team':
        return 'from-green-500 to-emerald-600';
      case 'client':
        return 'from-purple-500 to-pink-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manage Workspaces
          </DialogTitle>
          <DialogDescription>
            Switch between workspaces, create new ones, or manage members
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
            <TabsTrigger value="invite">Invite</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          {/* Workspaces Tab */}
          <TabsContent value="workspaces" className="mt-4">
            {isCreateMode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Create New Workspace</h3>
                  <Button variant="ghost" size="sm" onClick={() => setIsCreateMode(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

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
                    onChange={(e) =>
                      setNewWorkspace({ ...newWorkspace, description: e.target.value })
                    }
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
                          Personal
                        </div>
                      </SelectItem>
                      <SelectItem value="team">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Team
                        </div>
                      </SelectItem>
                      <SelectItem value="client">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Client
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateMode(false)}>
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
                        Create
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-500">{availableWorkspaces.length} workspace(s)</p>
                  <Button size="sm" onClick={() => setIsCreateMode(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Workspace
                  </Button>
                </div>

                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {availableWorkspaces.map((workspace) => {
                      const isActive = currentWorkspace?.id === workspace.id;
                      // Case-insensitive owner check
                      const isOwner =
                        workspace.owner_email?.toLowerCase() ===
                          currentUser?.email?.toLowerCase() ||
                        (workspace.members?.[0]?.toLowerCase() ===
                          currentUser?.email?.toLowerCase() &&
                          !workspace.owner_email);

                      return (
                        <div
                          key={workspace.id}
                          className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                            isActive
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg bg-gradient-to-r ${getWorkspaceColor(workspace.type)} text-white`}
                            >
                              {getWorkspaceIcon(workspace.type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {workspace.name}
                                </p>
                                {workspace.is_default && (
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                )}
                                {isActive && (
                                  <Badge variant="secondary" className="text-xs">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {workspace.type} | {workspace.members?.length || 0} member(s)
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetActiveWorkspace(workspace.id)}
                              >
                                Switch
                              </Button>
                            )}
                            {isOwner && !workspace.is_default && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleDeleteWorkspace(workspace)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          {/* Invite Tab */}
          <TabsContent value="invite" className="mt-4 space-y-4">
            <div>
              <Label>Select Workspace</Label>
              <Select
                value={inviteWorkspace?.id || ''}
                onValueChange={(id) =>
                  setInviteWorkspace(availableWorkspaces.find((w) => w.id === id))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a workspace" />
                </SelectTrigger>
                <SelectContent>
                  {availableWorkspaces
                    .filter((w) => w.owner_email === currentUser?.email)
                    .map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {inviteWorkspace && (
              <>
                <div>
                  <Label htmlFor="invite-email">Email Address</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button onClick={handleInviteMember} disabled={inviting} className="w-full">
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

                {inviteWorkspace.members?.length > 0 && (
                  <div className="pt-4 border-t">
                    <Label className="text-sm text-gray-600">Current Members</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {inviteWorkspace.members.map((email) => (
                        <Badge key={email} variant="secondary">
                          {email}
                          {email === inviteWorkspace.owner_email && (
                            <Star className="w-3 h-3 ml-1 text-yellow-500 fill-yellow-500" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-4 space-y-4">
            <div>
              <Label>Select Workspace</Label>
              <Select
                value={membersWorkspace?.id || ''}
                onValueChange={(id) =>
                  setMembersWorkspace(availableWorkspaces.find((w) => w.id === id))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a workspace" />
                </SelectTrigger>
                <SelectContent>
                  {availableWorkspaces
                    .filter((w) => w.owner_email === currentUser?.email)
                    .map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name} ({workspace.members?.length || 0} members)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {membersWorkspace && (
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {membersWorkspace.members?.map((email) => {
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
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

WorkspaceModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
};
