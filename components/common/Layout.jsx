

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { createPageUrl } from "@/lib/utils";
import { User } from "@/api/entities";
import { Task } from "@/api/entities";
import { Assignment } from "@/api/entities";
import { db } from "@/api/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  FolderOpen,
  FileEdit,
  FileSearch,
  MessageSquare,
  Users,
  Settings,
  Menu,
  Search,
  Bell,
  LogOut,
  User as UserIcon,
  Zap,
  HelpCircle,
  Plus,
  ChevronDown,
  Lightbulb,
  Command,
  CheckCircle,
  X,
  Brain,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Clock,
  Eye,
  GraduationCap,
  FileText,
  Target // Added Target icon
} from "lucide-react";

import { TutorialProvider } from "@/features/tutorial/TutorialProvider";
import TutorialOverlay from "@/features/tutorial/TutorialOverlay";
import TutorialButton from "@/features/tutorial/TutorialButton";
import UnifiedAIAssistant from "@/features/ai/UnifiedAIAssistant";
import WorkspaceSwitcher from '@/features/workspace/WorkspaceSwitcher';
import { WorkspaceProvider, useWorkspace } from '@/features/workspace/WorkspaceContext'; // Fixed import path
import WorkspaceErrorBoundary from '@/features/workspace/WorkspaceErrorBoundary'; // Added WorkspaceErrorBoundary import
import WorkspacePerformanceMonitor from '@/features/workspace/WorkspacePerformanceMonitor'; // Added WorkspacePerformanceMonitor import
import { ErrorBoundary } from '@/components/common/ErrorBoundary'; // Import shared ErrorBoundary
import { useAuth } from '@/components/auth/AuthProvider'; // Import auth hook
import MobileBottomNav from '@/components/common/MobileBottomNav'; // Mobile navigation
import WhatsNewModal from '@/features/onboarding/WhatsNewModal'; // Feature discovery
import BugReporter from '@/features/devtools/BugReporter'; // Visual Bug Reporter (dev only)
import TeamChatBubble from '@/features/teamchat/TeamChatBubble'; // Team Chat Bubble

const GlobalSearch = React.lazy(() =>
  import("@/components/search/GlobalSearch").catch(() => ({
    default: ({ isOpen, onClose }) => (
      <CommandDialog open={isOpen} onOpenChange={onClose}>
        <div className="p-8 text-center">
          <p>Global search is not available</p>
          <Button onClick={() => onClose()} className="mt-4">Close</Button>
        </div>
      </CommandDialog>
    )
  }))
);

