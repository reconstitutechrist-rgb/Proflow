import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Brain,
  MessageSquare,
  FileSearch,
  Wand2,
  Sparkles,
  FileText,
  Target,
  Clock,
  ArrowRight,
  BookOpen,
  PenTool,
  Lightbulb,
  ListTodo,
  Calendar,
} from 'lucide-react';

const RECENT_AI_ACTIONS_KEY = 'proflow_recent_ai_actions';
const MAX_RECENT_ACTIONS = 5;

// All AI capabilities organized by category
const AI_CAPABILITIES = [
  {
    category: 'Chat & Assistant',
    items: [
      {
        id: 'ask-ai',
        label: 'Chat with AI',
        description: 'Ask questions, get help with tasks',
        icon: MessageSquare,
        route: '/AIHub?tab=chat',
        color: 'text-purple-500',
      },
      {
        id: 'chat-documents',
        label: 'Chat with Documents',
        description: 'Upload and discuss documents with AI',
        icon: FileText,
        route: '/AIHub?tab=chat',
        color: 'text-blue-500',
      },
    ],
  },
  {
    category: 'Research',
    items: [
      {
        id: 'research',
        label: 'Research Assistant',
        description: 'Deep research on any topic',
        icon: FileSearch,
        route: '/AIHub?tab=research',
        color: 'text-green-500',
      },
      {
        id: 'web-research',
        label: 'Web Research',
        description: 'Search and analyze web content',
        icon: BookOpen,
        route: '/AIHub?tab=research',
        color: 'text-teal-500',
      },
    ],
  },
  {
    category: 'Generate & Create',
    items: [
      {
        id: 'generate-document',
        label: 'Generate Document',
        description: 'Create documents from templates',
        icon: Wand2,
        route: '/DocumentsHub?tab=templates',
        color: 'text-orange-500',
      },
      {
        id: 'write-content',
        label: 'Write Content',
        description: 'Generate text, summaries, drafts',
        icon: PenTool,
        route: '/DocumentsHub?tab=studio',
        color: 'text-pink-500',
      },
    ],
  },
  {
    category: 'Task Assistance',
    items: [
      {
        id: 'prioritize-tasks',
        label: 'Prioritize My Tasks',
        description: 'Get AI help organizing your work',
        icon: ListTodo,
        route: '/AIHub?tab=chat&prompt=Help me prioritize my current tasks',
        color: 'text-amber-500',
      },
      {
        id: 'plan-project',
        label: 'Plan a Project',
        description: 'Create project plans and milestones',
        icon: Target,
        route: '/AIHub?tab=chat&prompt=Help me create a project plan',
        color: 'text-indigo-500',
      },
      {
        id: 'schedule-help',
        label: 'Schedule Assistance',
        description: 'Get help with deadlines and scheduling',
        icon: Calendar,
        route: '/AIHub?tab=chat&prompt=Help me manage my schedule and deadlines',
        color: 'text-cyan-500',
      },
    ],
  },
];

// Context-aware suggestions based on current page
const getContextSuggestions = (pathname) => {
  if (pathname.includes('/Tasks')) {
    return [
      { label: 'Prioritize my tasks', prompt: 'Help me prioritize my current tasks' },
      { label: 'Break down a task', prompt: 'Help me break down this task into subtasks' },
      { label: 'Estimate task time', prompt: 'Help me estimate time for my tasks' },
    ];
  }
  if (pathname.includes('/Projects')) {
    return [
      { label: 'Create project plan', prompt: 'Help me create a project plan' },
      { label: 'Suggest milestones', prompt: 'What milestones should I set?' },
      { label: 'Risk assessment', prompt: 'Help me identify project risks' },
    ];
  }
  if (pathname.includes('/Documents')) {
    return [
      { label: 'Summarize document', prompt: 'Summarize this document for me' },
      { label: 'Improve writing', prompt: 'Help me improve this document' },
      { label: 'Generate outline', prompt: 'Create an outline for a document' },
    ];
  }
  if (pathname.includes('/Assignments')) {
    return [
      { label: 'Break down assignment', prompt: 'Break this assignment into tasks' },
      { label: 'Suggest next steps', prompt: 'What should I do next?' },
      { label: 'Track progress', prompt: 'Help me track my progress' },
    ];
  }
  // Default suggestions
  return [
    { label: 'What should I focus on?', prompt: 'What should I focus on today?' },
    { label: 'Summarize my progress', prompt: 'Give me a summary of my progress' },
    { label: 'Get help with writing', prompt: 'Help me write something' },
  ];
};

