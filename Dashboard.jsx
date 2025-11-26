import React, { useState, useEffect } from "react";
import { Assignment } from "@/api/entities";
import { Task } from "@/api/entities";
import { Document } from "@/api/entities";
import { Message } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Activity,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils";
import StatsOverview from "@/StatsOverview";
import RecentActivity from "@/RecentActivity";
import AssignmentProgress from "@/AssignmentProgress";
import DashboardNotes from "@/DashboardNotes";
import PartnerActivity from "@/PartnerActivity";
import SharedNotes from "@/SharedNotes";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalAssignments: 0,
    activeAssignments: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalDocuments: 0,
    recentMessages: 0,
  });
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [error, setError] = useState(null);

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (currentWorkspaceId) {
      loadDashboardData();
    }
  }, [currentWorkspaceId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Load all data filtered by workspace
      const [assignments, tasks, documents, messages] =
        await Promise.allSettled([
          Assignment.filter(
            { workspace_id: currentWorkspaceId },
            "-updated_date",
            20
          ),
          Task.filter(
            { workspace_id: currentWorkspaceId },
            "-updated_date",
            50
          ),
          Document.filter(
            { workspace_id: currentWorkspaceId },
            "-updated_date",
            100
          ),
          Message.filter(
            { workspace_id: currentWorkspaceId },
            "-created_date",
            50
          ).catch(() => []),
        ]);

      const assignmentData =
        assignments.status === "fulfilled" ? assignments.value : [];
      const activeAssignments = assignmentData.filter(
        (a) => a.status === "in_progress" || a.status === "planning"
      );

      const taskData = tasks.status === "fulfilled" ? tasks.value : [];
      const userTasks = taskData.filter(
        (t) => t.assigned_to === currentUser.email
      );
      const completedTasks = userTasks.filter((t) => t.status === "completed");
      const pendingTasks = userTasks
        .filter((t) => t.status !== "completed" && t.due_date)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5);

      const documentData =
        documents.status === "fulfilled" ? documents.value : [];
      const messageData = messages.status === "fulfilled" ? messages.value : [];
      const recentMessages = messageData.slice(0, 10);

      setStats({
        totalAssignments: assignmentData.length,
        activeAssignments: activeAssignments.length,
        totalTasks: userTasks.length,
        completedTasks: completedTasks.length,
        totalDocuments: documentData.length,
        recentMessages: recentMessages.length,
      });

      setUpcomingTasks(pendingTasks);
    } catch (err) {
      console.error("Error loading dashboard:", err);
      setError("Failed to load dashboard data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadDashboardData} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user?.full_name || "User"}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's what's happening with your assignments today.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Assignments
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAssignments}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalAssignments} total assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.completedTasks}/{stats.totalTasks}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalTasks > 0
                ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
                : 0}
              % completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-gray-500 mt-1">Across all assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Messages
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentMessages}</div>
            <p className="text-xs text-gray-500 mt-1">In the last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Notes Section */}
      <DashboardNotes currentUser={user} />

      {/* Two Column Layout: Partner Activity + Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Partner Activity */}
        <PartnerActivity currentUser={user} />

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Tasks</CardTitle>
              <Link to={createPageUrl("Tasks")}>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        task.priority === "urgent"
                          ? "bg-red-500"
                          : task.priority === "high"
                          ? "bg-orange-500"
                          : task.priority === "medium"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {task.due_date && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {task.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No upcoming tasks</p>
                <p className="text-sm text-gray-400 mt-1">
                  You're all caught up!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Collaboration Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SharedNotes compact={true} />
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to={createPageUrl("Assignments")}>
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
              >
                <FolderOpen className="w-6 h-6" />
                <span className="text-sm">New Assignment</span>
              </Button>
            </Link>
            <Link to={createPageUrl("Tasks")}>
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-sm">Add Task</span>
              </Button>
            </Link>
            <Link to={createPageUrl("Documents")}>
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
              >
                <FileText className="w-6 h-6" />
                <span className="text-sm">Upload Document</span>
              </Button>
            </Link>
            <Link to={createPageUrl("Chat")}>
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
              >
                <MessageSquare className="w-6 h-6" />
                <span className="text-sm">Team Chat</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
