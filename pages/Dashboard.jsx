import React, { useState, useEffect, useCallback } from 'react';
import { Assignment } from '@/api/entities';
import { Task } from '@/api/entities';
import { Document } from '@/api/entities';
import { Message } from '@/api/entities';
import { db } from '@/api/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Sparkles,
  AlertTriangle,
  Target,
  ArrowRight,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Link } from 'react-router';
import { createPageUrl } from '@/lib/utils';
import StatsOverview from '@/components/dashboard/StatsOverview';
import RecentActivity from '@/components/dashboard/RecentActivity';
import AssignmentProgress from '@/features/assignments/AssignmentProgress';
import DashboardNotes from '@/components/dashboard/DashboardNotes';
import PartnerActivity from '@/components/dashboard/PartnerActivity';
import SharedNotes from '@/components/dashboard/SharedNotes';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';

const DASHBOARD_PREFS_KEY = 'proflow_dashboard_prefs';

// Default widget visibility preferences
const DEFAULT_WIDGET_PREFS = {
  needsAttention: true,
  todaysFocus: true,
  stats: true,
  notes: true,
  partnerActivity: true,
  upcomingTasks: true,
  sharedNotes: true,
  quickActions: true,
};

// Collapsible section header component
function CollapsibleHeader({ title, icon: Icon, isOpen, onToggle, badge, className = '' }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center justify-between w-full text-left ${className}`}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5" />}
        <span>{title}</span>
        {badge}
      </div>
      {isOpen ? (
        <ChevronUp className="w-4 h-4 text-gray-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
}

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
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [todaysFocus, setTodaysFocus] = useState([]);
  const [needsAttention, setNeedsAttention] = useState({
    overdue: 0,
    dueToday: 0,
    highPriority: 0,
    blocked: 0,
  });
  const [error, setError] = useState(null);

  // Widget visibility preferences (persisted to localStorage)
  const [widgetPrefs, setWidgetPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_PREFS_KEY);
      if (saved) {
        return { ...DEFAULT_WIDGET_PREFS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Error loading dashboard preferences:', e);
    }
    return DEFAULT_WIDGET_PREFS;
  });

  // Toggle widget visibility and save to localStorage
  const toggleWidget = useCallback((widgetKey) => {
    setWidgetPrefs((prev) => {
      const updated = { ...prev, [widgetKey]: !prev[widgetKey] };
      try {
        localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving dashboard preferences:', e);
      }
      return updated;
    });
  }, []);

  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();

  useEffect(() => {
    // Only load data when we have a workspace ID and workspace context is done loading
    if (currentWorkspaceId && !workspaceLoading) {
      loadDashboardData();
    }
  }, [currentWorkspaceId, workspaceLoading]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = await db.auth.me();
      setUser(currentUser);

      // Load all data filtered by workspace
      const [assignments, tasks, documents, messages] = await Promise.allSettled([
        Assignment.filter({ workspace_id: currentWorkspaceId }, '-updated_date', 20),
        Task.filter({ workspace_id: currentWorkspaceId }, '-updated_date', 50),
        Document.filter({ workspace_id: currentWorkspaceId }, '-updated_date', 100),
        Message.filter({ workspace_id: currentWorkspaceId }, '-created_date', 50).catch(() => []),
      ]);

      const assignmentData = assignments.status === 'fulfilled' ? assignments.value : [];
      const activeAssignments = assignmentData.filter(
        (a) => a.status === 'in_progress' || a.status === 'planning'
      );

      const taskData = tasks.status === 'fulfilled' ? tasks.value : [];
      const userTasks = taskData.filter((t) => t.assigned_to === currentUser.email);
      const completedTasks = userTasks.filter((t) => t.status === 'completed');

      // Calculate today's date without time
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Calculate needs attention metrics
      const overdueTasksList = userTasks.filter((t) => {
        if (t.status === 'completed' || !t.due_date) return false;
        const dueDate = new Date(t.due_date);
        return dueDate < today;
      });

      const dueTodayTasks = userTasks.filter((t) => {
        if (t.status === 'completed' || !t.due_date) return false;
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      });

      const highPriorityTasks = userTasks.filter(
        (t) => t.status !== 'completed' && (t.priority === 'urgent' || t.priority === 'high')
      );

      const blockedTasks = userTasks.filter((t) => t.status === 'blocked');

      // Calculate Today's Focus - AI-suggested top 3 priorities
      const focusTasks = userTasks
        .filter((t) => t.status !== 'completed')
        .sort((a, b) => {
          // Priority order
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          const priorityA = priorityOrder[a.priority] || 0;
          const priorityB = priorityOrder[b.priority] || 0;

          // First sort by overdue status
          const aOverdue = a.due_date && new Date(a.due_date) < today;
          const bOverdue = b.due_date && new Date(b.due_date) < today;
          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;

          // Then by due today
          const aDueToday =
            a.due_date && new Date(a.due_date).setHours(0, 0, 0, 0) === today.getTime();
          const bDueToday =
            b.due_date && new Date(b.due_date).setHours(0, 0, 0, 0) === today.getTime();
          if (aDueToday && !bDueToday) return -1;
          if (!aDueToday && bDueToday) return 1;

          // Then by priority
          if (priorityA !== priorityB) return priorityB - priorityA;

          // Then by due date
          if (a.due_date && b.due_date) {
            return new Date(a.due_date) - new Date(b.due_date);
          }
          if (a.due_date) return -1;
          if (b.due_date) return 1;

          return 0;
        })
        .slice(0, 3);

      setOverdueTasks(overdueTasksList);
      setTodaysFocus(focusTasks);
      setNeedsAttention({
        overdue: overdueTasksList.length,
        dueToday: dueTodayTasks.length,
        highPriority: highPriorityTasks.length,
        blocked: blockedTasks.length,
      });

      const pendingTasks = userTasks
        .filter((t) => t.status !== 'completed' && t.due_date)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5);

      const documentData = documents.status === 'fulfilled' ? documents.value : [];
      const messageData = messages.status === 'fulfilled' ? messages.value : [];
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
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || workspaceLoading || !currentWorkspaceId) {
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

  // Check if there are items that need attention
  const hasNeedsAttention =
    needsAttention.overdue > 0 || needsAttention.dueToday > 0 || needsAttention.blocked > 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {user?.full_name || 'User'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's what's happening with your assignments today.
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* Needs Attention Section */}
      {hasNeedsAttention && (
        <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {needsAttention.overdue > 0 && (
                <Link to={`${createPageUrl('Tasks')}?preset=overdue`}>
                  <div className="flex items-center gap-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                    <div className="p-2 bg-red-500 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                        {needsAttention.overdue}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">Overdue</p>
                    </div>
                  </div>
                </Link>
              )}
              {needsAttention.dueToday > 0 && (
                <Link to={`${createPageUrl('Tasks')}?preset=due-today`}>
                  <div className="flex items-center gap-3 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors">
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {needsAttention.dueToday}
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">Due Today</p>
                    </div>
                  </div>
                </Link>
              )}
              {needsAttention.highPriority > 0 && (
                <Link to={`${createPageUrl('Tasks')}?priority=high`}>
                  <div className="flex items-center gap-3 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {needsAttention.highPriority}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">High Priority</p>
                    </div>
                  </div>
                </Link>
              )}
              {needsAttention.blocked > 0 && (
                <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="p-2 bg-gray-500 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                      {needsAttention.blocked}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Blocked</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Focus */}
      {todaysFocus.length > 0 && (
        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Sparkles className="w-5 h-5" />
                Today's Focus
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
              >
                AI Suggested
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {todaysFocus.map((task, index) => (
                <Link key={task.id} to={createPageUrl('Tasks')}>
                  <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-100 dark:border-purple-800 hover:shadow-md transition-shadow cursor-pointer">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                          : index === 1
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                            : 'bg-gradient-to-r from-green-500 to-emerald-500'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            task.priority === 'urgent'
                              ? 'border-red-300 text-red-600'
                              : task.priority === 'high'
                                ? 'border-orange-300 text-orange-600'
                                : 'border-gray-300 text-gray-600'
                          }`}
                        >
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <Collapsible open={widgetPrefs.stats} onOpenChange={() => toggleWidget('stats')}>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <CollapsibleHeader
                title="Overview"
                icon={TrendingUp}
                isOpen={widgetPrefs.stats}
                onToggle={() => toggleWidget('stats')}
                className="font-semibold"
              />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Active Assignments
                    </span>
                    <FolderOpen className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold">{stats.activeAssignments}</div>
                  <p className="text-xs text-gray-500 mt-1">{stats.totalAssignments} total</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Your Tasks
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.completedTasks}/{stats.totalTasks}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.totalTasks > 0
                      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
                      : 0}
                    % completed
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Documents
                    </span>
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                  <p className="text-xs text-gray-500 mt-1">Across all assignments</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Recent Messages
                    </span>
                    <MessageSquare className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold">{stats.recentMessages}</div>
                  <p className="text-xs text-gray-500 mt-1">In the last 24 hours</p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Notes Section */}
      <DashboardNotes currentUser={user} />

      {/* Two Column Layout: Partner Activity + Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Partner Activity */}
        <PartnerActivity currentUser={user} />

        {/* Upcoming Tasks */}
        <Collapsible
          open={widgetPrefs.upcomingTasks}
          onOpenChange={() => toggleWidget('upcomingTasks')}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <CollapsibleHeader
                    title="Upcoming Tasks"
                    icon={Clock}
                    isOpen={widgetPrefs.upcomingTasks}
                    onToggle={() => toggleWidget('upcomingTasks')}
                    className="font-semibold flex-1"
                  />
                </CollapsibleTrigger>
                <Link to={createPageUrl('Tasks')} className="ml-2">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {upcomingTasks.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            task.priority === 'urgent'
                              ? 'bg-red-500'
                              : task.priority === 'high'
                                ? 'bg-orange-500'
                                : task.priority === 'medium'
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
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
                              {task.status.replace('_', ' ')}
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
                    <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Team Collaboration Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SharedNotes compact={true} />
        </div>
      </div>

      {/* Quick Actions */}
      <Collapsible
        open={widgetPrefs.quickActions}
        onOpenChange={() => toggleWidget('quickActions')}
      >
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <CollapsibleHeader
                title="Quick Actions"
                icon={Zap}
                isOpen={widgetPrefs.quickActions}
                onToggle={() => toggleWidget('quickActions')}
                className="font-semibold"
              />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to={createPageUrl('Assignments')}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2"
                  >
                    <FolderOpen className="w-6 h-6" />
                    <span className="text-sm">New Assignment</span>
                  </Button>
                </Link>
                <Link to={`${createPageUrl('Tasks')}?create=true`}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="text-sm">Add Task</span>
                  </Button>
                </Link>
                <Link to={`${createPageUrl('DocumentsHub')}?tab=studio`}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2"
                  >
                    <FileText className="w-6 h-6" />
                    <span className="text-sm">New Document</span>
                  </Button>
                </Link>
                <Link to={createPageUrl('Chat')}>
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
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
