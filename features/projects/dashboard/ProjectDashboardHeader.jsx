import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Target, Calendar, Users } from 'lucide-react';

const STATUS_COLORS = {
  planning: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  on_hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export default function ProjectDashboardHeader({ project, onNavigateBack }) {
  if (!project) return null;

  const formatStatus = (status) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className="flex-shrink-0 border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-4"
      style={project.color ? { borderLeftColor: project.color, borderLeftWidth: '4px' } : {}}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNavigateBack}
            className="flex-shrink-0 mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: project.color ? `${project.color}20` : 'rgb(99, 102, 241, 0.1)',
                }}
              >
                <Target
                  className="w-5 h-5"
                  style={{ color: project.color || 'rgb(99, 102, 241)' }}
                />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {project.name}
              </h1>
            </div>

            {project.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 ml-12">
                {project.description}
              </p>
            )}

            <div className="flex items-center gap-3 mt-3 ml-12 flex-wrap">
              <Badge className={STATUS_COLORS[project.status] || STATUS_COLORS.planning}>
                {formatStatus(project.status)}
              </Badge>

              {project.priority && (
                <Badge className={PRIORITY_COLORS[project.priority] || PRIORITY_COLORS.medium}>
                  {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} Priority
                </Badge>
              )}

              {project.created_date && (
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Created {formatDate(project.created_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
