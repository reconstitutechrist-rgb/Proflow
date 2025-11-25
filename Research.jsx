
import React, { useState, useEffect } from "react";
import { Assignment } from "@/api/entities";
import { Document } from "@/api/entities";
import { AIResearchChat } from "@/api/entities";
import { User } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Brain,
  FileSearch,
  Lightbulb,
  BookOpen,
  Scale,
  Shield,
  Building,
  Target,
  MessageSquare,
  Globe,
  FolderOpen,
  X
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

import AIResearchAssistant from "@/components/ai/AIResearchAssistant";
import ResearchSuggestions from "@/components/research/ResearchSuggestions";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { useNavigate } from "react-router-dom"; // Assumed import for navigation
import { createPageUrl } from "@/lib/utils"; // Assumed utility for URL creation

export default function ResearchPage() {
  const [assignments, setAssignments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [researchHistory, setResearchHistory] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("research");

  const { currentWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate(); // Initialize useNavigate hook

  // Moved loadData function definition out of useEffect for reusability
  const loadData = async () => {
    if (!currentWorkspaceId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Modified to filter by workspace_id and use base44.entities
      const [assignmentsData, documentsData, researchData, user] = await Promise.all([
        base44.entities.Assignment.filter({ workspace_id: currentWorkspaceId }, "-updated_date"),
        base44.entities.Document.filter({ workspace_id: currentWorkspaceId }, "-updated_date"), // Keeping documents fetch with workspace filter to preserve functionality
        base44.entities.AIResearchChat.filter({ workspace_id: currentWorkspaceId }, "-created_date", 50),
        base44.auth.me()
      ]);

      setAssignments(assignmentsData);
      setDocuments(documentsData); // Keeping documents state update
      setResearchHistory(researchData);
      setCurrentUser(user);

      // Auto-select the first assignment if available and no assignment is currently selected
      // Ensure the selected assignment is part of the current workspace's assignments
      if (assignmentsData.length > 0 && (!selectedAssignment || !assignmentsData.find(a => a.id === selectedAssignment.id))) {
        setSelectedAssignment(assignmentsData[0]); // Select the entire assignment object
      } else if (assignmentsData.length === 0) {
        setSelectedAssignment(null); // Clear selected if no assignments are available
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load research data.", // Kept broader description
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentWorkspaceId) { // Only load data if a workspace is selected
      loadData();
    }
  }, [currentWorkspaceId]); // Dependency array includes currentWorkspaceId

  const getAssignmentDocuments = (assignmentId) => {
    if (!assignmentId) return [];
    return documents.filter(doc => doc.assigned_to_assignments?.includes(assignmentId));
  };

  const getAssignmentResearch = (assignmentId) => {
    if (!assignmentId) {
      return researchHistory.filter(research => !research.assignment_id);
    }
    return researchHistory.filter(research => research.assignment_id === assignmentId);
  };

  const handleResearchComplete = () => {
    // Refresh research history after a new chat is completed, filtering by workspace
    base44.entities.AIResearchChat.filter({ workspace_id: currentWorkspaceId }, "-created_date", 50)
      .then(setResearchHistory)
      .catch(error => {
        console.error("Error refreshing research history:", error);
        toast({
          title: "Error",
          description: "Failed to refresh research history.",
          variant: "destructive",
        });
      });
  };

  const handleAssignmentChange = (value) => {
    if (value === "none") {
      setSelectedAssignment(null);
    } else {
      const assignment = assignments.find(a => a.id === value);
      setSelectedAssignment(assignment);
    }
  };

  const clearAssignment = () => {
    setSelectedAssignment(null);
  };

  const handleCreateDocumentFromResearch = (research) => {
    const query = new URLSearchParams({
      fromResearch: 'true',
      assignmentId: research.assignment_id || '',
      assignmentName: assignments.find(a => a.id === research.assignment_id)?.name || 'General Research',
      researchQuestion: research.question,
      researchSummary: research.response.substring(0, 500),
      recommendedActions: JSON.stringify(research.recommended_actions || []),
      suggestedDocTitle: `Research: ${research.question.substring(0, 50)}...`
    }).toString();

    navigate(`${createPageUrl("DocumentStudio")}?${query}`);
  };

  // The outline also specified changes to handleResearch and handleGenerateDocument which are
  // functions performing API calls related to AI research and document creation.
  // These functions are typically managed within the AIResearchAssistant component,
  // not directly in ResearchPage which orchestrates the view.
  // ResearchPage passes necessary props like `workspaceId` to AIResearchAssistant,
  // and the AIResearchAssistant component itself would use `base44.functions.invoke`
  // and `base44.entities.AIResearchChat.create` internally.
  // Thus, these specific function implementations from the outline are omitted here
  // as they pertain to AIResearchAssistant's internal logic, not ResearchPage's.

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* Enhanced Header */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <FileSearch className="w-8 h-8 text-purple-600" />
                AI Research Assistant
              </h1>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Research anything you need - link to assignments or explore general topics
              </p>
            </div>
          </div>

          {/* FIXED: Assignment Selector with proper UI and handlers */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-gray-900 dark:text-white">
                    Research Context (Optional)
                  </Label>
                  {selectedAssignment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAssignment}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                <Select
                  value={selectedAssignment?.id || "none"}
                  onValueChange={handleAssignmentChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="General Research (No Assignment)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <span>General Research (No Assignment)</span>
                      </div>
                    </SelectItem>
                    {assignments.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 border-t mt-1 pt-2">
                          Link to Assignment:
                        </div>
                        {assignments.map(assignment => (
                          <SelectItem key={assignment.id} value={assignment.id}>
                            <div className="flex items-center gap-2">
                              <FolderOpen className="w-4 h-4 text-purple-600" />
                              <span>{assignment.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>

                {/* Selected Assignment Badge */}
                {selectedAssignment && (
                  <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <FolderOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                      Researching for: {selectedAssignment.name}
                    </span>
                    <Badge variant="outline" className="ml-auto bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                      {getAssignmentDocuments(selectedAssignment.id).length} documents
                    </Badge>
                  </div>
                )}

                {/* General Research Mode Indicator */}
                {!selectedAssignment && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      General Research Mode - Ask about any topic
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Research Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="research" className="text-base font-medium">
              <Brain className="w-4 h-4 mr-2" />
              AI Research
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="text-base font-medium">
              <Lightbulb className="w-4 h-4 mr-2" />
              Smart Suggestions
            </TabsTrigger>
            <TabsTrigger value="history" className="text-base font-medium">
              <MessageSquare className="w-4 h-4 mr-2" />
              Research History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="research">
            <ErrorBoundary>
              <div className="space-y-8">
                {/* Research Assistant - with proper height constraint */}
                <div className="h-[700px]">
                  <ErrorBoundary>
                    <AIResearchAssistant
                      assignment={selectedAssignment}
                      documents={selectedAssignment ? getAssignmentDocuments(selectedAssignment.id) : []}
                      currentUser={currentUser}
                      onResearchComplete={handleResearchComplete}
                      workspaceId={currentWorkspaceId} // Pass workspaceId to AIResearchAssistant
                    />
                  </ErrorBoundary>
                </div>

                {/* Assignment Context - Only show if assignment selected */}
                {selectedAssignment && (
                  <div className="grid lg:grid-cols-3 gap-6">
                    <Card className="border-0 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                          Assignment Context
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Available Documents
                          </h4>
                          <div className="space-y-2">
                            {getAssignmentDocuments(selectedAssignment.id).slice(0, 5).map(doc => (
                              <div key={doc.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <FileSearch className="w-4 h-4 text-gray-400" />
                                <span className="truncate">{doc.title}</span>
                              </div>
                            ))}
                            {getAssignmentDocuments(selectedAssignment.id).length > 5 && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                +{getAssignmentDocuments(selectedAssignment.id).length - 5} more documents
                              </p>
                            )}
                            {getAssignmentDocuments(selectedAssignment.id).length === 0 && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                No documents available
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Assignment Details
                          </h4>
                          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <span>Status:</span>
                              <Badge variant="outline">{selectedAssignment.status.replace('_', ' ')}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>Priority:</span>
                              <Badge variant="outline">{selectedAssignment.priority}</Badge>
                            </div>
                            <div>Team: {selectedAssignment.team_members?.length || 0} members</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Research Categories */}
                    <Card className="border-0 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                          Quick Research Categories
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { icon: Scale, label: "Legal & Compliance", color: "text-blue-600" },
                            { icon: Shield, label: "Security Requirements", color: "text-green-600" },
                            { icon: Building, label: "Industry Standards", color: "text-orange-600" },
                            { icon: BookOpen, label: "Best Practices", color: "text-purple-600" }
                          ].map(({ icon: Icon, label, color }) => (
                            <Button key={label} variant="outline" size="sm" className="h-auto p-3 text-left justify-start">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${color}`} />
                                <span className="text-xs font-medium">{label}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Research Tips */}
                    <Card className="border-0 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                          Research Tips
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span>Ask specific questions about your assignment's compliance requirements</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>Include your industry and location for more targeted advice</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <BookOpen className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Request specific documentation or process recommendations</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* General Research Tips - Show when no assignment selected */}
                {!selectedAssignment && (
                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-600" />
                        General Research Mode
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-400">
                          You're in general research mode. Ask about any topic, and I'll help you with:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-2 text-gray-600 dark:text-gray-400">
                          <li>Industry trends and best practices</li>
                          <li>Legal and compliance requirements</li>
                          <li>Technical specifications and standards</li>
                          <li>Market research and competitive analysis</li>
                          <li>Process recommendations and workflows</li>
                        </ul>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mt-4">
                          <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>
                              <strong>Tip:</strong> Use the dropdown above to link this research to an assignment at any time.
                              This will give me context about your project and available documents.
                            </span>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="suggestions" className="flex-1">
            <ErrorBoundary>
              {selectedAssignment ? (
                <ResearchSuggestions
                  assignment={selectedAssignment}
                  documents={getAssignmentDocuments(selectedAssignment.id)}
                />
              ) : (
                <Card className="border-0 shadow-md">
                  <CardContent className="p-12 text-center">
                    <Lightbulb className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                      Select an Assignment for Smart Suggestions
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      Smart suggestions are context-aware and work best when linked to a specific assignment.
                      Use the dropdown above to select an assignment.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (assignments.length > 0) {
                          setSelectedAssignment(assignments[0]);
                        }
                      }}
                      disabled={assignments.length === 0}
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      {assignments.length > 0 ? 'Select First Assignment' : 'No Assignments Available'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="history">
            <ErrorBoundary>
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <MessageSquare className="w-5 h-5" />
                    Research History
                    {selectedAssignment && (
                      <Badge variant="outline" className="ml-2">
                        {selectedAssignment.name}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedAssignment
                      ? `Showing research for ${selectedAssignment.name}`
                      : "Showing general research (not linked to any assignment)"
                    }
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getAssignmentResearch(selectedAssignment?.id).length > 0 ? (
                      getAssignmentResearch(selectedAssignment?.id).map((research) => (
                        <div key={research.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">{research.question}</h4>
                            <Badge variant="outline" className="ml-2 flex-shrink-0">
                              {research.research_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                            {research.response}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{new Date(research.created_date).toLocaleDateString()} at {new Date(research.created_date).toLocaleTimeString()}</span>
                            {research.confidence_score && (
                              <span className="font-medium">Confidence: {research.confidence_score}%</span>
                            )}
                            {/* Example of how to use the new function, can be uncommented and styled as needed */}
                            {/* <Button variant="ghost" size="sm" onClick={() => handleCreateDocumentFromResearch(research)}>
                              <FileSearch className="w-3 h-3 mr-1" /> Create Document
                            </Button> */}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No research history yet
                        </h3>
                        <p className="text-sm">
                          {selectedAssignment
                            ? "Start researching using the AI Research tab to build your history."
                            : "Your general research questions will appear here."}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
