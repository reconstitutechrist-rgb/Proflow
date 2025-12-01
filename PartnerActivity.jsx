import React, { useState, useEffect } from "react";
import { Task } from "@/api/entities";
import { Document } from "@/api/entities";
import { Message } from "@/api/entities";
import { User } from "@/api/entities";
import { db } from "@/api/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  CheckCircle2,
  FileText,
  MessageSquare,
  Clock,
  ArrowRight,
  Activity,
  Eye,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router";
import { createPageUrl } from "@/lib/utils";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

export default function PartnerActivity({ currentUser }) {
  const [partner, setPartner] = useState(null);
  const [partnerActivity, setPartnerActivity] = useState([]);
  const [partnerStats, setPartnerStats] = useState({
    tasksCompletedToday: 0,
    documentsEdited: 0,
    messagessSent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { currentWorkspace, currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (currentWorkspaceId && currentUser) {
      loadPartnerActivity();
    }
  }, [currentWorkspaceId, currentUser]);

  const loadPartnerActivity = async () => {
    try {
      setLoading(true);

      // Get workspace members and find the partner (other user)
      const workspaceMembers = currentWorkspace?.members || [];
      const partnerEmail = workspaceMembers.find(
        (email) => email !== currentUser?.email
      );

      if (!partnerEmail) {
        setPartner(null);
        setLoading(false);
        return;
      }

      // Load partner user info
      const users = await User.list();
      const partnerUser = users.find((u) => u.email === partnerEmail);
      setPartner(
        partnerUser || {
          email: partnerEmail,
          full_name: partnerEmail.split("@")[0],
        }
      );

      // Load partner's recent activity
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [tasks, documents, messages] = await Promise.all([
        Task.filter({ workspace_id: currentWorkspaceId }, "-updated_date", 50),
        Document.filter(
          { workspace_id: currentWorkspaceId },
          "-updated_date",
          50
        ),
        Message.filter(
          { workspace_id: currentWorkspaceId },
          "-created_date",
          50
        ).catch(() => []),
      ]);

      // Filter for partner's activity
      const partnerTasks = tasks.filter(
        (t) =>
          t.assigned_to === partnerEmail ||
          t.created_by === partnerEmail ||
          t.completed_by === partnerEmail
      );

      const partnerDocs = documents.filter(
        (d) =>
          d.created_by === partnerEmail || d.last_edited_by === partnerEmail
      );

      const partnerMessages = messages.filter(
        (m) => m.author_email === partnerEmail
      );

      // Build activity feed
      const activities = [];

      // Add task activities
      partnerTasks.slice(0, 5).forEach((task) => {
        const isCompleted = task.status === "completed";
        const activityDate = new Date(task.updated_date || task.created_date);

        activities.push({
          id: `task-${task.id}`,
          type: "task",
          action: isCompleted
            ? "completed"
            : task.created_by === partnerEmail
            ? "created"
            : "updated",
          title: task.title,
          entityId: task.id,
          timestamp: activityDate,
          icon: CheckCircle2,
          color: isCompleted
            ? "text-green-600 bg-green-50"
            : "text-blue-600 bg-blue-50",
        });
      });

      // Add document activities
      partnerDocs.slice(0, 5).forEach((doc) => {
        const activityDate = new Date(doc.updated_date || doc.created_date);
        const isNew =
          doc.created_by === partnerEmail &&
          new Date() - activityDate < 24 * 60 * 60 * 1000;

        activities.push({
          id: `doc-${doc.id}`,
          type: "document",
          action: isNew ? "created" : "edited",
          title: doc.title || doc.file_name,
          entityId: doc.id,
          timestamp: activityDate,
          icon: FileText,
          color: "text-purple-600 bg-purple-50",
        });
      });

      // Add message activities
      partnerMessages.slice(0, 3).forEach((msg) => {
        activities.push({
          id: `msg-${msg.id}`,
          type: "message",
          action: "sent",
          title:
            msg.content?.substring(0, 60) +
            (msg.content?.length > 60 ? "..." : ""),
          entityId: msg.thread_id,
          timestamp: new Date(msg.created_date),
          icon: MessageSquare,
          color: "text-orange-600 bg-orange-50",
        });
      });

      // Sort by timestamp and take top 8
      activities.sort((a, b) => b.timestamp - a.timestamp);
      setPartnerActivity(activities.slice(0, 8));

      // Calculate stats
      const tasksCompletedToday = partnerTasks.filter((t) => {
        const completedDate = new Date(t.completed_date || t.updated_date);
        return t.status === "completed" && completedDate >= today;
      }).length;

      setPartnerStats({
        tasksCompletedToday,
        documentsEdited: partnerDocs.length,
        messagesSent: partnerMessages.length,
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error loading partner activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityLink = (activity) => {
    switch (activity.type) {
      case "task":
        return createPageUrl("Tasks") + `?task=${activity.entityId}`;
      case "document":
        return createPageUrl("Documents") + `?doc=${activity.entityId}`;
      case "message":
        return createPageUrl("Chat") + `?thread=${activity.entityId}`;
      default:
        return "#";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Partner Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!partner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Partner Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              No partner in this workspace
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Invite a team member to collaborate
            </p>
            <Link to={createPageUrl("Users")}>
              <Button variant="outline" size="sm" className="mt-4">
                Manage Team
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Partner Activity
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadPartnerActivity}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Partner Header */}
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg">
          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
            <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
              {partner?.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">
              {partner?.full_name || partner?.email}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {partnerStats.tasksCompletedToday} tasks today
            </p>
          </div>
          <Link to={createPageUrl("Chat")}>
            <Button size="sm" variant="outline" className="gap-1">
              <MessageSquare className="w-3 h-3" />
              Message
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 mx-auto text-green-600 mb-1" />
            <p className="text-lg font-bold text-green-700 dark:text-green-400">
              {partnerStats.tasksCompletedToday}
            </p>
            <p className="text-xs text-green-600">Tasks Today</p>
          </div>
          <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <FileText className="w-4 h-4 mx-auto text-purple-600 mb-1" />
            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
              {partnerStats.documentsEdited}
            </p>
            <p className="text-xs text-purple-600">Documents</p>
          </div>
          <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <MessageSquare className="w-4 h-4 mx-auto text-orange-600 mb-1" />
            <p className="text-lg font-bold text-orange-700 dark:text-orange-400">
              {partnerStats.messagesSent}
            </p>
            <p className="text-xs text-orange-600">Messages</p>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Recent Activity
          </p>
          {partnerActivity.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {partnerActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <Link
                    key={activity.id}
                    to={getActivityLink(activity)}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <div className={`p-1.5 rounded-md ${activity.color}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.action} •{" "}
                        {formatDistanceToNow(activity.timestamp, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <Clock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          )}
        </div>

        {/* Last updated */}
        <p className="text-xs text-gray-400 text-center">
          Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  );
}
