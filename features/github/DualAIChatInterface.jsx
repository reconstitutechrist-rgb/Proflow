/**
 * DualAIChatInterface Component
 *
 * Split-view chat interface for dual AI collaboration.
 * Left: Gemini (Rapid Architect) - Blue theme
 * Right: Claude Opus 4.5 (Deep Thinker) - Orange theme
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  BrainCircuit,
  Send,
  RefreshCw,
  ArrowLeftRight,
  Sparkles,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import PromptTemplates, { getTemplateById, PROMPT_TEMPLATES } from './PromptTemplates';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDualAICollaboration, COLLABORATION_STATUS } from './useDualAICollaboration';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

/**
 * Message bubble component
 */
const MessageBubble = ({ message, type }) => {
  const isUser = message.role === 'user';
  const isSynthesis = message.type === 'synthesis';

  const bubbleStyles = {
    gemini: {
      user: 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100',
      assistant: 'bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800',
      synthesis:
        'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-purple-300 dark:border-purple-700',
    },
    claude: {
      user: 'bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100',
      assistant: 'bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800',
      synthesis:
        'bg-gradient-to-r from-orange-50 to-purple-50 dark:from-orange-900/20 dark:to-purple-900/20 border-2 border-purple-300 dark:border-purple-700',
    },
  };

  const styleKey = isSynthesis ? 'synthesis' : isUser ? 'user' : 'assistant';
  const style = bubbleStyles[type][styleKey];

  return (
    <div className={cn('mb-4', isUser ? 'flex justify-end' : '')}>
      <div className={cn('rounded-lg p-4 max-w-[95%]', style)}>
        {isSynthesis && (
          <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400">
            <ArrowLeftRight className="w-4 h-4" />
            <span className="text-xs font-medium">Cross-Pollination Response</span>
          </div>
        )}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

/**
 * Thinking indicator component
 */
const ThinkingIndicator = ({ label }) => (
  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg animate-pulse">
    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
    <span className="text-sm text-gray-500">{label}</span>
  </div>
);

/**
 * AI Panel Header component
 */
const AIPanelHeader = ({ type, isLoading }) => {
  const config = {
    gemini: {
      icon: Bot,
      iconClass: 'text-blue-500',
      name: 'Gemini 3 Pro',
      badge: 'Architect',
      badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    claude: {
      icon: Sparkles,
      iconClass: 'text-orange-500',
      name: 'Claude Opus 4.5',
      badge: 'Deep Thinker',
      badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    },
  };

  const { icon: Icon, iconClass, name, badge, badgeClass } = config[type];

  return (
    <div className="px-4 py-2 border-b flex items-center justify-between bg-white/50 dark:bg-gray-900/50">
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4', iconClass)} />
        <span className="text-xs font-medium">{name}</span>
        <Badge variant="outline" className={cn('text-[10px]', badgeClass)}>
          {badge}
        </Badge>
      </div>
      {isLoading && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
    </div>
  );
};

/**
 * Main DualAIChatInterface component
 */
const DualAIChatInterface = ({ repoFullName, contextFiles = [], onArtifactGenerated }) => {
  const [input, setInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('coding');
  const geminiScrollRef = useRef(null);
  const claudeScrollRef = useRef(null);
  const [securityAlerts, setSecurityAlerts] = useState([]);

  const {
    geminiMessages,
    claudeMessages,
    isGeminiLoading,
    isClaudeLoading,
    collaborationStatus,
    artifact,
    errors,
    startParallelThinking,
    synthesizeResponses,
    generateArtifact,
    resetSession,
    checkConfiguration,
    setTemplatePrompts,
  } = useDualAICollaboration();

  // Fetch security alerts if repo selected (Security Data Fusion - Rec #3)
  useEffect(() => {
    if (repoFullName) {
      const [owner, repo] = repoFullName.split('/');
      import('@/api/github').then(({ github }) => {
        github.listDependabotAlerts(owner, repo)
          .then(alerts => setSecurityAlerts(alerts))
          .catch(err => console.error('Failed to fetch security alerts:', err));
      });
    }
  }, [repoFullName]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (geminiScrollRef.current) {
      geminiScrollRef.current.scrollTop = geminiScrollRef.current.scrollHeight;
    }
  }, [geminiMessages]);

  useEffect(() => {
    if (claudeScrollRef.current) {
      claudeScrollRef.current.scrollTop = claudeScrollRef.current.scrollHeight;
    }
  }, [claudeMessages]);

  // Notify parent when artifact is generated
  useEffect(() => {
    if (artifact && onArtifactGenerated) {
      onArtifactGenerated(artifact);
    }
  }, [artifact, onArtifactGenerated]);

  // Update prompts when template changes
  const handleTemplateSelect = useCallback((templateId) => {
    setSelectedTemplate(templateId);
    const template = getTemplateById(templateId);
    setTemplatePrompts(template);
  }, [setTemplatePrompts]);

  const handleSend = () => {
    if (!input.trim()) return;
    const template = getTemplateById(selectedTemplate);
    startParallelThinking(input, contextFiles, template, { securityAlerts, repoFullName });
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const isAnyLoading = isGeminiLoading || isClaudeLoading;
  const canSynthesize =
    collaborationStatus === COLLABORATION_STATUS.REVIEW_READY && !isAnyLoading;
  const canGenerateArtifact =
    (collaborationStatus === COLLABORATION_STATUS.REVIEW_READY ||
      collaborationStatus === COLLABORATION_STATUS.ARTIFACT_READY) &&
    !isAnyLoading &&
    (geminiMessages.length > 0 || claudeMessages.length > 0);

  // Check configuration on mount
  const configIssues = checkConfiguration();

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden">
      {/* Top Control Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Dual-Expert Collaboration</h3>
            <p className="text-xs text-muted-foreground">
              Gemini 3 Pro x Claude Opus 4.5
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Synthesize Button */}
          {canSynthesize && (
            <Button
              onClick={synthesizeResponses}
              className="bg-purple-600 hover:bg-purple-700 animate-pulse"
              size="sm"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Synthesize & Cross-Critique
            </Button>
          )}

          {/* Generate Artifact Button */}
          {canGenerateArtifact && (
            <Button onClick={generateArtifact} variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Generate Document
            </Button>
          )}

          {/* Reset Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={resetSession}
            title="Reset session"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Prompt Templates */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Mode:</span>
          <PromptTemplates
            selectedTemplate={selectedTemplate}
            onSelectTemplate={handleTemplateSelect}
            disabled={isAnyLoading}
          />
        </div>
      </div>

      {/* Configuration Warning */}
      {configIssues.length > 0 && (
        <Alert variant="destructive" className="m-4 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {configIssues.join('. ')}. Please configure API keys in your .env file.
          </AlertDescription>
        </Alert>
      )}

      {/* Split Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* LEFT: Gemini */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex flex-col h-full bg-blue-50/30 dark:bg-blue-950/10">
              <AIPanelHeader type="gemini" isLoading={isGeminiLoading} />
              <ScrollArea className="flex-1 p-4" ref={geminiScrollRef}>
                {geminiMessages.length === 0 && !isGeminiLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
                    <Bot className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm">Gemini 3 Pro will provide architectural insights</p>
                    <p className="text-xs mt-1">Focus: Speed, Structure, Patterns</p>
                  </div>
                )}
                {geminiMessages.map((msg, idx) => (
                  <MessageBubble key={idx} message={msg} type="gemini" />
                ))}
                {isGeminiLoading && <ThinkingIndicator label="Architecting..." />}
                {errors.gemini && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.gemini}</AlertDescription>
                  </Alert>
                )}
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* RIGHT: Claude */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex flex-col h-full bg-orange-50/30 dark:bg-orange-950/10">
              <AIPanelHeader type="claude" isLoading={isClaudeLoading} />
              <ScrollArea className="flex-1 p-4" ref={claudeScrollRef}>
                {claudeMessages.length === 0 && !isClaudeLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
                    <Sparkles className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm">Claude will provide deep analysis</p>
                    <p className="text-xs mt-1">Focus: Edge Cases, Security, Logic</p>
                  </div>
                )}
                {claudeMessages.map((msg, idx) => (
                  <MessageBubble key={idx} message={msg} type="claude" />
                ))}
                {isClaudeLoading && <ThinkingIndicator label="Deep thinking..." />}
                {errors.claude && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.claude}</AlertDescription>
                  </Alert>
                )}
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-card">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your feature or issue... (Ctrl+Enter to send)"
            className="pr-12 min-h-[80px] resize-none"
            disabled={isAnyLoading || configIssues.length > 0}
          />
          <Button
            size="icon"
            className="absolute bottom-2 right-2"
            onClick={handleSend}
            disabled={!input.trim() || isAnyLoading || configIssues.length > 0}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Both AIs will respond simultaneously. Click "Synthesize" to cross-pollinate their insights.
        </p>
      </div>
    </div>
  );
};

export default DualAIChatInterface;
