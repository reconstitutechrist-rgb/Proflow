
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Bot, User, Sparkles, FileText, Lightbulb, Wand2, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function ConversationalAssistant({
  content,
  title,
  description,
  selectedAssignment,
  selectedTask,
  assignments,
  tasks,
  onInsertContent,
  quillRef,
  referenceDocuments // Add this new prop
}) {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI writing assistant. I can help you:\n\n- Generate new content from templates\n- Brainstorm ideas and outlines\n- Write sections of your document\n- Refine and improve existing text\n\nWhat would you like help with today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const getSelectedText = () => {
    if (quillRef?.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      if (range && range.length > 0) {
        return editor.getText(range.index, range.length);
      }
    }
    return null;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const assignmentContext = selectedAssignment
        ? assignments.find(a => a.id === selectedAssignment)
        : null;

      const taskContext = selectedTask
        ? tasks.find(t => t.id === selectedTask)
        : null;

      const selectedText = getSelectedText();
      const strippedContent = content ? content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

      let systemPrompt = `You are an expert writing assistant helping to create and improve documents. 

Current Document Context:
- Title: ${title || "Untitled Document"}
- Description: ${description || "No description"}
${assignmentContext ? `- Assignment: ${assignmentContext.name} - ${assignmentContext.description}` : ""}
${taskContext ? `- Task: ${taskContext.title} - ${taskContext.description || ''}` : ""}
- Current Content Length: ${strippedContent.length} characters
${selectedText ? `- Selected Text: "${selectedText}"` : ""}
${referenceDocuments && referenceDocuments.length > 0 ? `- Reference Documents Available: ${referenceDocuments.length} documents` : ""}

You can help with:
1. Generating new content (sections, paragraphs, bullet points)
2. Brainstorming ideas and outlines
3. Applying document templates (project briefs, proposals, reports, etc.)
4. Refining and improve existing text
5. Rewriting content for different audiences
${referenceDocuments && referenceDocuments.length > 0 ? "6. Answering questions based on the uploaded reference documents" : ""}

When generating content, use HTML formatting (<h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>) for proper structure.
Be concise but helpful. Ask clarifying questions if needed.`;

      const fullPrompt = `${systemPrompt}

User Request: ${currentInput}

${strippedContent.length > 0 && strippedContent.length < 2000 ? `Current Document Content:\n${strippedContent.substring(0, 2000)}` : ""}

Provide your response:`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: false,
        file_urls: referenceDocuments && referenceDocuments.length > 0 ? referenceDocuments : undefined
      });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error("Failed to get AI response");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleInsert = (messageContent) => {
    // Extract HTML content if wrapped in markdown code blocks
    let contentToInsert = messageContent;
    
    // Check if content is wrapped in code blocks
    const codeBlockMatch = messageContent.match(/```(?:html)?\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      contentToInsert = codeBlockMatch[1];
    }
    
    onInsertContent(contentToInsert);
    toast.success("Content inserted into document");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    { icon: FileText, text: "Write an introduction section", color: "text-blue-600" },
    { icon: Lightbulb, text: "Brainstorm key points", color: "text-yellow-600" },
    { icon: Wand2, text: "Apply a template", color: "text-purple-600" },
    { icon: Sparkles, text: "Improve selected text", color: "text-green-600" }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4 mb-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-indigo-100 text-indigo-600">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                <div
                  className={`rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : message.isError
                      ? 'bg-red-50 text-red-900 border border-red-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <ReactMarkdown
                      className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                      components={{
                        code: ({ inline, children, ...props }) => {
                          return inline ? (
                            <code className="px-1 py-0.5 rounded bg-gray-200 text-gray-800 text-xs" {...props}>
                              {children}
                            </code>
                          ) : (
                            <pre className="bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto text-xs my-2">
                              <code {...props}>{children}</code>
                            </pre>
                          );
                        },
                        p: ({ children }) => <p className="my-1 leading-relaxed text-sm">{children}</p>,
                        ul: ({ children }) => <ul className="my-1 ml-4 list-disc text-sm">{children}</ul>,
                        ol: ({ children }) => <ol className="my-1 ml-4 list-decimal text-sm">{children}</ol>,
                        li: ({ children }) => <li className="my-0.5 text-sm">{children}</li>,
                        h1: ({ children }) => <h1 className="text-base font-semibold my-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-semibold my-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold my-1">{children}</h3>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                
                {message.role === 'assistant' && !message.isError && message.id !== '1' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInsert(message.content)}
                    className="mt-1 h-7 text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Insert into Document
                  </Button>
                )}
                
                <span className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-gray-200 text-gray-600">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-indigo-100 text-indigo-600">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Prompts */}
      {messages.length === 1 && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {quickPrompts.map((prompt, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => {
                setInput(prompt.text);
                inputRef.current?.focus();
              }}
              className="justify-start h-auto py-2 text-xs"
              disabled={isLoading}
            >
              <prompt.icon className={`w-3 h-3 mr-2 ${prompt.color}`} />
              {prompt.text}
            </Button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        <Textarea
          ref={inputRef}
          placeholder="Ask me to generate content, brainstorm ideas, apply templates, or improve text..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={3}
          disabled={isLoading}
          className="flex-1 resize-none text-sm"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="self-end"
          size="icon"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
