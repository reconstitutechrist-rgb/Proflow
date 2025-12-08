import { useEffect, useRef } from 'react';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';

/**
 * Performance monitoring component for workspace operations
 * Logs performance metrics to help identify bottlenecks
 */
export default function WorkspacePerformanceMonitor() {
  const { currentWorkspaceId, loading } = useWorkspace();
  const startTimeRef = useRef(null);
  const metricsRef = useRef({
    workspaceSwitches: 0,
    averageSwitchTime: 0,
    totalSwitchTime: 0,
  });

  useEffect(() => {
    if (loading) {
      startTimeRef.current = performance.now();
    } else if (startTimeRef.current && currentWorkspaceId) {
      const duration = performance.now() - startTimeRef.current;

      // Update metrics
      metricsRef.current.workspaceSwitches++;
      metricsRef.current.totalSwitchTime += duration;
      metricsRef.current.averageSwitchTime =
        metricsRef.current.totalSwitchTime / metricsRef.current.workspaceSwitches;

      // Log if performance is degrading
      if (duration > 1000) {
        console.warn(`⚠️ Slow workspace switch detected: ${duration.toFixed(2)}ms`);
      } else {
        console.log(`✓ Workspace switch completed in ${duration.toFixed(2)}ms`);
      }

      // Log summary every 5 switches
      if (metricsRef.current.workspaceSwitches % 5 === 0) {
        console.log('📊 Workspace Performance Summary:', {
          totalSwitches: metricsRef.current.workspaceSwitches,
          averageTime: `${metricsRef.current.averageSwitchTime.toFixed(2)}ms`,
          currentWorkspace: currentWorkspaceId,
        });
      }

      startTimeRef.current = null;
    }
  }, [loading, currentWorkspaceId]);

  return null; // This is a monitoring component, no UI
}
