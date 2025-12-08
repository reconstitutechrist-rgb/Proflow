import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Shield,
  Database,
  Users,
  Activity,
} from 'lucide-react';
import { db } from '@/api/db';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { toast } from 'sonner';

export default function WorkspaceHealthCheck() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const { currentWorkspaceId, currentUser } = useWorkspace();

  const runHealthCheck = async () => {
    if (!currentWorkspaceId || !currentUser) {
      toast.error('No workspace or user loaded');
      return;
    }

    setChecking(true);
    const checks = [];

    try {
      // Check 1: Workspace exists and user is member
      try {
        const workspace = await db.entities.Workspace.filter(
          {
            id: currentWorkspaceId,
          },
          '-created_date',
          1
        );

        if (workspace.length > 0 && workspace[0].members.includes(currentUser.email)) {
          checks.push({
            name: 'Workspace Access',
            status: 'pass',
            message: 'User has valid workspace access',
          });
        } else {
          checks.push({
            name: 'Workspace Access',
            status: 'fail',
            message: 'Workspace not found or user not a member',
          });
        }
      } catch (error) {
        checks.push({
          name: 'Workspace Access',
          status: 'error',
          message: error.message,
        });
      }

      // Check 2: Data isolation (sample test)
      try {
        const projects = await db.entities.Project.filter(
          {
            workspace_id: currentWorkspaceId,
          },
          '-created_date',
          1
        );

        const allProjects = await db.entities.Project.list();
        const otherWorkspaceProjects = allProjects.filter(
          (p) => p.workspace_id && p.workspace_id !== currentWorkspaceId
        );

        if (
          otherWorkspaceProjects.length === 0 ||
          projects.every((p) => p.workspace_id === currentWorkspaceId)
        ) {
          checks.push({
            name: 'Data Isolation',
            status: 'pass',
            message: 'No cross-workspace data leakage detected',
          });
        } else {
          checks.push({
            name: 'Data Isolation',
            status: 'warning',
            message: 'Potential cross-workspace visibility detected',
          });
        }
      } catch (error) {
        checks.push({
          name: 'Data Isolation',
          status: 'error',
          message: error.message,
        });
      }

      // Check 3: All entities have workspace_id
      try {
        const entitiesToCheck = ['Project', 'Assignment', 'Document', 'Task'];
        const missingWorkspaceId = [];

        for (const entityName of entitiesToCheck) {
          const records = await db.entities[entityName].filter(
            {
              workspace_id: currentWorkspaceId,
            },
            '-created_date',
            5
          );

          const withoutWorkspace = records.filter((r) => !r.workspace_id);
          if (withoutWorkspace.length > 0) {
            missingWorkspaceId.push(`${entityName} (${withoutWorkspace.length})`);
          }
        }

        if (missingWorkspaceId.length === 0) {
          checks.push({
            name: 'Entity Integrity',
            status: 'pass',
            message: 'All checked entities have workspace_id',
          });
        } else {
          checks.push({
            name: 'Entity Integrity',
            status: 'warning',
            message: `Missing workspace_id: ${missingWorkspaceId.join(', ')}`,
          });
        }
      } catch (error) {
        checks.push({
          name: 'Entity Integrity',
          status: 'error',
          message: error.message,
        });
      }

      // Check 4: User active_workspace_id matches
      try {
        if (currentUser.active_workspace_id === currentWorkspaceId) {
          checks.push({
            name: 'User Sync',
            status: 'pass',
            message: 'User active workspace matches current',
          });
        } else {
          checks.push({
            name: 'User Sync',
            status: 'warning',
            message: 'User active_workspace_id out of sync',
          });
        }
      } catch (error) {
        checks.push({
          name: 'User Sync',
          status: 'error',
          message: error.message,
        });
      }

      setResults(checks);

      const passCount = checks.filter((c) => c.status === 'pass').length;
      if (passCount === checks.length) {
        toast.success('All health checks passed!');
      } else {
        toast.warning(`${passCount}/${checks.length} checks passed`);
      }
    } catch (error) {
      console.error('Health check error:', error);
      toast.error('Health check failed');
    } finally {
      setChecking(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'fail':
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pass: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      fail: 'bg-red-100 text-red-800',
      error: 'bg-red-100 text-red-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Workspace Health Check
          </CardTitle>
          <Button onClick={runHealthCheck} disabled={checking} size="sm">
            {checking ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Check
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!results ? (
          <div className="text-center py-8 text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Click "Run Check" to verify workspace health</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((check, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border bg-white dark:bg-gray-800"
              >
                <div className="flex-shrink-0 mt-0.5">{getStatusIcon(check.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{check.name}</h4>
                    <Badge className={getStatusBadge(check.status)} variant="secondary">
                      {check.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{check.message}</p>
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Summary:</span>
                <div className="flex gap-4">
                  <span className="text-green-600 font-medium">
                    {results.filter((r) => r.status === 'pass').length} Passed
                  </span>
                  <span className="text-yellow-600 font-medium">
                    {results.filter((r) => r.status === 'warning').length} Warnings
                  </span>
                  <span className="text-red-600 font-medium">
                    {results.filter((r) => r.status === 'fail' || r.status === 'error').length}{' '}
                    Failed
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
