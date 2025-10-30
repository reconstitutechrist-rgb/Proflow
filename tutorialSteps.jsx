
export const tutorialConfig = {
  title: "ProjectFlow Complete Tutorial",
  description: "Master ProjectFlow's integrated features and workflows",
  modules: [
    {
      title: "Welcome to ProjectFlow",
      description: "Introduction to the platform and its interconnected features",
      steps: [
        {
          title: "Welcome!",
          description: "Welcome to ProjectFlow - your complete assignment management platform. In this tutorial, you'll learn how all the features work together seamlessly to help you manage projects efficiently.",
          target: null,
          integration: {
            type: "feature",
            title: "Integrated Ecosystem",
            description: "Unlike traditional tools, ProjectFlow connects documents, tasks, AI tools, and team communication in one unified platform. Everything you create flows together automatically."
          },
          tip: "Take your time with each step. You can pause or restart the tutorial anytime from your user menu."
        },
        {
          title: "Your Dashboard",
          description: "This is your central hub. It shows real-time stats from all areas of your projects - active assignments, your tasks, documents, and recent team messages.",
          target: 'a[href*="Dashboard"]',
          integration: {
            type: "link",
            title: "Connected Data",
            description: "The dashboard pulls live data from Assignments, Tasks, Documents, and Chat - giving you a complete overview at a glance."
          },
          action: "Click on the Dashboard link to see your overview."
        }
      ]
    },
    {
      title: "Assignment Management - The Foundation",
      description: "Learn how assignments become the central context for all your work",
      steps: [
        {
          title: "Navigate to Assignments",
          description: "Assignments are the foundation of ProjectFlow. Every document, task, and conversation can be linked to an assignment, creating a complete project history.",
          target: 'a[href*="Assignments"]',
          integration: {
            type: "feature",
            title: "Assignment-Centric Organization",
            description: "When you link something to an assignment, it becomes accessible in that assignment's context across the entire platform."
          },
          action: "Click 'Assignments' in the sidebar to continue.",
          tip: "You can use Ctrl/Cmd + A to quickly jump to Assignments anytime!"
        },
        {
          title: "Create Your First Assignment",
          description: "Let's create a sample assignment. This will serve as the central hub for related documents, tasks, and team discussions.",
          target: 'button.bg-gradient-to-r',
          integration: {
            type: "feature",
            title: "The Project Hub",
            description: "Once created, this assignment becomes a filter and context for everything else - documents, tasks, AI research, and team chat."
          },
          action: "Click the 'New Assignment' button."
        },
        {
          title: "Assignment Details Matter",
          description: "Fill in the assignment details. The name and description are especially important - they'll be used by AI tools to provide better context and suggestions.",
          target: 'input[name="name"]',
          integration: {
            type: "ai",
            title: "AI Context Understanding",
            description: "The AI reads your assignment details to provide intelligent suggestions when generating documents, creating tasks, or answering questions."
          },
          tip: "Be descriptive! More context = better AI assistance throughout the platform."
        },
        {
          title: "Assignment Created!",
          description: "Great! Your assignment is now the central hub. Notice the tabs: Tasks, Documents, Team, and Activity. Everything related to this assignment will appear here.",
          target: '[role="tablist"]',
          integration: {
            type: "link",
            title: "Unified Project View",
            description: "This page connects to Tasks, Documents, Chat (Team tab), and tracks all Activity. It's your one-stop view for everything related to this project."
          }
        }
      ]
    },
    {
      title: "Documents - Your Knowledge Base",
      description: "Learn how documents are automatically analyzed and connected",
      steps: [
        {
          title: "Navigate to Documents",
          description: "The Documents section is your centralized file repository. But it's more than just storage - every document gets AI-powered analysis automatically.",
          target: 'a[href*="Documents"]',
          integration: {
            type: "ai",
            title: "Automatic AI Analysis",
            description: "When you upload a document, AI automatically extracts keywords, generates summaries, suggests categories, and identifies which assignments it relates to."
          },
          action: "Click 'Documents' in the sidebar.",
          tip: "Quick keyboard shortcut: Ctrl/Cmd + O"
        },
        {
          title: "Upload a Document",
          description: "Let's upload a document. You can drag and drop files or click the upload button. PDFs, Word docs, images, and text files are supported.",
          target: 'input[type="file"]',
          integration: {
            type: "ai",
            title: "Smart Upload Processing",
            description: "During upload, you can link the document to your assignment. AI will then analyze it and suggest improvements, related documents, and potential tasks."
          },
          action: "Click the 'Upload Documents' button to continue."
        },
        {
          title: "Link to Assignment",
          description: "When uploading, link the document to your assignment. This makes it available in the assignment's Documents tab and provides context for AI tools.",
          target: 'select',
          integration: {
            type: "link",
            title: "Assignment Connection",
            description: "Linking creates a two-way connection: view documents from the assignment page, or filter documents by assignment. AI tools can then use these documents as context."
          },
          tip: "You can link documents to multiple assignments if they're relevant to more than one project!"
        },
        {
          title: "AI Document Analysis",
          description: "After upload, the AI automatically analyzes your document. It extracts key points, generates a summary, identifies entities, and suggests categories and folders.",
          target: '.document-card',
          integration: {
            type: "ai",
            title: "Intelligent Extraction",
            description: "This analysis makes documents searchable by content (not just filename), enables AI Q&A, and helps suggest related documents."
          },
          tip: "Click the 'AI Summary' button on any document to see the full analysis!"
        }
      ]
    },
    {
      title: "AI Tools - Smart Assistance",
      description: "Discover how AI tools use your documents and assignments as context",
      steps: [
        {
          title: "Ask AI - Document Q&A",
          description: "Ask AI lets you upload documents and ask questions about them. But it's connected to your assignments too!",
          target: 'a[href*="AskAI"]',
          integration: {
            type: "ai",
            title: "Context-Aware Answers",
            description: "When you select an assignment, Ask AI can reference all documents linked to that assignment, giving you answers based on your actual project files."
          },
          action: "Click 'Ask AI' in the sidebar.",
          tip: "Quick shortcut: Ctrl/Cmd + Q"
        },
        {
          title: "Upload or Select Assignment Context",
          description: "You can upload new documents to ask questions about, OR select your assignment to use its existing documents as context.",
          target: 'input[type="file"]',
          integration: {
            type: "link",
            title: "Automatic Document Loading",
            description: "When you select an assignment, all its documents become available to the AI automatically. No need to re-upload!"
          },
          tip: "This is the power of integration - your assignment's documents are instantly available here."
        },
        {
          title: "AI Research Assistant",
          description: "The Research page lets you ask questions that require internet research. It's perfect for finding requirements, regulations, or best practices.",
          target: 'a[href*="Research"]',
          integration: {
            type: "ai",
            title: "Web + Your Documents",
            description: "Research combines internet search with your assignment's documents. It can suggest documents you should create and even recommend specific tasks."
          },
          action: "Click 'Research' to explore this feature.",
          tip: "Use this for compliance checks, industry standards, or requirement gathering!"
        },
        {
          title: "Research with Assignment Context",
          description: "Select your assignment before asking research questions. The AI will consider both web sources AND your assignment's context for more relevant answers.",
          target: 'select',
          integration: {
            type: "flow",
            title: "From Research to Action",
            description: "Research results include 'Recommended Actions' and 'Suggested Documents' that can be directly converted into tasks or new documents."
          },
          tip: "Research can suggest creating specific documents - which leads perfectly to the Generate tool!"
        }
      ]
    },
    {
      title: "Document Generation - AI Content Creation",
      description: "Learn how to generate documents using AI and your assignment context",
      steps: [
        {
          title: "Navigate to Generate",
          description: "The Generate page is your AI Document Studio. It can create professional documents from templates or custom prompts, using your assignment as context.",
          target: 'a[href*="Generate"]',
          integration: {
            type: "ai",
            title: "Context-Powered Generation",
            description: "The generator pulls information from your assignment details, existing documents, and even insights from Ask AI and Research."
          },
          action: "Click 'Generate' in the sidebar.",
          tip: "Shortcut: Ctrl/Cmd + G"
        },
        {
          title: "Select Assignment Context",
          description: "Choose your assignment to give the AI context. This helps it generate more relevant and accurate content.",
          target: '.assignment-selector',
          integration: {
            type: "link",
            title: "Smart Context Loading",
            description: "Selecting an assignment loads its details, team members, and related documents - all available to the AI for generation."
          },
          action: "Select your assignment from the context selector."
        },
        {
          title: "Choose a Template or Go Custom",
          description: "You can start with a template (Assignment Brief, Technical Spec, etc.) or create a completely custom document using the conversational interface.",
          target: '.template-card',
          integration: {
            type: "feature",
            title: "Template + Custom Flexibility",
            description: "Templates provide structure, but you can modify them conversationally. The AI remembers your changes throughout the session."
          },
          tip: "Templates are great starting points - you can always customize them after generation!"
        },
        {
          title: "Conversational Refinement",
          description: "After generating a document, you can chat with the AI to refine it: 'make it more formal', 'add a risk assessment section', 'translate to Spanish', etc.",
          target: 'textarea[placeholder*="message"]',
          integration: {
            type: "ai",
            title: "Iterative Improvement",
            description: "The AI maintains context of your document and previous requests, allowing natural conversational editing."
          },
          tip: "You can also use built-in tools: Content Rewriter, Grammar Assistant, and Document Q&A!"
        },
        {
          title: "Save and Auto-Link",
          description: "When you save the generated document, it's automatically saved to the Documents page and linked to your selected assignment.",
          target: 'button[class*="bg-green"]',
          integration: {
            type: "flow",
            title: "Automatic Integration",
            description: "The saved document appears in Documents, is linked to your assignment, gets AI analysis, and becomes available to other AI tools."
          },
          tip: "You can also enable auto-task generation to create tasks based on the document content!"
        },
        {
          title: "Document Refinement Tools",
          description: "The 'Refine' tab offers specialized tools: Content Rewriter (change tone/style), Grammar Assistant (fix errors), and Document Q&A (ask questions about the document).",
          target: '[role="tab"]',
          integration: {
            type: "feature",
            title: "Polish Your Documents",
            description: "These tools work on any document - whether you generated it or uploaded it from elsewhere."
          },
          tip: "The Grammar Assistant is powered by Claude - it's incredibly accurate!"
        },
        {
          title: "Format Converter Tool",
          description: "The 'Tools' tab includes a .docx to PDF converter. Upload your generated Word documents and convert them to professional PDFs instantly.",
          target: '[role="tab"]',
          integration: {
            type: "feature",
            title: "Complete Document Workflow",
            description: "Generate → Refine → Convert → Share. All in one place, no need to leave the platform."
          }
        }
      ]
    },
    {
      title: "Tasks - AI-Powered Task Management",
      description: "Learn how tasks connect to documents and can be auto-generated",
      steps: [
        {
          title: "Navigate to Tasks",
          description: "Tasks is where you manage all your to-dos. But tasks aren't isolated - they're connected to assignments, documents, and team members.",
          target: 'a[href*="Tasks"]',
          integration: {
            type: "link",
            title: "Assignment-Linked Tasks",
            description: "Every task belongs to an assignment. Filter by assignment to see only relevant tasks."
          },
          action: "Click 'Tasks' in the sidebar.",
          tip: "Keyboard shortcut: Ctrl/Cmd + T"
        },
        {
          title: "Task Board View",
          description: "Tasks are organized in a Kanban board: To Do, In Progress, Review, and Completed. You can drag and drop tasks between columns.",
          target: '.task-board',
          integration: {
            type: "feature",
            title: "Visual Task Management",
            description: "The board view shows all tasks across all assignments, or you can filter by a specific assignment."
          },
          tip: "You can also switch to list view for a different perspective!"
        },
        {
          title: "Create a Task",
          description: "When creating a task, you can link it to your assignment and optionally attach related documents.",
          target: 'button.bg-gradient-to-r',
          integration: {
            type: "link",
            title: "Document-Task Connection",
            description: "Linking documents to tasks helps team members find relevant files quickly. Changes to the document notify task assignees."
          },
          action: "Click to create a new task."
        },
        {
          title: "AI Task Suggestions",
          description: "Here's where it gets powerful: When you create or upload a document, you can enable 'Auto-Generate Tasks'. AI analyzes the document and suggests relevant tasks.",
          target: null,
          integration: {
            type: "ai",
            title: "Document-Driven Tasks",
            description: "AI reads your document (e.g., a project brief) and suggests tasks like 'Set up project repository', 'Design database schema', etc. with priorities and estimates."
          },
          tip: "This is a huge time-saver for project setup and planning!"
        },
        {
          title: "Task Dependencies",
          description: "Tasks can have dependencies (e.g., 'Task B blocks Task A'). The system tracks these relationships and can suggest task order.",
          target: null,
          integration: {
            type: "feature",
            title: "Smart Task Ordering",
            description: "Based on dependencies and AI analysis, the system can recommend which tasks to work on first."
          },
          tip: "Dependencies help ensure tasks are completed in the right order."
        }
      ]
    },
    {
      title: "Team Chat - Contextual Communication",
      description: "Learn how chat is integrated with assignments, documents, and tasks",
      steps: [
        {
          title: "Navigate to Chat",
          description: "Chat isn't just messaging - it's contextual communication tied to your assignments. Every conversation thread can be linked to a specific project.",
          target: 'a[href*="Chat"]',
          integration: {
            type: "link",
            title: "Assignment-Based Threads",
            description: "Chat threads are organized by assignment, so conversations stay relevant and easy to find."
          },
          action: "Click 'Chat' in the sidebar.",
          tip: "Quick shortcut: Ctrl/Cmd + C"
        },
        {
          title: "Start a Thread",
          description: "Create a new thread and select your assignment. This makes the conversation appear in that assignment's 'Team' tab.",
          target: 'button.bg-gradient-to-r',
          integration: {
            type: "link",
            title: "Unified Communication",
            description: "Threads appear in both Chat and the assignment's Team tab, ensuring everyone stays in sync."
          },
          action: "Try creating a new thread."
        },
        {
          title: "Share Documents in Chat",
          description: "You can share documents directly in chat. Click the attachment icon or use the 'Share to Chat' button on any document.",
          target: 'button[title*="Attach"]',
          integration: {
            type: "flow",
            title: "Document→Chat Integration",
            description: "When you share a document in chat, team members can view it inline, and the document page shows which threads it's been shared in."
          },
          tip: "Documents shared in chat get a 'Shared in X threads' indicator!"
        },
        {
          title: "Link Tasks in Messages",
          description: "You can mention tasks in messages (e.g., '@task-123'). This creates a link between the conversation and the task.",
          target: 'textarea[placeholder*="message"]',
          integration: {
            type: "link",
            title: "Task-Chat Connection",
            description: "Linked tasks show related conversations, and chat threads show related tasks. Nothing gets lost."
          },
          tip: "Great for discussing task progress or blockers!"
        },
        {
          title: "Decision Capture",
          description: "Mark important messages as 'Decisions'. These get highlighted and can be filtered/searched later.",
          target: 'button[title*="decision"]',
          integration: {
            type: "feature",
            title: "Document Decisions",
            description: "Decisions are tracked per assignment, making it easy to review 'what was decided and when'."
          },
          tip: "Decisions can also be exported as a summary document!"
        },
        {
          title: "Thread Summaries",
          description: "Long conversation? Click 'Summarize Thread' to get an AI-generated summary of key points, decisions, and action items.",
          target: 'button.bg-purple-600',
          integration: {
            type: "ai",
            title: "AI Meeting Notes",
            description: "The AI reads the entire thread and extracts key information. You can save this summary as a document!"
          },
          tip: "Perfect for generating meeting notes or project updates!"
        },
        {
          title: "Convert Actions to Tasks",
          description: "After summarizing a thread, you'll see 'Action Items'. You can convert these directly into tasks with one click!",
          target: 'button.bg-blue-600',
          integration: {
            type: "flow",
            title: "Chat→Tasks Flow",
            description: "Decisions made in chat become tasks automatically. The task is linked to the assignment and the original conversation."
          },
          tip: "This ensures nothing discussed in chat gets forgotten!"
        }
      ]
    },
    {
      title: "Document Packages - Professional Delivery",
      description: "Learn how to bundle documents for clients or partners",
      steps: [
        {
          title: "Document Packages",
          description: "In the Documents page, switch to the 'Packages' tab. Here you can bundle multiple documents into a professional package with custom branding.",
          target: '[role="tab"]',
          integration: {
            type: "feature",
            title: "Professional Document Delivery",
            description: "Perfect for delivering document sets to clients, investors, or partners. Includes cover pages, table of contents, and custom branding."
          },
          action: "Click the 'Packages' tab in Documents."
        },
        {
          title: "Create a Package",
          description: "Select documents, choose a template (Developer Package, Investor Package, etc.), customize branding, and generate a professional PDF package.",
          target: 'button.bg-gradient-to-r',
          integration: {
            type: "feature",
            title: "One-Click Bundling",
            description: "All documents are combined with automatic formatting, page numbers, and professional styling."
          },
          tip: "You can password-protect packages and set expiry dates!"
        }
      ]
    },
    {
      title: "Search - Find Anything",
      description: "Learn how integrated search works across the platform",
      steps: [
        {
          title: "Global Search",
          description: "Press Ctrl/Cmd + K anywhere to open global search. It searches assignments, documents, tasks, and messages simultaneously.",
          target: 'input[placeholder*="Search"]',
          integration: {
            type: "feature",
            title: "Unified Search",
            description: "Search understands context. Looking for 'requirements'? It finds relevant documents, tasks about requirements, AND messages discussing them."
          },
          action: "Try pressing Ctrl/Cmd + K to open search.",
          tip: "Search is AI-powered - it understands synonyms and context!"
        },
        {
          title: "Search Filters",
          description: "You can filter search results by type (Documents, Tasks, etc.) or by assignment to narrow down results.",
          target: 'select',
          integration: {
            type: "feature",
            title: "Smart Filtering",
            description: "Filters are contextual - they remember which assignment you're working on."
          },
          tip: "Search results show relevant connections, like which tasks reference a document!"
        }
      ]
    },
    {
      title: "Putting It All Together",
      description: "See the complete workflow in action",
      steps: [
        {
          title: "The Complete Workflow",
          description: "Let's recap how everything connects:\n\n1. Create an Assignment (the hub)\n2. Upload or Generate Documents (AI analyzes them)\n3. AI suggests Tasks based on documents\n4. Team discusses in Chat (linked to assignment)\n5. Chat decisions become Tasks\n6. Research new requirements\n7. Generate new documents from research\n8. Package documents for delivery\n\nEverything flows together seamlessly!",
          target: null,
          integration: {
            type: "flow",
            title: "Seamless Integration",
            description: "This is the power of ProjectFlow - every feature enhances the others. AI understands your full project context across all modules."
          },
          tip: "You can jump between features using keyboard shortcuts - no need to hunt for navigation!"
        },
        {
          title: "Example: Document Analysis Flow",
          description: "Real example:\n1. Upload a client brief → AI analyzes it\n2. AI suggests 5 tasks → You approve them\n3. Team discusses in Chat → Decisions captured\n4. Generate technical spec using brief as context\n5. Research compliance requirements → AI suggests new documents\n6. Create all documents → Package for client\n\nAll in one platform, all connected!",
          target: null,
          integration: {
            type: "flow",
            title: "End-to-End Workflow",
            description: "From initial brief to final delivery, ProjectFlow handles the entire project lifecycle with AI assistance at every step."
          }
        },
        {
          title: "Pro Tips",
          description: "Master tips:\n• Use keyboard shortcuts (Ctrl/Cmd + letter) for fast navigation\n• Let AI generate task lists from documents\n• Summarize long chat threads before converting to tasks\n• Use Ask AI to query multiple documents at once\n• Enable dark mode for late-night work\n• Pin important threads and documents\n• Create document packages for professional delivery",
          target: null,
          integration: {
            type: "feature",
            title: "Efficiency Multiplier",
            description: "These features, used together, can save hours of manual work per project."
          },
          tip: "Check the Help menu for a complete list of shortcuts and features!"
        },
        {
          title: "Tutorial Complete!",
          description: "Congratulations! You now understand how ProjectFlow's features work together. Remember:\n\n• Assignments are the hub\n• AI learns from your documents\n• Everything connects automatically\n• Chat captures decisions\n• Search finds anything\n\nStart exploring and building your projects!",
          target: null,
          integration: {
            type: "feature",
            title: "You're Ready!",
            description: "You now have the knowledge to use ProjectFlow like a pro. The AI will continue helping you along the way with suggestions and automation."
          },
          tip: "You can restart this tutorial anytime from your user menu. Happy building!"
        }
      ]
    }
  ]
};
