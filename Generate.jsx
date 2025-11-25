
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Assignment } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileEdit,
  FileText,
  Briefcase,
  Wand2,
  MessageCircle,
  FileType,
  Wrench,
} from "lucide-react";
import { useSearchParams } from "react-router-dom"; // Added useSearchParams import

import ConversationalDocumentStudio from "@/components/generation/ConversationalDocumentStudio";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster, toast } from "sonner";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

export default function GeneratePage() {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [retryAttempt, setRetryAttempt] = useState(0);
  const MAX_RETRIES = 3;
  const retryTimeoutRef = useRef(null);

  const { currentWorkspaceId } = useWorkspace();
  const [searchParams] = useSearchParams(); // Initialized useSearchParams

  // Memoize the loadData function to ensure its reference is stable across renders
  // and it only re-runs when its dependencies change.
  const loadData = useCallback(async (currentRetry = 0) => {
    // If no workspace is selected, we should not attempt to load data.
    // Clear existing data and set loading to false.
    if (!currentWorkspaceId) {
      setLoading(false);
      setAssignments([]);
      setSelectedAssignment(null);
      return;
    }

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    try {
      setLoading(true);
      
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      // Add delay with exponential backoff
      const baseDelay = 500;
      const delay = baseDelay * Math.pow(2, currentRetry);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const assignmentsData = await base44.entities.Assignment.filter(
        { workspace_id: currentWorkspaceId }, 
        "-updated_date"
      );
      setAssignments(assignmentsData);

      // After fetching new assignments for the workspace,
      // if there are assignments, the new useEffect will handle initial selection from URL.
      // If no URL param, it will select the first assignment if available.
      // We don't set selectedAssignment here directly to allow the URL param effect to take precedence.
      // However, if there are no assignments, we must clear selection.
      if (assignmentsData.length === 0) {
        setSelectedAssignment(null);
      }
      
      // Success - reset retry attempt
      setRetryAttempt(0);
      
    } catch (error) {
      console.error("Error loading data:", error);
      
      if (error.message && error.message.includes('Rate limit')) {
        if (currentRetry < MAX_RETRIES) {
          const retryDelay = 5000 * Math.pow(2, currentRetry); // 5s, 10s, 20s
          toast.error(`Rate limit reached. Retrying in ${retryDelay/1000} seconds...`, {
            duration: retryDelay
          });
          
          retryTimeoutRef.current = setTimeout(() => {
            setRetryAttempt(currentRetry + 1);
            loadData(currentRetry + 1);
          }, retryDelay);
        } else {
          toast.error("Rate limit exceeded. Please refresh the page manually.", {
            duration: 10000,
            action: {
              label: "Refresh",
              onClick: () => window.location.reload()
            }
          });
          setAssignments([]);
          setSelectedAssignment(null);
        }
      } else {
        setAssignments([]);
        setSelectedAssignment(null);
      }
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId]);

  // This useEffect hook will trigger data loading whenever the currentWorkspaceId changes
  // or on initial component mount.
  // We also explicitly reset selectedAssignment here to ensure a clean state
  // when switching between workspaces.
  useEffect(() => {
    // Reset selected assignment and retry attempt whenever the workspace context changes
    // or when this effect is run for the first time.
    setSelectedAssignment(null);
    setRetryAttempt(0); // Reset retry attempt to ensure a clean start for new workspace
    loadData(0);
    
    // Cleanup function
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [currentWorkspaceId, loadData]); // Only depend on workspace change

  // Handle assignment selection from URL params (including fromStudio)
  useEffect(() => {
    if (assignments.length > 0) {
      const assignmentIdFromUrl = searchParams.get('assignment');
      const fromStudio = searchParams.get('fromStudio');
      
      if (assignmentIdFromUrl) {
        const assignment = assignments.find(a => a.id === assignmentIdFromUrl);
        if (assignment) {
          setSelectedAssignment(assignment);
          
          if (fromStudio === 'true') {
            toast.info("Document loaded from Studio", {
              description: "You can now refine and enhance your document with AI"
            });
          }
        }
      } else if (!selectedAssignment) {
        // If no assignment ID in URL and no assignment is currently selected,
        // select the first one from the loaded assignments.
        setSelectedAssignment(assignments[0]);
      }
    } else if (assignments.length === 0 && selectedAssignment) {
      // If no assignments are loaded, but an assignment is selected, clear it.
      setSelectedAssignment(null);
    }
  }, [assignments, searchParams, selectedAssignment]);


  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <Wand2 className="w-8 h-8 text-purple-600" />
                  AI Document Studio
                </h1>
                <p className="text-base text-gray-600 dark:text-gray-400">
                  Your complete AI-powered workspace for creating, analyzing, and perfecting documents
                </p>
              </div>
            </div>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                  Assignment Context
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignments.length > 0 ? (
                    assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        onClick={() => setSelectedAssignment(assignment)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedAssignment?.id === assignment.id
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{assignment.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{assignment.description}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="outline">{assignment.status.replace('_', ' ')}</Badge>
                          <Badge variant="outline">{assignment.priority} priority</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-6 text-gray-500 dark:text-gray-400">
                      No assignments available. Please create one to get started.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {selectedAssignment ? (
            <ErrorBoundary>
              <ConversationalDocumentStudio
                assignment={selectedAssignment}
                currentUser={currentUser}
                assignments={assignments}
              />
            </ErrorBoundary>
          ) : (
            <Card className="border-0 shadow-md">
              <CardContent className="py-12">
                <div className="text-center">
                  <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Select an Assignment
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose an assignment above to start using the AI Document Studio
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <Toaster position="top-right" expand={true} richColors closeButton />
      </div>
    </ErrorBoundary>
  );
}
