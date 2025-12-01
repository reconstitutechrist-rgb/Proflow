import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { db } from "@/api/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Calendar,
  Users as UsersIcon,
  FileText,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Target,
  Edit,
  Plus,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  Download,
  Share2,
  MoreHorizontal
} from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import RelatedContentSuggestions from "@/RelatedContentSuggestions";

export default function AssignmentDetails({
  assignment,
  onClose,
  onEdit,
  currentUser
}) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const handleAddTask = () => {
    // Navigate to Tasks page with assignment pre-selected
    navigate(`/Tasks?assignment=${assignment.id}`);
  };

  useEffect(() => {
    if (!assignment) return;

    const loadAssignmentData = async () => {
      try {
        setLoading(true);

        const [tasksData, docsData, messagesData, usersData] = await Promise.all([
          db.entities.Task.filter({ assignment_id: assignment.id }, "-updated_date"),
          assignment.workspace_id
            ? db.entities.Document.filter({ workspace_id: assignment.workspace_id })
            : [],
          db.entities.Message.filter({ assignment_id: assignment.id }, "-created_date"),
          db.entities.User.list() // Users are filtered client-side by team membership
        ]);

        setTasks(tasksData);

        // Filter documents that are assigned to this assignment
        const assignmentDocs = docsData.filter(doc =>
          doc.assigned_to_assignments && doc.assigned_to_assignments.includes(assignment.id)
        );
        setDocuments(assignmentDocs);

        setMessages(messagesData.slice(0, 10)); // Latest 10 messages

        // Get team members including manager
        const teamEmails = [
          assignment.assignment_manager,
          ...(assignment.team_members || [])
        ].filter(Boolean);

        const members = usersData.filter(user => teamEmails.includes(user.email));
        setTeamMembers(members);
      } catch (error) {
        console.error("Error loading assignment data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAssignmentData();
  }, [assignment]);

  // Assignment statistics
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const reviewTasks = tasks.filter(t => t.status === 'review').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Overdue tasks
    const overdueTasks = tasks.filter(task => {
      if (!task.due_date || task.status === 'completed') return false;
      return new Date(task.due_date) < new Date();
    }).length;

    // High priority tasks
    const highPriorityTasks = tasks.filter(t =>
      ['high', 'urgent'].includes(t.priority) && t.status !== 'completed'
    ).length;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      reviewTasks,
      todoTasks,
      progress,
      overdueTasks,
      highPriorityTasks,
      totalDocuments: documents.length,
      totalMessages: messages.length
    };
  }, [tasks, documents, messages]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'planning': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTaskStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'review': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <Target className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleDownloadAllDocuments = async () => {
    if (documents.length === 0) {
      alert("No documents to download for this assignment.");
      return;
    }

    // Warn user about multiple downloads
    const confirmed = window.confirm(
      `This will download ${documents.length} document${documents.length > 1 ? 's' : ''} from "${assignment.name}". ` +
      "Your browser may ask for permission to download multiple files. Continue?"
    );
    
    if (!confirmed) {
      return;
    }

    setIsDownloadingAll(true);

    try {
      // Add a small delay between downloads to prevent browser blocking
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];

        // Create temporary download link
        const link = window.document.createElement('a');
        link.href = doc.file_url;
        link.download = doc.file_name || `document-${doc.id}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        // Append to body, click, then remove
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);

        // Small delay between downloads (100ms)
        if (i < documents.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Show success feedback
      setTimeout(() => {
        alert(`Started downloading ${documents.length} document${documents.length > 1 ? 's' : ''} for "${assignment.name}"`);
      }, 500);

    } catch (error) {
      console.error("Error downloading documents:", error);
      alert("Failed to download some documents. Please try again.");
    } finally {
      setIsDownloadingAll(false);
    }
  };


  const canEdit = currentUser?.user_role === 'admin' ||
                  currentUser?.user_role === 'project_manager' ||
                  currentUser?.email === assignment.assignment_manager;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assignments
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {/* Download All Documents Button */}
          {documents.length > 0 && (
            <Button
              onClick={handleDownloadAllDocuments}
              disabled={isDownloadingAll}
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            >
              {isDownloadingAll ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download All Documents ({documents.length})
                </>
              )}
            </Button>
          )}

          {canEdit && (
            <Button onClick={() => onEdit(assignment)} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Assignment
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Share2 className="w-4 h-4 mr-2" />
                Share Assignment
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Assignment Header */}
      <Card className="border-l-4" style={{ borderLeftColor: assignment.color }}>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{assignment.name}</h1>
                <Badge className={`border ${getStatusColor(assignment.status)}`} variant="secondary">
                  {assignment.status.replace('_', ' ')}
                </Badge>
                <Badge className={getPriorityColor(assignment.priority)}>
                  {assignment.priority}
                </Badge>
              </div>
              <p className="text-lg text-gray-600 max-w-3xl">{assignment.description}</p>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                {assignment.start_date && assignment.end_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(assignment.start_date), 'MMM d')} - {format(new Date(assignment.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" />
                  <span>{teamMembers.length} team members</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{stats.progress}%</div>
              <div className="text-sm text-gray-500">Complete</div>
              <Progress value={stats.progress} className="mt-2 w-32" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalTasks}</div>
            <p className="text-sm text-gray-600">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
            <p className="text-sm text-gray-600">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgressTasks}</div>
            <p className="text-sm text-gray-600">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.reviewTasks}</div>
            <p className="text-sm text-gray-600">Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.todoTasks}</div>
            <p className="text-sm text-gray-600">To Do</p>
          </CardContent>
        </Card>
        <Card className={`${stats.overdueTasks > 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
            <p className="text-sm text-gray-600">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalDocuments}</div>
            <p className="text-sm text-gray-600">Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.totalMessages}</div>
            <p className="text-sm text-gray-600">Messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs and Related Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="tasks" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="tasks">Tasks ({stats.totalTasks})</TabsTrigger>
              <TabsTrigger value="documents">Documents ({stats.totalDocuments})</TabsTrigger>
              <TabsTrigger value="team">Team ({teamMembers.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* Tasks Tab */}
            <TabsContent value="tasks">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Assignment Tasks</span>
                    <Button size="sm" onClick={handleAddTask}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tasks.length > 0 ? (
                    <div className="space-y-4">
                      {tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex-shrink-0">
                            {getTaskStatusIcon(task.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{task.title}</h4>
                            <p className="text-sm text-gray-600 truncate">{task.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <Badge className={`text-xs ${
                                task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {task.priority}
                              </Badge>
                              {task.assigned_to && (
                                <span className="text-xs text-gray-500">
                                  Assigned to {teamMembers.find(m => m.email === task.assigned_to)?.full_name || task.assigned_to}
                                </span>
                              )}
                              {task.due_date && (
                                <span className="text-xs text-gray-500">
                                  Due {format(new Date(task.due_date), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className={`${getStatusColor(task.status)} border`}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
                      <p className="text-gray-500 mb-4">Create your first task to get started</p>
                      <Button onClick={handleAddTask}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Task
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Assignment Documents</span>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.length > 0 ? (
                    <div className="space-y-4">
                      {documents.map(doc => (
                        <div key={doc.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex-shrink-0">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{doc.title}</h4>
                            <p className="text-sm text-gray-600 truncate">{doc.file_name}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-gray-500">
                                {((doc.file_size || 0) / 1024 / 1024).toFixed(1)} MB
                              </span>
                              <span className="text-xs text-gray-500">
                                {format(new Date(doc.created_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                      <p className="text-gray-500 mb-4">Upload your first document</p>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team">
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Assignment Manager */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Manager</h3>
                      {(() => {
                        const manager = teamMembers.find(m => m.email === assignment.assignment_manager);
                        return manager ? (
                          <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                            <Avatar className="w-12 h-12">
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                                {manager.full_name?.split(' ').map(n => n[0]).join('') || 'M'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{manager.full_name}</h4>
                              <p className="text-sm text-gray-600">{manager.job_title}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Mail className="w-3 h-3" />
                                  <span>{manager.email}</span>
                                </div>
                                {manager.phone && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Phone className="w-3 h-3" />
                                    <span>{manager.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Manager
                            </Badge>
                          </div>
                        ) : (
                          <p className="text-gray-500">No manager assigned</p>
                        );
                      })()}
                    </div>

                    {/* Team Members */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h3>
                      {teamMembers.filter(m => m.email !== assignment.assignment_manager).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {teamMembers.filter(m => m.email !== assignment.assignment_manager).map(member => (
                            <div key={member.email} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-gray-100 text-gray-600 font-semibold">
                                  {member.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 truncate">{member.full_name}</h4>
                                <p className="text-sm text-gray-600 truncate">{member.job_title}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                  <Mail className="w-3 h-3" />
                                  <span className="truncate">{member.email}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No additional team members</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map(message => (
                        <div key={message.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">
                              {message.author_name?.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-gray-900">
                                {message.author_name || message.author_email}
                              </span>
                              <span className="text-xs text-gray-500">
                                {format(new Date(message.created_date), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{message.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
                      <p className="text-gray-500">Team activity and messages will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          {/* Related Content Suggestions */}
          <RelatedContentSuggestions
            currentItem={assignment}
            itemType="assignment"
            maxSuggestions={5}
          />
          {/* Add any other existing sidebar content here if applicable */}
        </div>
      </div>
    </div>
  );
}