function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, signOut } = useAuth();
  const { currentWorkspaceId } = useWorkspace();
  const [user, setUser] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      return savedTheme === 'dark';
    }
    return false;
  });
  
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const loadEssentialNotifications = useCallback(async () => {
    if (!user || !user.email) {
      setNotifications([]);
      return;
    }

    try {
      // Get tasks assigned to user and recent assignments from user's workspace
      const [tasks, recentAssignments] = await Promise.all([
        Task.filter({ assigned_to: user.email }, "-updated_date", 10),
        Assignment.filter({}, "-updated_date", 10) // Get recent assignments
      ]);

      // Filter assignments to only those the user has tasks in
      const userTaskAssignmentIds = new Set(tasks.map(t => t.assignment_id).filter(Boolean));
      const assignments = recentAssignments
        .filter(a => userTaskAssignmentIds.has(a.id))
        .slice(0, 5);

      const essentialNotifs = [];
      const now = new Date();
      
      tasks.forEach(task => {
        if (task.status && task.status !== 'completed' && task.due_date) {
          const dueDate = new Date(task.due_date);
          const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff < 0) {
            essentialNotifs.push({
              id: `overdue-task-${task.id}`,
              title: "Task Overdue",
              message: `"${task.title}" was due ${Math.abs(daysDiff)} days ago.`,
              type: "urgent",
              actionUrl: createPageUrl("Tasks") + `?task=${task.id}`,
              timestamp: task.due_date,
              priority: "high"
            });
          } else if (daysDiff <= 1 && daysDiff >= 0) {
            essentialNotifs.push({
              id: `due-soon-task-${task.id}`,
              title: "Task Due Soon", 
              message: `"${task.title}" is due ${daysDiff === 0 ? 'today' : 'tomorrow'}.`,
              type: "warning",
              actionUrl: createPageUrl("Tasks") + `?task=${task.id}`,
              timestamp: task.due_date,
              priority: "medium"
            });
          }
        }
      });

      tasks.forEach(task => {
        const createdDate = new Date(task.created_date);
        const hoursSinceCreated = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceCreated <= 24 && task.assigned_to === user.email && task.created_by !== user.email) {
          essentialNotifs.push({
            id: `new-task-assigned-${task.id}`,
            title: "New Task Assigned",
            message: `"${task.title}" was assigned to you by ${task.created_by || 'an administrator'}.`,
            type: "info",
            actionUrl: createPageUrl("Tasks") + `?task=${task.id}`,
            timestamp: task.created_date,
            priority: "medium"
          });
        }
      });

      assignments.forEach(assignment => {
        const updatedDate = new Date(assignment.updated_date);
        const hoursSinceUpdate = (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate <= 24 && assignment.status && assignment.status !== 'in_progress') {
          let notificationType = 'info';
          let notificationMessage = `"${assignment.name}" status changed to ${assignment.status.replace('_', ' ')}.`;
          if (assignment.status === 'completed') {
            notificationType = 'success';
            notificationMessage = `"${assignment.name}" has been completed.`;
          } else if (assignment.status === 'cancelled' || assignment.status === 'on_hold') {
            notificationType = 'warning';
          }

          essentialNotifs.push({
            id: `assignment-status-${assignment.id}`,
            title: "Assignment Status Update",
            message: notificationMessage,
            type: notificationType,
            actionUrl: createPageUrl("Assignments") + `?assignment=${assignment.id}`,
            timestamp: assignment.updated_date,
            priority: assignment.status === 'completed' ? "low" : "medium"
          });
        }
      });

      essentialNotifs.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      setNotifications(essentialNotifs.slice(0, 5)); 
    } catch (error) {
      console.error("Error loading essential notifications:", error);
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadEssentialNotifications();
      const intervalId = setInterval(loadEssentialNotifications, 5 * 60 * 1000);
      return () => clearInterval(intervalId);
    } else {
      setNotifications([]);
    }
  }, [user, loadEssentialNotifications]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA'].includes(event.target.tagName) || event.target.contentEditable === 'true') {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'k':
            event.preventDefault();
            setIsGlobalSearchOpen(true);
            break;
          case '/':
            event.preventDefault();
            setIsKeyboardShortcutsOpen(true);
            break;
          case 'd':
            event.preventDefault();
            if (location.pathname !== createPageUrl("Dashboard")) {
              navigate(createPageUrl("Dashboard"));
            }
            break;
          case 'p': // Added shortcut for Projects
            event.preventDefault();
            if (location.pathname !== createPageUrl("Projects")) {
              navigate(createPageUrl("Projects"));
            }
            break;
          case 'a':
            event.preventDefault();
            if (location.pathname !== createPageUrl("Assignments")) {
              navigate(createPageUrl("Assignments"));
            }
            break;
          case 't':
            event.preventDefault();
            if (location.pathname !== createPageUrl("Tasks")) {
              navigate(createPageUrl("Tasks"));
            }
            break;
          case 'o':
            event.preventDefault();
            if (location.pathname !== createPageUrl("Documents")) {
              navigate(createPageUrl("Documents"));
            }
            break;
          case 'w':
            event.preventDefault();
            // Navigate to Documents with Studio tab
            navigate(createPageUrl("Documents") + "?tab=studio");
            break;
          case 'q':
            event.preventDefault();
            if (location.pathname !== createPageUrl("AIHub")) {
              navigate(createPageUrl("AIHub"));
            }
            break;
          case 'c':
            event.preventDefault();
            if (location.pathname !== createPageUrl("Chat")) {
              navigate(createPageUrl("Chat"));
            }
            break;
          case 'r':
            event.preventDefault();
            // Redirect to AI Hub research tab (Research page is deprecated)
            navigate(createPageUrl("AIHub") + "?tab=research");
            break;
          case 'g':
            event.preventDefault();
            if (location.pathname !== createPageUrl("Generate")) {
              navigate(createPageUrl("Generate"));
            }
            break;
          case 'u':
            event.preventDefault();
            if (location.pathname !== createPageUrl("Users")) {
              navigate(createPageUrl("Users"));
            }
            break;
        }
      }

      if (event.key === 'Escape') {
        setIsGlobalSearchOpen(false);
        setIsKeyboardShortcutsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    
    root.classList.remove('dark');
    
    if (isDarkMode) {
      root.classList.add('dark');
      root.style.setProperty('--background', '222.2% 84% 4.9%');
      root.style.setProperty('--foreground', '210% 40% 98%');
      root.style.setProperty('--muted', '217.2% 32.6% 17.5%');
      root.style.setProperty('--muted-foreground', '215% 20.2% 65.1%');
      root.style.setProperty('--border', '217.2% 32.6% 17.5%');
      root.style.setProperty('--card', '222.2% 84% 4.9%');
      root.style.setProperty('--card-foreground', '210% 40% 98%');
    } else {
      root.style.setProperty('--background', '0 0% 100%');
      root.style.setProperty('--foreground', '222.2% 84% 4.9%');
      root.style.setProperty('--muted', '210% 40% 96%');
      root.style.setProperty('--muted-foreground', '215.4% 16.3% 46.9%');
      root.style.setProperty('--border', '214.3% 31.8% 91.4%');
      root.style.setProperty('--card', '0 0% 100%');
      root.style.setProperty('--card-foreground', '222.2% 84% 4.9%');
    }
    
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.body.style.backgroundColor = isDarkMode ? 'hsl(222.2% 84% 4.9%)' : 'hsl(0 0% 100%)';
    document.body.style.color = isDarkMode ? 'hsl(210% 40% 98%)' : 'hsl(222.2% 84% 4.9%)';
    
  }, [isDarkMode]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await db.auth.me(); 
      setUser(currentUser);
    } catch (error) {
      console.log("User not authenticated");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
        console.error("Logout failed:", error);
    }
  };

  const handleSearchFocus = useCallback(() => {
    setIsGlobalSearchOpen(true);
  }, []);

  const handleSearchResult = useCallback((result) => {
    setIsGlobalSearchOpen(false);
    switch (result.type) {
      case 'project': // Handle project search results
        navigate(createPageUrl("Projects") + `?project=${result.id}`);
        break;
      case 'assignment':
        navigate(createPageUrl("Assignments") + `?assignment=${result.id}`);
        break;
      case 'document':
        navigate(createPageUrl("Documents") + `?doc=${result.id}`);
        break;
      case 'message':
        navigate(createPageUrl("Chat") + `?message=${result.id}`);
        break;
      case 'task':
        navigate(createPageUrl("Tasks") + `?task=${result.id}`);
        break;
      default:
        break;
    }
  }, [navigate]);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
      const newTheme = !prev;
      console.log(`Theme toggled to: ${newTheme ? 'dark' : 'light'}`);
      return newTheme;
    });
  }, []);

  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleNotificationClick = useCallback((notification) => {
    markNotificationAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  }, [markNotificationAsRead, navigate]);

  const unreadNotifications = notifications.length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'urgent': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'info': return <Bell className="w-4 h-4 text-blue-600" />;
      default: return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'urgent': return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-950';
      case 'warning': return 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950'; 
      case 'success': return 'border-l-4 border-green-500 bg-green-50 dark:bg-green-950';
      case 'info': return 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950';
      default: return 'border-l-4 border-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  };

  const navigationGroups = [
    {
      title: "Home",
      items: [
        {
          title: "Dashboard",
          url: createPageUrl("Dashboard"),
          icon: LayoutDashboard,
          description: "Overview and analytics",
          shortcut: "D",
          badge: null
        }
      ]
    },
    {
      title: "Work",
      items: [
        {
          title: "Projects",
          url: createPageUrl("Projects"),
          icon: Target,
          description: "Manage projects and roadmaps",
          shortcut: "P",
          badge: null
        },
        {
          title: "Assignments",
          url: createPageUrl("Assignments"),
          icon: FolderOpen,
          description: "Manage team assignments",
          shortcut: "A",
          badge: null
        },
        {
          title: "Tasks",
          url: createPageUrl("Tasks"),
          icon: FileEdit,
          description: "Task tracking and management",
          shortcut: "T",
          badge: null
        }
      ]
    },
    {
      title: "Documents",
      items: [
        {
          title: "Documents",
          url: createPageUrl("Documents"),
          icon: FileText,
          description: "Library, Studio & Templates",
          shortcut: "O",
          badge: null
        }
      ]
    },
    {
      title: "AI",
      items: [
        {
          title: "AI Hub",
          url: createPageUrl("AIHub"),
          icon: Brain,
          description: "Chat, Research & Generate",
          shortcut: "Q",
          badge: "New"
        }
      ]
    },
    {
      title: "Team",
      items: [
        {
          title: "Chat",
          url: createPageUrl("Chat"),
          icon: MessageSquare,
          description: "Team communication",
          shortcut: "C",
          badge: null
        },
        {
          title: "Members",
          url: createPageUrl("Users"),
          icon: Users,
          description: "Team management",
          shortcut: "U",
          badge: null
        }
      ]
    }
  ];

  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 animate-gradient-shift"></div>
            <FolderOpen className="w-5 h-5 text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              AssignmentHub
            </h1>
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase">
              Knowledge Platform
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700" role="navigation" aria-label="Main navigation">
        <div className="space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 mb-2">
                {group.title}
              </h3>

              <div className="space-y-0.5" role="group" aria-labelledby={`group-${group.title}`}>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <Link
                      key={item.title}
                      to={item.url}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={`${item.title} - ${item.description}`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 rounded-r-full"></div>
                      )}
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                      } group-hover:scale-110 transition-transform`} />
                      <span className="flex-1 truncate">{item.title}</span>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-4 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 border-0 font-semibold">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {user && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700">
            <div className="relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-400 to-gray-600"></div>
              <UserIcon className="w-4 h-4 text-white relative z-10" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.full_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-[10px] px-2 py-0 h-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-0 font-semibold">
                  {user.user_role?.replace('_', ' ') || 'team member'}
                </Badge>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-lg shadow-green-500/50 animate-pulse" title="Online" />
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-full mt-2 justify-start text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-white'}`}>
      {/* Add Performance Monitor */}
      <WorkspacePerformanceMonitor />

      {/* Top Bar */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile Menu & Logo */}
            <div className="flex items-center gap-4">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <SheetHeader className="p-6 border-b">
                    <SheetTitle className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-lg shadow-lg">
                        <FileEdit className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        AssignmentHub
                      </span>
                    </SheetTitle>
                  </SheetHeader>
                  
                  {/* Add WorkspaceSwitcher to mobile menu */}
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <WorkspaceSwitcher />
                  </div>
                  
                  <SidebarContent isMobile={true} />
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shadow-md overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600"></div>
                  <FileEdit className="w-5 h-5 text-white relative z-10" />
                </div>
                <span className="hidden sm:block text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  AssignmentHub
                </span>
              </div>
            </div>

            {/* Workspace Switcher, Search & User Menu */}
            <div className="flex items-center gap-3">
              {/* Workspace Switcher */}
              <WorkspaceSwitcher />

              <div className="hidden md:block">
                <Button
                  variant="outline"
                  className="w-64 justify-start text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl transition-all"
                  onClick={() => setIsGlobalSearchOpen(true)}
                >
                  <Search className="w-4 h-4 mr-3" />
                  <span>Search assignments, docs...</span>
                  <kbd className="ml-auto px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600">
                    <Command className="w-3 h-3 inline mr-1" />K
                  </kbd>
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                onClick={() => setIsGlobalSearchOpen(true)}
              >
                <Search className="w-5 h-5" />
              </Button>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
                    <Bell className="w-5 h-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] rounded-full font-bold shadow-lg shadow-red-500/50 animate-pulse">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-96 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-2xl rounded-xl">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Essential Notifications</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Only urgent and actionable items</p>
                    </div>
                    {notifications.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearAllNotifications}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white mb-1">All caught up!</p>
                      <p className="text-sm">No essential notifications right now.</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${getNotificationStyle(notif.type)} backdrop-blur-sm`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="flex items-start gap-3 group">
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                {notif.title}
                              </p>
                              <p className="text-gray-700 dark:text-gray-300 text-sm mt-1 line-clamp-2">
                                {notif.message}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                {new Date(notif.timestamp).toLocaleDateString()} at{' '}
                                {new Date(notif.timestamp).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6 ml-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                markNotificationAsRead(notif.id);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {notifications.length > 0 && (
                    <div className="px-4 py-3 border-t bg-gray-50 dark:bg-gray-800/50 text-center backdrop-blur-sm">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Showing essential notifications only • Click to take action
                      </p>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-md">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm">
                        {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </div>
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {user?.full_name || 'Loading...'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {user?.user_role?.replace('_', ' ') || 'user'}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-2xl rounded-xl">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-medium dark:text-white">{user?.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                  <DropdownMenuItem className="rounded-lg mx-1 my-1">
                    <UserIcon className="w-4 h-4 mr-3" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg mx-1 my-1">
                    <Link to={createPageUrl("Preferences")} className="flex items-center w-full">
                      <Settings className="w-4 h-4 mr-3" />
                      Preferences
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleTheme} className="rounded-lg mx-1 my-1">
                    <Eye className="w-4 h-4 mr-3" />
                    {isDarkMode ? 'Switch to Light Mode' : 'Dark Mode'}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg mx-1 my-1 cursor-pointer">
                    <TutorialButton variant="ghost" size="sm" showIcon={true} />
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg mx-1 my-1">
                    <HelpCircle className="w-4 h-4 mr-3" />
                    Help & Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20 rounded-lg mx-1 my-1"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Desktop Top Navigation Bar */}
        <div className="hidden lg:block border-t border-gray-200/50 dark:border-gray-800/50">
          <nav className="px-6 py-2">
            <div className="flex items-center gap-1">
              {navigationGroups.map((group) => (
                <DropdownMenu key={group.title} modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg px-4 py-2 transition-colors"
                    >
                      {group.title}
                      <ChevronDown className="ml-1 w-3 h-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xl rounded-xl">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.url;
                      return (
                        <DropdownMenuItem key={item.title} asChild className="rounded-lg mx-1 my-0.5">
                          <Link
                            to={item.url}
                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
                              isActive 
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{item.title}</span>
                                {item.badge && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-0">
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</p>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 pb-24 md:pb-8 bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      {/* Global Search Dialog */}
      <React.Suspense fallback={null}>
        <GlobalSearch
          isOpen={isGlobalSearchOpen}
          onClose={() => setIsGlobalSearchOpen(false)}
        />
      </React.Suspense>

      {/* Unified AI Assistant */}
      <UnifiedAIAssistant />

      {/* Team Chat Bubble - wrapped in ErrorBoundary to prevent crashes */}
      <ErrorBoundary minimal>
        <TeamChatBubble />
      </ErrorBoundary>

      {/* Visual Bug Reporter - Development Only */}
      <BugReporter />

      {/* What's New Modal for feature discovery */}
      <WhatsNewModal />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Tutorial Overlay */}
      <TutorialOverlay />
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ErrorBoundary>
      <WorkspaceProvider>
        <WorkspaceErrorBoundary>
          <TutorialProvider>
            <LayoutContent children={children} currentPageName={currentPageName} />
          </TutorialProvider>
        </WorkspaceErrorBoundary>
      </WorkspaceProvider>

    </ErrorBoundary>
  );
}
