import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Send,
  Brain,
  Sparkles,
  Eye,
  EyeOff,
  XCircle,
  Layers,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import MessageActions from "@/components/MessageActions";
import SuggestedQuestions from "@/components/SuggestedQuestions";
import { MEMORY_LIMITS } from "@/hooks/useAskAI";

export function AskAIChatArea({
  messages,
  currentUser,
  currentSession,
  sessionModified,
  inputMessage,
  setInputMessage,
  isProcessing,
  isProcessingEmbeddings,
  uploadedDocuments,
  excludedMessageCount,
  useRAG,
  messagesEndRef,
  toggleMessageInContext,
  handleSendMessage,
  handleSuggestedQuestion,
  setShowOnboardingTutorial,
  setShowSessionTemplates,
}) {
  const handleMessageEdit = (messageIndex) => {
    const message = messages[messageIndex];
    if (message.type === 'user') {
      setInputMessage(message.content);
    }
  };

  const handleMessageCopy = (message) => {
    navigator.clipboard.writeText(message.content);
  };

  const handleMessageRegenerate = (messageIndex) => {
    const message = messages[messageIndex];
    if (message.type === 'assistant' && messageIndex > 0) {
      const userMessage = messages[messageIndex - 1];
      if (userMessage && userMessage.type === 'user') {
        setInputMessage(userMessage.content);
      }
    }
  };

  const handleMessageDelete = (messageIndex) => {
    // This would need to be passed from parent or handled via context
    console.log('Delete message at index:', messageIndex);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Card className="flex-1 shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {currentSession ? (
                <div className="flex items-center gap-2">
                  <span>{currentSession.name}</span>
                  {sessionModified && (
                    <Badge variant="outline" className="text-amber-600 border-amber-600">
                      Modified
                    </Badge>
                  )}
                </div>
              ) : (
                "Conversation"
              )}
            </CardTitle>
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <Badge variant="secondary">
                  {messages.length} message{messages.length > 1 ? 's' : ''}
                </Badge>
              )}
              {excludedMessageCount > 0 && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {excludedMessageCount} excluded
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.length > 0 ? (
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.excludedFromContext ? 'opacity-50' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      : message.type === 'error'
                      ? 'bg-red-500'
                      : 'bg-gradient-to-br from-purple-500 to-pink-600'
                  }`}>
                    {message.type === 'user' ? (
                      <span className="text-white text-sm font-semibold">
                        {currentUser?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </span>
                    ) : message.type === 'error' ? (
                      <XCircle className="w-5 h-5 text-white" />
                    ) : (
                      <Brain className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {message.type === 'user' ? 'You' : message.type === 'error' ? 'Error' : 'AI Assistant'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleString()}
                      </p>
                      {message.ragMetadata?.usedRAG && (
                        <Badge variant="secondary" className={`text-xs ${
                          message.ragMetadata.usingRealEmbeddings ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''
                        }`}>
                          RAG: {message.ragMetadata.usingRealEmbeddings ? 'OpenAI' : 'Simulated'}
                          {message.ragMetadata.chunkTypes && message.ragMetadata.chunkTypes.length > 0 && ` (${message.ragMetadata.chunkTypes.join(', ')})`}
                        </Badge>
                      )}
                      {(message.type === 'user' || message.type === 'assistant') && (
                        <div className="flex items-center gap-2 ml-auto">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleMessageInContext(message.id)}
                            title={message.excludedFromContext ? "Include in context" : "Exclude from context"}
                          >
                            {message.excludedFromContext ? (
                              <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-gray-600" />
                            )}
                          </Button>
                          <MessageActions
                            message={message}
                            onEdit={() => handleMessageEdit(index)}
                            onCopy={() => handleMessageCopy(message)}
                            onRegenerate={() => handleMessageRegenerate(index)}
                            onDelete={() => handleMessageDelete(index)}
                          />
                        </div>
                      )}
                    </div>

                    <div className={`prose prose-sm dark:prose-invert max-w-none ${
                      message.type === 'user' ? 'text-gray-900 dark:text-gray-100' : ''
                    }`}>
                      {(message.type === 'assistant' || message.type === 'error') ? (
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Start a Conversation
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
                  Upload documents and ask questions to get intelligent answers powered by {useRAG ? 'advanced semantic chunking and OpenAI embeddings' : 'AI'}
                </p>
                <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 text-left mb-6">
                  <p>• Upload up to {MEMORY_LIMITS.MAX_DOCUMENTS} documents</p>
                  <p>• Chat for up to {MEMORY_LIMITS.MAX_MESSAGES} messages</p>
                  <p>• Automatic semantic chunking for better context</p>
                  <p>• Save and resume conversations anytime</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowOnboardingTutorial(true)}
                    className="rounded-xl"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Take a Tour
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => setShowSessionTemplates(true)}
                    className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Browse Templates
                  </Button>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length > 0 && uploadedDocuments.length > 0 && (
            <div className="px-4 pb-4">
              <SuggestedQuestions
                documents={uploadedDocuments}
                lastMessage={messages[messages.length - 1]}
                onSelectQuestion={handleSuggestedQuestion}
              />
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0" id="message-input">
          <div className="flex gap-3">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your question here... (Shift+Enter for new line)"
              className="resize-none rounded-xl"
              rows={3}
              disabled={isProcessing || isProcessingEmbeddings}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isProcessing || isProcessingEmbeddings || (!inputMessage.trim() && uploadedDocuments.filter(d => d.includedInContext !== false).length === 0)}
              className="px-6 bg-purple-600 hover:bg-purple-700 rounded-xl"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          {isProcessing && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              AI is thinking...
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default AskAIChatArea;