export default function AISpotlight({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentActions, setRecentActions] = useState([]);

  const contextSuggestions = getContextSuggestions(location.pathname);

  // Load recent AI actions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_AI_ACTIONS_KEY);
      if (saved) {
        setRecentActions(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading recent AI actions:', e);
    }
  }, []);

  // Save an action to recent actions
  const saveRecentAction = useCallback((action) => {
    setRecentActions((prev) => {
      const filtered = prev.filter((a) => a.id !== action.id);
      const updated = [{ ...action, timestamp: Date.now() }, ...filtered].slice(
        0,
        MAX_RECENT_ACTIONS
      );
      try {
        localStorage.setItem(RECENT_AI_ACTIONS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving recent AI actions:', e);
      }
      return updated;
    });
  }, []);

  // Clear recent actions
  const clearRecentActions = useCallback(() => {
    setRecentActions([]);
    try {
      localStorage.removeItem(RECENT_AI_ACTIONS_KEY);
    } catch (e) {
      console.error('Error clearing recent AI actions:', e);
    }
  }, []);

  // Handle capability selection
  const handleSelect = useCallback(
    (item) => {
      saveRecentAction(item);
      onClose();
      navigate(item.route);
    },
    [navigate, onClose, saveRecentAction]
  );

  // Handle context suggestion
  const handleContextSuggestion = useCallback(
    (suggestion) => {
      onClose();
      navigate(`/AIHub?tab=chat&prompt=${encodeURIComponent(suggestion.prompt)}`);
    },
    [navigate, onClose]
  );

  // Handle recent action click
  const handleRecentAction = useCallback(
    (action) => {
      onClose();
      navigate(action.route);
    },
    [navigate, onClose]
  );

  // Reset search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter capabilities based on search
  const filteredCapabilities = AI_CAPABILITIES.map((category) => ({
    ...category,
    items: category.items.filter(
      (item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.items.length > 0);

  const showSuggestions = !searchQuery.trim();

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput
        placeholder="What would you like AI help with?"
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>No AI features found. Try a different search.</CommandEmpty>

        {/* Context-Aware Suggestions - shown when no query */}
        {showSuggestions && (
          <>
            <CommandGroup
              heading={
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-3 h-3 text-yellow-500" />
                  <span>Suggested for this page</span>
                </div>
              }
            >
              {contextSuggestions.map((suggestion, index) => (
                <CommandItem
                  key={`suggestion-${index}`}
                  onSelect={() => handleContextSuggestion(suggestion)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="flex-1">{suggestion.label}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Recent AI Actions - shown when no query and have recent actions */}
        {showSuggestions && recentActions.length > 0 && (
          <>
            <CommandGroup
              heading={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>Recent</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearRecentActions();
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    Clear
                  </button>
                </div>
              }
            >
              {recentActions.map((action) => {
                const IconComponent =
                  AI_CAPABILITIES.flatMap((c) => c.items).find((i) => i.id === action.id)?.icon ||
                  Brain;
                return (
                  <CommandItem
                    key={`recent-${action.id}`}
                    onSelect={() => handleRecentAction(action)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <IconComponent className={`w-4 h-4 ${action.color || 'text-gray-400'}`} />
                    <span className="flex-1">{action.label}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* AI Capabilities */}
        {filteredCapabilities.map((category) => (
          <CommandGroup key={category.category} heading={category.category}>
            {category.items.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {item.description}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>

      {/* Footer with keyboard hints */}
      <div className="flex items-center justify-center gap-4 px-4 py-2 border-t text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">
        <span className="flex items-center gap-1">
          <Brain className="w-3 h-3 text-purple-500" />
          AI Spotlight
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono">
            ↵
          </kbd>
          select
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono">
            esc
          </kbd>
          close
        </span>
      </div>
    </CommandDialog>
  );
}
