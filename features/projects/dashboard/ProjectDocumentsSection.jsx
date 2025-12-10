import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  File,
  FileImage,
  FileSpreadsheet,
  FileCode,
  Presentation,
  ChevronRight,
  Calendar,
} from 'lucide-react';

const FILE_TYPE_ICONS = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  md: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  svg: FileImage,
  ppt: Presentation,
  pptx: Presentation,
  js: FileCode,
  ts: FileCode,
  jsx: FileCode,
  tsx: FileCode,
  json: FileCode,
  html: FileCode,
  css: FileCode,
};

const DOCUMENT_TYPE_COLORS = {
  contract: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  specification: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  design: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  report: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  presentation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function ProjectDocumentsSection({ documents, onDocumentClick }) {
  const getFileIcon = (fileName) => {
    if (!fileName) return File;
    const extension = fileName.split('.').pop()?.toLowerCase();
    return FILE_TYPE_ICONS[extension] || File;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter out folder placeholders
  const filteredDocs = documents.filter((d) => d.document_type !== 'folder_placeholder');

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Documents
          <Badge variant="secondary" className="ml-1">
            {filteredDocs.length}
          </Badge>
        </h2>
      </div>

      {filteredDocs.length === 0 ? (
        <Card className="bg-gray-50 dark:bg-gray-800/50 border-dashed">
          <CardContent className="p-6 text-center">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No documents found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredDocs.map((doc) => {
            const FileIcon = getFileIcon(doc.file_name);

            return (
              <Card
                key={doc.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => onDocumentClick(doc)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                      <FileIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {doc.title || doc.file_name || 'Untitled Document'}
                      </h3>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {doc.document_type && doc.document_type !== 'other' && (
                          <Badge
                            className={`text-xs ${
                              DOCUMENT_TYPE_COLORS[doc.document_type] || DOCUMENT_TYPE_COLORS.other
                            }`}
                          >
                            {doc.document_type}
                          </Badge>
                        )}

                        {doc.created_date && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(doc.created_date)}
                          </span>
                        )}

                        {doc.file_size && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(doc.file_size)}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
