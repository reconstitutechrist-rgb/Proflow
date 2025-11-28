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
  Star,
  CheckCircle2,
  Loader2
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
      await db.entities.Workspace.create({
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
                          <DropdownMenuItem>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Invite Members
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
    </div>
  );
}