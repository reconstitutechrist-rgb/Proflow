import React, { useMemo } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  Star,
  Trash2,
  FolderInput,
  Copy,
  Share2,
  X,
  Calendar,
  User,
  HardDrive,
  FolderKanban,
  Target,
  Clock,
  Image,
  File,
  Table,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

/**
 * File type configuration for icons and colors
 */
const FILE_TYPE_CONFIG = {
  // Documents
  doc: { icon: FileText, color: 'text-blue-500' },
  docx: { icon: FileText, color: 'text-blue-500' },
  // Spreadsheets
  xls: { icon: Table, color: 'text-green-500' },
  xlsx: { icon: Table, color: 'text-green-500' },
  csv: { icon: Table, color: 'text-green-500' },
  // PDFs
  pdf: { icon: FileText, color: 'text-red-500' },
  // Images
  png: { icon: Image, color: 'text-purple-500' },
  jpg: { icon: Image, color: 'text-purple-500' },
  jpeg: { icon: Image, color: 'text-purple-500' },
  gif: { icon: Image, color: 'text-purple-500' },
  svg: { icon: Image, color: 'text-purple-500' },
  webp: { icon: Image, color: 'text-purple-500' },
  // Code
  js: { icon: Code, color: 'text-yellow-500' },
  jsx: { icon: Code, color: 'text-yellow-500' },
  ts: { icon: Code, color: 'text-blue-500' },
  tsx: { icon: Code, color: 'text-blue-500' },
  json: { icon: Code, color: 'text-gray-500' },
  md: { icon: FileText, color: 'text-gray-500' },
  // Default
  default: { icon: File, color: 'text-gray-500' },
};

/**
 * Get file type config based on filename
 */
const getFileTypeConfig = (fileName) => {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  return FILE_TYPE_CONFIG[ext] || FILE_TYPE_CONFIG.default;
};

/**
 * Format bytes to human readable string
 */
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

/**
 * Get preview text from document content
 */
const getPreviewText = (doc) => {
  if (!doc) return '';

  // If there's HTML content, strip tags and get first ~200 chars
  if (doc.content) {
    const textContent = doc.content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return textContent.slice(0, 300) + (textContent.length > 300 ? '...' : '');
  }

  // If there's a description, use that
  if (doc.description) {
    return doc.description.slice(0, 300) + (doc.description.length > 300 ? '...' : '');
  }

  return 'No preview available';
};

