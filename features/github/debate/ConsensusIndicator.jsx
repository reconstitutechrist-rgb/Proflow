import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Visual indicator showing the agreement level between the two AIs
 */
export function ConsensusIndicator({ score, agreedPoints = [], contestedPoints = [] }) {
  // Determine status based on score
  const getStatus = () => {
    if (score >= 85) return { label: 'Consensus', color: 'green', icon: CheckCircle };
    if (score >= 60) return { label: 'Moderate Agreement', color: 'yellow', icon: HelpCircle };
    if (score >= 30) return { label: 'Partial Agreement', color: 'orange', icon: AlertCircle };
    return { label: 'Divergent Views', color: 'red', icon: AlertCircle };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  const colorClasses = {
    green: 'text-green-600 bg-green-100 border-green-200',
    yellow: 'text-yellow-600 bg-yellow-100 border-yellow-200',
    orange: 'text-orange-600 bg-orange-100 border-orange-200',
    red: 'text-red-600 bg-red-100 border-red-200',
  };

  const progressColors = {
    green: '[&>div]:bg-green-500',
    yellow: '[&>div]:bg-yellow-500',
    orange: '[&>div]:bg-orange-500',
    red: '[&>div]:bg-red-500',
  };

  return (
    <div className="space-y-3">
      {/* Main Score Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('w-5 h-5', `text-${status.color}-600`)} />
          <span className="font-medium text-gray-900 dark:text-white">{status.label}</span>
        </div>
        <Badge className={cn('border', colorClasses[status.color])}>{score}% Agreement</Badge>
      </div>

      {/* Progress Bar */}
      <Progress value={score} className={cn('h-2', progressColors[status.color])} />

      {/* Points Summary */}
      {(agreedPoints.length > 0 || contestedPoints.length > 0) && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Agreed Points */}
          <div>
            <div className="flex items-center gap-1 text-green-600 font-medium mb-1">
              <CheckCircle className="w-3 h-3" />
              Agreed ({agreedPoints.length})
            </div>
            {agreedPoints.length > 0 ? (
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                {agreedPoints.slice(0, 3).map((point, i) => (
                  <li key={i} className="truncate text-xs">
                    • {point}
                  </li>
                ))}
                {agreedPoints.length > 3 && (
                  <li className="text-xs text-gray-400">+{agreedPoints.length - 3} more</li>
                )}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">Building consensus...</p>
            )}
          </div>

          {/* Contested Points */}
          <div>
            <div className="flex items-center gap-1 text-orange-600 font-medium mb-1">
              <AlertCircle className="w-3 h-3" />
              Under Discussion ({contestedPoints.length})
            </div>
            {contestedPoints.length > 0 ? (
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                {contestedPoints.slice(0, 3).map((point, i) => (
                  <li key={i} className="truncate text-xs">
                    • {point}
                  </li>
                ))}
                {contestedPoints.length > 3 && (
                  <li className="text-xs text-gray-400">+{contestedPoints.length - 3} more</li>
                )}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">All points resolved</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConsensusIndicator;
