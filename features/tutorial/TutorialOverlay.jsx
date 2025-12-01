import React, { useEffect, useState, useRef } from 'react';
import { useTutorial } from '@/features/tutorial/TutorialProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check,
  AlertCircle,
  Lightbulb,
  Link2,
  ArrowRight,
  Zap
} from 'lucide-react';

export default function TutorialOverlay() {
  const {
    isActive,
    currentModule,
    tutorialData,
    nextStep,
    previousStep,
    endTutorial,
    getCurrentStepData,
    getTotalSteps,
    getCurrentStepNumber,
  } = useTutorial();

  const [highlightedElement, setHighlightedElement] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);

  const stepData = getCurrentStepData();

  useEffect(() => {
    if (!isActive || !stepData) return;

    // Highlight target element
    if (stepData.target) {
      const element = document.querySelector(stepData.target);
      if (element) {
        setHighlightedElement(element);
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Calculate tooltip position
        const rect = element.getBoundingClientRect();
        const tooltipHeight = tooltipRef.current?.offsetHeight || 300;
        const tooltipWidth = tooltipRef.current?.offsetWidth || 400;

        let top = rect.bottom + 20;
        let left = rect.left;

        // Adjust if tooltip would go off-screen
        if (top + tooltipHeight > window.innerHeight) {
          top = rect.top - tooltipHeight - 20;
        }

        if (left + tooltipWidth > window.innerWidth) {
          left = window.innerWidth - tooltipWidth - 20;
        }

        if (left < 20) {
          left = 20;
        }

        setTooltipPosition({ top, left });
      }
    } else {
      setHighlightedElement(null);
    }

    return () => {
      setHighlightedElement(null);
    };
  }, [isActive, stepData]);

  if (!isActive || !stepData) return null;

  const moduleData = tutorialData.modules[currentModule];
  const progress = (getCurrentStepNumber() / getTotalSteps()) * 100;

  const getHighlightStyle = () => {
    if (!highlightedElement) return {};
    
    const rect = highlightedElement.getBoundingClientRect();
    return {
      top: rect.top - 4,
      left: rect.left - 4,
      width: rect.width + 8,
      height: rect.height + 8,
    };
  };

  const getIntegrationIcon = (type) => {
    switch (type) {
      case 'ai': return <Sparkles className="w-4 h-4" />;
      case 'link': return <Link2 className="w-4 h-4" />;
      case 'flow': return <ArrowRight className="w-4 h-4" />;
      case 'feature': return <Zap className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Highlight Box */}
      {highlightedElement && (
        <>
          <div
            className="absolute pointer-events-none transition-all duration-300"
            style={getHighlightStyle()}
          >
            <div className="absolute inset-0 rounded-lg ring-4 ring-blue-500 ring-offset-4 ring-offset-transparent animate-pulse" />
            <div className="absolute inset-0 rounded-lg bg-white/5" />
          </div>

          {/* Arrow pointer */}
          <div
            className="absolute w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800 transition-all duration-300"
            style={{
              top: tooltipPosition.top - 8,
              left: getHighlightStyle().left + (getHighlightStyle().width / 2) - 8,
            }}
          />
        </>
      )}

      {/* Tutorial Tooltip */}
      <Card
        ref={tooltipRef}
        className="absolute w-[500px] max-w-[90vw] shadow-2xl border-2 border-blue-500/50 bg-white dark:bg-gray-800 transition-all duration-300"
        style={{
          top: highlightedElement ? tooltipPosition.top : '50%',
          left: highlightedElement ? tooltipPosition.left : '50%',
          transform: highlightedElement ? 'none' : 'translate(-50%, -50%)',
        }}
      >
        <CardContent className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  Module {currentModule + 1} of {tutorialData.modules.length}
                </Badge>
                <Badge variant="outline">
                  Step {getCurrentStepNumber()} of {getTotalSteps()}
                </Badge>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {moduleData.title}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={endTutorial}
              className="ml-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{stepData.title}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {stepData.description}
            </p>

            {/* Integration Highlight */}
            {stepData.integration && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    {getIntegrationIcon(stepData.integration.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {stepData.integration.title}
                    </h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      {stepData.integration.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Instruction */}
            {stepData.action && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Try it yourself:
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {stepData.action}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pro Tip */}
            {stepData.tip && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-100 uppercase tracking-wide">
                      Pro Tip
                    </span>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      {stepData.tip}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={currentModule === 0 && getCurrentStepNumber() === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={endTutorial}
                className="text-gray-600 dark:text-gray-400"
              >
                Skip Tutorial
              </Button>
              <Button
                onClick={nextStep}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {getCurrentStepNumber() === getTotalSteps() ? 'Complete' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}