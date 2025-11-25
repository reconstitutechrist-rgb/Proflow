
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Calendar,
  Users,
  ChevronRight
} from "lucide-react";

// Helper function to lighten a hex color by a given percentage
const lightenColor = (hex, percent) => {
  let f = parseInt(hex.slice(1), 16),
    t = percent < 0 ? 0 : 255,
    p = percent < 0 ? percent * -1 : percent,
    c = '#';
  for (let i = 0; i < 3; i++) {
    let v = f % 256;
    f = Math.floor(f / 256);
    let l = Math.round((t - v) * (p / 100)) + v;
    c += ('00' + l.toString(16)).slice(-2);
  }
  return c;
};

export default function AssignmentGrid({ assignments, onSelectAssignment }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-200 text-green-800 dark:bg-green-700 dark:text-green-200';
      case 'in_progress': return 'bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-200';
      case 'on_hold': return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200';
      case 'planning': return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'cancelled': return 'bg-red-200 text-red-800 dark:bg-red-700 dark:text-red-200';
      default: return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 text-red-700 dark:text-red-300';
      case 'high': return 'border-orange-500 text-orange-700 dark:text-orange-300';
      case 'medium': return 'border-yellow-500 text-yellow-700 dark:text-yellow-300';
      case 'low': return 'border-green-500 text-green-700 dark:text-green-300';
      default: return 'border-gray-300 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assignments.map((assignment) => (
        <Card
          key={assignment.id}
          className="group cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl overflow-hidden hover:-translate-y-1"
          onClick={() => onSelectAssignment && onSelectAssignment(assignment)}
        >
          <div
            className="h-3"
            style={{
              background: `linear-gradient(to right, ${assignment.color || '#3B82F6'}, ${lightenColor(assignment.color || '#3B82F6', 40)})`
            }}
          />
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {assignment.name}
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {assignment.description}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={`ml-3 rounded-lg font-medium ${getStatusColor(assignment.status)}`}
              >
                {assignment.status?.replace('_', ' ') || 'Planning'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>
                  {assignment.start_date
                    ? new Date(assignment.start_date).toLocaleDateString()
                    : 'No date'}
                </span>
              </div>
              {assignment.priority && (
                <Badge variant="outline" className={`rounded-lg capitalize ${getPriorityColor(assignment.priority)}`}>
                  {assignment.priority}
                </Badge>
              )}
            </div>

            {assignment.team_members && assignment.team_members.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {assignment.team_members.length} member{assignment.team_members.length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex -space-x-2">
                {assignment.team_members?.slice(0, 3).map((email, idx) => (
                  <div
                    key={idx}
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white text-xs font-medium shadow-md"
                    title={email}
                  >
                    {email[0].toUpperCase()}
                  </div>
                ))}
                {assignment.team_members && assignment.team_members.length > 3 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 shadow-md">
                    +{assignment.team_members.length - 3}
                  </div>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
