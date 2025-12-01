
export const tutorialConfig = {
  title: "Proflow Quick Start Guide",
  description: "Learn the streamlined way to manage projects with AI assistance",
  modules: [
    {
      title: "Welcome to Proflow",
      description: "Get oriented with the new streamlined interface",
      steps: [
        {
          title: "Welcome!",
          description: "Welcome to Proflow - your AI-powered project management platform. We've streamlined everything into 5 main areas: Home, Work, Documents, AI, and Team.",
          target: null,
          integration: {
            type: "feature",
            title: "Simplified Navigation",
            description: "No more hunting through menus. Everything is organized into logical groups with quick keyboard shortcuts."
          },
          tip: "Use the navigation bar at the top or keyboard shortcuts (Ctrl/Cmd + letter) to jump anywhere instantly."
        },
        {
          title: "Your Dashboard",
          description: "The Dashboard shows what needs your attention: overdue items, tasks due today, and AI-suggested priorities. It's your daily command center.",
          target: 'a[href*="Dashboard"]',
          integration: {
            type: "feature",
            title: "Needs Attention",
            description: "The dashboard highlights overdue tasks, due today items, and high-priority work so you never miss what's important."
          },
          tip: "Check 'Today's Focus' for AI-suggested priorities based on your workload."
        }
      ]
    },
    {
      title: "Work Hub - Projects, Assignments & Tasks",
      description: "Manage all your work in one unified area",
      steps: [
        {
          title: "Projects Overview",
          description: "Projects are your high-level initiatives. Each project can contain multiple assignments, which break down into tasks.",
          target: 'a[href*="Projects"]',
          integration: {
            type: "feature",
            title: "Project Hierarchy",
            description: "Projects > Assignments > Tasks. This hierarchy keeps everything organized and contextual."
          },
          action: "Click 'Projects' to see your project portfolio.",
          tip: "Keyboard shortcut: Ctrl/Cmd + P"
        },
        {
          title: "Tasks - Multiple Views",
          description: "The Tasks page now offers three views: Kanban (drag & drop), List (detailed table), and Calendar (timeline). Use filter presets to quickly find what matters.",
          target: 'a[href*="Tasks"]',
          integration: {
            type: "feature",
            title: "View Modes",
            description: "Switch between Kanban, List, and Calendar views. Filter by 'My Tasks', 'Overdue', 'Due Today', or 'This Week'."
          },
          action: "Click 'Tasks' to explore the new views.",
          tip: "The overdue badge shows how many tasks need immediate attention."
        }
      ]
    },
    {
      title: "Documents - Library, Studio & Templates",
      description: "All document features unified in one place",
      steps: [
        {
          title: "Documents Hub",
          description: "The new Documents page combines everything: Library (browse/upload), Studio (create/edit with AI), and Templates (quick AI generation).",
          target: 'a[href*="Documents"]',
          integration: {
            type: "feature",
            title: "Three Tabs, One Location",
            description: "Library: Browse and upload. Studio: Rich editor with AI assistant. Templates: Generate docs from professional templates."
          },
          action: "Click 'Documents' to explore.",
          tip: "Keyboard shortcut: Ctrl/Cmd + O for Library, Ctrl/Cmd + W for Studio"
        },
        {
          title: "Document Studio",
          description: "The Studio tab is your AI-powered editor. Write with a conversational AI assistant, get reviews, rewrite for different audiences, and generate images.",
          target: null,
          integration: {
            type: "ai",
            title: "AI Sidebar Tools",
            description: "The AI sidebar has three tabs: Assistant (chat for help), Review (analyze content), and Tools (references & images)."
          },
          tip: "Link documents to assignments for better AI context!"
        },
        {
          title: "Quick Templates",
          description: "The Templates tab lets you generate professional documents instantly. Choose a template, customize the prompt, and AI creates it for you.",
          target: null,
          integration: {
            type: "ai",
            title: "Template Types",
            description: "Assignment Brief, Technical Spec, Project Plan, Status Report - all customizable with your project context."
          },
          tip: "Select an assignment first to give AI better context for generation."
        }
      ]
    },
    {
      title: "AI Hub - Chat, Research & Generate",
      description: "All AI tools consolidated in one powerful hub",
      steps: [
        {
          title: "AI Hub Overview",
          description: "The AI Hub combines Ask AI (document Q&A), Research (web search), and Generate (content creation) into one unified interface.",
          target: 'a[href*="AIHub"]',
          integration: {
            type: "ai",
            title: "Three AI Modes",
            description: "Chat: Ask questions about your documents. Research: Search the web for info. Generate: Create any content with AI."
          },
          action: "Click 'AI Hub' to explore.",
          tip: "Keyboard shortcut: Ctrl/Cmd + Q"
        },
        {
          title: "Context-Aware AI",
          description: "Select an assignment to give AI context. It can then reference your assignment details, team, and linked documents automatically.",
          target: null,
          integration: {
            type: "feature",
            title: "Assignment Context",
            description: "When you select an assignment, AI has access to all its context - no need to explain your project every time."
          },
          tip: "Upload additional documents for the AI to reference in its answers."
        }
      ]
    },
    {
      title: "AI Assistant Widget",
      description: "Get AI help anywhere with the floating assistant",
      steps: [
        {
          title: "Floating AI Button",
          description: "Notice the brain icon at the bottom-right? That's your contextual AI assistant. It knows which page you're on and suggests relevant quick actions.",
          target: 'button.fixed.bottom-20',
          integration: {
            type: "ai",
            title: "Context-Aware Help",
            description: "On Tasks page? It suggests task prioritization. On Documents? It suggests summaries. The AI adapts to where you are."
          },
          action: "Click the floating brain button to try it.",
          tip: "Quick actions change based on which page you're viewing."
        }
      ]
    },
    {
      title: "Workspace & Team",
      description: "Manage workspaces and collaborate with your team",
      steps: [
        {
          title: "Workspace Switcher",
          description: "Use the workspace dropdown in the header to switch between workspaces, create new ones, or manage members - all from a quick modal.",
          target: null,
          integration: {
            type: "feature",
            title: "Quick Workspace Management",
            description: "No more navigating to a separate page. Manage everything from the dropdown modal."
          },
          tip: "Each workspace has its own projects, documents, and team."
        },
        {
          title: "Team Chat",
          description: "The Chat page lets you communicate with your team. Conversations can be linked to assignments for context.",
          target: 'a[href*="Chat"]',
          integration: {
            type: "feature",
            title: "Contextual Conversations",
            description: "Link chat threads to assignments. Share documents. Convert discussions into tasks."
          },
          tip: "Keyboard shortcut: Ctrl/Cmd + C"
        }
      ]
    },
    {
      title: "Mobile Experience",
      description: "Proflow works great on mobile devices too",
      steps: [
        {
          title: "Mobile Navigation",
          description: "On mobile, use the bottom navigation bar. The center '+' button opens quick create for new tasks, documents, or AI chat.",
          target: null,
          integration: {
            type: "feature",
            title: "Touch-Optimized",
            description: "Swipe between views, tap to navigate, and use the floating action button for quick actions."
          },
          tip: "The mobile interface prioritizes the most common actions."
        }
      ]
    },
    {
      title: "Keyboard Shortcuts",
      description: "Master these shortcuts to work faster",
      steps: [
        {
          title: "Essential Shortcuts",
          description: "Master these shortcuts for faster navigation:\n\n- Ctrl/Cmd + K: Global Search\n- Ctrl/Cmd + D: Dashboard\n- Ctrl/Cmd + P: Projects\n- Ctrl/Cmd + A: Assignments\n- Ctrl/Cmd + T: Tasks\n- Ctrl/Cmd + O: Documents\n- Ctrl/Cmd + Q: AI Hub\n- Ctrl/Cmd + C: Chat",
          target: null,
          integration: {
            type: "feature",
            title: "Power User Mode",
            description: "Keyboard shortcuts let you navigate without touching the mouse. Press Ctrl/Cmd + / to see all shortcuts."
          },
          tip: "The search shortcut (Ctrl/Cmd + K) searches everything at once!"
        }
      ]
    },
    {
      title: "You're Ready!",
      description: "Start exploring and building",
      steps: [
        {
          title: "Tutorial Complete!",
          description: "You now know the essentials:\n\n1. Dashboard shows what needs attention\n2. Work hub has Projects, Assignments, Tasks\n3. Documents hub combines Library, Studio, Templates\n4. AI Hub unifies Chat, Research, Generate\n5. Floating AI assistant helps everywhere\n6. Workspaces organize everything by team\n\nStart creating and let AI assist you!",
          target: null,
          integration: {
            type: "feature",
            title: "Get Started",
            description: "Create a project, add some documents, and watch how everything connects automatically."
          },
          tip: "You can restart this tutorial anytime from your profile menu. Happy building!"
        }
      ]
    }
  ]
};
