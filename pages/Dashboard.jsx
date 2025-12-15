import React, { useState, useEffect, useCallback } from 'react';
import { Assignment } from '@/api/entities';
import { Task } from '@/api/entities';
import { Document } from '@/api/entities';
import { Message } from '@/api/entities';
import { db } from '@/api/db';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  FolderOpen,
  FileText,
  Users,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Activity,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Link } from 'react-router';
import { createPageUrl } from '@/lib/utils';
import DashboardNotes from '@/components/dashboard/DashboardNotes';
import PartnerActivity from '@/components/dashboard/PartnerActivity';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';

const DASHBOARD_PREFS_KEY = 'proflow_dashboard_prefs';

// Default widget visibility preferences
const DEFAULT_WIDGET_PREFS = {
  needsAttention: true,
  todaysFocus: true,
  stats: true,
  notes: false, // collapsed by default
  partnerActivity: true,
  upcomingTasks: true,
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
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [todaysFocus, setTodaysFocus] = useState([]);
  const [needsAttention, setNeedsAttention] = useState({
    overdue: 0,
    dueToday: 0,
    highPriority: 0,
    blocked: 0,
  });
  const [error, setError] = useState(null);

  // Teammate activity for the Overview section
  const [teamActivity, setTeamActivity] = useState({
    tasks: [],
    documents: [],
    messages: [],
    assignments: [],
  });

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

      const taskData = tasks.status === 'fulfilled' ? tasks.value : [];
      const userTasks = taskData.filter((t) => t.assigned_to === currentUser.email);

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

      // Calculate teammate activity (last 24 hours, not from current user)
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const teammateTaskActivity = taskData
        .filter((t) => {
          const updateDate = new Date(t.updated_date || t.created_date);
          const isRecent = updateDate >= oneDayAgo;
          const isTeammate =
            t.created_by !== currentUser.email && t.assigned_to !== currentUser.email;
          return isRecent && isTeammate;
        })
        .slice(0, 5)
        .map((t) => ({
          id: t.id,
          title: t.title,
          by: t.created_by,
          date: t.updated_date || t.created_date,
          action: t.status === 'completed' ? 'completed' : 'updated',
        }));

      const teammateDocActivity = documentData
        .filter((d) => {
          const updateDate = new Date(d.updated_date || d.created_date);
          const isRecent = updateDate >= oneDayAgo;
          const isTeammate = d.created_by !== currentUser.email;
          return isRecent && isTeammate;
        })
        .slice(0, 5)
        .map((d) => ({
          id: d.id,
          title: d.title || d.file_name,
          by: d.created_by,
          date: d.updated_date || d.created_date,
          action: 'added',
        }));

      const teammateMessageActivity = messageData
        .filter((m) => {
          const createDate = new Date(m.created_date);
          const isRecent = createDate >= oneDayAgo;
          const isTeammate = m.author_email !== currentUser.email;
          return isRecent && isTeammate;
        })
        .slice(0, 5)
        .map((m) => ({
          id: m.id,
          title: m.content?.substring(0, 50) + (m.content?.length > 50 ? '...' : ''),
          by: m.author_email,
          date: m.created_date,
          action: 'sent',
        }));

      const teammateAssignmentActivity = assignmentData
        .filter((a) => {
          const updateDate = new Date(a.updated_date || a.created_date);
          const isRecent = updateDate >= oneDayAgo;
          const isTeammate = a.created_by !== currentUser.email;
          return isRecent && isTeammate;
        })
        .slice(0, 5)
        .map((a) => ({
          id: a.id,
          title: a.name,
          by: a.created_by,
          date: a.updated_date || a.created_date,
          action: 'updated',
        }));

      setTeamActivity({
        tasks: teammateTaskActivity,
        documents: teammateDocActivity,
        messages: teammateMessageActivity,
        assignments: teammateAssignmentActivity,
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

      {/* Team Activity */}
      <Collapsible open={widgetPrefs.stats} onOpenChange={() => toggleWidget('stats')}>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <CollapsibleHeader
                title="Team Activity"
                icon={Users}
                isOpen={widgetPrefs.stats}
                onToggle={() => toggleWidget('stats')}
                className="font-semibold"
                badge={<span className="text-xs text-gray-500 ml-2">Last 24 hours</span>}
              />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Tasks */}
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                        {teamActivity.tasks.length > 0 ? `+${teamActivity.tasks.length}` : '—'}
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-500">Tasks</p>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-72">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Recent Task Activity</h4>
                      {teamActivity.tasks.length > 0 ? (
                        teamActivity.tasks.map((item) => (
                          <div key={item.id} className="text-sm border-l-2 border-green-400 pl-2">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-xs text-gray-500">
                              {item.by?.split('@')[0]} •{' '}
                              {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No recent task activity</p>
                      )}
                      <Link
                        to={createPageUrl('Tasks')}
                        className="text-xs text-blue-600 hover:underline block mt-2"
                      >
                        View all tasks →
                      </Link>
                    </div>
                  </HoverCardContent>
                </HoverCard>

                {/* Documents */}
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                        {teamActivity.documents.length > 0
                          ? `+${teamActivity.documents.length}`
                          : '—'}
                      </div>
                      <p className="text-xs text-purple-600 dark:text-purple-500">Documents</p>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-72">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Recent Document Activity</h4>
                      {teamActivity.documents.length > 0 ? (
                        teamActivity.documents.map((item) => (
                          <div key={item.id} className="text-sm border-l-2 border-purple-400 pl-2">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-xs text-gray-500">
                              {item.by?.split('@')[0]} •{' '}
                              {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No recent document activity</p>
                      )}
                      <Link
                        to={createPageUrl('Documents')}
                        className="text-xs text-blue-600 hover:underline block mt-2"
                      >
                        View all documents →
                      </Link>
                    </div>
                  </HoverCardContent>
                </HoverCard>

                {/* Messages */}
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <MessageSquare className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                        {teamActivity.messages.length > 0
                          ? `+${teamActivity.messages.length}`
                          : '—'}
                      </div>
                      <p className="text-xs text-orange-600 dark:text-orange-500">Messages</p>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-72">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Recent Messages</h4>
                      {teamActivity.messages.length > 0 ? (
                        teamActivity.messages.map((item) => (
                          <div key={item.id} className="text-sm border-l-2 border-orange-400 pl-2">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-xs text-gray-500">
                              {item.by?.split('@')[0]} •{' '}
                              {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No recent messages</p>
                      )}
                      <Link
                        to={createPageUrl('Chat')}
                        className="text-xs text-blue-600 hover:underline block mt-2"
                      >
                        View chat →
                      </Link>
                    </div>
                  </HoverCardContent>
                </HoverCard>

                {/* Assignments */}
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <FolderOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                        {teamActivity.assignments.length > 0
                          ? `+${teamActivity.assignments.length}`
                          : '—'}
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-500">Assignments</p>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-72">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Recent Assignment Activity</h4>
                      {teamActivity.assignments.length > 0 ? (
                        teamActivity.assignments.map((item) => (
                          <div key={item.id} className="text-sm border-l-2 border-blue-400 pl-2">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-xs text-gray-500">
                              {item.by?.split('@')[0]} •{' '}
                              {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No recent assignment activity</p>
                      )}
                      <Link
                        to={createPageUrl('Assignments')}
                        className="text-xs text-blue-600 hover:underline block mt-2"
                      >
                        View all assignments →
                      </Link>
                    </div>
                  </HoverCardContent>
                </HoverCard>
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
    </div>
  );
}
