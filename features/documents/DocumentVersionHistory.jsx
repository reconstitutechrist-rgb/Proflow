import React, { useState, useEffect } from 'react';
import { Document } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Clock,
  Download,
  RotateCcw,
  FileText,
  User,
  AlertCircle,
  Loader2,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';

// Error Boundary
class VersionHistoryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('VersionHistory Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to load version history
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {this.state.error?.message || 'An error occurred'}
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

function DocumentVersionHistoryContent({ document, isOpen, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false); // For history loading
  const [selectedVersion, setSelectedVersion] = useState(null); // Used for both restore target and preview target
  const [showPreview, setShowPreview] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (isOpen && document && currentWorkspaceId) {
      // CRITICAL: Validate document is in current workspace
      if (document.workspace_id !== currentWorkspaceId) {
        toast.error('Cannot access version history from other workspaces');
        console.error('Security violation: Cross-workspace version access attempt', {
          documentWorkspace: document.workspace_id,
          currentWorkspace: currentWorkspaceId,
        });
        onClose();
        return;
      }
      loadVersionHistory();
    } else if (!isOpen) {
      // Reset states when dialog closes
      setVersions([]);
      setLoading(false);
      setSelectedVersion(null);
      setShowPreview(false);
      setRestoring(false);
    }
  }, [isOpen, document, currentWorkspaceId, onClose]);

  const loadVersionHistory = () => {
    try {
      setLoading(true);
      const versionHistory = document.version_history || [];

      // Add current version to the list
      const currentVersion = {
        version: document.version || '1.0',
        content: document.content, // From outline
        file_url: document.file_url,
        created_date: document.updated_date || document.created_date,
        created_by: document.created_by,
        change_notes: 'Current version',
        is_current: true,
      };

      // Combine and sort (re-use existing sort logic from allVersions)
      const combinedVersions = [
        currentVersion,
        ...versionHistory.map((v) => ({ ...v, is_current: false })), // Ensure is_current is set for historical ones
      ].sort((a, b) => {
        const aTime = a.version.split('.')[2] || new Date(a.created_date).getTime();
        const bTime = b.version.split('.')[2] || new Date(b.created_date).getTime();
        return Number(bTime) - Number(aTime);
      });

      setVersions(combinedVersions);
    } catch (error) {
      console.error('Error loading version history:', error);
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  // Get display version (remove timestamp for cleaner UI)
  const getDisplayVersion = (version) => {
    if (!version) return '1.0';
    // If version has timestamp (e.g., "1.2.1234567890"), show only major.minor
    const parts = version.split('.');
    if (parts.length > 2 && parts[2].length > 5) {
      return `${parts[0]}.${parts[1]}`;
    }
    return version;
  };

  // Get full version (with timestamp for uniqueness)
  const getFullVersion = (version) => {
    return version || '1.0';
  };

  const handleDownloadVersion = (versionData) => {
    if (!versionData.file_url) {
      toast.error('File URL not available for this version');
      return;
    }

    // Force download
    fetch(versionData.file_url)
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${document.title}_v${getDisplayVersion(versionData.version)}.${document.file_name?.split('.').pop() || 'pdf'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success(`Downloaded version ${getDisplayVersion(versionData.version)}`);
      })
      .catch((error) => {
        console.error('Download failed:', error);
        toast.error('Failed to download file');
      });
  };

  const handleRestoreVersion = async (version) => {
    if (!version || version.is_current) return;

    // CRITICAL: Double-check workspace before restore
    if (document.workspace_id !== currentWorkspaceId) {
      toast.error('Cannot restore versions from other workspaces');
      console.error('Security violation: Cross-workspace version restore attempt');
      return;
    }

    try {
      setRestoring(true);

      // Save current version to history before restoring
      const currentVersionData = {
        version: document.version,
        content: document.content, // From outline
        file_url: document.file_url,
        created_date: new Date().toISOString(),
        created_by: document.created_by,
        change_notes: `Version before restore to ${getDisplayVersion(version.version)}`,
      };

      // Ensure version_history is an array before spreading
      const updatedHistory = [currentVersionData, ...(document.version_history || [])];

      // Determine new version number (increment minor by 0.1)
      const currentMajorMinor = parseFloat(document.version || '1.0');
      const newVersionNum = currentMajorMinor + 0.1;
      const newVersion = `${newVersionNum.toFixed(1)}.${Date.now()}`; // Append timestamp for uniqueness

      // Restore the selected version
      await Document.update(document.id, {
        content: version.content,
        file_url: version.file_url,
        version: newVersion,
        version_history: updatedHistory,
        workspace_id: currentWorkspaceId, // CRITICAL: Maintain workspace_id
      });

      toast.success(
        `Restored to version ${getDisplayVersion(version.version)} (new current v${getDisplayVersion(newVersion)})`
      );
      setSelectedVersion(null); // Clear selected version to close AlertDialog
      setRestoring(false);
      onClose(); // Close the main dialog after successful restore
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Failed to restore version');
    } finally {
      setRestoring(false);
    }
  };

  const handlePreview = (version) => {
    setSelectedVersion(version);
    setShowPreview(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Version History for "{document?.title || 'Document'}"
          </DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Current version: {getDisplayVersion(document?.version || '1.0')}
          </p>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto space-y-4 pr-2 -mr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">Loading version history...</p>
              </div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No version history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((versionData, index) => (
                <Card
                  key={index}
                  className={`${versionData.is_current ? 'border-2 border-blue-500 dark:border-blue-400' : 'border border-gray-200 dark:border-gray-700'}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              Version {getDisplayVersion(versionData.version)}
                            </span>
                          </div>
                          {versionData.is_current && (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              Current
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{versionData.created_by || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {format(new Date(versionData.created_date), 'MMM d, yyyy')} at{' '}
                              {format(new Date(versionData.created_date), 'h:mm a')}
                            </span>
                          </div>
                        </div>

                        {versionData.change_notes && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            {versionData.change_notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadVersion(versionData)}
                          disabled={!versionData.file_url}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>

                        {!versionData.is_current && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreview(versionData)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedVersion(versionData)}
                              className="text-orange-600 hover:text-orange-700 dark:text-orange-400"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Restore
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Restore Confirmation Dialog */}
        <AlertDialog
          open={!!selectedVersion && !showPreview}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedVersion(null); // Clear selected version when dialog closes
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore to Previous Version?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Are you sure you want to restore to version{' '}
                  <strong>{getDisplayVersion(selectedVersion?.version)}</strong>?
                </p>
                <p className="text-amber-600 dark:text-amber-400">
                  ⚠️ The current version will be saved in history, and a new version will be
                  created.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleRestoreVersion(selectedVersion)}
                disabled={restoring}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {restoring ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore Version
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Preview Dialog */}
        <Dialog
          open={showPreview}
          onOpenChange={(open) => {
            if (!open) {
              setShowPreview(false);
              setSelectedVersion(null); // Clear selected version when preview closes
            }
          }}
        >
          <DialogContent className="max-w-7xl h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                Preview: Version {getDisplayVersion(selectedVersion?.version)}
              </DialogTitle>
            </DialogHeader>
            <div className="h-full overflow-hidden flex flex-col">
              <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                <p className="text-sm font-semibold">
                  Version {getDisplayVersion(selectedVersion?.version)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {selectedVersion && format(new Date(selectedVersion.created_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex-1 border rounded overflow-hidden">
                {selectedVersion?.file_url ? (
                  <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedVersion.file_url)}&embedded=true`}
                    className="w-full h-full"
                    title="Old Version Preview"
                  />
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    File preview not available for this version.
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

// Export wrapped with error boundary
export default function DocumentVersionHistory(props) {
  return (
    <VersionHistoryErrorBoundary>
      <DocumentVersionHistoryContent {...props} />
    </VersionHistoryErrorBoundary>
  );
}
