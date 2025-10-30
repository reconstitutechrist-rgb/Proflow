
import React, { useState, useEffect, useMemo } from "react";
import { DocumentComment } from "@/api/entities";
import { Task } from "@/api/entities";
import { ConversationThread } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  Send,
  MoreVertical,
  CheckCircle2,
  Link2,
  Trash2,
  Reply,
  AlertCircle,
  HelpCircle,
  ThumbsUp,
  FileText,
  Loader2,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useWorkspace } from "../workspace/WorkspaceContext"; // Added import

const commentTypeIcons = {
  general: MessageSquare,
  feedback: ThumbsUp,
  question: HelpCircle,
  issue: AlertCircle,
  approval: CheckCircle2
};

const commentTypeColors = {
  general: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  feedback: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  question: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  issue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  approval: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
};

// Error Boundary for this component
class CommentsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("DocumentComments Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to load comments
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {this.state.error?.message || "An error occurred"}
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Updated props for DocumentCommentsInner
function DocumentCommentsInner({ documentId, documentTitle, currentUser, assignments = [] }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState("general");
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [threads, setThreads] = useState([]);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState("");
  
  // All users for @mention validation
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const { currentWorkspaceId } = useWorkspace(); // Added useWorkspace hook

  const COMMENTS_PER_PAGE = 20;

  // Load users for @mention validation
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const usersData = await User.list();
        setAllUsers(usersData || []);
      } catch (error) {
        console.error("Error loading users:", error);
        toast.error("Failed to load user list");
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  // Reset pagination when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    // Changed document?.id to documentId
    if (documentId) {
      loadComments();
      loadLinkableItems();
    }
  }, [documentId, page, statusFilter]); // Changed document?.id to documentId

  const loadComments = async () => {
    if (!documentId) return; // Changed document?.id to documentId
    
    try {
      setLoading(true);
      const filters = statusFilter === "all" 
        ? { document_id: documentId, workspace_id: currentWorkspaceId } // Added workspace_id
        : { document_id: documentId, status: statusFilter, workspace_id: currentWorkspaceId }; // Added workspace_id
      
      const allComments = await DocumentComment.filter(filters, "-created_date");
      
      // Calculate pagination
      const total = Math.ceil((allComments?.length || 0) / COMMENTS_PER_PAGE);
      setTotalPages(total);
      
      // Get current page comments
      const start = (page - 1) * COMMENTS_PER_PAGE;
      const end = start + COMMENTS_PER_PAGE;
      setComments(allComments?.slice(start, end) || []);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLinkableItems = async () => {
    // Changed document.assigned_to_assignments to assignments prop
    if (!assignments || assignments.length === 0) {
      return;
    }

    try {
      // Changed document.assigned_to_assignments[0] to assignments[0]
      const assignmentId = assignments[0];
      
      const [tasksData, threadsData] = await Promise.all([
        Task.filter({ assignment_id: assignmentId }, "-created_date", 50),
        ConversationThread.filter({ assignment_id: assignmentId }, "-last_activity", 20)
      ]);
      
      setTasks(tasksData || []);
      setThreads(threadsData || []);
    } catch (error) {
      console.error("Error loading linkable items:", error);
    }
  };

  // Parse @mentions from text and validate against actual users
  const parseMentions = (text) => {
    if (!text) return [];
    const mentionRegex = /@(\S+)/g;
    const matches = [...text.matchAll(mentionRegex)];
    const potentialMentions = matches.map(match => match[1]);
    
    // Validate mentions against actual users
    const validMentions = potentialMentions.filter(mention => {
      // Check if it's a valid email or username
      const isEmail = mention.includes('@') || mention.includes('.');
      if (!isEmail) return false;
      
      // Check if user exists in our user list
      return allUsers.some(user => 
        user.email.toLowerCase().includes(mention.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(mention.toLowerCase())
      );
    });
    
    return validMentions;
  };

  // Memoize parsed comment content to avoid re-parsing on every render
  const renderTextWithMentions = useMemo(() => {
    return (text) => {
      if (!text) return null;
      
      const parts = text.split(/(@\S+)/g);
      return parts.map((part, index) => {
        if (part.startsWith('@')) {
          const mention = part.substring(1);
          const isValid = allUsers.some(user => 
            user.email.toLowerCase().includes(mention.toLowerCase()) ||
            user.full_name?.toLowerCase().includes(mention.toLowerCase())
          );
          
          return (
            <span
              key={index}
              className={`font-semibold ${
                isValid 
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1 rounded'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      });
    };
  }, [allUsers]);

  const handleAddComment = async () => {
    // Added currentWorkspaceId validation
    if (!newComment.trim() || !currentUser || !currentWorkspaceId) {
      toast.error("Please ensure you are logged in and a workspace is selected.");
      return;
    }

    // Validate @mentions
    const mentions = parseMentions(newComment);
    const invalidMentions = [...newComment.matchAll(/@(\S+)/g)]
      .map(m => m[1])
      .filter(m => !mentions.includes(m));
    
    if (invalidMentions.length > 0) {
      toast.warning(`Unknown users mentioned: ${invalidMentions.map(m => '@' + m).join(', ')}`);
    }

    try {
      setSubmitting(true);
      
      await DocumentComment.create({
        workspace_id: currentWorkspaceId, // Added workspace_id
        document_id: documentId, // Changed document.id to documentId
        document_title: documentTitle, // Changed document.title to documentTitle
        content: newComment,
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        comment_type: commentType,
        linked_task_id: selectedTask?.id || null,
        linked_task_title: selectedTask?.title || null,
        linked_thread_id: selectedThread?.id || null,
        linked_thread_topic: selectedThread?.topic || null,
        mentions: mentions.length > 0 ? mentions : [],
        status: "open"
      });

      toast.success("Comment added successfully");
      setNewComment("");
      setCommentType("general");
      setSelectedTask(null); // Preserved original logic
      setSelectedThread(null); // Preserved original logic
      
      // Reload comments
      await loadComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (commentId) => {
    // Added currentWorkspaceId validation and setSubmitting
    if (!replyText.trim() || !currentUser || !currentWorkspaceId) {
      toast.error("Please ensure you are logged in and a workspace is selected.");
      return;
    }

    // Validate @mentions in reply
    const mentions = parseMentions(replyText);
    const invalidMentions = [...replyText.matchAll(/@(\S+)/g)]
      .map(m => m[1])
      .filter(m => !mentions.includes(m));
    
    if (invalidMentions.length > 0) {
      toast.warning(`Unknown users mentioned: ${invalidMentions.map(m => '@' + m).join(', ')}`);
    }

    try {
      setSubmitting(true); // Added from outline
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      const updatedReplies = [
        ...(comment.replies || []),
        {
          author_email: currentUser.email,
          author_name: currentUser.full_name,
          content: replyText, // Kept replyText as per existing state
          created_date: new Date().toISOString()
        }
      ];

      await DocumentComment.update(commentId, {
        replies: updatedReplies,
        // Preserved existing mentions update logic
        mentions: [ 
          ...(comment.mentions || []),
          ...mentions
        ].filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
      });

      toast.success("Reply added successfully");
      setReplyingTo(null);
      setReplyText("");
      await loadComments();
    } catch (error) {
      console.error("Error adding reply:", error);
      toast.error("Failed to add reply");
    } finally {
      setSubmitting(false); // Added from outline
    }
  };

  const handleEditComment = async () => {
    if (!editText.trim() || !editingComment) {
      toast.error("Please enter comment text");
      return;
    }

    // Validate @mentions in edited comment
    const mentions = parseMentions(editText);
    const invalidMentions = [...editText.matchAll(/@(\S+)/g)]
      .map(m => m[1])
      .filter(m => !mentions.includes(m));
    
    if (invalidMentions.length > 0) {
      toast.warning(`Unknown users mentioned: ${invalidMentions.map(m => '@' + m).join(', ')}`);
    }

    try {
      await DocumentComment.update(editingComment.id, {
        content: editText,
        mentions: mentions.length > 0 ? mentions : []
      });

      toast.success("Comment updated successfully");
      setEditingComment(null);
      setEditText("");
      await loadComments();
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
    }
  };

  const handleResolveComment = async (commentId) => {
    try {
      const comment = comments.find(c => c.id === commentId);
      const newStatus = comment.status === "resolved" ? "open" : "resolved";
      
      await DocumentComment.update(commentId, {
        status: newStatus,
        resolved_by: newStatus === "resolved" ? currentUser.email : null,
        resolved_at: newStatus === "resolved" ? new Date().toISOString() : null
      });

      toast.success(newStatus === "resolved" ? "Comment resolved" : "Comment reopened");
      await loadComments();
    } catch (error) {
      console.error("Error resolving comment:", error);
      toast.error("Failed to update comment status");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      await DocumentComment.delete(commentId);
      toast.success("Comment deleted successfully");
      await loadComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const CommentTypeIcon = commentTypeIcons[commentType] || MessageSquare;

  // Loading states
  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Loading comments...</p>
        </div>
      </div>
    );
  }

  // Ensure currentWorkspaceId is set
  if (!currentWorkspaceId) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Please select a workspace to view comments.</p>
      </div>
    );
  }

  if (!currentUser && !loading) {
    return (
      <div className="p-8 text-center">
        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Please log in to view and add comments</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Comments ({comments.length > 0 ? `${(page - 1) * COMMENTS_PER_PAGE + 1}-${Math.min(page * COMMENTS_PER_PAGE, comments.length)}` : '0'})
        </h3>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Comments</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Add New Comment Form */}
      <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm">
                {currentUser?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="Add a comment... Use @username to mention team members"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] resize-none"
                disabled={submitting || loadingUsers || !currentWorkspaceId}
              />
              
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={commentType} onValueChange={setCommentType} disabled={submitting}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        General
                      </div>
                    </SelectItem>
                    <SelectItem value="feedback">
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4" />
                        Feedback
                      </div>
                    </SelectItem>
                    <SelectItem value="question">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        Question
                      </div>
                    </SelectItem>
                    <SelectItem value="issue">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Issue
                      </div>
                    </SelectItem>
                    <SelectItem value="approval">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Approval
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {tasks.length > 0 && (
                  <Select 
                    value={selectedTask?.id || "none"} 
                    onValueChange={(val) => setSelectedTask(val === "none" ? null : tasks.find(t => t.id === val))}
                    disabled={submitting}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Link to task (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No task</SelectItem>
                      {tasks.map(task => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {threads.length > 0 && (
                  <Select 
                    value={selectedThread?.id || "none"} 
                    onValueChange={(val) => setSelectedThread(val === "none" ? null : threads.find(t => t.id === val))}
                    disabled={submitting}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Link to thread (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No thread</SelectItem>
                      {threads.map(thread => (
                        <SelectItem key={thread.id} value={thread.id}>
                          {thread.topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button 
                  onClick={handleAddComment} 
                  disabled={!newComment.trim() || submitting || loadingUsers || !currentWorkspaceId}
                  className="ml-auto"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Post Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const CommentIcon = commentTypeIcons[comment.comment_type] || MessageSquare;
            const isAuthor = currentUser && comment.author_email === currentUser.email;
            const isEditing = editingComment?.id === comment.id;

            return (
              <Card key={comment.id} className={`${
                comment.status === "resolved" ? "opacity-60" : ""
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                          {comment.author_name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {comment.author_name}
                          </span>
                          <Badge className={commentTypeColors[comment.comment_type]}>
                            <CommentIcon className="w-3 h-3 mr-1" />
                            {comment.comment_type}
                          </Badge>
                          {comment.status === "resolved" && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleResolveComment(comment.id)}>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {comment.status === "resolved" ? "Reopen" : "Mark as Resolved"}
                        </DropdownMenuItem>
                        {isAuthor && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => {
                                setEditingComment(comment);
                                setEditText(comment.content);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Edit Comment
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Comment
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleEditComment} size="sm">
                          Save Changes
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingComment(null);
                            setEditText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {renderTextWithMentions(comment.content)}
                    </p>
                  )}

                  {/* Linked Items */}
                  {(comment.linked_task_title || comment.linked_thread_topic) && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      {comment.linked_task_title && (
                        <Badge variant="outline" className="text-xs">
                          <Link2 className="w-3 h-3 mr-1" />
                          Task: {comment.linked_task_title}
                        </Badge>
                      )}
                      {comment.linked_thread_topic && (
                        <Badge variant="outline" className="text-xs">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Thread: {comment.linked_thread_topic}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-700 space-y-3 mt-3">
                      {comment.replies.map((reply, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Avatar className="w-6 h-6 flex-shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white text-xs">
                              {reply.author_name?.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {reply.author_name}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {renderTextWithMentions(reply.content)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Form */}
                  {replyingTo === comment.id ? (
                    <div className="pl-6 space-y-2 mt-3">
                      <Textarea
                        placeholder="Write a reply... Use @username to mention"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="min-h-[60px] text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAddReply(comment.id)} disabled={submitting}>
                          <Send className="w-3 h-3 mr-1" />
                          Reply
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(comment.id)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Reply className="w-3 h-3 mr-1" />
                      Reply
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// Export wrapped with error boundary
// Updated props for the exported component
export default function DocumentComments({ documentId, documentTitle, currentUser, assignments = [] }) {
  return (
    <CommentsErrorBoundary>
      <DocumentCommentsInner 
        documentId={documentId} 
        documentTitle={documentTitle} 
        currentUser={currentUser} 
        assignments={assignments} 
      />
    </CommentsErrorBoundary>
  );
}
