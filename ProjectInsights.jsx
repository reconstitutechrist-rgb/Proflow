
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  Calendar,
  Target,
  Lightbulb,
  ArrowRight,
  Brain,
  AlertCircle,
  Clock,
  FlaskConical, // Added for AI analysis badge
  BarChart2,    // Added for success probability
  ShieldAlert,  // Added for risks
  UserCog,      // Added for resource suggestions
  ListChecks    // Added for recommended actions
} from "lucide-react";
import { useWorkspace } from "@/components/workspace/WorkspaceContext"; // New import
import { db } from '@/api/db';
import { toast } from 'sonner'; // Assuming sonner is used for toasts

export default function ProjectInsights({ projectId }) { // Changed component signature
  const [insights, setInsights] = useState(null);
  // smartSuggestions state removed as it's no longer part of the new LLM output
  const [loading, setLoading] = useState(true);

  const { currentWorkspaceId } = useWorkspace(); // New hook usage

  const loadInsights = async () => { // Renamed from generateInsights, removed useCallback
    setLoading(true);
    try {
      if (!projectId || !currentWorkspaceId) {
        setLoading(false);
        return;
      }

      // CRITICAL: Load only data from current workspace
      const [projectData, assignmentsData, tasksData] = await Promise.all([
        db.entities.Project.filter({
          workspace_id: currentWorkspaceId,
          id: projectId
        }, "-updated_date", 1),
        db.entities.Assignment.filter({
          workspace_id: currentWorkspaceId,
          project_id: projectId
        }, "-updated_date"),
        db.entities.Task.filter({
          workspace_id: currentWorkspaceId
        }, "-updated_date")
      ]);

      const project = projectData[0]; // Get the single project object from the array

      // CRITICAL: Validate project belongs to current workspace
      if (!project || project.workspace_id !== currentWorkspaceId) {
        console.error("Security violation: Project not in current workspace or not found");
        toast.error("Cannot access project from other workspaces or project not found.");
        setLoading(false);
        return;
      }

      // Filter tasks that belong to this project's assignments
      const assignmentIds = assignmentsData.map(a => a.id);
      const projectTasks = tasksData.filter(t => assignmentIds.includes(t.assignment_id));

      const contextText = `
Project Name: ${project.name}
Project Description: ${project.description}
Project Status: ${project.status}
Number of Assignments: ${assignmentsData.length}
Total Project Tasks: ${projectTasks.length}

Assignments Breakdown:
${assignmentsData.map(a => `- Assignment: ${a.name}, Status: ${a.status}`).join('\n')}

Task Status Summary:
- Completed Tasks: ${projectTasks.filter(t => t.status === 'completed').length}
- In Progress Tasks: ${projectTasks.filter(t => t.status === 'in_progress').length}
- To Do Tasks: ${projectTasks.filter(t => t.status === 'todo').length}
`;

      const prompt = `You are an expert project manager AI. Analyze the following project data and provide actionable insights in a concise, professional manner:

${contextText}

Provide:
1. Key risks or blockers (if any) - list as bullet points. If none, state "No significant risks identified at this time."
2. Progress assessment - a brief paragraph summary (2-4 sentences).
3. Resource allocation suggestions - list as bullet points. If none, state "Current resource allocation seems adequate."
4. Next recommended actions (3-5) - list as bullet points.
5. Success probability estimate (0-100) - a single number.

Return as JSON.`;

      const response = await db.integrations.Core.InvokeLLM({ // Changed LLM invocation structure
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            risks: { type: "array", items: { type: "string" }, description: "List of key risks or blockers." },
            progress_assessment: { type: "string", description: "Brief paragraph summarizing project progress." },
            resource_suggestions: { type: "array", items: { type: "string" }, description: "List of suggestions for resource allocation." },
            recommended_actions: { type: "array", items: { type: "string" }, description: "List of 3-5 next recommended actions." },
            success_probability: { type: "number", minimum: 0, maximum: 100, description: "Estimated success probability from 0 to 100." }
          },
          required: ["risks", "progress_assessment", "resource_suggestions", "recommended_actions", "success_probability"]
        }
      });

      setInsights({
        project: project, // Storing the fetched project object
        assignments: assignmentsData,
        tasks: projectTasks,
        analysis: response // Storing the AI analysis response
      });

    } catch (error) {
      console.error("Error loading insights:", error);
      toast.error("Failed to load project insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Trigger insight loading when projectId or currentWorkspaceId changes
    if (projectId && currentWorkspaceId) {
      loadInsights();
    } else if (!projectId && !loading) {
      // If projectId is removed, clear insights to reset component state
      setInsights(null);
    }
  }, [projectId, currentWorkspaceId]); // Dependencies updated for the new data fetching pattern

  // Utility functions like getHealthColor and getSeverityColor are removed
  // as the new LLM output schema does not include project_health_score or detailed risk severity.

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600 animate-pulse" />
            AI Project Insights
            <Badge className="bg-purple-100 text-purple-700">Analyzing...</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-purple-300 animate-pulse" />
            <p className="text-gray-500">Analyzing project data and generating intelligent suggestions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check for insights or analysis content
  if (!insights || !insights.analysis) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-300" />
            <p className="text-red-600">Failed to generate insights or no data available.</p>
            <Button variant="outline" className="mt-4" onClick={loadInsights}>Retry Analysis</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Destructure for easier access
  const { project, analysis } = insights;

  // Helper for success probability color, adapted for the new success_probability score
  const getSuccessProbabilityColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Project Overview & Success Probability */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Project Overview for "{project.name}"
            <Badge className="bg-purple-100 text-purple-700">
              <FlaskConical className="w-3 h-3 mr-1" />AI Analysis
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{project.description}</p>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Success Probability:</h4>
            </div>
            <div className={`inline-flex items-center px-3 py-1 rounded-lg font-bold text-lg ${getSuccessProbabilityColor(analysis.success_probability)}`}>
              {analysis.success_probability}%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Assessment */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Progress Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{analysis.progress_assessment}</p>
        </CardContent>
      </Card>

      {/* Key Risks or Blockers */}
      {analysis.risks && analysis.risks.length > 0 && (
        <Card className="border-0 shadow-sm border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="w-5 h-5" />
              Key Risks or Blockers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-red-800">
              {analysis.risks.map((risk, index) => (
                <li key={index}>{risk}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Resource Allocation Suggestions */}
      {analysis.resource_suggestions && analysis.resource_suggestions.length > 0 && (
        <Card className="border-0 shadow-sm border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <UserCog className="w-5 h-5" />
              Resource Allocation Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-yellow-800">
              {analysis.resource_suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Next Recommended Actions */}
      {analysis.recommended_actions && analysis.recommended_actions.length > 0 && (
        <Card className="border-0 shadow-sm border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <ListChecks className="w-5 h-5" />
              Next Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-blue-800">
              {analysis.recommended_actions.map((action, index) => (
                <li key={index}>{action}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
