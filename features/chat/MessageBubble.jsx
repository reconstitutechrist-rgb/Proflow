import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Bot, User, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Status configuration for tool calls
  const getToolCallStatus = (status) => {
    switch (status) {
      case 'completed':
      case 'success':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' };
      case 'running':
      case 'in_progress':
      case 'pending':
        return { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50', spin: true };
      case 'failed':
      case 'error':
        return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
            <Bot className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={cn("max-w-[85%] space-y-2", isUser && "flex flex-col items-end")}>
        {/* Main Message */}
        {message.content && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 shadow-sm",
              isUser
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
            )}
          >
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    code: ({ inline, children }) =>
                      inline ? (
                        <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono">
                          {children}
                        </code>
                      ) : (
                        <code className="block p-2 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono overflow-x-auto">
                          {children}
                        </code>
                      ),
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Tool Calls (for assistant messages) */}
        {isAssistant && message.tool_calls && message.tool_calls.length > 0 && (
          <div className="space-y-1 w-full">
            {message.tool_calls.map((toolCall, idx) => {
              const statusConfig = getToolCallStatus(toolCall.status);
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={idx}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-xs flex items-center gap-2",
                    statusConfig.bg,
                    "border-gray-200 dark:border-gray-700"
                  )}
                >
                  <StatusIcon
                    className={cn("w-3 h-3", statusConfig.color, statusConfig.spin && "animate-spin")}
                  />
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {toolCall.name || 'Processing...'}
                  </span>
                  {toolCall.status && (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {toolCall.status}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Timestamp */}
        {message.timestamp && (
          <p className="text-[10px] text-gray-500 dark:text-gray-400 px-2">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-md">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}