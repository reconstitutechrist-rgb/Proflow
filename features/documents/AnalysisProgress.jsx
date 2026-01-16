/**
 * AnalysisProgress Component
 *
 * Shows multi-step progress during document analysis.
 * Steps: Extract → Analyze → Match → Generate
 */

import { Progress } from '@/components/ui/progress';
import { Loader2, FileText, Brain, Search, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ANALYSIS_STEPS = [
  { key: 'extracting', label: 'Extracting content', icon: FileText, threshold: 0 },
  { key: 'analyzing', label: 'Analyzing facts', icon: Brain, threshold: 25 },
  { key: 'matching', label: 'Finding matches', icon: Search, threshold: 50 },
  { key: 'generating', label: 'Generating changes', icon: Sparkles, threshold: 75 },
  { key: 'complete', label: 'Complete', icon: CheckCircle2, threshold: 100 },
];

export default function AnalysisProgress({ progress, status, currentStep: _currentStep }) {
  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{status || 'Analyzing...'}</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between">
        {ANALYSIS_STEPS.slice(0, 4).map((step, index) => {
          const isActive =
            progress >= step.threshold && progress < (ANALYSIS_STEPS[index + 1]?.threshold || 101);
          const isComplete = progress > (ANALYSIS_STEPS[index + 1]?.threshold || 100);
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={cn(
                'flex flex-col items-center gap-1 text-xs',
                isActive && 'text-primary',
                isComplete && 'text-green-600',
                !isActive && !isComplete && 'text-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2',
                  isActive && 'border-primary bg-primary/10',
                  isComplete && 'border-green-600 bg-green-50',
                  !isActive && !isComplete && 'border-muted'
                )}
              >
                {isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isComplete ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className="text-center">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
