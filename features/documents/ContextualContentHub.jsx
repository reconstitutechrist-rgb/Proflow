
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Assignment } from "@/api/entities";
import { Document } from "@/api/entities";
import { Task } from "@/api/entities";
import { Message } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Network, 
  TrendingUp, 
  Users, 
  Clock,
  Target,
  Loader2,
  RefreshCw,
  Lightbulb
} from "lucide-react";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";

export default function ContextualContentHub({ currentUser, assignmentId }) { // Changed prop from selectedAssignment to assignmentId
  const [contentInsights, setContentInsights] = useState(null); // AI generated insights
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false); // Loading state for AI
  const [isDataLoading, setIsDataLoading] = useState(false); // Loading state for raw data
  const [activeTab, setActiveTab] = useState("connections");
  const [lastAnalysisTime, setLastAnalysisTime] = useState(null);
  const [rawContextualData, setRawContextualData] = useState(null); // Raw data fetched from backend
  const [currentAssignmentDetails, setCurrentAssignmentDetails] = useState(null); // To store the full assignment object if assignmentId is provided

  const { currentWorkspaceId } = useWorkspace(); // Added useWorkspace hook

  // Memoize expensive calculations for AI analysis key
  const analysisKey = useMemo(() => {
    return `${assignmentId || 'all'}-${currentUser?.email || 'unknown'}-${currentWorkspaceId || 'unknown'}`;
  }, [assignmentId, currentUser?.email, currentWorkspaceId]);

  // Cache insights for 10 minutes to avoid excessive AI calls
  const isCacheValid = useMemo(() => {
    if (!lastAnalysisTime) return false;
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    return lastAnalysisTime > tenMinutesAgo;
  }, [lastAnalysisTime]);

  // Function to load raw contextual data from the backend
  const loadContextualContent = useCallback(async () => {
    if (!assignmentId || !currentWorkspaceId) {
      setRawContextualData(null);
      setCurrentAssignmentDetails(null);
      return;
    }

    setIsDataLoading(true);
    try {
      // Load all workspace-scoped and assignment-related content
      const [documentsPromise, tasksPromise, messagesPromise, relatedAssignmentsPromise, currentAssignmentPromise] = await Promise.allSettled([
        Document.filter({
          workspace_id: currentWorkspaceId,
          assigned_to_assignments: { $in: [assignmentId] }
        }, "-updated_date", 20),
        Task.filter({
          workspace_id: currentWorkspaceId,
          assignment_id: assignmentId
        }, "-updated_date", 20),
        Message.filter({
          workspace_id: currentWorkspaceId,
          assignment_id: assignmentId
        }, "-created_date", 20).catch(() => []), // Added catch to prevent allSettled from failing if messages fail
        Assignment.filter({
          workspace_id: currentWorkspaceId
        }, "-updated_date", 10),
        Assignment.get(assignmentId) // Fetch the current assignment details
      ]);

      setRawContextualData({
        assignment: currentAssignmentPromise.status === 'fulfilled' ? currentAssignmentPromise.value : null, // Pass the full assignment object to AI
        documents: documentsPromise.status === 'fulfilled' ? documentsPromise.value : [],
        tasks: tasksPromise.status === 'fulfilled' ? tasksPromise.value : [],
        messages: messagesPromise.status === 'fulfilled' ? messagesPromise.value : [],
        relatedAssignments: (relatedAssignmentsPromise.status === 'fulfilled' ? relatedAssignmentsPromise.value : [])
          .filter(a => a.id !== assignmentId)
          .slice(0, 3)
      });
      setCurrentAssignmentDetails(currentAssignmentPromise.status === 'fulfilled' ? currentAssignmentPromise.value : null);

    } catch (error) {
      console.error("Error loading contextual content:", error);
      setRawContextualData(null);
      setCurrentAssignmentDetails(null);
    } finally {
      setIsDataLoading(false);
    }
  }, [assignmentId, currentWorkspaceId]); // Dependencies for loadContextualContent

  // Function to generate content insights using the LLM based on raw data
  const generateContentInsights = useCallback(async (forceRefresh = false) => {
    if (!rawContextualData || isDataLoading) {
      // console.warn("Cannot generate insights: raw contextual data is not available or still loading.");
      return;
    }

    if (!forceRefresh && isCacheValid && contentInsights) {
      return; // Use cached data
    }

    setIsGeneratingInsights(true);
    try {
      // Use rawContextualData for the prompt
      const prompt = `Hi! I'm your content intelligence assistant. I've been looking at your team's work and I'd love to share some insights that might be helpful.

Here's what I'm working with:
${JSON.stringify(rawContextualData, null, 2)}

User: ${currentUser?.full_name || 'Team Member'} (${currentUser?.email || 'team@company.com'})

I'd like to help you by pointing out:

1. **Interesting Connections**: Things that are related but you might not have noticed - like documents that reference similar topics, or tasks that build on each other.

2. **Work Patterns**: How your team typically gets things done - what works well and what might need tweaking.

3. **Knowledge Gaps**: Areas where creating some documentation, templates, or sharing knowledge could save everyone time.

4. **Team Collaboration**: How well the team is working together and where communication could be smoother.

Please keep it friendly and practical - like advice from a helpful colleague who's been watching how the team works and wants to share some useful observations.`;

      const response = await InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            content_connections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  connected_items: { 
                    type: "array", 
                    items: { 
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        id: { type: "string" },
                        title: { type: "string" }
                      }
                    }
                  },
                  strength: { type: "string" }
                }
              }
            },
            workflow_patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern_type: { type: "string" },
                  description: { type: "string" },
                  frequency: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            knowledge_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  description: { type: "string" },
                  potential_impact: { type: "string" },
                  suggested_action: { type: "string" }
                }
              }
            },
            collaboration_insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  insight_type: { type: "string" },
                  description: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            }
          }
        }
      });

      setContentInsights(response);
      setLastAnalysisTime(new Date());

    } catch (error) {
      console.error("Error generating content insights:", error);
      setContentInsights(null);
    } finally {
      setIsGeneratingInsights(false);
    }
  }, [currentUser, isCacheValid, contentInsights, rawContextualData, isDataLoading]); // Dependencies for generateContentInsights

  // Effect to load raw data when assignmentId or currentWorkspaceId changes
  useEffect(() => {
    if (assignmentId && currentWorkspaceId) {
      loadContextualContent();
    } else {
      setRawContextualData(null);
      setCurrentAssignmentDetails(null);
      setContentInsights(null); // Clear insights if context is lost
      setLastAnalysisTime(null);
    }
  }, [assignmentId, currentWorkspaceId, loadContextualContent]);

  // Effect to trigger AI insights generation once raw data is loaded
  useEffect(() => {
    if (rawContextualData && !isDataLoading) {
      generateContentInsights();
    }
  }, [analysisKey, rawContextualData, isDataLoading, generateContentInsights]);

  const getConnectionStrengthColor = (strength) => {
    switch (strength?.toLowerCase()) {
      case 'strong': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'weak': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getPatternImpactColor = (impact) => {
    switch (impact?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (isDataLoading || isGeneratingInsights) { // Combined loading states
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 text-purple-500 animate-spin" />
              <p className="text-sm text-gray-600">
                {isDataLoading ? "Loading contextual data..." : "Analyzing patterns and generating insights..."}
              </p>
              <p className="text-xs text-gray-500 mt-1">This might take a moment ☕</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If data is loaded but no insights could be generated
  if (!contentInsights) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-8">
          <div className="text-center">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">Hmm, I couldn't analyze your content right now</p>
            <p className="text-sm text-gray-500 mb-4">This sometimes happens - let me try again</p>
            <Button variant="outline" onClick={() => generateContentInsights(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Give it another shot
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Network className="w-3 h-3 text-white" />
            </div>
            Content Insights
            {currentAssignmentDetails && ( // Display assignment name if available
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {currentAssignmentDetails.name}
              </Badge>
            )}
          </div>
          {lastAnalysisTime && (
            <div className="text-xs text-gray-500">
              Updated {lastAnalysisTime.toLocaleTimeString()}
            </div>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600">
          I've been looking at your content and found some interesting patterns that might help! 
        </p>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connections" className="text-xs">
              <Network className="w-3 h-3 mr-1" />
              Connections
            </TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              Patterns
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="text-xs">
              <Target className="w-3 h-3 mr-1" />
              Opportunities
            </TabsTrigger>
            <TabsTrigger value="collaboration" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              Team Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="mt-4">
            <div className="space-y-4">
              {contentInsights.content_connections?.length > 0 ? contentInsights.content_connections.map((connection, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{connection.title}</h4>
                    <Badge className={`text-xs ${getConnectionStrengthColor(connection.strength)}`}>
                      {connection.strength} connection
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{connection.description}</p>
                  {connection.connected_items?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {connection.connected_items.map((item, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {item.type}: {item.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <Network className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>I haven't spotted any interesting connections yet</p>
                  <p className="text-sm mt-1">As you add more content, I'll start seeing patterns!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="patterns" className="mt-4">
            <div className="space-y-4">
              {contentInsights.workflow_patterns?.length > 0 ? contentInsights.workflow_patterns.map((pattern, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{pattern.pattern_type}</h4>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {pattern.frequency}
                      </Badge>
                      <Badge className={`text-xs ${getPatternImpactColor(pattern.impact)}`}>
                        {pattern.impact} impact
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{pattern.description}</p>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>I haven't detected clear workflow patterns yet</p>
                  <p className="text-sm mt-1">As your team works, I'll learn more about your processes!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="knowledge" className="mt-4">
            <div className="space-y-4">
              {contentInsights.knowledge_opportunities?.length > 0 ? contentInsights.knowledge_opportunities.map((opportunity, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{opportunity.area}</h4>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                      {opportunity.potential_impact}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{opportunity.description}</p>
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    <strong>Suggested:</strong> {opportunity.suggested_action}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>I don't see any immediate knowledge opportunities</p>
                  <p className="text-sm mt-1">Keep documenting and sharing, and I'll highlight areas for improvement!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="collaboration" className="mt-4">
            <div className="space-y-4">
              {contentInsights.collaboration_insights?.length > 0 ? contentInsights.collaboration_insights.map((insight, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{insight.insight_type}</h4>
                    <Badge variant="outline" className="text-xs">
                      Team Insight
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                  <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded">
                    <strong>Recommendation:</strong> {insight.recommendation}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No specific collaboration insights to highlight right now</p>
                  <p className="text-sm mt-1">As your team interacts, I'll observe and share tips!</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => generateContentInsights(true)}
            className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            disabled={isDataLoading || isGeneratingInsights}
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Check for new insights {isCacheValid ? "(using cached data)" : ""}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
