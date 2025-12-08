import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Archive, MessageCircle } from 'lucide-react';

export default function ArchiveConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  detectedPhrase,
}) {
  const handleKeepChatting = () => {
    onOpenChange(false);
  };

  const handleArchive = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-orange-500" />
            Archive this chat?
          </DialogTitle>
          <DialogDescription className="pt-2">
            {detectedPhrase?.phrase ? (
              <>
                It looks like you're wrapping up the conversation
                {detectedPhrase.matchType === 'exact' ? (
                  <span> ("{detectedPhrase.phrase}")</span>
                ) : (
                  <span> (detected closing phrase)</span>
                )}
                . Would you like to archive this chat?
              </>
            ) : (
              <>
                Would you like to archive this chat? You can access archived chats later from the
                chat settings.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
          <p className="font-medium mb-1">What happens when you archive:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>The chat will be moved to your archives</li>
            <li>Messages will be preserved</li>
            <li>You can restore it anytime</li>
          </ul>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleKeepChatting}
            className="flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Keep Chatting
          </Button>
          <Button
            onClick={handleArchive}
            className="bg-orange-500 hover:bg-orange-600 flex items-center gap-2"
          >
            <Archive className="w-4 h-4" />
            Archive Chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
