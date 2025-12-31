import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderOpen, Calendar, Users, Clock } from 'lucide-react';

const STATUS_OPTIONS = [
  {
    value: 'planning',
    label: 'Planning',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    value: 'on_hold',
    label: 'On Hold',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  {
    value: 'completed',
    label: 'Completed',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-gray-600 dark:text-gray-400' },
  { value: 'medium', label: 'Medium', color: 'text-blue-600 dark:text-blue-400' },
  { value: 'high', label: 'High', color: 'text-orange-600 dark:text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-600 dark:text-red-400' },
];

const PRIORITY_BORDER_COLORS = {
  low: 'border-gray-300 dark:border-gray-600',
  medium: 'border-blue-400 dark:border-blue-500',
  high: 'border-orange-400 dark:border-orange-500',
  urgent: 'border-red-400 dark:border-red-500',
};

export default function ProjectAssignmentsSection({
  assignments,
  onStatusChange,
  onPriorityChange,
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <Card
              key={assignment.id}
              className={`border-l-4 ${
                PRIORITY_BORDER_COLORS[assignment.priority] || PRIORITY_BORDER_COLORS.medium
              }`}
            >
              <CardContent className="p-4">
                {/* Header: Title + Dropdowns */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">{assignment.name}</h3>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status Dropdown */}
                    <Select
                      value={assignment.status || 'planning'}
                      onValueChange={(value) => onStatusChange(assignment.id, value)}
                    >
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <span className={status.color}>{status.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Priority Dropdown */}
                    <Select
                      value={assignment.priority || 'medium'}
                      onValueChange={(value) => onPriorityChange(assignment.id, value)}
                    >
                      <SelectTrigger className="h-7 w-[100px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            <span className={priority.color}>{priority.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description - Full display */}
                {assignment.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 whitespace-pre-wrap">
                    {assignment.description}
                  </p>
                )}

                {/* Metadata row */}
                <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                  {assignment.start_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Start: {formatDate(assignment.start_date)}
                    </span>
                  )}

                  {assignment.end_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Due: {formatDate(assignment.end_date)}
                    </span>
                  )}

                  {assignment.team_members?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {assignment.team_members.length} member
                      {assignment.team_members.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Team members detail */}
                {assignment.team_members?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex flex-wrap gap-2">
                      {assignment.team_members.map((member, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs bg-purple-50 dark:bg-purple-900/20"
                        >
                          {member}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
