import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tutorialConfig } from './tutorialSteps';

const TutorialContext = createContext();

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
};

export const TutorialProvider = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentModule, setCurrentModule] = useState(null);
  const [tutorialData, setTutorialData] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [sampleAssignment, setSampleAssignment] = useState(null);
  const [sampleDocument, setSampleDocument] = useState(null);

  useEffect(() => {
    // Load tutorial progress from localStorage
    const saved = localStorage.getItem('tutorial_progress');
    if (saved) {
      const progress = JSON.parse(saved);
      setCompletedSteps(progress.completedSteps || []);
    }
  }, []);

  // Listen for start-tutorial custom event from WhatsNewModal
  useEffect(() => {
    const handleStartTutorial = () => {
      startTutorialWithConfig();
    };

    window.addEventListener('start-tutorial', handleStartTutorial);
    return () => window.removeEventListener('start-tutorial', handleStartTutorial);
  }, []);

  const startTutorialWithConfig = useCallback(() => {
    setTutorialData(tutorialConfig);
    setCurrentModule(0);
    setCurrentStep(0);
    setIsActive(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const startTutorial = (config) => {
    setTutorialData(config || tutorialConfig);
    setCurrentModule(0);
    setCurrentStep(0);
    setIsActive(true);
    document.body.style.overflow = 'hidden';
  };

  const endTutorial = () => {
    setIsActive(false);
    setCurrentStep(0);
    setCurrentModule(null);
    setTutorialData(null);
    document.body.style.overflow = 'auto';
  };

  const nextStep = () => {
    if (!tutorialData) return;

    const currentModuleData = tutorialData.modules[currentModule];
    const newCompletedStep = `${currentModule}-${currentStep}`;

    if (!completedSteps.includes(newCompletedStep)) {
      const updated = [...completedSteps, newCompletedStep];
      setCompletedSteps(updated);
      localStorage.setItem('tutorial_progress', JSON.stringify({ completedSteps: updated }));
    }

    if (currentStep < currentModuleData.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (currentModule < tutorialData.modules.length - 1) {
      setCurrentModule(currentModule + 1);
      setCurrentStep(0);
    } else {
      // Tutorial complete
      completeTutorial();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (currentModule > 0) {
      setCurrentModule(currentModule - 1);
      const prevModule = tutorialData.modules[currentModule - 1];
      setCurrentStep(prevModule.steps.length - 1);
    }
  };

  const skipToModule = (moduleIndex) => {
    if (moduleIndex >= 0 && moduleIndex < tutorialData.modules.length) {
      setCurrentModule(moduleIndex);
      setCurrentStep(0);
    }
  };

  const completeTutorial = () => {
    localStorage.setItem('tutorial_completed', 'true');
    endTutorial();
  };

  const resetTutorial = () => {
    localStorage.removeItem('tutorial_progress');
    localStorage.removeItem('tutorial_completed');
    setCompletedSteps([]);
    setSampleAssignment(null);
    setSampleDocument(null);
  };

  const hasCompletedTutorial = () => {
    return localStorage.getItem('tutorial_completed') === 'true';
  };

  const getCurrentStepData = () => {
    if (!tutorialData || currentModule === null) return null;
    const module = tutorialData.modules[currentModule];
    return module?.steps[currentStep];
  };

  const getTotalSteps = () => {
    if (!tutorialData) return 0;
    return tutorialData.modules.reduce((total, module) => total + module.steps.length, 0);
  };

  const getCurrentStepNumber = () => {
    if (!tutorialData || currentModule === null) return 0;
    let stepNumber = 0;
    for (let i = 0; i < currentModule; i++) {
      stepNumber += tutorialData.modules[i].steps.length;
    }
    return stepNumber + currentStep + 1;
  };

  const value = {
    isActive,
    currentStep,
    currentModule,
    tutorialData,
    completedSteps,
    sampleAssignment,
    sampleDocument,
    setSampleAssignment,
    setSampleDocument,
    startTutorial,
    endTutorial,
    nextStep,
    previousStep,
    skipToModule,
    completeTutorial,
    resetTutorial,
    hasCompletedTutorial,
    getCurrentStepData,
    getTotalSteps,
    getCurrentStepNumber,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
};
