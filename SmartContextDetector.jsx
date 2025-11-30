import React, { useEffect, useCallback, useRef } from "react";
import { Assignment, Task, Document } from "@/api/entities";
import { db } from "@/api/db";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

export default function SmartContextDetector({ onSuggestion }) {
  const { currentWorkspaceId } = useWorkspace();
  const lastSuggestionRef = useRef(null);
  const suggestionTimeoutRef = useRef(null);

  const detectContext = useCallback(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const currentPage = window.location.pathname;
      
      // Clear any pending suggestions
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }

      // Don't show suggestions too frequently
      const now = Date.now();
      if (lastSuggestionRef.current && now - lastSuggestionRef.current < 30000) {
        return;
      }

      let suggestion = null;

      // Document page - viewing a specific document
      if (currentPage.includes('Documents') && (urlParams.has('doc') || urlParams.has('document'))) {
        const docId = urlParams.get('doc') || urlParams.get('document');
        try {
          const doc = await Document.read(docId);
          if (doc && !doc.ai_analysis?.summary) {
            suggestion = {
              title: "📄 AI Analysis Available",
              message: "This document hasn't been analyzed yet. I can help you extract key points, check for compliance issues, or generate a summary.",
              actions: [
                {
                  label: "Analyze Document",
                  prompt: "Please analyze this document and provide a summary with key points"
                },
                {
                  label: "Check Compliance",
                  prompt: "Check this document for any compliance or quality issues"
                }
              ]
            };
          }
        } catch (error) {
          console.error("Error loading document:", error);
        }
      }

      // Tasks page - check for overdue tasks
      else if (currentPage.includes('Tasks')) {
        try {
          const user = await db.auth.me();
          // Filter by workspace_id to ensure we only get tasks from current workspace
          const tasks = await Task.filter({
            workspace_id: currentWorkspaceId,
            assigned_to: user.email,
            status: 'todo' // Use simple string instead of $nin operator
          }, '-due_date', 10);

          const now = new Date();
          now.setHours(0, 0, 0, 0);
          
          const overdueTasks = tasks.filter(task => {
            if (!task.due_date) return false;
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate < now;
          });

          if (overdueTasks.length > 0) {
            suggestion = {
              title: "⚠️ Overdue Tasks Detected",
              message: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}. I can help you prioritize or update them.`,
              actions: [
                {
                  label: "Show Overdue Tasks",
                  prompt: "Show me my overdue tasks and help me prioritize them"
                },
                {
                  label: "Update Status",
                  prompt: "Help me update the status of my overdue tasks"
                }
              ]
            };
          }
        } catch (error) {
          console.error("Error checking tasks:", error);
        }
      }

      // Assignments page - viewing a specific assignment
      else if (currentPage.includes('Assignments') && urlParams.has('assignment')) {
        const assignmentId = urlParams.get('assignment');
        try {
          const assignment = await Assignment.read(assignmentId);
          // Filter by workspace_id to ensure we only get tasks from current workspace
          const tasks = await Task.filter({
            workspace_id: currentWorkspaceId,
            assignment_id: assignmentId
          }, '-created_date', 5);
          
          if (assignment && tasks.length === 0) {
            suggestion = {
              title: "🎯 No Tasks Yet",
              message: "This assignment doesn't have any tasks. I can help you generate initial tasks based on workflow patterns.",
              actions: [
                {
                  label: "Generate Tasks",
                  prompt: "Generate initial tasks for this assignment based on best practices"
                },
                {
                  label: "Suggest Workflow",
                  prompt: "What workflow pattern would work best for this assignment?"
                }
              ]
            };
          }
        } catch (error) {
          console.error("Error loading assignment:", error);
        }
      }

      // Dashboard - general productivity suggestion
      else if (currentPage.includes('Dashboard') || currentPage === '/') {
        try {
          const user = await db.auth.me();
          // Filter by workspace_id to ensure we only get tasks from current workspace
          const tasks = await Task.filter({
            workspace_id: currentWorkspaceId,
            assigned_to: user.email,
            status: 'todo'
          }, '-priority', 5);

          if (tasks.length > 10) {
            suggestion = {
              title: "📊 Task Backlog Building Up",
              message: `You have ${tasks.length} tasks in your backlog. I can help you prioritize or organize them.`,
              actions: [
                {
                  label: "Prioritize Tasks",
                  prompt: "Help me prioritize my current tasks based on urgency and importance"
                },
                {
                  label: "Show Statistics",
                  prompt: "Show me an overview of my task statistics and suggest improvements"
                }
              ]
            };
          }
        } catch (error) {
          console.error("Error checking dashboard context:", error);
        }
      }

      // Send suggestion if we found one
      if (suggestion && onSuggestion) {
        lastSuggestionRef.current = now;
        onSuggestion(suggestion);
      }

    } catch (error) {
      console.error("Error in context detection:", error);
    }
  }, [onSuggestion, currentWorkspaceId]);

  useEffect(() => {
    // Detect context after a short delay when page loads
    suggestionTimeoutRef.current = setTimeout(() => {
      detectContext();
    }, 2000);

    // Clean up timeout on unmount
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [detectContext]);

  // Re-detect when URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      suggestionTimeoutRef.current = setTimeout(() => {
        detectContext();
      }, 2000);
    };

    window.addEventListener('popstate', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [detectContext]);

  // This component doesn't render anything
  return null;
}