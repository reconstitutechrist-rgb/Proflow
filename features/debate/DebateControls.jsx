import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Play, Square, Copy, Save, ChevronDown, Loader2, Check, FolderOpen } from 'lucide-react';
import { db } from '@/api/db';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';

/**
 * Control buttons for the debate interface
 * Handles stop, continue, save to project, and copy actions
 */
export function DebateControls({
  status,
  currentRound,
  maxRounds = 5,
  onContinue,
  onStop,
  onSaveToProject,
  finalResponse,
}) {
  const { currentWorkspaceId } = useWorkspace();
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load projects for save dropdown
  const loadProjects = async () => {
    if (!currentWorkspaceId || projects.length > 0) return;

    setLoadingProjects(true);
    try {
      const projectList = await db.entities.Project.list({
        workspace_id: currentWorkspaceId,
      });
      setProjects(projectList || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleCopy = async () => {
    if (!finalResponse) {
      toast.error('No response to copy yet');
      return;
    }
    await navigator.clipboard.writeText(finalResponse);
    setCopied(true);
    toast.success('Response copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!selectedProject || !finalResponse) return;

    setSaving(true);
    try {
      await onSaveToProject(selectedProject.id, finalResponse);
      toast.success(`Saved to "${selectedProject.name}"`);
      setShowSaveDialog(false);
      setSelectedProject(null);
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isDebating = status === 'debating';
  const isPaused = status === 'paused';
  const isFinished = status === 'consensus' || status === 'stopped' || status === 'max_rounds';
  const canContinue = isPaused && currentRound < maxRounds;

  return (
    <div className="flex items-center gap-2 p-4 border-t bg-gray-50 dark:bg-gray-800/50">
      {/* Status Indicator */}
      <div className="flex-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {status === 'debating' && (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Round {currentRound} in progress...
            </span>
          )}
          {status === 'paused' && `Round ${currentRound} complete`}
          {status === 'consensus' && 'Consensus reached'}
          {status === 'stopped' && 'Debate stopped'}
          {status === 'max_rounds' && `Max rounds (${maxRounds}) reached`}
          {status === 'idle' && 'Ready to start'}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Continue / Stop Button */}
        {isDebating ? (
          <Button variant="destructive" size="sm" onClick={onStop}>
            <Square className="w-4 h-4 mr-2" />
            Stop Debate
          </Button>
        ) : canContinue ? (
          <Button size="sm" onClick={onContinue}>
            <Play className="w-4 h-4 mr-2" />
            Continue ({maxRounds - currentRound} left)
          </Button>
        ) : null}

        {/* Copy Response */}
        {(isFinished || isPaused) && (
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Response
              </>
            )}
          </Button>
        )}

        {/* Save to Project */}
        {(isFinished || isPaused) && (
          <DropdownMenu onOpenChange={(open) => open && loadProjects()}>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Save className="w-4 h-4 mr-2" />
                Save to Project
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {loadingProjects ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : projects.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No projects found</div>
              ) : (
                projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project);
                      setShowSaveDialog(true);
                    }}
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    {project.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to Project</DialogTitle>
            <DialogDescription>
              Save this AI debate result to "{selectedProject?.name}"? A note will be created with
              the analysis.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DebateControls;
