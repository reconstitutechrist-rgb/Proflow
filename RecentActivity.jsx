
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  FileText, 
  MessageSquare, 
  CheckCircle, 
  Clock,
  User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

export default function RecentActivity({ recentActivity = [], createPageUrl }) {
  // Safely handle empty or undefined recentActivity
  const activities = Array.isArray(recentActivity) ? recentActivity : [];

  if (activities.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        <Clock className="w-16 h-16 mx-auto mb-6 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No recent activity</h3>
        <p className="text-gray-500 dark:text-gray-400">Recent assignment activity will appear here.</p>
      </div>
    );
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'document': return FileText;
      case 'message': return MessageSquare;
      case 'task': return CheckCircle;
      default: return FileText;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'document': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'message': return 'text-green-600 bg-green-50 border-green-100';
      case 'task': return 'text-orange-600 bg-orange-50 border-orange-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = getActivityIcon(activity.type);
        const colorClass = getActivityColor(activity.type);
        
        return (
          <div key={activity.id} className={`flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 ${colorClass}`}>
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-medium text-gray-900 dark:text-white leading-relaxed text-sm">{activity.title}</p>
              {activity.subtitle && (
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{activity.subtitle}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  <span className="font-medium">{activity.user || 'Unknown'}</span>
                </div>
                <span>•</span>
                <span>{activity.time ? formatDistanceToNow(new Date(activity.time), { addSuffix: true }) : 'Recently'}</span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-medium capitalize">
              {activity.type}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
