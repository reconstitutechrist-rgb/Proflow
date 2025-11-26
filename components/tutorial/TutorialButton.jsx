import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { GraduationCap } from 'lucide-react';
import { useTutorial } from '@/TutorialProvider';
import { tutorialConfig } from '@/tutorialSteps';

function TutorialButtonInner({ variant = "ghost", size = "sm", showIcon = true }) {
  const { startTutorial, hasCompletedTutorial, resetTutorial } = useTutorial();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleStart = () => {
    if (hasCompletedTutorial()) {
      setDialogOpen(true);
    } else {
      startTutorial(tutorialConfig);
    }
  };

  const handleDialogConfirm = () => {
    resetTutorial();
    startTutorial(tutorialConfig);
    setDialogOpen(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleStart}
        className="gap-2 w-full justify-start"
      >
        {showIcon && <GraduationCap className="w-4 h-4" />}
        {hasCompletedTutorial() ? 'Restart Tutorial' : 'Start Tutorial'}
      </Button>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Tutorial?</AlertDialogTitle>
            <AlertDialogDescription>
              You've already completed the tutorial. Would you like to restart it from the beginning?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDialogConfirm}>Restart</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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