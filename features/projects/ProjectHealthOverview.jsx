
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  FileText,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  Loader2
} from "lucide-react";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { toast } from "sonner"; // Changed toast import
import { db } from "@/api/db";

export default function ProjectHealthOverview({ projectId }) {
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);

  const { currentWorkspaceId } = useWorkspace();

  const loadHealthData = useCallback(async () => {
    if (!projectId || !currentWorkspaceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // CRITICAL: Load only data from current workspace
      // Assuming db.entities.Project, Assignment, Task are available
      const [projectResult, assignmentsResult, tasksResult] = await Promise.all([
        db.entities.Project.filter({
          workspace_id: currentWorkspaceId,
          id: projectId
        }, "-updated_date", 1), // Limiting to 1 project
        db.entities.Assignment.filter({
          workspace_id: currentWorkspaceId,
          project_id: projectId
        }, "-updated_date"),
        db.entities.Task.filter({
          workspace_id: currentWorkspaceId
        }, "-updated_date")
      ]);

      const project = projectResult.length > 0 ? projectResult[0] : null;
      const assignments = assignmentsResult;
      const tasks = tasksResult;

      // CRITICAL: Validate project belongs to current workspace
      if (!project || project.workspace_id !== currentWorkspaceId) {
        console.error("Security violation: Project not in current workspace or not found");
        toast.error("Cannot access project from other workspaces or project not found.");
        setHealthData(null);
        setLoading(false);
        return;
      }

      // Filter tasks that belong to this project's assignments
      const assignmentIds = assignments.map(a => a.id);
      const projectTasks = tasks.filter(t => assignmentIds.includes(t.assignment_id));

      // Calculate health metrics
      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
      const overdueTasks = projectTasks.filter(t => {
        if (t.status === 'completed' || !t.due_date) return false;
        return new Date(t.due_date) < new Date();
      }).length;

      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const activeAssignments = assignments.filter(a =>
        a.status === 'in_progress' || a.status === 'planning'
      ).length;

      // Calculate health score (0-100)
      let healthScore = 100;
      if (overdueTasks > 0) healthScore -= (overdueTasks / totalTasks) * 30; // Penalize for overdue tasks
      if (progressPercentage < 50 && totalTasks > 0) healthScore -= 20; // Penalize for low progress
      if (activeAssignments === 0 && assignments.length > 0) healthScore -= 10; // Penalize if no active assignments but assignments exist

      setHealthData({
        project: project,
        totalAssignments: assignments.length,
        activeAssignments: activeAssignments,
        totalTasks: totalTasks,
        completedTasks: completedTasks,
        overdueTasks: overdueTasks,
        progressPercentage: progressPercentage,
        healthScore: Math.max(0, Math.round(healthScore)),
        assignments: assignments,
        tasks: projectTasks
      });
    } catch (error) {
      console.error("Error loading health data:", error);
      toast.error("Failed to load project health data");
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, currentWorkspaceId]);

  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  const getHealthColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusIcon = (score) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return Clock;
    return AlertTriangle;
  };

  const overallHealth = healthData?.healthScore || 0;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Project Health Overview
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-blue-600">{overallHealth}%</div>
            <div className="text-sm text-gray-500">Overall Health</div>
          </div>
          <Progress value={overallHealth} className="flex-1 h-2" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="sr-only">Loading...</span>
          </div>
        ) : healthData ? (
          <div className="space-y-4">
            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {React.createElement(getStatusIcon(healthData.healthScore), {
                    className: `w-5 h-5 ${
                      healthData.healthScore >= 80 ? 'text-green-500' :
                      healthData.healthScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                    }`
                  })}
                  <div>
                    <h4 className="font-semibold text-gray-900">{healthData.project.name}</h4>
                    <p className="text-sm text-gray-500">{healthData.project.status?.replace('_', ' ') || 'Unknown Status'}</p>
                  </div>
                </div>
                <Badge className={`${getHealthColor(healthData.healthScore)} border`}>
                  {healthData.healthScore}% Health
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{healthData.totalAssignments}</div>
                  <div className="text-gray-500">Total Assignments</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">{healthData.activeAssignments}</div>
                  <div className="text-gray-500">Active Assignments</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-purple-600">{healthData.progressPercentage}%</div>
                  <div className="text-gray-500">Task Progress</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-orange-600">{healthData.overdueTasks}</div>
                  <div className="text-gray-500">Overdue Tasks</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No project data available for health analysis. Please ensure a valid project ID is provided.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
