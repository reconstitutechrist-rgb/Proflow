import React, { useState, useEffect } from "react";
import AISummaryButton from "../documents/AISummaryButton";
import { Assignment } from "@/api/entities";
import { Document } from "@/api/entities";

export default function ChatSummaryButton({ messages, threadTopic, className, assignment_id }) {
  const [assignmentContext, setAssignmentContext] = useState(null);
  const [documentContexts, setDocumentContexts] = useState([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  useEffect(() => {
    if (assignment_id) {
      loadContext();
    }
  }, [assignment_id]);

  const loadContext = async () => {
    setIsLoadingContext(true);
    try {
      // Fetch assignment data
      const assignment = await Assignment.filter({ id: assignment_id }, "-created_date", 1);
      if (assignment && assignment.length > 0) {
        setAssignmentContext(assignment[0]);
      }

      // Fetch related documents
      const docs = await Document.filter({ 
        assigned_to_assignments: { $in: [assignment_id] } 
      }, "-created_date", 10); // Limit to 10 most recent docs
      
      setDocumentContexts(docs.map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description || "No description",
        document_type: doc.document_type || "other"
      })));
    } catch (error) {
      console.error("Error loading context:", error);
    } finally {
      setIsLoadingContext(false);
    }
  };

  // Build chat content from messages
  const chatContent = messages.map(msg => 
    `[${new Date(msg.created_date).toLocaleTimeString()}] ${msg.author_name}: ${msg.content}`
  ).join('\n\n');

  const title = threadTopic ? `Chat Summary: ${threadTopic}` : "Chat Summary";

  return (
    <AISummaryButton
      content={chatContent}
      type="chat"
      title={title}
      className={className}
      variant="outline"
      size="sm"
      assignment_id={assignment_id}
      assignmentContext={assignmentContext}
      documentContexts={documentContexts}
      disabled={messages.length === 0 || isLoadingContext}
      disabledMessage={
        isLoadingContext 
          ? "Loading context..." 
          : messages.length === 0 
            ? "No messages to summarize yet" 
            : undefined
      }
    />
  );
}