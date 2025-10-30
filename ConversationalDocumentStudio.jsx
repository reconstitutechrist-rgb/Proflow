
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wand2,
  FileEdit,
  MessageCircle,
  FileType,
  RefreshCw,
  Sparkles,
  Send,
  Loader2,
  Upload,
  X,
  Bot,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { UploadFile, InvokeLLM } from "@/api/integrations";
import { anthropicResearch } from "@/api/functions";
import { useWorkspace } from "../workspace/WorkspaceContext";

import DocumentGenerator from "./DocumentGenerator";
import DocumentRefiner from "./DocumentRefiner";
import DocToPdfConverter from "../tools/DocToPdfConverter";

export default function ConversationalDocumentStudio({ assignment, currentUser, assignments, onDocumentCreated }) {
  const [activeMode, setActiveMode] = useState("chat");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // New state variables for document transfer
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    // Welcome message
    const welcomeMessage = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `👋 Welcome to your AI Document Studio! I'm here to help you with:

**📝 Document Creation** - Generate professional documents from templates
**✨ Document Refinement** - Improve and polish existing documents  
**💬 Document Q&A** - Ask questions about your uploaded files
**🔄 Format Conversion** - Convert .docx files to PDF

You can also just chat with me - ask me anything about documents, assignments, or get help with your work!

What would you like to do today?`,
      timestamp: new Date()
    };
    setChatMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    // Check if document was transferred from studio
    const transferredDoc = sessionStorage.getItem('studio_document_transfer');
    if (transferredDoc) {
      try {
        const docState = JSON.parse(transferredDoc);
        
        // Check if transfer is recent (within last 5 minutes)
        if (Date.now() - docState.timestamp < 5 * 60 * 1000) {
          setGeneratedDocument(docState.content || '');
          setDocumentTitle(docState.title || '');
          setDocumentDescription(docState.description || '');
          
          toast.success("Document loaded from Studio", {
            description: `"${docState.title}" is ready for refinement`
          });

          // Switch to refine tab if a document was loaded
          setActiveMode("refine");
        }
        
        // Clear the transfer data
        sessionStorage.removeItem('studio_document_transfer');
      } catch (error) {
        console.error('Error loading transferred document:', error);
      }
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      setIsUploading(true);
      try {
        const { file_url } = await UploadFile({ file });
        
        let content = "";
        if (file.type === "text/plain" || file.name.endsWith('.txt')) {
          content = await file.text();
        }

        const newDoc = {
          id: Date.now() + Math.random(),
          name: file.name,
          file_url,
          type: file.type,
          size: file.size,
          content
        };

        setUploadedDocs(prev => [...prev, newDoc]);
        
        const uploadMessage = {
          id: Date.now().toString(),
          type: 'system',
          content: `✅ Uploaded "${file.name}" successfully! You can now ask questions about this document.`,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, uploadMessage]);
        
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveDocument = (docId) => {
    setUploadedDocs(prev => prev.filter(doc => doc.id !== docId));
    toast.success("Document removed");
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput("");
    setIsChatLoading(true);

    try {
      // Build context from uploaded documents
      const contextData = uploadedDocs.map(doc => ({
        name: doc.name,
        content: doc.content || `[File: ${doc.name}]`,
        url: doc.file_url
      }));

      const systemPrompt = `You are an intelligent AI assistant in a Document Studio. You help users with:
1. Document creation and generation
2. Document analysis and Q&A
3. Content refinement and improvement
4. General questions about their work

Current Context:
- Assignment ID: ${assignment?.id || 'N/A'}
${contextData.length > 0 ? `\n\nUploaded Documents:\n${contextData.map(d => `- ${d.name}`).join('\n')}` : ''}

Conversation History:
${chatMessages.slice(-5).map(m => `${m.type}: ${m.content}`).join('\n')}

User Message: "${currentInput}"

Provide helpful, actionable responses. If they're asking about uploaded documents, use the document context. If they want to create something, guide them to use the appropriate tool.`;

      const response = await InvokeLLM({
        prompt: systemPrompt,
        file_urls: uploadedDocs.map(doc => doc.file_url)
      });

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Error in chat:", error);
      toast.error("Failed to get response");
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Studio Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            Conversational Document Studio
            <Badge variant="outline" className="ml-auto bg-white dark:bg-gray-800">
              <MessageCircle className="w-3 h-3 mr-1" />
              AI-Powered
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeMode} onValueChange={setActiveMode}>
            <div className="border-b px-6 pt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="chat">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  AI Chat
                </TabsTrigger>
                <TabsTrigger value="generate">
                  <FileEdit className="w-4 h-4 mr-2" />
                  Generate
                </TabsTrigger>
                <TabsTrigger value="refine">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refine
                </TabsTrigger>
                <TabsTrigger value="tools">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Tools
                </TabsTrigger>
              </TabsList>
            </div>

            {/* AI Chat Tab */}
            <TabsContent value="chat" className="m-0">
              <div className="flex h-[600px]">
                {/* Chat Messages Area - 70% */}
                <div className="flex-1 flex flex-col border-r">
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.type !== 'user' && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                            {msg.type === 'system' ? (
                              <Sparkles className="w-4 h-4 text-white" />
                            ) : (
                              <Bot className="w-4 h-4 text-white" />
                            )}
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            msg.type === 'user'
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                              : msg.type === 'system'
                              ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                              : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                          <div className="text-xs mt-2 opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {msg.type === 'user' && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))}

                    {isChatLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 border-t bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex gap-3">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything about documents, assignments, or get help with your work..."
                        className="flex-1"
                        disabled={isChatLoading}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                      >
                        {isChatLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Document Sidebar - 30% */}
                <div className="w-80 flex flex-col bg-gray-50 dark:bg-gray-900/50">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-purple-600" />
                      Uploaded Documents
                    </h3>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".txt,.pdf,.doc,.docx"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Files
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {uploadedDocs.length > 0 ? (
                      <div className="space-y-2">
                        {uploadedDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 group hover:border-purple-300 dark:hover:border-purple-600 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                  {doc.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {(doc.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveDocument(doc.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No documents uploaded</p>
                        <p className="text-xs mt-1">Upload files to ask questions about them</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Document Generator Tab */}
            <TabsContent value="generate" className="p-6">
              <DocumentGenerator
                assignment={assignment} // Changed from assignmentId
                currentUser={currentUser} // Added
                assignments={assignments} // Added
                currentWorkspaceId={currentWorkspaceId}
                onDocumentGenerated={(newDoc) => {
                  const successMsg = {
                    id: Date.now().toString(),
                    type: 'system',
                    content: '🎉 Document generated and saved successfully!',
                    timestamp: new Date()
                  };
                  setChatMessages(prev => [...prev, successMsg]);
                  setActiveMode("chat");
                  if (onDocumentCreated) {
                    onDocumentCreated(newDoc);
                  }
                }}
              />
            </TabsContent>

            {/* Document Refiner Tab */}
            <TabsContent value="refine" className="p-6">
              <DocumentRefiner
                assignmentId={assignment?.id} // Assuming DocumentRefiner expects assignmentId: string
                currentWorkspaceId={currentWorkspaceId}
                initialContent={generatedDocument} // Added
                initialTitle={documentTitle} // Added
                initialDescription={documentDescription} // Added
                onRefinementComplete={() => {
                  // Optional: Add a chat message or switch mode after refinement
                  const successMsg = {
                    id: Date.now().toString(),
                    type: 'system',
                    content: '✨ Document refinement complete!',
                    timestamp: new Date()
                  };
                  setChatMessages(prev => [...prev, successMsg]);
                  // Clear initial document state after it's been used
                  setGeneratedDocument('');
                  setDocumentTitle('');
                  setDocumentDescription('');
                  setActiveMode("chat");
                }}
              />
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools" className="p-6 space-y-6">
              <div className="grid gap-6">
                <DocToPdfConverter
                  currentWorkspaceId={currentWorkspaceId}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
