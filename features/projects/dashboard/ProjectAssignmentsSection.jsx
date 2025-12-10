import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, ChevronRight, Calendar, Users } from 'lucide-react';

const STATUS_COLORS = {
  planning: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  on_hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const PRIORITY_COLORS = {
  low: 'border-gray-300 dark:border-gray-600',
  medium: 'border-blue-400 dark:border-blue-500',
  high: 'border-orange-400 dark:border-orange-500',
  urgent: 'border-red-400 dark:border-red-500',
};

export default function ProjectAssignmentsSection({ assignments, onAssignmentClick }) {
  const formatStatus = (status) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-purple-600" />
          Assignments
          <Badge variant="secondary" className="ml-1">
            {assignments.length}
          </Badge>
        </h2>
      </div>

      {assignments.length === 0 ? (
        <Card className="bg-gray-50 dark:bg-gray-800/50 border-dashed">
          <CardContent className="p-6 text-center">
            <FolderOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No assignments found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assignments.map((assignment) => (
            <Card
              key={assignment.id}
              className={`cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 ${
                PRIORITY_COLORS[assignment.priority] || PRIORITY_COLORS.medium
              }`}
              onClick={() => onAssignmentClick(assignment)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {assignment.name}
                      </h3>
                    </div>

                    {assignment.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mb-2">
                        {assignment.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={STATUS_COLORS[assignment.status] || STATUS_COLORS.planning}>
                        {formatStatus(assignment.status)}
                      </Badge>

                      {assignment.end_date && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due {formatDate(assignment.end_date)}
                        </span>
                      )}

                      {assignment.team_members?.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {assignment.team_members.length} member
                          {assignment.team_members.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
