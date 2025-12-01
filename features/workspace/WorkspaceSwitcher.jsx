import React, { useState } from 'react';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  ChevronDown, 
  CheckCircle2, 
  Briefcase, 
  Users, 
  Building2,
  Plus,
  Settings,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router';
import { createPageUrl } from '@/lib/utils';
import { toast } from 'sonner';

export default function WorkspaceSwitcher() {
  const { currentWorkspace, availableWorkspaces, switchWorkspace, loading } = useWorkspace();
  const [switching, setSwitching] = useState(false);

  const getWorkspaceIcon = (type) => {
    switch (type) {
      case 'personal':
        return <Briefcase className="w-4 h-4" />;
      case 'team':
        return <Users className="w-4 h-4" />;
      case 'client':
        return <Building2 className="w-4 h-4" />;
      default:
        return <Briefcase className="w-4 h-4" />;
    }
  };

  const getWorkspaceColor = (type) => {
    switch (type) {
      case 'personal':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30';
      case 'team':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30';
      case 'client':
        return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/30';
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950/30';
    }
  };

  const handleWorkspaceSwitch = async (workspaceId) => {
    if (workspaceId === currentWorkspace?.id) return;

    try {
      setSwitching(true);
      await switchWorkspace(workspaceId);
    } catch (err) {
      console.error("Error switching workspace:", err);
    } finally {
      setSwitching(false);
    }
  };

  if (loading || !currentWorkspace) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse">
        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
        <div className="hidden md:block">
          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
          <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-3 px-3 py-2 h-auto border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-all"
          disabled={switching}
          title={currentWorkspace.name}
        >
          <div className={`p-2 rounded-lg ${getWorkspaceColor(currentWorkspace.type)}`}>
            {switching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              getWorkspaceIcon(currentWorkspace.type)
            )}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight truncate max-w-[150px]">
              {currentWorkspace.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {currentWorkspace.type} workspace
            </p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wide">
          Your Workspaces
        </DropdownMenuLabel>
        
        {availableWorkspaces.map((workspace) => {
          const isActive = workspace.id === currentWorkspace.id;
          return (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => handleWorkspaceSwitch(workspace.id)}
              className={`flex items-center gap-3 p-3 cursor-pointer ${
                isActive ? 'bg-blue-50 dark:bg-blue-950/30' : ''
              }`}
              disabled={switching}
            >
              <div className={`p-2 rounded-lg flex-shrink-0 ${getWorkspaceColor(workspace.type)}`}>
                {getWorkspaceIcon(workspace.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={workspace.name}>
                    {workspace.name}
                  </p>
                  {isActive && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {workspace.type}
                  {workspace.is_default && ' • Default'}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            to={createPageUrl('Workspaces')}
            className="flex items-center gap-2 p-3 cursor-pointer text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Create New Workspace</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            to={createPageUrl('Workspaces')}
            className="flex items-center gap-2 p-3 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Manage Workspaces</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
