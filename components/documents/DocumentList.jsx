import React, { useMemo } from 'react';
import {
  FileText,
  MoreVertical,
  Star,
  Trash2,
  FolderInput,
  Eye,
  Download,
  RotateCcw,
  Copy,
  Share2,
  FolderKanban,
  ChevronRight,
  Image,
  File,
  Table,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import OutdatedDocumentBadge from './OutdatedDocumentBadge';

/**
 * File type configuration for icons and colors
 */
const FILE_TYPE_CONFIG = {
  doc: { icon: FileText, color: 'text-blue-500' },
  docx: { icon: FileText, color: 'text-blue-500' },
  xls: { icon: Table, color: 'text-green-500' },
  xlsx: { icon: Table, color: 'text-green-500' },
  csv: { icon: Table, color: 'text-green-500' },
  pdf: { icon: FileText, color: 'text-red-500' },
  png: { icon: Image, color: 'text-purple-500' },
  jpg: { icon: Image, color: 'text-purple-500' },
  jpeg: { icon: Image, color: 'text-purple-500' },
  gif: { icon: Image, color: 'text-purple-500' },
  svg: { icon: Image, color: 'text-purple-500' },
  webp: { icon: Image, color: 'text-purple-500' },
  js: { icon: Code, color: 'text-yellow-500' },
  jsx: { icon: Code, color: 'text-yellow-500' },
  ts: { icon: Code, color: 'text-blue-500' },
  tsx: { icon: Code, color: 'text-blue-500' },
  json: { icon: Code, color: 'text-gray-500' },
  md: { icon: FileText, color: 'text-gray-500' },
  default: { icon: File, color: 'text-gray-500' },
};

const getFileTypeConfig = (fileName) => {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  return FILE_TYPE_CONFIG[ext] || FILE_TYPE_CONFIG.default;
};

/**
 * DocumentCard - Grid view card component
 */
function DocumentCard({
  doc,
  isSelected,
  onSelect,
  onStar,
  onDelete,
  onMove,
  onRestore,
  onOpen,
  projectName,
  darkMode,
  isTrash,
}) {
  const fileConfig = getFileTypeConfig(doc.file_name);
  const FileIcon = fileConfig.icon;
  const timeAgo = formatDistanceToNow(new Date(doc.updated_date || doc.created_date), {
    addSuffix: true,
  });

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all group relative',
        isSelected
          ? darkMode
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-indigo-500 bg-indigo-50'
          : darkMode
            ? 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10'
            : 'border-gray-200 hover:border-indigo-300 hover:shadow-lg'
      )}
      onClick={() => onSelect(doc)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              darkMode ? 'bg-white/10' : 'bg-gray-100'
            )}
          >
            <FileIcon className={cn('w-5 h-5', fileConfig.color)} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity',
                  darkMode ? 'hover:bg-white/10' : ''
                )}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(doc);
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </DropdownMenuItem>
              {!isTrash && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onStar(doc);
                    }}
                  >
                    <Star
                      className={cn(
                        'w-4 h-4 mr-2',
                        doc.is_starred && 'fill-yellow-500 text-yellow-500'
                      )}
                    />
                    {doc.is_starred ? 'Unstar' : 'Star'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(doc);
                    }}
                  >
                    <FolderInput className="w-4 h-4 mr-2" />
                    Move to Folder
                  </DropdownMenuItem>
                </>
              )}
              {isTrash ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(doc);
                    }}
                    className="text-green-600 focus:text-green-600"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(doc);
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn('font-medium truncate', darkMode ? 'text-white' : 'text-gray-900')}>
              {doc.title}
            </h3>
            {doc.is_starred && !isTrash && (
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500 flex-shrink-0" />
            )}
            {doc.is_outdated && <OutdatedDocumentBadge document={doc} size="small" />}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className={cn('text-xs', darkMode ? 'text-gray-500' : 'text-gray-500')}>{timeAgo}</p>
            {projectName && (
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs px-1.5 py-0 h-5',
                  darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                )}
              >
                <FolderKanban className="w-3 h-3 mr-1" />
                {projectName}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * DocumentRow - List view row component
 */
