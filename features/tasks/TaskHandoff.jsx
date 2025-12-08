import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  ArrowRightLeft,
  User,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { db } from '@/api/db';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';

export default function TaskHandoff({ task, currentUser, users = [], onClose, onSuccess }) {
  const [handoffNotes, setHandoffNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');

  const { currentWorkspaceId } = useWorkspace();

  // Filter out current user from available partners
  const availablePartners = users.filter(
    (u) => u.email !== currentUser?.email && u.email !== task?.assigned_to
  );

  // Get the selected partner object
  const selectedPartner = availablePartners.find((u) => u.email === selectedPartnerId);

  // Auto-select if only one partner available
  useEffect(() => {
    if (availablePartners.length === 1 && !selectedPartnerId) {
      setSelectedPartnerId(availablePartners[0].email);
    }
  }, [availablePartners, selectedPartnerId]);

  const handleHandoff = async () => {
    if (!task || !selectedPartner) {
      toast.error('Please select a partner to hand off to');
      return;
    }

    try {
      setIsSubmitting(true);

      // Build handoff history
      const handoffHistory = task.handoff_history || [];
      const newHandoff = {
        from_user: currentUser.email,
        from_user_name: currentUser.full_name,
        to_user: selectedPartner.email,
        to_user_name: selectedPartner.full_name,
        notes: handoffNotes,
        timestamp: new Date().toISOString(),
        previous_status: task.status,
      };
      handoffHistory.push(newHandoff);

      // Update the task
      await db.entities.Task.update(task.id, {
        assigned_to: selectedPartner.email,
        handoff_history: handoffHistory,
        handoff_notes: handoffNotes,
        last_handoff_date: new Date().toISOString(),
        status: task.status === 'completed' ? 'in_progress' : task.status,
      });

      // Create follow-up task if requested
      if (createFollowUp && followUpTitle.trim()) {
        await db.entities.Task.create({
          workspace_id: currentWorkspaceId,
          title: followUpTitle,
          description: `Follow-up from: ${task.title}\n\nOriginal handoff notes: ${handoffNotes}`,
          assigned_to: currentUser.email,
          assignment_id: task.assignment_id,
          priority: task.priority,
          status: 'todo',
          related_task_id: task.id,
          created_by: currentUser.email,
        });
      }

      // Create a message in the relevant thread if available
      if (task.thread_id) {
        try {
          await db.entities.Message.create({
            workspace_id: currentWorkspaceId,
            thread_id: task.thread_id,
            author_email: currentUser.email,
            author_name: currentUser.full_name,
            content: `📋 **Task Handoff**: "${
              task.title
            }" has been handed off to ${selectedPartner.full_name}.\n\n${
              handoffNotes ? `**Notes:** ${handoffNotes}` : ''
            }`,
            message_type: 'system',
          });
        } catch (msgError) {
          console.error('Error creating handoff message:', msgError);
        }
      }

      toast.success(`Task handed off to ${selectedPartner.full_name}`);

      if (onSuccess) {
        onSuccess();
      }

      resetForm();
    } catch (error) {
      console.error('Error handing off task:', error);
      toast.error('Failed to hand off task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setHandoffNotes('');
    setCreateFollowUp(false);
    setFollowUpTitle('');
    setSelectedPartnerId('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!task) return null;

  const hasExistingHandoffs = task.handoff_history && task.handoff_history.length > 0;

  return (
    <Dialog open={!!task} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
            Hand Off Task
          </DialogTitle>
          <DialogDescription>
            Transfer this task to a team member with context and notes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs capitalize">
                {task.status?.replace('_', ' ')}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs capitalize ${
                  task.priority === 'urgent'
                    ? 'border-red-500 text-red-600'
                    : task.priority === 'high'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-gray-300'
                }`}
              >
                {task.priority}
              </Badge>
            </div>
          </div>

          {/* Partner Selection */}
          {availablePartners.length > 0 ? (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Hand off to
              </label>
              {availablePartners.length === 1 ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {availablePartners[0].full_name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase() || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {availablePartners[0].full_name}
                    </p>
                    <p className="text-xs text-gray-500">{availablePartners[0].email}</p>
                  </div>
                </div>
              ) : (
                <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePartners.map((partner) => (
                      <SelectItem key={partner.email} value={partner.email}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {partner.full_name
                                ?.split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{partner.full_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No other team members available for handoff
              </p>
            </div>
          )}

          {/* Handoff Direction Visual */}
          {selectedPartner && (
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="text-center">
                <Avatar className="h-10 w-10 mx-auto mb-1">
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {currentUser?.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() || 'Y'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs text-gray-600">You</p>
              </div>
              <div className="flex flex-col items-center">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                <p className="text-xs text-indigo-600 mt-1">Handing off</p>
              </div>
              <div className="text-center">
                <Avatar className="h-10 w-10 mx-auto mb-1">
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {selectedPartner?.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() || 'P'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs text-gray-600">{selectedPartner?.full_name?.split(' ')[0]}</p>
              </div>
            </div>
          )}

          {/* Handoff Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Handoff Notes
            </label>
            <Textarea
              value={handoffNotes}
              onChange={(e) => setHandoffNotes(e.target.value)}
              placeholder="Add context for your partner... What's the current status? What needs to be done next? Any blockers?"
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Create Follow-up Task */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createFollowUp}
                onChange={(e) => setCreateFollowUp(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Create a follow-up task for myself
              </span>
            </label>

            {createFollowUp && (
              <input
                type="text"
                value={followUpTitle}
                onChange={(e) => setFollowUpTitle(e.target.value)}
                placeholder="Follow-up task title..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>

          {/* Previous Handoffs */}
          {hasExistingHandoffs && (
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Handoff History
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {task.handoff_history.map((handoff, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs"
                  >
                    <Clock className="w-3 h-3 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-700 dark:text-gray-300">
                        {handoff.from_user_name || handoff.from_user} →{' '}
                        {handoff.to_user_name || handoff.to_user}
                      </p>
                      {handoff.notes && (
                        <p className="text-gray-500 mt-1 italic">"{handoff.notes}"</p>
                      )}
                      <p className="text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(handoff.timestamp), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleHandoff}
            disabled={isSubmitting || !selectedPartner}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Handing Off...
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Hand Off Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
