import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare } from 'lucide-react';

export default function ConversationHistory() {
  return (
    <ScrollArea className="flex-1">
      <div className="text-center py-12 px-4">
        <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Conversation history</p>
        <p className="text-sm text-gray-400 mt-1">This feature is coming soon</p>
      </div>
    </ScrollArea>
  );
}
