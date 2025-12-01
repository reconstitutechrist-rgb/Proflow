
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router";
import { createPageUrl } from "@/lib/utils";
import { 
  FolderOpen, 
  Calendar,
  Users,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AssignmentProgress({ assignments = [], tasks = [] }) {
  // Safely handle empty or undefined props
  const safeAssignments = Array.isArray(assignments) ? assignments : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Calculate assignment progress based on tasks
  const getAssignmentProgress = (assignmentId) => {
    const assignmentTasks = safeTasks.filter(task => task.assignment_id === assignmentId);
    if (assignmentTasks.length === 0) return 0;
    const completedTasks = assignmentTasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / assignmentTasks.length) * 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'planning': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  if (safeAssignments.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        <FolderOpen className="w-16 h-16 mx-auto mb-6 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No assignments to show</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first assignment to track progress.</p>
        <Link to={createPageUrl("Assignments")}>
          <Button variant="outline" size="sm">
            Create Assignment
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {safeAssignments.slice(0, 4).map((assignment) => {
        const progress = getAssignmentProgress(assignment.id);
        const assignmentTasks = safeTasks.filter(task => task.assignment_id === assignment.id);
        
        return (
          <div key={assignment.id} className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 space-y-2">
                <h4 className="font-semibold text-gray-900 dark:text-white text-base leading-relaxed">{assignment.name}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {assignment.end_date 
                      ? `Due ${new Date(assignment.end_date).toLocaleDateString()}`
                      : 'No due date'
                    }
                  </span>
                </div>
              </div>
              <Badge className={`${getStatusColor(assignment.status)} border`} variant="secondary">
                {assignment.status?.replace('_', ' ') || 'planning'}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Progress</span>
                <span className="font-bold text-gray-900 dark:text-white">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="font-medium">{assignment.team_members?.length || 0} members</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">{assignmentTasks.filter(t => t.status === 'completed').length}/{assignmentTasks.length} tasks</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
