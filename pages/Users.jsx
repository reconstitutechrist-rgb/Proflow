import { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { db } from '@/api/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
  Search,
  Users as UsersIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  UserPlus,
  Shield,
  Building2,
  Globe,
  Loader2,
  Clock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('workspace'); // "workspace" or "all"

  // Invite dialog state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const {
    currentWorkspace,
    currentWorkspaceId,
    refreshWorkspaces,
    loading: workspaceLoading,
  } = useWorkspace();

  useEffect(() => {
    if (!workspaceLoading) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceLoading]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Filter assignments by workspace - users are global but we only show workspace members
      const [usersData, assignmentsData, userData] = await Promise.all([
        User.list(),
        currentWorkspaceId
          ? db.entities.Assignment.filter({ workspace_id: currentWorkspaceId })
          : [],
        db.auth.me(),
      ]);
      setUsers(usersData);
      setAssignments(assignmentsData);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle inviting a member to the workspace
  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!currentWorkspace) {
      toast.error('No workspace selected');
      return;
    }

    const email = inviteEmail.trim().toLowerCase();

    // Check if already a member
    if (currentWorkspace.members?.some((m) => m.toLowerCase() === email)) {
      toast.error('This user is already a member of this workspace');
      return;
    }

    try {
      setInviting(true);

      // Add the email to the members array
      const updatedMembers = [...(currentWorkspace.members || []), email];

      await db.entities.Workspace.update(currentWorkspace.id, {
        members: updatedMembers,
      });

      // Try to add to workspace_members table if user exists
      try {
        const invitedUser = users.find((u) => u.email?.toLowerCase() === email);
        if (invitedUser) {
          await db.entities.WorkspaceMember.create({
            workspace_id: currentWorkspace.id,
            user_email: invitedUser.email,
            role: 'member',
            invited_by: currentUser?.email,
          });
        }
      } catch (memberError) {
        console.warn('Could not add workspace member record:', memberError);
      }

      toast.success(`Invited ${email} to ${currentWorkspace.name}`);
      setIsInviteDialogOpen(false);
      setInviteEmail('');

      // Refresh workspaces and reload data
      await refreshWorkspaces();
      await loadData();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  // Normalize user role - handle null, undefined, or unexpected values
  // Also considers workspace ownership - workspace owner is always admin for their workspace
  const normalizeUserRole = (role, userEmail) => {
    // If user is the workspace owner, they are admin for this workspace
    if (viewMode === 'workspace' && currentWorkspace?.owner_email === userEmail) {
      return 'admin';
    }
    if (!role) return 'team_member';
    const validRoles = ['admin', 'project_manager', 'team_member', 'client'];
    return validRoles.includes(role) ? role : 'team_member';
  };

  const getRoleColor = (role, userEmail) => {
    const normalizedRole = normalizeUserRole(role, userEmail);
    switch (normalizedRole) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'project_manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'team_member':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'client':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getRoleLabel = (role, userEmail) => {
    const normalizedRole = normalizeUserRole(role, userEmail);
    return normalizedRole.replace('_', ' ');
  };

  const getUserAssignments = (userEmail) => {
    return assignments.filter(
      (assignment) =>
        assignment.assignment_manager === userEmail ||
        assignment.team_members?.includes(userEmail) ||
        assignment.client_contact === userEmail
    );
  };

  // Filter users based on workspace membership
  const workspaceMembers = users.filter((user) =>
    currentWorkspace?.members?.some((m) => m.toLowerCase() === user.email?.toLowerCase())
  );

  // Check if owner is in the users list
  const userEmails = users.map((u) => u.email?.toLowerCase());
  const currentUserEmail = currentUser?.email?.toLowerCase();
  const ownerEmail = currentWorkspace?.owner_email?.toLowerCase();
  const ownerInUsersList = ownerEmail && userEmails.includes(ownerEmail);

  // If owner is not in users list but is the current user, create a synthetic user entry
  const syntheticOwner =
    !ownerInUsersList && ownerEmail === currentUserEmail && currentUser
      ? [
          {
            id: 'current-user',
            email: currentUser.email,
            full_name: currentUser.full_name || 'Workspace Owner',
            user_role: 'admin',
            _isSynthetic: true,
          },
        ]
      : [];

  // Combine real workspace members with synthetic owner if needed
  const allWorkspaceMembers = [...workspaceMembers, ...syntheticOwner];

  // Find pending invites - emails in workspace.members that don't have a user account
  // Exclude the workspace owner and the current user (they're not "pending")
  const pendingInvites = (currentWorkspace?.members || []).filter((email) => {
    const lowerEmail = email?.toLowerCase();
    // Not pending if: has a user account, is the owner, or is the current user
    return (
      !userEmails.includes(lowerEmail) &&
      lowerEmail !== ownerEmail &&
      lowerEmail !== currentUserEmail
    );
  });

  // Determine which user list to use based on view mode
  const displayUsers = viewMode === 'workspace' ? allWorkspaceMembers : users;

  const filteredUsers = displayUsers.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.job_title?.toLowerCase().includes(searchQuery.toLowerCase());

    const userRole = normalizeUserRole(user.user_role, user.email);
    const matchesRole = selectedRole === 'all' || userRole === selectedRole;

    return matchesSearch && matchesRole;
  });

  const canInviteUsers = true;

  // Count users by role for both views
  const countUsersByRole = (userList) => ({
    admin: userList.filter((u) => normalizeUserRole(u.user_role, u.email) === 'admin').length,
    pm: userList.filter((u) => normalizeUserRole(u.user_role, u.email) === 'project_manager')
      .length,
    team: userList.filter((u) => normalizeUserRole(u.user_role, u.email) === 'team_member').length,
    client: userList.filter((u) => normalizeUserRole(u.user_role, u.email) === 'client').length,
  });

  const workspaceCounts = countUsersByRole(allWorkspaceMembers);
  const allCounts = countUsersByRole(users);

  const currentCounts = viewMode === 'workspace' ? workspaceCounts : allCounts;

  const adminCount = currentCounts.admin;
  const pmCount = currentCounts.pm;
  const teamCount = currentCounts.team;
  const clientCount = currentCounts.client;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Directory</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              {viewMode === 'workspace'
                ? `Viewing ${currentWorkspace?.name || 'current workspace'} members`
                : 'Viewing all users across workspaces'}
            </p>
          </div>
          {canInviteUsers && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 shrink-0"
              onClick={() => setIsInviteDialogOpen(true)}
            >
              <UserPlus className="w-4 h-4" />
              Invite User
            </Button>
          )}
        </div>

        {/* Admin Setup Alert - only show if no admin AND no workspace owner in the member list */}
        {adminCount === 0 && viewMode === 'workspace' && !currentWorkspace?.owner_email && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">
            <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>No administrator assigned yet.</strong> The workspace owner is automatically
              assigned as admin. If you need to set a different admin, go to the Supabase Dashboard
              → Table Editor → users, and set the{' '}
              <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/50 rounded text-xs">
                user_role
              </code>{' '}
              field to{' '}
              <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/50 rounded text-xs">
                admin
              </code>
              .
            </AlertDescription>
          </Alert>
        )}

        {/* Workspace/All Users Toggle */}
        <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="workspace" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Workspace Members ({allWorkspaceMembers.length + pendingInvites.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              All Users ({users.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name, email, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedRole === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRole('all')}
            >
              All ({displayUsers.length})
            </Button>
            <Button
              variant={selectedRole === 'admin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRole('admin')}
            >
              Admin ({adminCount})
            </Button>
            <Button
              variant={selectedRole === 'project_manager' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRole('project_manager')}
            >
              Project Managers ({pmCount})
            </Button>
            <Button
              variant={selectedRole === 'team_member' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRole('team_member')}
            >
              Team Members ({teamCount})
            </Button>
            <Button
              variant={selectedRole === 'client' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRole('client')}
            >
              Clients ({clientCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse h-48"
            ></div>
          ))
        ) : filteredUsers.length > 0 || (viewMode === 'workspace' && pendingInvites.length > 0) ? (
          <>
            {filteredUsers.map((user) => {
              const userAssignments = getUserAssignments(user.email);
              const isWorkspaceMember = currentWorkspace?.members?.includes(user.email);
              const isWorkspaceOwner = currentWorkspace?.owner_email === user.email;

              return (
                <Card
                  key={user.id}
                  className="border-0 shadow-md hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                          {user.full_name
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('') || user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {user.full_name || 'No Name'}
                            {isWorkspaceOwner && viewMode === 'workspace' && (
                              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                (Owner)
                              </span>
                            )}
                          </h3>
                          {viewMode === 'all' && isWorkspaceMember && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800 shrink-0"
                            >
                              <Building2 className="w-3 h-3 mr-1" />
                              In Workspace
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user.job_title || 'No title'}
                        </p>
                        <Badge
                          className={`${getRoleColor(user.user_role, user.email)} mt-2`}
                          variant="secondary"
                        >
                          {getRoleLabel(user.user_role, user.email)}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      {user.department && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span>{user.department}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {userAssignments.length} active assignment
                          {userAssignments.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {user.bio && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {user.bio}
                        </p>
                      </div>
                    )}

                    {user.last_active && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Last active: {new Date(user.last_active).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Pending Invites - show only in workspace view */}
            {viewMode === 'workspace' && pendingInvites.length > 0 && (
              <>
                {pendingInvites.map((email) => (
                  <Card
                    key={email}
                    className="shadow-md border-dashed border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-linear-to-r from-gray-400 to-gray-500 text-white">
                            {email?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-gray-600 dark:text-gray-300 truncate">
                              Pending Invite
                            </h3>
                            <Badge
                              variant="outline"
                              className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800 shrink-0"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            Awaiting account creation
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="w-4 h-4 shrink-0" />
                          <span className="truncate">{email}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          This user has been invited but has not created an account yet.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </>
        ) : (
          <div className="col-span-full text-center py-12">
            <UsersIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery
                ? 'No users found'
                : viewMode === 'workspace'
                  ? 'No workspace members'
                  : 'No team members'}
            </h3>
            <p className="text-base text-gray-500 dark:text-gray-400">
              {searchQuery
                ? 'Try adjusting your search terms or filters'
                : viewMode === 'workspace'
                  ? 'Invite members to your workspace to get started'
                  : 'Invite team members to get started'}
            </p>
          </div>
        )}
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{adminCount}</div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
              Administrators
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pmCount}</div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
              Project Managers
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{teamCount}</div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
              Team Members
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {clientCount}
            </div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Clients</div>
          </CardContent>
        </Card>
      </div>

      {/* Invite User Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Add a new member to {currentWorkspace?.name || 'this workspace'}
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
            {currentWorkspace?.members && currentWorkspace.members.length > 0 && (
              <div>
                <Label className="text-sm text-gray-600">
                  Current Members ({currentWorkspace.members.length})
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentWorkspace.members.slice(0, 5).map((email) => (
                    <Badge key={email} variant="secondary" className="text-xs">
                      {email}
                      {email === currentWorkspace.owner_email && (
                        <span className="ml-1 text-yellow-600">★</span>
                      )}
                    </Badge>
                  ))}
                  {currentWorkspace.members.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{currentWorkspace.members.length - 5} more
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
    </div>
  );
}
