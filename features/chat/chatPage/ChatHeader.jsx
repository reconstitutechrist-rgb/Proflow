import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ChatSummaryButton from "@/features/chat/ChatSummaryButton";

export function ChatHeader({
  currentThread,
  currentThreadMessages,
  currentAssignment,
  setIsThreadFormOpen,
}) {
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-6 rounded-lg border border-indigo-100 dark:border-indigo-900/50 shadow-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            Team Chat
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Collaborate and communicate with your team
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentThread && (
            <ChatSummaryButton
              messages={currentThreadMessages}
              threadTopic={currentThread.topic}
              assignment_id={currentThread.assignment_id || currentAssignment?.id}
              project_id={currentThread.project_id}
              className="rounded-lg shadow-sm"
            />
          )}
          <Button
            variant="outline"
            onClick={() => setIsThreadFormOpen(true)}
            className="rounded-lg border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Thread
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChatHeader;