function DocumentRow({
  doc,
  isSelected,
  onSelect,
  onStar,
  onDelete,
  onMove,
  onRestore,
  onOpen,
  projectName,
  darkMode,
  isTrash,
}) {
  const fileConfig = getFileTypeConfig(doc.file_name);
  const FileIcon = fileConfig.icon;
  const timeAgo = formatDistanceToNow(new Date(doc.updated_date || doc.created_date), {
    addSuffix: true,
  });

  return (
    <div
      onClick={() => onSelect(doc)}
      className={cn(
        'flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all group',
        isSelected
          ? darkMode
            ? 'bg-indigo-500/20 border border-indigo-500'
            : 'bg-indigo-50 border border-indigo-500'
          : darkMode
            ? 'hover:bg-white/5 border border-transparent'
            : 'hover:bg-gray-50 border border-transparent'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          darkMode ? 'bg-white/10' : 'bg-gray-100'
        )}
      >
        <FileIcon className={cn('w-5 h-5', fileConfig.color)} />
      </div>

      {/* Title and metadata */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={cn('font-medium truncate', darkMode ? 'text-white' : 'text-gray-900')}>
            {doc.title}
          </h3>
          {doc.is_starred && !isTrash && (
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500 flex-shrink-0" />
          )}
          {doc.is_outdated && <OutdatedDocumentBadge document={doc} size="small" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {projectName && (
            <Badge
              variant="secondary"
              className={cn(
                'text-xs px-1.5 py-0 h-5',
                darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
              )}
            >
              <FolderKanban className="w-3 h-3 mr-1" />
              {projectName}
            </Badge>
          )}
        </div>
      </div>

      {/* Time */}
      <span className={cn('text-sm flex-shrink-0', darkMode ? 'text-gray-500' : 'text-gray-400')}>
        {timeAgo}
      </span>

      {/* Created by */}
      {doc.created_by && (
        <span
          className={cn(
            'text-sm truncate max-w-[120px] hidden md:block',
            darkMode ? 'text-gray-400' : 'text-gray-500'
          )}
        >
          {doc.created_by.split('@')[0]}
        </span>
      )}

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity',
              darkMode ? 'hover:bg-white/10' : ''
            )}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onOpen(doc);
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </DropdownMenuItem>
          {!isTrash && (
            <>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onStar(doc);
                }}
              >
                <Star
                  className={cn(
                    'w-4 h-4 mr-2',
                    doc.is_starred && 'fill-yellow-500 text-yellow-500'
                  )}
                />
                {doc.is_starred ? 'Unstar' : 'Star'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(doc);
                }}
              >
                <FolderInput className="w-4 h-4 mr-2" />
                Move to Folder
              </DropdownMenuItem>
            </>
          )}
          {isTrash ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(doc);
                }}
                className="text-green-600 focus:text-green-600"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(doc);
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ChevronRight className={cn('w-5 h-5', darkMode ? 'text-gray-600' : 'text-gray-300')} />
    </div>
  );
}

/**
 * DocumentList - Document grid/list display component
 * @param {Object} props
 * @param {Array} props.documents - Documents to display
 * @param {string} props.viewMode - 'grid' or 'list'
 * @param {Object} props.selectedDoc - Currently selected document
 * @param {Function} props.onSelectDoc - Callback when document selected
 * @param {Function} props.onStarDoc - Callback to star/unstar document
 * @param {Function} props.onDeleteDoc - Callback to delete document
 * @param {Function} props.onMoveDoc - Callback to move document
 * @param {Function} props.onRestoreDoc - Callback to restore document
 * @param {Function} props.onOpenDoc - Callback to open document preview
 * @param {Array} props.projects - All projects
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 * @param {boolean} props.isTrash - Whether viewing trash
 */
export default function DocumentList({
  documents = [],
  viewMode = 'grid',
  selectedDoc,
  onSelectDoc,
  onStarDoc,
  onDeleteDoc,
  onMoveDoc,
  onRestoreDoc,
  onOpenDoc,
  projects = [],
  darkMode = false,
  isTrash = false,
}) {
  // Map project IDs to names
  const projectMap = useMemo(() => {
    const map = {};
    projects.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [projects]);

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileText className={cn('w-12 h-12 mb-4', darkMode ? 'text-gray-600' : 'text-gray-300')} />
        <h3 className={cn('text-lg font-medium mb-2', darkMode ? 'text-white' : 'text-gray-900')}>
          {isTrash ? 'Trash is empty' : 'No documents found'}
        </h3>
        <p className={cn('text-sm', darkMode ? 'text-gray-500' : 'text-gray-500')}>
          {isTrash
            ? 'Deleted documents will appear here'
            : 'Try adjusting filters or upload a document'}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className={cn('p-4', viewMode === 'grid' ? '' : 'space-y-1')}>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {documents.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  layout
                >
                  <DocumentCard
                    doc={doc}
                    isSelected={selectedDoc?.id === doc.id}
                    onSelect={onSelectDoc}
                    onStar={onStarDoc}
                    onDelete={onDeleteDoc}
                    onMove={onMoveDoc}
                    onRestore={onRestoreDoc}
                    onOpen={onOpenDoc}
                    projectName={projectMap[doc.assigned_to_project]}
                    darkMode={darkMode}
                    isTrash={isTrash}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {documents.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                layout
              >
                <DocumentRow
                  doc={doc}
                  isSelected={selectedDoc?.id === doc.id}
                  onSelect={onSelectDoc}
                  onStar={onStarDoc}
                  onDelete={onDeleteDoc}
                  onMove={onMoveDoc}
                  onRestore={onRestoreDoc}
                  onOpen={onOpenDoc}
                  projectName={projectMap[doc.assigned_to_project]}
                  darkMode={darkMode}
                  isTrash={isTrash}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </ScrollArea>
  );
}
