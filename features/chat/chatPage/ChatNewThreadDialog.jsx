import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ChatNewThreadDialog({
  isThreadFormOpen,
  setIsThreadFormOpen,
  newThreadTopic,
  setNewThreadTopic,
  newThreadDescription,
  setNewThreadDescription,
  handleNewThreadSubmit,
  selectedContextId,
  currentProject,
  currentUser,
  currentWorkspaceId,
}) {
  return (
    <Dialog open={isThreadFormOpen} onOpenChange={setIsThreadFormOpen}>
      <DialogContent className="sm:max-w-[425px] rounded-lg shadow-lg border-0 bg-white/80 dark:bg-gray-900/80">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Start New Thread
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {selectedContextId === 'general'
              ? 'Create a new general workspace conversation thread.'
              : currentProject
                ? 'Create a new conversation thread for the selected project.'
                : 'Create a new conversation thread for the selected assignment.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleNewThreadSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="threadTopic" className="text-right text-gray-700 dark:text-gray-300">
                Topic
              </Label>
              <Input
                id="threadTopic"
                value={newThreadTopic}
                onChange={(e) => setNewThreadTopic(e.target.value)}
                className="col-span-3 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                placeholder="e.g., Q3 Marketing Campaign Brainstorm"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="threadDescription"
                className="text-right text-gray-700 dark:text-gray-300"
              >
                Description
              </Label>
              <Textarea
                id="threadDescription"
                value={newThreadDescription}
                onChange={(e) => setNewThreadDescription(e.target.value)}
                className="col-span-3 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                placeholder="Optional: Briefly describe the thread's purpose"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsThreadFormOpen(false)}
              className="rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newThreadTopic.trim() || !currentUser || !currentWorkspaceId}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={
                !newThreadTopic.trim()
                  ? 'Enter a topic to create thread'
                  : !currentUser
                    ? 'Log in to create thread'
                    : !currentWorkspaceId
                      ? 'Select a workspace to create thread'
                      : 'Create thread'
              }
            >
              Create Thread
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ChatNewThreadDialog;
