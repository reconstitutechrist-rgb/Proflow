import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  X,
  Edit,
  Calendar,
  Users,
  FolderOpen,
  Target,
  DollarSign,
  Tag as TagIcon,
  Trash2,
  LayoutDashboard,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectDetails({
  project,
  onClose,
  onEdit,
  onDelete,
  onNavigateToAssignments,
  onNavigateToDashboard,
  currentUser,
}) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'planning':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  {project.name}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`${getStatusColor(project.status)} rounded-full`}>
                  {project.status.replace('_', ' ')}
                </Badge>
                <Badge className={`${getPriorityColor(project.priority)} rounded-full`}>
                  {project.priority}
                </Badge>
              </div>
              {project.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-2">{project.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onEdit(project)} className="rounded-xl">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => onDelete(project)}
                className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button variant="outline" onClick={onClose} className="rounded-xl">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Goals */}
          {project.goals && (
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Goals & Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {project.goals}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-purple-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => onNavigateToDashboard(project.id)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Open Project Dashboard
              </Button>
              <Button
                onClick={() => onNavigateToAssignments(project.id)}
                variant="outline"
                className="w-full rounded-xl"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                View All Assignments
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Project Info */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl">
            <CardHeader>
              <CardTitle>Project Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(project.start_date || project.end_date) && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Timeline</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {project.start_date && format(new Date(project.start_date), 'MMM d, yyyy')}
                      {project.start_date && project.end_date && ' - '}
                      {project.end_date && format(new Date(project.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {project.budget && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ${project.budget.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {project.project_manager && (
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Project Manager
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {project.project_manager}
                    </p>
                  </div>
                </div>
              )}

              {project.client_contact && (
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Client Contact
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {project.client_contact}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          {project.team_members && project.team_members.length > 0 && (
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Team Members ({project.team_members.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {project.team_members.map((email) => (
                    <div key={email} className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                          {email.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{email}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TagIcon className="w-5 h-5 text-purple-600" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
