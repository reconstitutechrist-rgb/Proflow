import React from 'react';
import { Link, useLocation } from 'react-router';
import { createPageUrl } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Brain,
  Users,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MobileBottomNav() {
  const location = useLocation();

  const navItems = [
    {
      label: 'Home',
      icon: LayoutDashboard,
      href: createPageUrl('Dashboard'),
      match: ['/Dashboard', '/']
    },
    {
      label: 'Work',
      icon: FolderOpen,
      href: createPageUrl('Projects'),
      match: ['/Projects', '/Assignments', '/Tasks']
    },
    {
      label: 'Docs',
      icon: FileText,
      href: createPageUrl('Documents'),
      match: ['/Documents', '/DocumentsHub']
    },
    {
      label: 'AI',
      icon: Brain,
      href: createPageUrl('AIHub'),
      match: ['/AIHub', '/AskAI', '/Generate']
    },
    {
      label: 'Team',
      icon: Users,
      href: createPageUrl('Chat'),
      match: ['/Chat', '/Users']
    },
  ];

  const isActive = (item) => {
    return item.match.some(path => location.pathname.includes(path));
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item);

          // Insert the floating action button in the middle
          if (index === 2) {
            return (
              <React.Fragment key={item.label}>
                {/* Quick Create FAB */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg -mt-6"
                    >
                      <Plus className="w-6 h-6 text-white" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48 mb-2">
                    <DropdownMenuItem asChild>
                      <Link to={`${createPageUrl('Tasks')}?new=true`} className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        New Task
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`${createPageUrl('Documents')}?tab=studio`} className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        New Document
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`${createPageUrl('AIHub')}?tab=chat`} className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Ask AI
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Current nav item after FAB */}
                <Link
                  to={item.href}
                  className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${
                    active
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : ''}`} />
                  <span className="text-xs mt-1 font-medium">{item.label}</span>
                  {active && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-purple-600 dark:bg-purple-400 rounded-t-full" />
                  )}
                </Link>
              </React.Fragment>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${
                active
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : ''}`} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
              {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-purple-600 dark:bg-purple-400 rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
