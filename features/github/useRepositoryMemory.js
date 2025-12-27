import { useState, useEffect, useCallback } from 'react';
import repositoryAnalyzer from '@/api/repositoryAnalyzer';

/**
 * Hook for accessing repository memory (deep code analysis)
 * Provides the accumulated context and analysis status for a repository
 */
export function useRepositoryMemory(repositoryId, repoFullName = null) {
  const [memory, setMemory] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, loading, analyzing, completed, failed, stale
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetch repository memory from database
   */
  const fetchMemory = useCallback(async () => {
    if (!repositoryId) {
      setMemory(null);
      setStatus('idle');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const memoryData = await repositoryAnalyzer.getRepositoryMemory(repositoryId);

      if (memoryData) {
        setMemory(memoryData);
        setStatus(memoryData.analysis_status);
        return memoryData;
      } else {
        setMemory(null);
        setStatus('idle');
        return null;
      }
    } catch (err) {
      console.error('Error fetching repository memory:', err);
      setError(err.message);
      setStatus('error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [repositoryId]);

  /**
   * Trigger fresh analysis for the repository
   */
  const triggerAnalysis = useCallback(
    async (workspaceId) => {
      if (!repositoryId || !repoFullName || !workspaceId) {
        setError('Missing required parameters for analysis');
        return null;
      }

      try {
        setStatus('analyzing');
        setError(null);

        const result = await repositoryAnalyzer.startAnalysis(
          repositoryId,
          workspaceId,
          repoFullName
        );

        // Start polling for completion
        pollForCompletion();

        return result;
      } catch (err) {
        console.error('Error triggering analysis:', err);
        setError(err.message);
        setStatus('failed');
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [repositoryId, repoFullName]
  );

  /**
   * Poll for analysis completion
   */
  const pollForCompletion = useCallback(async () => {
    const maxAttempts = 60; // 5 minutes max (5s intervals)
    let attempts = 0;

    const poll = async () => {
      attempts++;
      const memoryData = await fetchMemory();

      if (!memoryData) {
        // No memory yet, keep polling
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
        return;
      }

      if (memoryData.analysis_status === 'analyzing') {
        // Still analyzing, keep polling
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setStatus('timeout');
        }
      }
      // Otherwise, analysis is done (completed, failed, or stale)
    };

    setTimeout(poll, 3000); // Initial delay
  }, [fetchMemory]);

  /**
   * Check if analysis is fresh or needs refresh
   */
  const checkFreshness = useCallback(async () => {
    if (!repositoryId || !repoFullName) {
      return { needsRefresh: false, reason: 'missing_params' };
    }

    try {
      const [owner, repo] = repoFullName.split('/');
      return await repositoryAnalyzer.checkAnalysisFreshness(repositoryId, owner, repo);
    } catch (err) {
      console.error('Error checking freshness:', err);
      return { needsRefresh: true, reason: 'error' };
    }
  }, [repositoryId, repoFullName]);

  /**
   * Get formatted context for AI prompts
   */
  const getAIContext = useCallback(() => {
    if (!memory || memory.analysis_status !== 'completed') {
      return null;
    }

    return memory.accumulated_context;
  }, [memory]);

  /**
   * Get summary for display
   */
  const getSummary = useCallback(() => {
    if (!memory) {
      return null;
    }

    return {
      filesAnalyzed: memory.files_analyzed || 0,
      totalFiles: memory.total_files || 0,
      languages: memory.languages_breakdown || {},
      patterns: memory.coding_patterns || [],
      keyInsights: memory.key_insights || [],
      lastAnalyzed: memory.analysis_completed_at,
    };
  }, [memory]);

  // Initial fetch
  useEffect(() => {
    if (repositoryId) {
      fetchMemory();
    }
  }, [repositoryId, fetchMemory]);

  return {
    // State
    memory,
    status,
    error,
    isLoading,
    isAnalyzing: status === 'analyzing',
    isCompleted: status === 'completed',
    isStale: status === 'stale',
    isFailed: status === 'failed',

    // Actions
    refresh: fetchMemory,
    triggerAnalysis,
    checkFreshness,

    // Getters
    getAIContext,
    getSummary,
  };
}

export default useRepositoryMemory;
