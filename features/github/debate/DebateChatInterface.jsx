import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Github,
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { useDebateSession } from './useDebateSession';
import { DebateMessage } from './DebateMessage';
import { DebateControls } from './DebateControls';
import { ConsensusIndicator } from './ConsensusIndicator';

/**
 * Main chat interface for the dual-AI debate system
 */
export function DebateChatInterface({ repoFullName, onBack }) {
  const {
    session,
    messages,
    context,
    status,
    error,
    currentRound,
    consensusScore,
    startSession,
    runNextRound,
    stopDebate,
    continueDebate,
    getFinalResponse,
    saveToProject,
    AI_MODELS,
  } = useDebateSession();

  const [query, setQuery] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [finalResponse, setFinalResponse] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate final response when debate ends
  useEffect(() => {
    if (status === 'consensus' || status === 'stopped' || status === 'max_rounds') {
      getFinalResponse().then((response) => {
        if (response) setFinalResponse(response);
      });
    }
  }, [status, getFinalResponse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || !repoFullName) return;

    setIsStarting(true);
    try {
      await startSession(repoFullName, query.trim());
      setQuery('');
      // Auto-start first round
      setTimeout(() => runNextRound(), 500);
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <CardHeader className="border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            <span>{repoFullName}</span>
            {session && (
              <Badge variant="secondary" className="ml-2">
                Round {currentRound}
              </Badge>
            )}
          </CardTitle>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Back to Repositories
            </Button>
          )}
        </div>

        {/* AI Models Info */}
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            {AI_MODELS.analyst.name} (Analyst)
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            {AI_MODELS.critic.name} (Critic)
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* Empty State */}
            {messages.length === 0 && status === 'idle' && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Start a Dual-AI Debate
                </h3>
                <p className="text-gray-500 max-w-md mb-4">
                  Ask a question about this repository. Two AI models will analyze it, debate, and
                  reach a consensus.
                </p>
                <div className="flex gap-2 text-xs text-gray-400">
                  <Badge variant="outline">🔵 GPT-5.2 analyzes first</Badge>
                  <Badge variant="outline">🟣 Claude critiques</Badge>
                  <Badge variant="outline">→ They iterate to consensus</Badge>
                </div>
              </div>
            )}

            {/* User Query Display */}
            {session && context?.originalQuery && (
              <Card className="bg-gray-50 dark:bg-gray-800/50 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm">
                      👤
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        Your Question
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{context.originalQuery}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Consensus Indicator (during debate) */}
            {messages.length > 0 && (
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                <CardContent className="p-4">
                  <ConsensusIndicator
                    score={consensusScore}
                    agreedPoints={context?.agreedPoints || []}
                    contestedPoints={context?.contestedPoints || []}
                  />
                </CardContent>
              </Card>
            )}

            {/* Messages */}
            {messages.map((message, index) => (
              <DebateMessage
                key={message.id}
                message={message}
                isLatest={index === messages.length - 1}
              />
            ))}

            {/* Loading Indicator */}
            {status === 'debating' && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-500">AI is thinking...</span>
              </div>
            )}

            {/* Final Response */}
            {finalResponse &&
              (status === 'consensus' || status === 'stopped' || status === 'max_rounds') && (
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800 dark:text-green-200">
                        {status === 'consensus' ? 'Consensus Reached' : 'Final Analysis'}
                      </span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
                      {finalResponse}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Controls (during debate) */}
      {session && (
        <DebateControls
          status={status}
          currentRound={currentRound}
          maxRounds={5}
          onContinue={continueDebate}
          onStop={stopDebate}
          onSaveToProject={saveToProject}
          finalResponse={finalResponse}
        />
      )}

      {/* Input Area (before debate starts) */}
      {!session && (
        <div className="border-t p-4 bg-gray-50 dark:bg-gray-800/50">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this repository... (e.g., 'What are the main patterns used?' or 'How can I improve the code quality?')"
              className="resize-none"
              rows={3}
              disabled={isStarting}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Shift+Enter for new line • Enter to submit
              </span>
              <Button
                type="submit"
                disabled={!query.trim() || isStarting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Start Debate
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* New Question Button (after debate ends) */}
      {(status === 'consensus' || status === 'stopped' || status === 'max_rounds') && (
        <div className="border-t p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              setFinalResponse(null);
              window.location.reload(); // Simple reset for now
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Ask New Question
          </Button>
        </div>
      )}
    </Card>
  );
}

export default DebateChatInterface;
