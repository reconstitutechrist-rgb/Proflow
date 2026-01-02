import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/lib/utils';
import { AI_MODELS } from './debateOrchestrator';

/**
 * Single message in the debate chat
 * Shows AI model indicator, content, and copy functionality
 */
export function DebateMessage({ message, isLatest }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const model = AI_MODELS[message.role];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Card
      className={cn(
        'transition-all',
        isLatest && 'ring-2 ring-offset-2',
        message.role === 'analyst'
          ? 'border-l-4 border-l-blue-500'
          : 'border-l-4 border-l-purple-500',
        isLatest && (message.role === 'analyst' ? 'ring-blue-200' : 'ring-purple-200')
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Model Icon */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium',
                message.role === 'analyst' ? 'bg-blue-500' : 'bg-purple-500'
              )}
            >
              {model.icon}
            </div>

            {/* Model Name & Round */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-white">{model.name}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    message.role === 'analyst'
                      ? 'border-blue-200 text-blue-700'
                      : 'border-purple-200 text-purple-700'
                  )}
                >
                  {message.role === 'analyst' ? 'Analyst' : 'Critic'}
                </Badge>
              </div>
              <span className="text-xs text-gray-500">
                Round {message.round} • {formatTime(message.timestamp)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Content */}
        {expanded && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{message.content}</ReactMarkdown>
          </div>
        )}

        {!expanded && (
          <p className="text-sm text-gray-500 line-clamp-2">
            {message.content.substring(0, 150)}...
          </p>
        )}

        {/* Token Usage (optional, for debugging) */}
        {message.tokenUsage && (
          <div className="mt-2 text-xs text-gray-400 flex gap-2">
            <span>Tokens: {message.tokenUsage.totalTokens}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DebateMessage;
