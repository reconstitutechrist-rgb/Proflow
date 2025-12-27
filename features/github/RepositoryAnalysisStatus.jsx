import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Brain, Clock } from 'lucide-react';
import { useRepositoryMemory } from './useRepositoryMemory';

/**
 * Repository Analysis Status Badge
 * Shows the current state of repository memory analysis
 */
export function RepositoryAnalysisStatus({ repositoryId, repoFullName, compact = false }) {
  const { status, memory, isLoading } = useRepositoryMemory(repositoryId, repoFullName);

  if (isLoading) {
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        {!compact && 'Loading...'}
      </Badge>
    );
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      label: 'Pending',
      description: 'Analysis will start shortly',
      variant: 'outline',
      className: 'text-gray-500',
    },
    analyzing: {
      icon: Loader2,
      label: 'Analyzing',
      description: 'Deep code analysis in progress...',
      variant: 'secondary',
      className: 'text-blue-600 animate-pulse',
      iconClassName: 'animate-spin',
    },
    completed: {
      icon: CheckCircle2,
      label: 'Analyzed',
      description: `${memory?.files_analyzed || 0} files analyzed`,
      variant: 'default',
      className: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    },
    failed: {
      icon: XCircle,
      label: 'Failed',
      description: memory?.analysis_error || 'Analysis failed',
      variant: 'destructive',
      className: 'text-red-600',
    },
    stale: {
      icon: AlertTriangle,
      label: 'Stale',
      description: 'New commits detected - needs re-analysis',
      variant: 'outline',
      className: 'text-yellow-600',
    },
    idle: {
      icon: Brain,
      label: 'Not analyzed',
      description: 'No analysis data available',
      variant: 'outline',
      className: 'text-gray-400',
    },
    error: {
      icon: XCircle,
      label: 'Error',
      description: 'Failed to load analysis status',
      variant: 'destructive',
      className: 'text-red-600',
    },
  };

  const config = statusConfig[status] || statusConfig.idle;
  const Icon = config.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center ${config.className}`}>
              <Icon className={`w-4 h-4 ${config.iconClassName || ''}`} />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-gray-400">{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className={`text-xs gap-1 ${config.className}`}>
            <Icon className={`w-3 h-3 ${config.iconClassName || ''}`} />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-gray-400">{config.description}</p>
            {status === 'completed' && memory && (
              <div className="mt-2 text-xs space-y-1">
                {memory.languages_breakdown && (
                  <p>Languages: {Object.keys(memory.languages_breakdown).slice(0, 3).join(', ')}</p>
                )}
                {memory.coding_patterns?.length > 0 && (
                  <p>
                    Patterns:{' '}
                    {memory.coding_patterns
                      .slice(0, 2)
                      .map((p) => p.name)
                      .join(', ')}
                  </p>
                )}
                {memory.analysis_completed_at && (
                  <p className="text-gray-500">
                    Analyzed: {new Date(memory.analysis_completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Analysis Progress Bar
 * Shows detailed progress during analysis
 */
export function RepositoryAnalysisProgress({ repositoryId, repoFullName }) {
  const { status, memory } = useRepositoryMemory(repositoryId, repoFullName);

  if (status !== 'analyzing') {
    return null;
  }

  const progress =
    memory?.files_analyzed && memory?.total_files
      ? Math.round((memory.files_analyzed / memory.total_files) * 100)
      : null;

  return (
    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
          Analyzing repository...
        </span>
      </div>
      {progress !== null && (
        <div className="space-y-1">
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {memory.files_analyzed} / {memory.total_files} files
          </p>
        </div>
      )}
      <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2">
        Deep analysis extracts functions, classes, patterns, and dependencies for accurate AI
        responses.
      </p>
    </div>
  );
}

export default RepositoryAnalysisStatus;
