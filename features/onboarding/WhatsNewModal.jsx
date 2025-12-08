import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  FileText,
  Brain,
  LayoutDashboard,
  CheckSquare,
  FolderOpen,
  Smartphone,
  Wand2,
  ChevronRight,
  X,
} from 'lucide-react';

const CURRENT_VERSION = '2.0.0';
const STORAGE_KEY = 'proflow_seen_version';

const updates = [
  {
    icon: LayoutDashboard,
    title: 'Enhanced Dashboard',
    description:
      'New "Needs Attention" section highlights overdue tasks, due today items, and high-priority work. Plus "Today\'s Focus" shows AI-suggested priorities.',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    tag: 'Dashboard',
  },
  {
    icon: FileText,
    title: 'Unified Documents Hub',
    description:
      'Library, Studio, and Templates combined into one page with tabs. Browse, create, and generate documents without switching pages.',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600',
    tag: 'Documents',
  },
  {
    icon: Brain,
    title: 'AI Hub',
    description:
      'Ask AI, Research, and Generate unified into one powerful hub. All AI tools in one place with shared context.',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
    tag: 'AI',
  },
  {
    icon: CheckSquare,
    title: 'Task Views',
    description:
      'Three new views: Kanban, List, and Calendar. Plus quick filter presets for My Tasks, Overdue, Due Today, and This Week.',
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600',
    tag: 'Tasks',
  },
  {
    icon: FolderOpen,
    title: 'Workspace Modal',
    description:
      'Manage workspaces, invite members, and switch contexts from a quick dropdown modal - no more navigating away.',
    color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600',
    tag: 'Workspaces',
  },
  {
    icon: Sparkles,
    title: 'Contextual AI Assistant',
    description:
      "New floating AI button that knows which page you're on and suggests relevant quick actions.",
    color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600',
    tag: 'AI',
  },
  {
    icon: Wand2,
    title: 'Transform Menu',
    description:
      'Unified content transformation tool. Summarize, simplify, make formal, friendly, or technical - all from one menu.',
    color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600',
    tag: 'AI',
  },
  {
    icon: Smartphone,
    title: 'Mobile Navigation',
    description:
      'New bottom navigation bar on mobile with quick create button. Tap the + to quickly add tasks, documents, or start AI chat.',
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    tag: 'Mobile',
  },
];

export default function WhatsNewModal({ forceOpen = false, onClose }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Check if user has seen this version
    const seenVersion = localStorage.getItem(STORAGE_KEY);
    if (seenVersion !== CURRENT_VERSION) {
      // Delay showing to not interrupt initial load
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setIsOpen(false);
    onClose?.();
  };

  const handleStartTutorial = () => {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setIsOpen(false);
    // Trigger tutorial start - this would need to be connected to TutorialProvider
    window.dispatchEvent(new CustomEvent('start-tutorial'));
    onClose?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">What's New in Proflow</DialogTitle>
              <DialogDescription>
                We've streamlined the experience with powerful new features
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4 py-4">
            {updates.map((update, index) => {
              const Icon = update.icon;
              return (
                <div
                  key={index}
                  className="flex gap-4 p-4 rounded-lg border bg-gray-50 dark:bg-gray-800/50 hover:border-purple-300 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${update.color} flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {update.title}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {update.tag}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{update.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="sm:flex-1">
            Got it
          </Button>
          <Button
            onClick={handleStartTutorial}
            className="sm:flex-1 bg-gradient-to-r from-purple-600 to-indigo-600"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Take a Quick Tour
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
