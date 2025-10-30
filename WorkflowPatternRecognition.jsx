
import React, { useState, useEffect } from "react";
import { WorkflowPattern } from "@/api/entities";
import { Task } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Target,
  Users,
  Zap,
  BookOpen,
  ArrowRight,
  Lightbulb,
  Plus
} from "lucide-react";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function WorkflowPatternRecognition({
  assignment, // Changed from tasks, assignments, currentAssignment
  onPatternApplied // Changed from onPatternApply
}) {
  const [patterns, setPatterns] = useState([]);
  const [suggestedPattern, setSuggestedPattern] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  // const [showPatternDialog, setShowPatternDialog] = useState(false); // Not implemented in JSX, so keeping commented

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (assignment && currentWorkspaceId) {
      // CRITICAL: Validate assignment is in current workspace
      if (assignment.workspace_id !== currentWorkspaceId) {
        toast.error("Cannot access workflow patterns from other workspaces");
        console.error("Security violation: Cross-workspace pattern access", {
          assignmentWorkspace: assignment.workspace_id,
          currentWorkspace: currentWorkspaceId
        });
        setPatterns([]); // Clear patterns if validation fails
        setSuggestedPattern(null);
        return;
      }
      loadWorkflowPatterns();
      analyzeAndSuggestPattern();
    } else {
      setPatterns([]);
      setSuggestedPattern(null);
    }
  }, [assignment, currentWorkspaceId]);

  const loadWorkflowPatterns = async () => {
    try {
      setLoading(true);

      // CRITICAL: Only load patterns from current workspace
      // Using base44.entities directly as per outline
      const workflowPatterns = await base44.entities.WorkflowPattern.filter({
        workspace_id: currentWorkspaceId
      }, "-usage_count", 10); // Filter by usage count descending, limit 10

      setPatterns(workflowPatterns);
    } catch (error) {
      console.error("Error loading workflow patterns:", error);
      toast.error("Failed to load workflow patterns.");
    } finally {
      setLoading(false);
    }
  };

  const analyzeAndSuggestPattern = async () => {
    if (!assignment || !currentWorkspaceId) return;

    try {
      // Analyze assignment details to suggest best pattern
      const assignmentDetails = `
Assignment: ${assignment.name}
Description: ${assignment.description || 'N/A'}
Status: ${assignment.status}
Team Size: ${assignment.team_members?.length || 0}
      `;

      const prompt = `Based on this assignment, suggest the most appropriate workflow pattern. Consider the assignment type, scope, and team size.

Assignment Details:
${assignmentDetails}

Available Patterns for Workspace:
${patterns.map(p => `- ${p.name} (type: ${p.assignment_type || 'general'})`).join('\n')}

If an existing pattern matches well, suggest its name. Otherwise, suggest a custom pattern name that would fit.
Provide a reasoning for the suggestion and a confidence score.

Return the pattern name that best matches, or suggest a custom pattern.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            pattern_name: { type: "string" },
            reasoning: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 100 }
          },
          required: ["pattern_name", "reasoning", "confidence"]
        }
      });

      if (!response || !response.pattern_name) {
        console.warn("LLM did not return a valid pattern suggestion.");
        setSuggestedPattern(null);
        return;
      }

      // CRITICAL: Check if pattern exists in current workspace
      const matchingPattern = patterns.find(p =>
        p.name.toLowerCase().includes(response.pattern_name.toLowerCase()) &&
        p.workspace_id === currentWorkspaceId
      );

      if (matchingPattern) {
        setSuggestedPattern({
          ...matchingPattern,
          ai_reasoning: response.reasoning,
          ai_confidence: response.confidence
        });
      } else {
        // If LLM suggests a custom pattern or one not in our list, we can represent it
        setSuggestedPattern({
          id: 'ai-custom',
          name: response.pattern_name,
          description: response.reasoning,
          usage_count: 0,
          success_rate: response.confidence, // Use confidence as success rate for suggested custom
          pattern_sequence: [], // No sequence for a new custom pattern yet
          ai_reasoning: response.reasoning,
          ai_confidence: response.confidence,
          isCustomSuggestion: true,
          workspace_id: currentWorkspaceId // Ensure this also has workspace_id context
        });
      }
    } catch (error) {
      console.error("Error analyzing pattern:", error);
      toast.error("Failed to get pattern suggestion from AI.");
      setSuggestedPattern(null);
    }
  };

  const handleApplyPattern = async (pattern) => {
    if (!assignment || !pattern || !currentWorkspaceId) return;

    // CRITICAL: Validate both assignment and pattern are in current workspace
    if (assignment.workspace_id !== currentWorkspaceId || pattern.workspace_id !== currentWorkspaceId) {
      toast.error("Cannot apply patterns across workspaces");
      console.error("Security violation: Cross-workspace pattern application attempt", {
        assignmentWorkspace: assignment.workspace_id,
        patternWorkspace: pattern.workspace_id,
        currentWorkspace: currentWorkspaceId
      });
      return;
    }

    try {
      setApplying(true);

      const tasksToCreate = [];

      for (const stage of pattern.pattern_sequence || []) { // Ensure pattern_sequence is iterable
        for (const taskTitle of stage.typical_tasks || []) { // Ensure typical_tasks is iterable
          tasksToCreate.push({
            workspace_id: currentWorkspaceId, // CRITICAL: Workspace scoping
            title: taskTitle,
            description: `Task from '${pattern.name}' workflow pattern - ${stage.stage_name} stage for assignment '${assignment.name}'`,
            assignment_id: assignment.id,
            status: "todo",
            priority: stage.priority || "medium", // Allow stage to define priority
            workflow_stage: stage.stage_name,
            auto_generated: true,
            generation_source: {
              source_type: "workflow_pattern",
              source_id: pattern.id,
              confidence: pattern.ai_confidence || 90, // Use AI confidence if available
              reasoning: pattern.ai_reasoning || `Generated from ${pattern.name} pattern`
            },
            estimated_effort: stage.estimated_duration || null,
            skill_requirements: stage.required_skills || []
          });
        }
      }

      // Create all tasks
      if (tasksToCreate.length > 0) {
        await base44.entities.Task.bulkCreate(tasksToCreate);
      } else {
        toast.info(`Pattern '${pattern.name}' has no tasks to create.`);
      }


      // Update pattern usage count
      // CRITICAL: Maintain workspace_id (though update by ID generally handles this implicitly in secured ORMs)
      await base44.entities.WorkflowPattern.update(pattern.id, {
        usage_count: (pattern.usage_count || 0) + 1,
        last_updated: new Date().toISOString(),
        // workspace_id: currentWorkspaceId // Redundant if updating by ID, but harmless if ORM uses it for context
      });

      toast.success(`Applied '${pattern.name}' workflow pattern - ${tasksToCreate.length} tasks created`);

      // setShowPatternDialog(false); // If a dialog were used

      if (onPatternApplied) {
        onPatternApplied(pattern, tasksToCreate);
      }
      loadWorkflowPatterns(); // Reload patterns to update usage counts
      analyzeAndSuggestPattern(); // Re-analyze for potential new suggestions
    } catch (error) {
      console.error("Error applying workflow pattern:", error);
      toast.error("Failed to apply workflow pattern.");
    } finally {
      setApplying(false);
    }
  };

  const handleSaveAsNewPattern = async (patternData) => {
    if (!assignment || !currentWorkspaceId) return;

    try {
      // CRITICAL: Create pattern with workspace_id
      const newPattern = await base44.entities.WorkflowPattern.create({
        ...patternData,
        workspace_id: currentWorkspaceId, // CRITICAL: Workspace scoping
        usage_count: 0,
        last_updated: new Date().toISOString()
      });

      toast.success("New workflow pattern saved!");
      loadWorkflowPatterns(); // Reload to include the new pattern
      analyzeAndSuggestPattern(); // Re-analyze with new pattern
      return newPattern;
    } catch (error) {
      console.error("Error saving pattern:", error);
      toast.error("Failed to save workflow pattern.");
      throw error; // Re-throw to allow further handling if needed
    }
  };

  if (!assignment) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Workflow Pattern Recognition
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">Select an assignment to view workflow patterns.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          Workflow Pattern Recognition for "{assignment.name}"
          <Badge className="bg-purple-100 text-purple-800">
            AI Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && (
          <div className="flex items-center justify-center p-4">
            <span className="animate-spin h-5 w-5 mr-3 border-t-2 border-b-2 border-purple-500 rounded-full"></span>
            Loading patterns...
          </div>
        )}

        {/* AI Suggested Pattern */}
        {suggestedPattern && (
          <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
            <h4 className="font-semibold text-lg mb-2 flex items-center gap-2 text-purple-800">
              <Lightbulb className="w-5 h-5" /> AI Suggestion
            </h4>
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-purple-900">{suggestedPattern.name}</h5>
              <Badge className="bg-purple-200 text-purple-800 text-sm">
                Confidence: {suggestedPattern.ai_confidence || suggestedPattern.success_rate || 'N/A'}%
              </Badge>
            </div>
            <p className="text-sm text-purple-700 mb-3">{suggestedPattern.ai_reasoning || suggestedPattern.description}</p>
            {suggestedPattern.isCustomSuggestion ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={applying} onClick={() => {
                  // For a custom suggestion, we'd typically open a dialog to define the pattern sequence
                  // For now, we'll just log and indicate it needs to be defined
                  toast.info("This is a new AI-suggested pattern. Define its stages to save and apply.");
                  // setShowPatternDialog(true); // If a dialog exists to define a new pattern
                }}>
                  <Plus className="w-4 h-4 mr-1" /> Define & Save
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => handleApplyPattern(suggestedPattern)}
                disabled={applying || suggestedPattern.pattern_sequence?.length === 0}
              >
                {applying ? "Applying..." : <><BookOpen className="w-4 h-4 mr-1" /> Apply Suggested Pattern</>}
              </Button>
            )}
          </div>
        )}

        {/* Available Workflow Patterns */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> Available Workflow Patterns
          </h4>
          {patterns.length === 0 && !loading && (
            <p className="text-gray-500 text-sm">No workflow patterns found for this workspace. Create a new one?</p>
          )}

          <div className="grid gap-3">
            {patterns.map((pattern) => (
              <div key={pattern.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium text-sm">{pattern.name}</p>
                  <p className="text-xs text-gray-600">
                    {pattern.success_rate ? `Success rate: ${pattern.success_rate}% • ` : ''}
                    Used {pattern.usage_count || 0} times
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleApplyPattern(pattern)}
                  disabled={applying || pattern.pattern_sequence?.length === 0}
                >
                  {applying ? "Applying..." : "Apply"}
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full mt-4"
            // onClick={() => setShowPatternDialog(true)} // If a dialog exists to define a new pattern
            onClick={() => handleSaveAsNewPattern({
              name: `New Pattern for ${assignment.name}`,
              description: `A new pattern derived from assignment ${assignment.name}`,
              assignment_type: assignment.assignment_type || 'general',
              pattern_sequence: [], // Initial empty sequence, user would define in a dialog
            })}
          >
            <Plus className="w-4 h-4 mr-2" /> Save Current as New Pattern (Placeholder)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
