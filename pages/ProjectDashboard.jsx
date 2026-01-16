import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Search,
  X,
  FolderOpen,
  CheckSquare,
  Check,
  FileText,
  Target,
  Loader2,
  AlertCircle,
  Sun,
  Moon,
  Settings,
  Maximize2,
  Minimize2,
  Upload,
  ChevronDown,
  ChevronRight,
  Sparkles,
  History,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

import { db } from '@/api/db';
import { getProjectMemory } from '@/api/projectMemory';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAskAI } from '@/hooks/useAskAI';

const THEME_STORAGE_KEY = 'proflow_project_dashboard_theme';

// Status and Priority configurations
const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'todo', label: 'To Do' },
  { value: 'review', label: 'Review' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export default function ProjectDashboard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currentWorkspaceId, loading: workspaceLoading } = useWorkspace();
  const askAI = useAskAI();
  const contextSetRef = useRef(null);
  const docsLoadedRef = useRef(null);
  const analysisIntervalRef = useRef(null);
  const applyTimeoutRef = useRef(null);

  // Detect Mac for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Core data state
  const [project, setProject] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [projectMemory, setProjectMemory] = useState(null);
  const [_currentUser, setCurrentUser] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // AI Assistant state
  const [aiViewMode, setAiViewMode] = useState('collapsed');
  const [docControlStep, setDocControlStep] = useState('chat');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [linkedAssignment, setLinkedAssignment] = useState('');
  const [linkedTask, setLinkedTask] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [expandedDocs, setExpandedDocs] = useState(new Set());
  const [proposedChanges, setProposedChanges] = useState([]);
  const [inputMessage, setInputMessage] = useState('');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState({
    assignments: true,
    tasks: true,
    documents: true,
  });

  // Document summaries state
  const [documentSummaries, setDocumentSummaries] = useState({});
  const [loadingDocSummaries, setLoadingDocSummaries] = useState({});
  const [expandedDocItems, setExpandedDocItems] = useState(new Set());

  // Theme classes (memoized for performance)
  const theme = useMemo(
    () => ({
      bg: isDarkMode ? 'bg-slate-950' : 'bg-gray-50',
      text: isDarkMode ? 'text-white' : 'text-gray-900',
      textMuted: isDarkMode ? 'text-slate-400' : 'text-gray-500',
      textSecondary: isDarkMode ? 'text-slate-300' : 'text-gray-700',
      card: isDarkMode ? 'bg-slate-900/50 border-white/5' : 'bg-white border-gray-200 shadow-sm',
      cardHover: isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50',
      input: isDarkMode
        ? 'bg-white/5 border-white/10 text-white'
        : 'bg-white border-gray-300 text-gray-900',
      border: isDarkMode ? 'border-white/5' : 'border-gray-200',
      borderLight: isDarkMode ? 'border-white/10' : 'border-gray-100',
      progressBg: isDarkMode ? 'bg-slate-800' : 'bg-gray-200',
      btnSecondary: isDarkMode
        ? 'bg-white/5 hover:bg-white/10 text-white'
        : 'bg-gray-100 hover:bg-gray-200 text-gray-700',
      btnGhost: isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100',
      surface: isDarkMode ? 'bg-white/5' : 'bg-gray-50',
      surfaceElevated: isDarkMode
        ? 'bg-slate-900/95 border-white/10'
        : 'bg-white border-gray-200 shadow-xl',
      aiCard: isDarkMode
        ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20 hover:border-amber-500/40'
        : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 hover:border-amber-300',
      aiCardText: isDarkMode ? 'text-amber-200' : 'text-amber-800',
      diffRemove: isDarkMode ? 'text-rose-300/80' : 'text-rose-600',
      diffAdd: isDarkMode ? 'text-emerald-300/80' : 'text-emerald-600',
      diffBg: isDarkMode ? 'bg-slate-900/50' : 'bg-gray-50',
    }),
    [isDarkMode]
  );

  const statusColors = useMemo(
    () => ({
      planning: isDarkMode ? 'bg-slate-500' : 'bg-slate-400',
      todo: isDarkMode ? 'bg-slate-500' : 'bg-slate-400',
      in_progress: 'bg-blue-500',
      review: 'bg-purple-500',
      on_hold: 'bg-amber-500',
      completed: 'bg-emerald-500',
      cancelled: 'bg-red-500',
    }),
    [isDarkMode]
  );

  const priorityColors = useMemo(
    () => ({
      urgent: isDarkMode
        ? 'text-rose-400 bg-rose-500/20 border-rose-500/30'
        : 'text-rose-600 bg-rose-50 border-rose-200',
      high: isDarkMode
        ? 'text-orange-400 bg-orange-500/20 border-orange-500/30'
        : 'text-orange-600 bg-orange-50 border-orange-200',
      medium: isDarkMode
        ? 'text-blue-400 bg-blue-500/20 border-blue-500/30'
        : 'text-blue-600 bg-blue-50 border-blue-200',
      low: isDarkMode
        ? 'text-slate-400 bg-slate-500/20 border-slate-500/30'
        : 'text-slate-600 bg-slate-100 border-slate-200',
    }),
    [isDarkMode]
  );

  // Save theme preference
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Cleanup intervals and timeouts on unmount
  useEffect(() => {
    return () => {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
      if (applyTimeoutRef.current) clearTimeout(applyTimeoutRef.current);
    };
  }, []);

  // Keyboard shortcuts for AI assistant
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K to open AI assistant
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setAiViewMode((prev) => (prev === 'collapsed' ? 'expanded' : prev));
      }
      // Escape to close fullscreen or expanded AI
      if (e.key === 'Escape') {
        setAiViewMode((prev) => {
          if (prev === 'fullscreen') return 'expanded';
          if (prev === 'expanded') return 'collapsed';
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-set project context for AI
  useEffect(() => {
    if (project && project.id !== contextSetRef.current) {
      askAI.setSelectedProject(project);
      askAI.setContextType('project');
      contextSetRef.current = project.id;
    }
  }, [project, askAI]);

  // Auto-load linked documents for AI
  useEffect(() => {
    if (!documents || documents.length === 0) return;

    const linkedDocs = documents.filter(
      (doc) => doc.document_type !== 'folder_placeholder' && doc.file_url
    );

    const docsKey = linkedDocs
      .map((d) => d.id)
      .sort()
      .join(',');
    if (docsKey === docsLoadedRef.current) return;
    docsLoadedRef.current = docsKey;

    if (linkedDocs.length > 0) {
      askAI.addLinkedDocuments(linkedDocs);
    }
  }, [documents, askAI]);

  // Load project data
  const loadProjectData = useCallback(async () => {
    if (!currentWorkspaceId || workspaceLoading || !projectId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const projectData = await db.entities.Project.get(projectId);
      if (!projectData) {
        setError('Project not found');
        setLoading(false);
        return;
      }

      const [assignmentsData, allTasks, documentsData, memoryData, user] = await Promise.all([
        db.entities.Assignment.filter({ workspace_id: currentWorkspaceId, project_id: projectId }),
        db.entities.Task.filter({ workspace_id: currentWorkspaceId }),
        db.entities.Document.filter({ workspace_id: currentWorkspaceId }),
        getProjectMemory(projectId, currentWorkspaceId).catch(() => null),
        db.auth.me(),
      ]);

      const assignmentIds = assignmentsData.map((a) => a.id);
      const projectTasks = allTasks.filter(
        (t) => t.project_id === projectId || assignmentIds.includes(t.assignment_id)
      );

      const projectDocs = documentsData.filter(
        (d) =>
          d.assigned_to_project === projectId ||
          (d.assigned_to_assignments &&
            d.assigned_to_assignments.some((id) => assignmentIds.includes(id)))
      );

      setProject(projectData);
      setAssignments(assignmentsData || []);
      setTasks(projectTasks || []);
      setDocuments(projectDocs || []);
      setProjectMemory(memoryData);
      setCurrentUser(user);
    } catch (err) {
      console.error('Error loading project data:', err);
      setError('Failed to load project data');
      toast.error('Failed to load project data');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, workspaceLoading, projectId]);

  useEffect(() => {
    if (currentWorkspaceId && !workspaceLoading && projectId) {
      loadProjectData();
    }
  }, [currentWorkspaceId, workspaceLoading, projectId, loadProjectData]);

  // Filter logic
  const applyFilters = useCallback(
    (items, searchFields) => {
      return items
        .filter((item) => {
          if (!searchQuery.trim()) return true;
          const query = searchQuery.toLowerCase();
          return searchFields.some((field) => item[field]?.toLowerCase().includes(query));
        })
        .filter((item) => statusFilter === 'all' || item.status === statusFilter)
        .filter((item) => priorityFilter === 'all' || item.priority === priorityFilter);
    },
    [searchQuery, statusFilter, priorityFilter]
  );

  const filteredAssignments = useMemo(
    () => applyFilters(assignments, ['name', 'description']),
    [assignments, applyFilters]
  );

  const filteredTasks = useMemo(
    () => applyFilters(tasks, ['title', 'description']),
    [tasks, applyFilters]
  );

  const filteredDocuments = useMemo(() => {
    const filtered = documents.filter((d) => d.document_type !== 'folder_placeholder');
    if (!searchQuery.trim()) return filtered;
    const query = searchQuery.toLowerCase();
    return filtered.filter(
      (d) => d.title?.toLowerCase().includes(query) || d.file_name?.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all';

  // Navigation handlers
  const handleNavigateBack = () => {
    navigate('/Projects');
  };

  // Task handlers
  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await db.entities.Task.update(taskId, {
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString() : null,
      });
      loadProjectData();
      toast.success('Task status updated');
    } catch (err) {
      console.error('Error updating task status:', err);
      toast.error('Failed to update task status');
    }
  };

  // Computed metrics
  const metrics = useMemo(() => {
    const docsWithoutFolders = documents.filter((d) => d.document_type !== 'folder_placeholder');
    return {
      assignments: {
        total: assignments.length,
        completed: assignments.filter((a) => a.status === 'completed').length,
      },
      tasks: {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'completed').length,
        overdue: tasks.filter((t) => {
          if (!t.due_date || t.status === 'completed') return false;
          return new Date(t.due_date) < new Date();
        }).length,
      },
      documents: { total: docsWithoutFolders.length },
    };
  }, [assignments, tasks, documents]);

  const progress =
    metrics.assignments.total > 0
      ? Math.round((metrics.assignments.completed / metrics.assignments.total) * 100)
      : 0;

  // Real activity feed
  const recentActivity = useMemo(() => {
    const activities = [];

    // Task completions
    tasks
      .filter((t) => t.completed_date)
      .forEach((t) => {
        const timestamp = new Date(t.completed_date);
        if (isNaN(timestamp.getTime())) return; // Skip invalid dates
        activities.push({
          type: 'task_complete',
          action: 'completed',
          item: t.title,
          user: t.assigned_to || t.created_by,
          timestamp,
          icon: '✓',
        });
      });

    // Document uploads
    documents
      .filter((d) => d.document_type !== 'folder_placeholder' && d.created_date)
      .forEach((d) => {
        const timestamp = new Date(d.created_date);
        if (isNaN(timestamp.getTime())) return; // Skip invalid dates
        activities.push({
          type: 'document_upload',
          action: 'uploaded',
          item: d.title || d.file_name,
          user: d.created_by,
          timestamp,
          icon: '📎',
        });
      });

    // Assignment updates
    assignments
      .filter((a) => a.updated_date && a.updated_date !== a.created_date)
      .forEach((a) => {
        const timestamp = new Date(a.updated_date);
        if (isNaN(timestamp.getTime())) return; // Skip invalid dates
        activities.push({
          type: 'assignment_update',
          action: 'updated',
          item: a.name,
          user: a.created_by,
          timestamp,
          icon: '📋',
        });
      });

    // Sort by timestamp, take 5 most recent
    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [tasks, documents, assignments]);

  // Helper functions
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (email) => {
    if (!email) return '?';
    const name = email.split('@')[0];
    return name.slice(0, 2).toUpperCase();
  };

  const getUserName = (email) => {
    if (!email) return 'Unknown';
    return email
      .split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const isOverdue = (item) => {
    const dueDate = item.due_date || item.end_date;
    if (!dueDate || item.status === 'completed') return false;
    return new Date(dueDate) < new Date();
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Document summary generation
  const generateDocumentSummary = async (docId) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    const content = doc.content || doc.file_content;
    if (!content || content.trim().length < 50) {
      setDocumentSummaries((prev) => ({
        ...prev,
        [docId]: { error: true, message: 'Document has insufficient content for summarization.' },
      }));
      return;
    }

    setLoadingDocSummaries((prev) => ({ ...prev, [docId]: true }));

    try {
      const strippedContent = content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000);

      const prompt = `Summarize the following document concisely:

${strippedContent}

Provide a 2-3 sentence executive summary and 3-5 key points as bullet points.

Format as JSON with keys: executive_summary (string), key_points (array of strings).`;

      const response = await db.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            executive_summary: { type: 'string' },
            key_points: { type: 'array', items: { type: 'string' } },
          },
          required: ['executive_summary', 'key_points'],
        },
      });

      let parsed;
      try {
        parsed = typeof response === 'string' ? JSON.parse(response) : response;
      } catch {
        parsed = { executive_summary: response, key_points: [] };
      }

      setDocumentSummaries((prev) => ({
        ...prev,
        [docId]: { data: parsed },
      }));
    } catch (error) {
      console.error('Error generating summary:', error);
      setDocumentSummaries((prev) => ({
        ...prev,
        [docId]: { error: true, message: 'Failed to generate summary. Please try again.' },
      }));
      toast.error('Failed to generate summary');
    } finally {
      setLoadingDocSummaries((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const toggleDocumentItem = async (docId) => {
    const isExpanding = !expandedDocItems.has(docId);
    setExpandedDocItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) newSet.delete(docId);
      else newSet.add(docId);
      return newSet;
    });

    if (isExpanding && !documentSummaries[docId] && !loadingDocSummaries[docId]) {
      await generateDocumentSummary(docId);
    }
  };

  // Document Control handlers
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }
  };

  const handleAnalyze = () => {
    setDocControlStep('analyzing');
    setAnalysisProgress(0);

    // Clear any existing interval
    if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);

    analysisIntervalRef.current = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 100) {
          clearInterval(analysisIntervalRef.current);
          analysisIntervalRef.current = null;
          setProposedChanges([
            {
              documentId: documents[0]?.id || 'd1',
              documentTitle: documents[0]?.title || 'Project Brief',
              fileName: documents[0]?.file_name || 'project_brief.pdf',
              overallConfidence: 0.87,
              changes: [
                {
                  id: 'c1',
                  sectionName: 'Budget Overview',
                  pageNumber: 3,
                  confidenceScore: 0.92,
                  originalText: 'Sample original text from document',
                  proposedText: 'Updated text based on uploaded document analysis',
                  status: 'pending',
                },
              ],
            },
          ]);
          setDocControlStep('preview');
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const toggleDocExpanded = (docId) => {
    setExpandedDocs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) newSet.delete(docId);
      else newSet.add(docId);
      return newSet;
    });
  };

  const updateChangeStatus = (docId, changeId, newStatus) => {
    setProposedChanges((prev) =>
      prev.map((doc) => {
        if (doc.documentId === docId) {
          return {
            ...doc,
            changes: doc.changes.map((change) =>
              change.id === changeId ? { ...change, status: newStatus } : change
            ),
          };
        }
        return doc;
      })
    );
  };

  const approveAllForDoc = (docId) => {
    setProposedChanges((prev) =>
      prev.map((doc) => {
        if (doc.documentId === docId) {
          return { ...doc, changes: doc.changes.map((c) => ({ ...c, status: 'approved' })) };
        }
        return doc;
      })
    );
  };

  const rejectAllForDoc = (docId) => {
    setProposedChanges((prev) =>
      prev.map((doc) => {
        if (doc.documentId === docId) {
          return { ...doc, changes: doc.changes.map((c) => ({ ...c, status: 'rejected' })) };
        }
        return doc;
      })
    );
  };

  const getApprovedCount = () => {
    return proposedChanges.reduce(
      (total, doc) => total + doc.changes.filter((c) => c.status === 'approved').length,
      0
    );
  };

  const getTotalChanges = () => {
    return proposedChanges.reduce((total, doc) => total + doc.changes.length, 0);
  };

  const handleApplyChanges = () => {
    setDocControlStep('applying');
    // Clear any existing timeout
    if (applyTimeoutRef.current) clearTimeout(applyTimeoutRef.current);

    applyTimeoutRef.current = setTimeout(() => {
      applyTimeoutRef.current = null;
      setDocControlStep('complete');
      toast.success('Document changes applied successfully');
    }, 2000);
  };

  const resetDocControl = () => {
    setDocControlStep('chat');
    setUploadedFile(null);
    setLinkedAssignment('');
    setLinkedTask('');
    setAnalysisProgress(0);
    setProposedChanges([]);
    setExpandedDocs(new Set());
  };

  const closeAIAssistant = () => {
    resetDocControl();
    setAiViewMode('collapsed');
  };

  // AI Chat handler
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    try {
      await askAI.handleSendMessage(inputMessage);
      setInputMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    }
  };

  // Render AI Content based on step
  const renderAIContent = () => {
    switch (docControlStep) {
      case 'chat':
        return (
          <div className="space-y-4">
            {/* Show chat history if exists */}
            {askAI.messages?.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {askAI.messages.map((msg, idx) => (
                  <div
                    key={msg.id || `msg-${idx}`}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-xl text-sm max-w-[80%] ${
                        msg.role === 'user' ? 'bg-indigo-500 text-white' : theme.surface
                      }`}
                    >
                      <p className={msg.role === 'user' ? 'text-white' : theme.text}>
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <div className={`p-3 rounded-xl ${theme.surface} text-sm`}>
                  <p className={theme.text}>
                    I can help you manage this project. Try asking me to:
                  </p>
                  <ul className={`mt-2 space-y-1 ${theme.textMuted}`}>
                    <li>- Summarize project status</li>
                    <li>- Create new tasks</li>
                    <li>- Find relevant documents</li>
                    <li>- Generate progress reports</li>
                  </ul>
                </div>
              </div>
            )}

            <div
              onClick={() => setDocControlStep('upload')}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${theme.aiCard}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`}
                >
                  <Upload
                    className={`w-5 h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}
                  />
                </div>
                <div>
                  <p className={`font-medium ${theme.aiCardText}`}>
                    Upload Document to Update Project Files
                  </p>
                  <p className={`text-xs mt-0.5 ${theme.textMuted}`}>
                    AI will analyze and suggest changes to existing documents
                  </p>
                </div>
                <ChevronRight className={`w-5 h-5 ml-auto ${theme.textMuted}`} />
              </div>
            </div>

            {/* Session management buttons */}
            {(askAI.messages?.length > 0 || askAI.uploadedDocuments?.length > 0) && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => askAI.setIsSessionsSheetOpen(true)}
                  className="flex-1"
                >
                  <History className="w-4 h-4 mr-2" />
                  Sessions ({askAI.sessions?.length || 0})
                </Button>
                <Button
                  variant={askAI.sessionModified ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => askAI.setIsSaveDialogOpen(true)}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {askAI.currentSession ? 'Update' : 'Save'}
                </Button>
              </div>
            )}
          </div>
        );

      case 'upload':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setDocControlStep('chat')}
                className={`p-1 rounded ${theme.btnGhost}`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className={`font-medium ${theme.text}`}>Document Control</span>
            </div>

            <label className="block">
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  uploadedFile
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : isDarkMode
                      ? 'border-white/20 hover:border-white/40'
                      : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {uploadedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}
                    >
                      <FileText
                        className={`w-6 h-6 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}
                      />
                    </div>
                    <div className="text-left">
                      <p
                        className={`font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}
                      >
                        {uploadedFile.name}
                      </p>
                      <p className={`text-xs ${theme.textMuted}`}>
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setUploadedFile(null);
                      }}
                      className={`p-1 rounded ${theme.btnGhost} ml-2`}
                    >
                      <X className={`w-4 h-4 ${theme.textMuted}`} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className={`w-10 h-10 mx-auto mb-3 ${theme.textMuted}`} />
                    <p className={`text-sm ${theme.textMuted}`}>
                      Drop file here or click to browse
                    </p>
                    <p
                      className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}
                    >
                      PDF, DOCX, TXT, MD (max 10MB)
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.docx,.txt,.md"
              />
            </label>

            <div className={`space-y-3 p-3 rounded-xl ${theme.surface}`}>
              <div className="flex items-center gap-2 text-sm">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                <span className={theme.textSecondary}>Auto-linked to:</span>
                <span className={`font-medium ${theme.text}`}>{project?.name}</span>
              </div>

              <div>
                <label className={`text-xs mb-1 block ${theme.textMuted}`}>
                  Link to Assignment (optional)
                </label>
                <Select value={linkedAssignment} onValueChange={setLinkedAssignment}>
                  <SelectTrigger className={`w-full ${theme.input}`}>
                    <SelectValue placeholder="Select assignment..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className={`text-xs mb-1 block ${theme.textMuted}`}>
                  Link to Task (optional)
                </label>
                <Select value={linkedTask} onValueChange={setLinkedTask}>
                  <SelectTrigger className={`w-full ${theme.input}`}>
                    <SelectValue placeholder="Select task..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {tasks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDocControlStep('chat')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={!uploadedFile}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              >
                Analyze & Compare
              </Button>
            </div>
          </div>
        );

      case 'analyzing':
        return (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <div
                className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20' : 'bg-gradient-to-br from-indigo-100 to-purple-100'}`}
              >
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
              <p className={`font-medium mb-2 ${theme.text}`}>Analyzing Document...</p>
              <p className={`text-sm mb-4 ${theme.textMuted}`}>
                Finding related documents and identifying changes
              </p>

              <div className="max-w-xs mx-auto">
                <div className={`h-2 rounded-full overflow-hidden ${theme.progressBg}`}>
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
                <p className={`text-xs mt-2 ${theme.textMuted}`}>{analysisProgress}% complete</p>
              </div>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button onClick={resetDocControl} className={`p-1 rounded ${theme.btnGhost}`}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className={`font-medium ${theme.text}`}>Proposed Changes</span>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}
              >
                {getApprovedCount()}/{getTotalChanges()} approved
              </span>
            </div>

            <div className={`p-3 rounded-xl text-sm ${theme.surface}`}>
              <p className={theme.textSecondary}>
                Found{' '}
                <span className={`font-medium ${theme.text}`}>
                  {proposedChanges.length} documents
                </span>{' '}
                with{' '}
                <span className={`font-medium ${theme.text}`}>{getTotalChanges()} sections</span> to
                update
              </p>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {proposedChanges.map((doc) => (
                <div
                  key={doc.documentId}
                  className={`rounded-xl border overflow-hidden ${theme.border}`}
                >
                  <div
                    onClick={() => toggleDocExpanded(doc.documentId)}
                    className={`p-3 cursor-pointer transition-colors ${theme.surface} ${theme.cardHover}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 ${theme.textMuted}`} />
                        <span className={`font-medium text-sm ${theme.text}`}>
                          {doc.documentTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${theme.textMuted}`}>
                          {doc.changes.length} changes
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${expandedDocs.has(doc.documentId) ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </div>

                    {!expandedDocs.has(doc.documentId) && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            approveAllForDoc(doc.documentId);
                          }}
                          className={`flex-1 px-2 py-1 rounded-lg text-xs transition-colors ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                        >
                          Approve All
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            rejectAllForDoc(doc.documentId);
                          }}
                          className={`flex-1 px-2 py-1 rounded-lg text-xs transition-colors ${isDarkMode ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                        >
                          Reject All
                        </button>
                      </div>
                    )}
                  </div>

                  {expandedDocs.has(doc.documentId) && (
                    <div className={`border-t ${theme.border}`}>
                      {doc.changes.map((change, idx) => (
                        <div
                          key={change.id}
                          className={`p-3 ${idx > 0 ? `border-t ${theme.borderLight}` : ''}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-medium ${theme.textSecondary}`}>
                              {change.sectionName}
                            </span>
                            <Badge
                              variant={
                                change.status === 'approved'
                                  ? 'default'
                                  : change.status === 'rejected'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {change.status}
                            </Badge>
                          </div>

                          <div
                            className={`rounded-lg p-2 text-xs font-mono space-y-1 ${theme.diffBg}`}
                          >
                            <div className="flex">
                              <span className="text-rose-500 mr-2">-</span>
                              <span className={`line-through ${theme.diffRemove}`}>
                                {change.originalText}
                              </span>
                            </div>
                            <div className="flex">
                              <span className="text-emerald-500 mr-2">+</span>
                              <span className={theme.diffAdd}>{change.proposedText}</span>
                            </div>
                          </div>

                          {change.status === 'pending' && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateChangeStatus(doc.documentId, change.id, 'approved')
                                }
                                className="flex-1 text-emerald-600"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateChangeStatus(doc.documentId, change.id, 'rejected')
                                }
                                className="flex-1 text-rose-600"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className={`pt-2 border-t ${theme.border}`}>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetDocControl} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyChanges}
                  disabled={getApprovedCount() === 0}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                >
                  Apply {getApprovedCount()} Changes
                </Button>
              </div>
            </div>
          </div>
        );

      case 'applying':
        return (
          <div className="py-8 text-center">
            <div
              className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20' : 'bg-gradient-to-br from-indigo-100 to-purple-100'}`}
            >
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
            <p className={`font-medium mb-2 ${theme.text}`}>Applying Changes...</p>
            <p className={`text-sm ${theme.textMuted}`}>Updating documents</p>
          </div>
        );

      case 'complete':
        return (
          <div className="py-6 text-center">
            <div
              className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/20' : 'bg-gradient-to-br from-emerald-100 to-green-100'}`}
            >
              <CheckSquare className="w-8 h-8 text-emerald-500" />
            </div>
            <p
              className={`font-medium mb-2 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}
            >
              Changes Applied Successfully!
            </p>

            <div className={`mt-4 p-3 rounded-xl text-sm text-left ${theme.surface}`}>
              <p className={`mb-2 ${theme.textSecondary}`}>
                Updated documents and saved source file to /Miscellaneous
              </p>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={resetDocControl} className="flex-1">
                Upload Another
              </Button>
              <Button
                onClick={closeAIAssistant}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              >
                Done
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Loading state
  if (loading || workspaceLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.bg}`}>
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.bg}`}>
        <Card className={`max-w-md ${theme.card}`}>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className={`text-xl font-semibold mb-2 ${theme.text}`}>Project Not Found</h2>
            <p className={`mb-4 ${theme.textMuted}`}>
              {error || 'The project you are looking for does not exist.'}
            </p>
            <Button onClick={handleNavigateBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div
        className={`min-h-screen font-sans transition-colors duration-300 ${theme.bg} ${theme.text}`}
      >
        {/* Ambient background - dark mode only */}
        {isDarkMode && (
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
            <div className="absolute top-1/2 right-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl" />
          </div>
        )}

        {/* Main content */}
        <div className="relative z-10 p-6 max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNavigateBack}
                  className={theme.btnSecondary}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
                    <Badge
                      className={`${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <p className={`text-sm ${theme.textMuted}`}>
                    {project.end_date && `Due ${formatDate(project.end_date)}`}
                    {project.end_date && project.priority && ' - '}
                    {project.priority && `${project.priority} Priority`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Theme toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={theme.btnSecondary}
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>

                {/* Team avatars */}
                {project.team_members && project.team_members.length > 0 && (
                  <div className="flex -space-x-2">
                    {[...new Set(project.team_members)].slice(0, 4).map((member, idx) => (
                      <div
                        key={`${member}-${idx}`}
                        className={`w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-medium text-white ring-2 ${isDarkMode ? 'ring-slate-950' : 'ring-gray-50'}`}
                        title={member}
                      >
                        {getInitials(member)}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="ghost"
                  className={theme.btnSecondary}
                  onClick={() => toast.info('Project settings coming soon')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </header>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${theme.textMuted}`}>Overall Progress</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${theme.progressBg}`}>
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className={`mb-6 p-4 rounded-2xl border ${theme.card}`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textMuted}`}
                />
                <Input
                  placeholder="Search assignments, tasks, documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-9 pr-9 ${theme.input}`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className={`w-4 h-4 ${theme.textMuted} hover:opacity-75`} />
                  </button>
                )}
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={`w-[150px] ${theme.input}`}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className={`w-[150px] ${theme.input}`}>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className={theme.btnGhost}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Metrics cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[
              {
                label: 'Assignments',
                value: `${metrics.assignments.completed}/${metrics.assignments.total}`,
                sub: 'completed',
                icon: FolderOpen,
                color: isDarkMode
                  ? 'from-violet-500/20 to-violet-600/10'
                  : 'from-violet-100 to-violet-50',
              },
              {
                label: 'Tasks',
                value: `${metrics.tasks.completed}/${metrics.tasks.total}`,
                sub: `${metrics.tasks.overdue} overdue`,
                icon: CheckSquare,
                color: isDarkMode ? 'from-cyan-500/20 to-cyan-600/10' : 'from-cyan-100 to-cyan-50',
                alert: metrics.tasks.overdue > 0,
              },
              {
                label: 'Documents',
                value: metrics.documents.total,
                sub: 'attached',
                icon: FileText,
                color: isDarkMode
                  ? 'from-amber-500/20 to-amber-600/10'
                  : 'from-amber-100 to-amber-50',
              },
            ].map((metric, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${metric.color} border p-5 ${theme.border}`}
              >
                <div
                  className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 ${isDarkMode ? 'bg-white/5' : 'bg-white/50'}`}
                />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm ${theme.textMuted}`}>{metric.label}</span>
                    <metric.icon className={`w-5 h-5 ${theme.textMuted}`} />
                  </div>
                  <p className="text-3xl font-semibold mb-1">{metric.value}</p>
                  <p className={`text-sm ${metric.alert ? 'text-rose-500' : theme.textMuted}`}>
                    {metric.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Main content - 3 cols on lg, full width on smaller */}
            <div className="lg:col-span-3 space-y-6">
              {/* Assignments Section */}
              <div className={`rounded-2xl border overflow-hidden ${theme.card}`}>
                <button
                  onClick={() => toggleSection('assignments')}
                  className={`w-full p-4 border-b flex items-center justify-between ${theme.border} ${theme.cardHover}`}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-indigo-500" />
                    <h2 className="font-medium">Assignments ({filteredAssignments.length})</h2>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.assignments ? '' : '-rotate-90'}`}
                  />
                </button>
                {expandedSections.assignments && (
                  <div className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                    {filteredAssignments.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className={theme.textMuted}>No assignments found</p>
                      </div>
                    ) : (
                      filteredAssignments.map((item) => {
                        const assignmentTasks = tasks.filter((t) => t.assignment_id === item.id);
                        const completedTasks = assignmentTasks.filter(
                          (t) => t.status === 'completed'
                        ).length;
                        const assignmentProgress =
                          assignmentTasks.length > 0
                            ? Math.round((completedTasks / assignmentTasks.length) * 100)
                            : item.status === 'completed'
                              ? 100
                              : 0;

                        return (
                          <div
                            key={item.id}
                            className={`p-4 cursor-pointer transition-colors ${theme.cardHover}`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-2 h-2 rounded-full ${statusColors[item.status] || 'bg-gray-400'}`}
                                />
                                <span className="font-medium">{item.name}</span>
                                {item.priority && (
                                  <Badge className={priorityColors[item.priority]}>
                                    {item.priority}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {item.team_members?.[0] && (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white">
                                    {getInitials(item.team_members[0])}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex-1 h-1.5 rounded-full overflow-hidden ${theme.progressBg}`}
                              >
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                                  style={{ width: `${assignmentProgress}%` }}
                                />
                              </div>
                              <span className={`text-sm ${theme.textMuted}`}>
                                {assignmentProgress}%
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Tasks Section */}
              <div className={`rounded-2xl border overflow-hidden ${theme.card}`}>
                <button
                  onClick={() => toggleSection('tasks')}
                  className={`w-full p-4 border-b flex items-center justify-between ${theme.border} ${theme.cardHover}`}
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-cyan-500" />
                    <h2 className="font-medium">Tasks ({filteredTasks.length})</h2>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.tasks ? '' : '-rotate-90'}`}
                  />
                </button>
                {expandedSections.tasks && (
                  <div className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                    {filteredTasks.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className={theme.textMuted}>No tasks found</p>
                      </div>
                    ) : (
                      filteredTasks.map((task) => {
                        const taskOverdue = isOverdue(task);
                        const dueLabel =
                          task.status === 'completed'
                            ? 'Done'
                            : taskOverdue
                              ? 'Overdue'
                              : formatDate(task.due_date);

                        return (
                          <div
                            key={task.id}
                            className={`p-4 cursor-pointer transition-colors ${theme.cardHover}`}
                          >
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() =>
                                  handleTaskStatusChange(
                                    task.id,
                                    task.status === 'completed' ? 'todo' : 'completed'
                                  )
                                }
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                  task.status === 'completed'
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : isDarkMode
                                      ? 'border-slate-600 hover:border-slate-500'
                                      : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                {task.status === 'completed' && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`font-medium truncate ${task.status === 'completed' ? `line-through ${theme.textMuted}` : ''}`}
                                >
                                  {task.title}
                                </p>
                              </div>
                              {task.priority && (
                                <Badge className={priorityColors[task.priority]}>
                                  {task.priority}
                                </Badge>
                              )}
                              {dueLabel && (
                                <span
                                  className={`text-sm ${taskOverdue ? 'text-rose-500' : theme.textMuted}`}
                                >
                                  {dueLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Documents Section */}
              <div className={`rounded-2xl border overflow-hidden ${theme.card}`}>
                <button
                  onClick={() => toggleSection('documents')}
                  className={`w-full p-4 border-b flex items-center justify-between ${theme.border} ${theme.cardHover}`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-500" />
                    <h2 className="font-medium">Documents ({filteredDocuments.length})</h2>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.documents ? '' : '-rotate-90'}`}
                  />
                </button>
                {expandedSections.documents && (
                  <div className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                    {filteredDocuments.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className={theme.textMuted}>No documents found</p>
                      </div>
                    ) : (
                      filteredDocuments.map((doc) => {
                        const isDocExpanded = expandedDocItems.has(doc.id);
                        const isLoadingSummary = loadingDocSummaries[doc.id];
                        const summary = documentSummaries[doc.id];

                        return (
                          <div key={doc.id} className={`transition-colors ${theme.cardHover}`}>
                            <div
                              onClick={() => toggleDocumentItem(doc.id)}
                              className="p-4 cursor-pointer flex items-center gap-4"
                            >
                              <div
                                className={`p-2 rounded-lg ${isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`}
                              >
                                <FileText
                                  className={`w-5 h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{doc.title || doc.file_name}</p>
                                <p className={`text-xs ${theme.textMuted}`}>
                                  {doc.document_type}{' '}
                                  {doc.created_date && `- ${formatDate(doc.created_date)}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isLoadingSummary && (
                                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                )}
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform ${isDocExpanded ? 'rotate-180' : ''} ${theme.textMuted}`}
                                />
                              </div>
                            </div>

                            {isDocExpanded && (
                              <div className={`px-4 pb-4 border-t ${theme.borderLight}`}>
                                <div className={`mt-3 p-3 rounded-xl ${theme.surface}`}>
                                  {isLoadingSummary ? (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span className={theme.textMuted}>
                                        Generating AI summary...
                                      </span>
                                    </div>
                                  ) : summary?.error ? (
                                    <p
                                      className={`text-sm ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}
                                    >
                                      {summary.message}
                                    </p>
                                  ) : summary?.data ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-1 text-xs font-medium text-indigo-500">
                                        <Sparkles className="w-3 h-3" />
                                        AI Summary
                                      </div>
                                      <p className={`text-sm ${theme.textSecondary}`}>
                                        {summary.data.executive_summary}
                                      </p>
                                      {summary.data.key_points?.length > 0 && (
                                        <ul className={`mt-2 space-y-1 text-sm ${theme.textMuted}`}>
                                          {summary.data.key_points.map((point, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                              <span className="text-indigo-500 mt-1">-</span>
                                              <span>{point}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          generateDocumentSummary(doc.id);
                                        }}
                                        className="mt-2 text-xs"
                                      >
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        Regenerate
                                      </Button>
                                    </div>
                                  ) : (
                                    <p className={`text-sm ${theme.textMuted}`}>
                                      Click to generate AI summary...
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - 2 cols on lg, full width on smaller */}
            <div className="lg:col-span-2 space-y-6">
              {/* Completion Ring */}
              <div className={`rounded-2xl border p-6 ${theme.card}`}>
                <h3 className="font-medium mb-4">Completion Status</h3>
                <div className="flex items-center justify-center py-4">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke={isDarkMode ? '#1e293b' : '#e5e7eb'}
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="url(#progressGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${progress * 2.64} 264`}
                      />
                      <defs>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold">{progress}%</span>
                      <span className={`text-sm ${theme.textMuted}`}>Complete</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className={`rounded-2xl border p-6 ${theme.card}`}>
                <h3 className="font-medium mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {recentActivity.length === 0 ? (
                    <p className={`text-sm ${theme.textMuted}`}>No recent activity</p>
                  ) : (
                    recentActivity.map((activity) => (
                      <div
                        key={`${activity.type}-${activity.item}-${activity.timestamp.getTime()}`}
                        className="flex items-start gap-3"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${theme.surface}`}
                        >
                          {activity.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className={theme.textMuted}>
                              {getUserName(activity.user)} {activity.action}
                            </span>{' '}
                            <span className="font-medium">{activity.item}</span>
                          </p>
                          <p
                            className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}
                          >
                            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className={`rounded-2xl border p-6 ${theme.card}`}>
                <h3 className="font-medium mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  {projectMemory && (
                    <div
                      className={`p-3 rounded-xl ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'} border`}
                    >
                      <p
                        className={`text-sm ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}
                      >
                        AI Memory Active
                      </p>
                      <p className={`text-xs mt-1 ${theme.textMuted}`}>Project context saved</p>
                    </div>
                  )}
                  <div className={`p-3 rounded-xl ${theme.surface}`}>
                    <p className={`text-sm ${theme.textSecondary}`}>
                      {askAI.uploadedDocuments?.length || 0} documents in AI context
                    </p>
                    <p className={`text-xs mt-1 ${theme.textMuted}`}>
                      {askAI.messages?.length || 0} messages in session
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Assistant Bar */}
          {aiViewMode !== 'fullscreen' && (
            <div className="mt-8 flex justify-center pb-8">
              <div
                className={`transition-all duration-300 ${aiViewMode === 'expanded' ? 'w-full max-w-2xl' : 'w-auto'}`}
              >
                <div
                  className={`rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden border ${theme.surfaceElevated}`}
                >
                  {aiViewMode === 'expanded' ? (
                    <div>
                      <div
                        className={`p-4 border-b flex items-center justify-between ${theme.border}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Target className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium">AI Assistant</span>
                          <Badge
                            className={
                              isDarkMode
                                ? 'bg-indigo-500/20 text-indigo-400'
                                : 'bg-indigo-100 text-indigo-600'
                            }
                          >
                            {project.name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAiViewMode('fullscreen')}
                            className={theme.btnGhost}
                          >
                            <Maximize2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={closeAIAssistant}
                            className={theme.btnGhost}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div
                        className={`p-4 max-h-[500px] overflow-y-auto ${isDarkMode ? 'bg-slate-950/50' : 'bg-gray-50/50'}`}
                      >
                        {renderAIContent()}
                      </div>
                      {docControlStep === 'chat' && (
                        <div className={`p-4 border-t ${theme.border}`}>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Ask anything about this project..."
                              value={inputMessage}
                              onChange={(e) => setInputMessage(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                              className={`flex-1 ${theme.input}`}
                            />
                            <Button
                              onClick={handleSendMessage}
                              disabled={askAI.isProcessing}
                              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                            >
                              {askAI.isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Send'
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setAiViewMode('expanded')}
                      className={`flex items-center gap-3 px-5 py-3 transition-colors ${theme.cardHover}`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">Ask AI Assistant</span>
                      <span className={`text-xs ml-2 ${theme.textMuted}`}>
                        {isMac ? '⌘K' : 'Ctrl+K'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen AI Assistant */}
        {aiViewMode === 'fullscreen' && (
          <div
            className={`fixed inset-0 z-50 flex flex-col ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`}
          >
            <div
              className={`flex-shrink-0 border-b ${theme.border} ${isDarkMode ? 'bg-slate-900/95' : 'bg-white'}`}
            >
              <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${theme.text}`}>AI Assistant</h2>
                    <p className={`text-sm ${theme.textMuted}`}>Project: {project.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setAiViewMode('expanded')}
                    className={theme.btnSecondary}
                  >
                    <Minimize2 className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={closeAIAssistant}
                    className={theme.btnSecondary}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-8">{renderAIContent()}</div>
            </div>

            {docControlStep === 'chat' && (
              <div
                className={`flex-shrink-0 border-t ${theme.border} ${isDarkMode ? 'bg-slate-900/95' : 'bg-white'}`}
              >
                <div className="max-w-3xl mx-auto px-6 py-4">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Ask anything about this project..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className={`flex-1 py-3 ${theme.input}`}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={askAI.isProcessing}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                    >
                      {askAI.isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