/**
 * DocumentPreviewPanel - Inline preview panel (not the full modal)
 * @param {Object} props
 * @param {Object} props.document - The document to preview
 * @param {Array} props.projects - All projects
 * @param {Array} props.assignments - All assignments
 * @param {Function} props.onClose - Callback to close panel
 * @param {Function} props.onOpen - Callback to open full preview modal
 * @param {Function} props.onStar - Callback to star/unstar document
 * @param {Function} props.onDelete - Callback to delete document
 * @param {Function} props.onDownload - Callback to download document
 * @param {Function} props.onMove - Callback to move document
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 */
export default function DocumentPreviewPanel({
  document,
  projects = [],
  assignments = [],
  onClose,
  onOpen,
  onStar,
  onDelete,
  onDownload,
  onMove,
  darkMode = false,
}) {
  // Get project name - hooks must be called unconditionally
  const projectName = useMemo(() => {
    if (!document?.assigned_to_project) return null;
    const project = projects.find((p) => p.id === document.assigned_to_project);
    return project?.name || null;
  }, [document?.assigned_to_project, projects]);

  // Get assignment names
  const assignmentNames = useMemo(() => {
    if (!document?.assigned_to_assignments?.length) return [];
    return document.assigned_to_assignments
      .map((assignmentId) => {
        const assignment = assignments.find((a) => a.id === assignmentId);
        return assignment?.name || assignment?.title;
      })
      .filter(Boolean);
  }, [document?.assigned_to_assignments, assignments]);

  // Early return after hooks
  if (!document) return null;

  const fileConfig = getFileTypeConfig(document.file_name);
  const FileIcon = fileConfig.icon;

  const timeAgo =
    document.updated_date || document.created_date
      ? formatDistanceToNow(new Date(document.updated_date || document.created_date), {
          addSuffix: true,
        })
      : '';

  return (
    <div
      className={cn(
        'w-80 flex-shrink-0 flex flex-col border-l h-full',
        darkMode ? 'bg-[#0A0A0B] border-white/10' : 'bg-white border-gray-200'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          darkMode ? 'border-white/10' : 'border-gray-200'
        )}
      >
        <h3 className={cn('font-medium', darkMode ? 'text-white' : 'text-gray-900')}>Preview</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Document icon and title */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                darkMode ? 'bg-white/10' : 'bg-gray-100'
              )}
            >
              <FileIcon className={cn('w-6 h-6', fileConfig.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={cn('font-medium truncate', darkMode ? 'text-white' : 'text-gray-900')}>
                {document.title}
              </h4>
              <p className={cn('text-sm truncate', darkMode ? 'text-gray-400' : 'text-gray-500')}>
                {document.file_name || document.file_type || 'Document'}
              </p>
              {document.file_size && (
                <p className={cn('text-xs', darkMode ? 'text-gray-500' : 'text-gray-400')}>
                  {formatBytes(document.file_size)}
                </p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={onOpen} className="flex-1">
              Open
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onDownload}
              className={darkMode ? 'border-white/20' : ''}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onStar}
              className={darkMode ? 'border-white/20' : ''}
            >
              <Star
                className={cn(
                  'w-4 h-4',
                  document.is_starred ? 'fill-yellow-500 text-yellow-500' : ''
                )}
              />
            </Button>
          </div>

          {/* Details section */}
          <div className={cn('rounded-lg p-3 space-y-3', darkMode ? 'bg-white/5' : 'bg-gray-50')}>
            <h5
              className={cn(
                'text-xs font-semibold uppercase tracking-wider',
                darkMode ? 'text-gray-500' : 'text-gray-400'
              )}
            >
              Details
            </h5>

            {/* Project */}
            {projectName && (
              <div className="flex items-center gap-2">
                <FolderKanban
                  className={cn(
                    'w-4 h-4 flex-shrink-0',
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  )}
                />
                <span className={cn('text-sm', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                  {projectName}
                </span>
              </div>
            )}

            {/* Assignments */}
            {assignmentNames.length > 0 && (
              <div className="flex items-start gap-2">
                <Target
                  className={cn(
                    'w-4 h-4 flex-shrink-0 mt-0.5',
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  )}
                />
                <div className="flex flex-wrap gap-1">
                  {assignmentNames.map((name, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Modified */}
            <div className="flex items-center gap-2">
              <Clock
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                )}
              />
              <span className={cn('text-sm', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                Modified {timeAgo}
              </span>
            </div>

            {/* Created by */}
            {document.created_by && (
              <div className="flex items-center gap-2">
                <User
                  className={cn(
                    'w-4 h-4 flex-shrink-0',
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  )}
                />
                <span
                  className={cn('text-sm truncate', darkMode ? 'text-gray-300' : 'text-gray-700')}
                >
                  {document.created_by}
                </span>
              </div>
            )}
          </div>

          {/* Summary section */}
          <div className={cn('rounded-lg p-3', darkMode ? 'bg-white/5' : 'bg-gray-50')}>
            <h5
              className={cn(
                'text-xs font-semibold uppercase tracking-wider mb-2',
                darkMode ? 'text-gray-500' : 'text-gray-400'
              )}
            >
              Summary
            </h5>
            <p
              className={cn(
                'text-sm leading-relaxed',
                darkMode ? 'text-gray-300' : 'text-gray-600'
              )}
            >
              {getPreviewText(document)}
            </p>
          </div>

          {/* Additional actions */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className={cn('w-full justify-start', darkMode ? 'border-white/20' : '')}
              onClick={onMove}
            >
              <FolderInput className="w-4 h-4 mr-2" />
              Move to Folder
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50',
                darkMode ? 'border-white/20 hover:bg-red-900/20' : ''
              )}
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
