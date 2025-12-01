import React from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap } from 'lucide-react';
import { useTutorial } from '@/features/tutorial/TutorialProvider';
import { tutorialConfig } from '@/features/tutorial/tutorialSteps';

function TutorialButtonInner({ variant = "ghost", size = "sm", showIcon = true }) {
  const { startTutorial, hasCompletedTutorial, resetTutorial } = useTutorial();

  const handleStart = () => {
    if (hasCompletedTutorial()) {
      if (confirm('You\'ve already completed the tutorial. Would you like to restart it from the beginning?')) {
        resetTutorial();
        startTutorial(tutorialConfig);
      }
    } else {
      startTutorial(tutorialConfig);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleStart}
      className="gap-2 w-full justify-start"
    >
      {showIcon && <GraduationCap className="w-4 h-4" />}
      {hasCompletedTutorial() ? 'Restart Tutorial' : 'Start Tutorial'}
    </Button>
  );
}

export default function TutorialButton(props) {
  // Wrap in error boundary to prevent crashes
  try {
    return <TutorialButtonInner {...props} />;
  } catch (error) {
    console.error('TutorialButton error:', error);
    return (
      <Button
        variant={props.variant || "ghost"}
        size={props.size || "sm"}
        className="gap-2 w-full justify-start"
        disabled
      >
        {props.showIcon && <GraduationCap className="w-4 h-4" />}
        Tutorial (Loading...)
      </Button>
    );
  }
}