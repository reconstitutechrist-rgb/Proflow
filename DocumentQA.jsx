
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { base44 } from "@/api/base44Client";

export default function DocumentQA({ documentId }) {
  const [document, setDocument] = useState(null); // New state for the loaded document
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false); // Renamed from isProcessing
  const [answer, setAnswer] = useState(null); // New state for the current AI response
  const [chatHistory, setChatHistory] = useState([]); // Renamed from conversation
  const [tempUserQuestionForDisplay, setTempUserQuestionForDisplay] = useState(null); // To display user's question during loading phase

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    // Only load if a documentId is provided and a workspace is selected
    if (documentId && currentWorkspaceId) {
      loadDocument();
      loadHistory();
    } else if (!documentId) {
      // Clear states if documentId is removed (e.g., component unmounted or document selection changes)
      setDocument(null);
      setChatHistory([]);
      setAnswer(null);
      setTempUserQuestionForDisplay(null);
    }
  }, [documentId, currentWorkspaceId]); // Re-run effect when documentId or workspace changes

  const loadDocument = async () => {
    if (!currentWorkspaceId || !documentId) return;
    try {
      const docs = await base44.entities.Document.filter({
        workspace_id: currentWorkspaceId,
        id: documentId
      }, "-updated_date", 1); // Get latest document by ID, limit 1

      if (docs.length > 0) {
        // CRITICAL: Validate document is in current workspace
        if (docs[0].workspace_id !== currentWorkspaceId) {
          console.error("Security violation: Document not in current workspace");
          toast.error("Cannot access document from other workspaces");
          setDocument(null); // Clear any potentially invalid document
          return;
        }
        setDocument(docs[0]);
      } else {
        setDocument(null); // Document not found or filter returned empty
        toast.error("Document not found.");
      }
    } catch (error) {
      console.error("Error loading document:", error);
      toast.error("Error loading document details.");
      setDocument(null); // Clear document on error
    }
  };

  const loadHistory = async () => {
    if (!currentWorkspaceId || !documentId) return;
    try {
      // CRITICAL: Load only Q&A from current workspace
      const history = await base44.entities.AIChat.filter({
        workspace_id: currentWorkspaceId,
        chat_type: 'document_query'
      }, "-created_date", 50); // Get recent chats, increased limit to 50 for more history

      // Filter history to only include chats related to the current document
      setChatHistory(history.filter(h => h.source_documents?.includes(documentId)));
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Error loading chat history.");
      setChatHistory([]); // Clear history on error
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    if (!document) {
      toast.error("Document not loaded yet. Please wait or select a document.");
      return;
    }

    // CRITICAL: Validate document workspace before querying
    if (document.workspace_id !== currentWorkspaceId) {
      toast.error("Cannot query documents from other workspaces");
      return;
    }

    const userQuestionForProcessing = question.trim();
    setTempUserQuestionForDisplay(userQuestionForProcessing); // Store for immediate display
    setQuestion(""); // Clear the input field
    setAnswer(null); // Clear previous AI answer
    setLoading(true);

    try {
      // Sanitize document content for the prompt
      const strippedContent = (document.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      const prompt = `Based on this document, answer the user's question:

Document Title: ${document.title || 'Untitled Document'}
Document Content: ${strippedContent || 'No content available.'}

User Question: ${userQuestionForProcessing}

Provide a clear, specific answer based only on the information in the document. If the answer isn't in the document, say so.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      setAnswer(response); // Temporarily display the response

      // CRITICAL: Save Q&A with workspace_id
      const user = await base44.auth.me(); // Get current user info
      await base44.entities.AIChat.create({
        workspace_id: currentWorkspaceId, // CRITICAL: Workspace scoping
        assignment_id: document.assigned_to_assignments?.[0] || null, // Use the first assignment ID if available
        user_email: user.email,
        question: userQuestionForProcessing,
        response: response,
        source_documents: [document.id],
        confidence_score: 80, // Example confidence score
        chat_type: 'document_query'
      });

      // Refresh chat history to include the newly saved Q&A
      await loadHistory();

      // Clear temporary display states after history has been reloaded
      setTempUserQuestionForDisplay(null);
      setAnswer(null);

    } catch (error) {
      console.error("Error asking question:", error);
      toast.error("Failed to get answer");

      // Set an error message as the answer if the request fails
      setAnswer("Sorry, I encountered an error processing your question. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Build the list of messages to display in the chat interface
  const displayMessages = [];

  // Add historical Q&A from chatHistory
  chatHistory.forEach(chat => {
    displayMessages.push({ type: 'user', content: chat.question, timestamp: new Date(chat.created_date) });
    displayMessages.push({ type: 'assistant', content: chat.response, timestamp: new Date(chat.created_date) });
  });

  // Add the currently processing question and its potential answer/loading state
  if (tempUserQuestionForDisplay) {
    displayMessages.push({ type: 'user', content: tempUserQuestionForDisplay, timestamp: new Date() });
    if (loading) {
      displayMessages.push({ type: 'assistant', content: 'Thinking...', isLoading: true, timestamp: new Date() });
    } else if (answer) {
      // If answer is available but not yet cleared (e.g., just received from LLM)
      displayMessages.push({ type: 'assistant', content: answer, timestamp: new Date() });
    }
  } else if (answer && !loading) {
      // This case handles situations where `answer` might be set (e.g., error message)
      // and `tempUserQuestionForDisplay` was not set or already cleared.
      displayMessages.push({ type: 'assistant', content: answer, timestamp: new Date() });
  }


  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/20 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <CardTitle>Document Q&A</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {document ? `Asking questions about: ${document.title}` : "Select a document to ask questions"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!document ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {documentId ? (
              <p>Loading document details...</p>
            ) : (
              <p>Please select a document from the sidebar to start asking questions.</p>
            )}
            {loading && <Loader2 className="w-5 h-5 animate-spin mx-auto mt-2" />}
          </div>
        ) : (
          <>
            {displayMessages.length > 0 && (
              <div className="border rounded-lg p-4 space-y-3 max-h-[300px] overflow-y-auto bg-gray-50 dark:bg-gray-800">
                {displayMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.type === 'user'
                          ? 'bg-pink-600 text-white'
                          : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.isLoading ? <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> : null}
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about the document..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAskQuestion();
                  }
                }}
                disabled={loading || !document} // Disable input if loading or no document is loaded
              />
              <Button
                onClick={handleAskQuestion}
                disabled={loading || !question.trim() || !document} // Disable button if loading, empty question, or no document
                className="bg-pink-600 hover:bg-pink-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
