import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Code, 
  Users, 
  Database,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function DocumentationPage() {
  const [activeDoc, setActiveDoc] = useState("testing");

  const docs = {
    testing: {
      title: "Testing Checklist",
      icon: CheckCircle,
      content: `# 🧪 Workspace Feature - Testing Checklist

## Security Testing (CRITICAL)

### Cross-Workspace Data Leakage Tests

#### Test 1: Document Access Control
- [ ] Create document in Workspace A
- [ ] Switch to Workspace B
- [ ] Verify document from A is NOT visible
- [ ] Verify search in B does NOT return A's documents
- [ ] Verify direct URL access to A's document shows error/empty

#### Test 2: Task Isolation
- [ ] Create task in Workspace A assigned to Assignment A
- [ ] Switch to Workspace B
- [ ] Verify task from A is NOT visible in any view
- [ ] Verify task board does NOT show A's tasks
- [ ] Verify task search does NOT return A's tasks

#### Test 3: Assignment/Project Boundaries
- [ ] Create assignment in Workspace A
- [ ] Switch to Workspace B
- [ ] Verify assignment A is NOT listed
- [ ] Verify AI Assistant does NOT access A's assignments
- [ ] Verify related content suggestions do NOT show A's data

#### Test 4: Chat/Message Isolation
- [ ] Create conversation thread in Workspace A
- [ ] Switch to Workspace B
- [ ] Verify A's messages are NOT visible
- [ ] Verify thread list does NOT show A's threads
- [ ] Verify search does NOT return A's messages

#### Test 5: Cross-Workspace Operations (Should FAIL)
- [ ] Try to duplicate document from A while in B → Should fail
- [ ] Try to share file from A to B's thread → Should fail
- [ ] Try to package documents from A while in B → Should fail
- [ ] Try to link A's document to B's assignment → Should fail

## Page-Level Testing

### Dashboard
- [ ] Statistics show only current workspace data
- [ ] Recent activity from current workspace only
- [ ] Assignment progress shows current workspace assignments
- [ ] Notes are workspace-scoped

### Projects
- [ ] Only shows current workspace projects
- [ ] Create new project adds workspace_id
- [ ] Edit project maintains workspace_id

### Assignments
- [ ] Only shows current workspace assignments
- [ ] Create new assignment adds workspace_id
- [ ] Related documents filtered by workspace
- [ ] Related tasks filtered by workspace

### Documents
- [ ] Only shows current workspace documents
- [ ] Upload adds workspace_id
- [ ] Folder structure shows only workspace folders
- [ ] Search limited to current workspace

### Tasks
- [ ] Only shows current workspace tasks
- [ ] Create task adds workspace_id
- [ ] Task board filtered by workspace
- [ ] Dependencies limited to workspace tasks

### Chat
- [ ] Only shows current workspace threads
- [ ] New thread creates in current workspace
- [ ] Messages scoped to workspace
- [ ] File sharing validates workspace

## Workflow Testing

### Scenario 1: New User Onboarding
1. [ ] New user logs in
2. [ ] Default personal workspace created automatically
3. [ ] User can create content immediately
4. [ ] All content saved to default workspace

### Scenario 2: Multi-Workspace User
1. [ ] User has 3 workspaces (Personal, Team A, Client X)
2. [ ] Create document in Personal workspace
3. [ ] Switch to Team A
4. [ ] Verify Personal document not visible
5. [ ] Create document in Team A
6. [ ] Switch back to Personal
7. [ ] Verify Team A document not visible
8. [ ] Verify Personal document still exists

### Scenario 3: Workspace Switching
1. [ ] Create task in Workspace A
2. [ ] Switch to Workspace B
3. [ ] Verify active_workspace_id updated in User entity
4. [ ] Verify all pages reload with B's data
5. [ ] Switch back to A
6. [ ] Verify original task still exists

## Sign-Off Criteria

**Feature is PRODUCTION-READY when:**
- [ ] All Critical Tests pass
- [ ] All P0 Security tests pass
- [ ] All Page tests pass
- [ ] No cross-workspace data leakage
- [ ] Performance acceptable
- [ ] Documentation complete
`
    },
    developer: {
      title: "Developer Guide",
      icon: Code,
      content: `# 👨‍💻 Workspace Feature - Developer Guide

## Architecture

### WorkspaceContext
All workspace logic is centralized in \`components/workspace/WorkspaceContext.jsx\`

\`\`\`javascript
import { useWorkspace } from "../components/workspace/WorkspaceContext";

const { 
  currentWorkspace,        // Current workspace object
  currentWorkspaceId,      // Current workspace ID (string)
  availableWorkspaces,     // Array of all user's workspaces
  loading,                 // Boolean: context loading state
  switchWorkspace,         // Function to switch workspaces
  refreshWorkspaces,       // Function to reload workspaces
} = useWorkspace();
\`\`\`

## Rules for Workspace-Aware Development

### Rule 1: ALWAYS Filter by Workspace

**❌ WRONG:**
\`\`\`javascript
const tasks = await base44.entities.Task.list();
\`\`\`

**✅ CORRECT:**
\`\`\`javascript
import { useWorkspace } from "../components/workspace/WorkspaceContext";

const { currentWorkspaceId } = useWorkspace();
const tasks = await base44.entities.Task.filter({
  workspace_id: currentWorkspaceId
}, "-updated_date");
\`\`\`

### Rule 2: ALWAYS Add workspace_id on Creation

**❌ WRONG:**
\`\`\`javascript
await base44.entities.Task.create({
  title: "New Task",
  assignment_id: assignmentId
});
\`\`\`

**✅ CORRECT:**
\`\`\`javascript
const { currentWorkspaceId } = useWorkspace();

await base44.entities.Task.create({
  workspace_id: currentWorkspaceId,  // CRITICAL
  title: "New Task",
  assignment_id: assignmentId
});
\`\`\`

### Rule 3: ALWAYS Maintain workspace_id on Update

**✅ CORRECT:**
\`\`\`javascript
const { currentWorkspaceId } = useWorkspace();

await base44.entities.Task.update(taskId, {
  status: "completed",
  workspace_id: currentWorkspaceId  // Maintain workspace
});
\`\`\`

### Rule 4: ALWAYS Validate Before Sensitive Operations

**✅ CORRECT:**
\`\`\`javascript
const { currentWorkspaceId } = useWorkspace();

const handleDuplicate = async (document) => {
  // CRITICAL: Validate source document is in current workspace
  if (document.workspace_id !== currentWorkspaceId) {
    toast.error("Cannot duplicate documents from other workspaces");
    console.error("Security violation: Cross-workspace duplication attempt");
    return;
  }

  const duplicate = await base44.entities.Document.create({
    ...document,
    id: undefined,
    title: document.title + " (Copy)",
    workspace_id: currentWorkspaceId  // CRITICAL
  });
};
\`\`\`

### Rule 5: Wait for workspace_id Before Loading

**✅ CORRECT:**
\`\`\`javascript
const { currentWorkspaceId } = useWorkspace();

useEffect(() => {
  if (currentWorkspaceId) {
    loadTasks();
  }
}, [currentWorkspaceId]);
\`\`\`

## Common Patterns

### Pattern 1: Loading Page Data
\`\`\`javascript
const { currentWorkspaceId } = useWorkspace();

useEffect(() => {
  if (currentWorkspaceId) {
    loadData();
  }
}, [currentWorkspaceId]);

const loadData = async () => {
  try {
    setLoading(true);
    
    const results = await base44.entities.MyEntity.filter({
      workspace_id: currentWorkspaceId
    }, "-updated_date");
    
    setData(results);
  } catch (error) {
    console.error("Error loading data:", error);
  } finally {
    setLoading(false);
  }
};
\`\`\`

### Pattern 2: Creating New Entity
\`\`\`javascript
const { currentWorkspaceId } = useWorkspace();

const handleCreate = async (formData) => {
  if (!currentWorkspaceId) {
    toast.error("No workspace selected");
    return;
  }

  const newEntity = await base44.entities.MyEntity.create({
    workspace_id: currentWorkspaceId,  // CRITICAL
    ...formData
  });
};
\`\`\`

## Security Checklist

Before submitting code, verify:

- [ ] All entity queries include \`workspace_id\` filter
- [ ] All entity creates include \`workspace_id\` field
- [ ] All entity updates maintain \`workspace_id\`
- [ ] Cross-workspace operations are blocked
- [ ] Security violations are logged to console
- [ ] \`useWorkspace()\` hook imported and used
- [ ] \`currentWorkspaceId\` checked before operations
- [ ] No hardcoded workspace IDs

## Common Mistakes to Avoid

1. **Forgetting to import useWorkspace**
2. **Not waiting for workspace_id**
3. **Skipping validation**
4. **Using workspace name instead of ID**
5. **Not handling workspace switches**
`
    },
    user: {
      title: "User Guide",
      icon: Users,
      content: `# 📘 Workspaces - User Guide

## What are Workspaces?

Workspaces help you organize your projects, assignments, documents, and tasks into separate environments. Think of them as different containers for different areas of your work.

## Why Use Workspaces?

### 1. Separation of Concerns
- Keep personal projects separate from team projects
- Organize client work independently
- Prevent accidental mixing of unrelated work

### 2. Team Collaboration
- Share a workspace with team members
- Everyone sees the same projects and documents
- Collaborate seamlessly without clutter

### 3. Clean Organization
- Each workspace has its own projects, tasks, documents
- Switch between contexts easily
- Find what you need faster

## Getting Started

### Your First Workspace

When you first log in, ProjectFlow automatically creates a **default personal workspace** for you. You can start working immediately!

### Workspace Switcher

Look for the workspace switcher in the top navigation bar. Click it to:
- See all your workspaces
- Switch between workspaces
- Create new workspaces
- Manage workspace settings

## Types of Workspaces

### 1. Personal Workspace (👤)
- For your individual projects
- Private to you by default
- Perfect for learning, experiments, personal assignments

### 2. Team Workspace (👥)
- For collaborative team projects
- Shared with specific team members
- Great for department work, group assignments

### 3. Client Workspace (🏢)
- For client-specific projects
- Keep client work organized
- Share with clients and stakeholders

## Creating a New Workspace

1. Click the **workspace switcher** in the navigation
2. Click **"+ New Workspace"**
3. Fill in the details:
   - **Name**: Give it a descriptive name
   - **Description**: Optional, but helpful
   - **Type**: Choose Personal, Team, or Client
4. Click **"Create Workspace"**

## Switching Workspaces

1. Click the workspace switcher in the top navigation
2. Select the workspace you want to switch to
3. The page will reload with that workspace's content

**Note:** Your active workspace is saved, so when you log in again, you'll be right where you left off!

## Understanding Workspace Data

### What's Isolated by Workspace?

Each workspace has its own:
- ✅ Projects
- ✅ Assignments
- ✅ Tasks
- ✅ Documents
- ✅ Chat conversations
- ✅ Research queries
- ✅ AI chat sessions
- ✅ Notes

### What's Shared Across Workspaces?

- ✅ **Users**: Team members are global
- ✅ **Your Preferences**: Notification settings, theme
- ✅ **Your Profile**: Name, email, bio

## Security & Privacy

### Data Isolation
- **Your data is safe**: Content in one workspace is never visible in another
- **No accidental leaks**: You cannot accidentally share documents across workspaces
- **Secure by design**: The system enforces workspace boundaries automatically

## Best Practices

### 1. Use Descriptive Names
❌ "Workspace 1"
✅ "Q1 2024 Marketing Campaign"

### 2. Organize by Context
- **Personal Workspace**: Learning materials, personal projects
- **Team Workspace**: Department projects, shared resources
- **Client Workspace**: Client-specific deliverables

### 3. Keep Workspaces Focused
- Don't mix unrelated projects in one workspace
- Create separate workspaces for different clients
- Use team workspaces for collaboration

## Troubleshooting

### "I can't see my documents!"
**Solution:** Check if you're in the correct workspace. Use the workspace switcher to navigate to the right workspace.

### "My task disappeared!"
**Solution:** Tasks are workspace-specific. Switch to the workspace where you created the task.

### "I want to move a document to another workspace"
**Current Workaround:** 
1. Open the document in the source workspace
2. Copy the content
3. Switch to the target workspace
4. Create a new document and paste the content
`
    },
    migration: {
      title: "Migration Guide",
      icon: Database,
      content: `# 🔄 Workspace Feature - Migration Guide

## Overview
This guide helps you migrate existing ProjectFlow data to the new workspace-aware architecture.

## ⚠️ Important Notes

### Before Migration
1. **Backup your data**: Export all entities before starting
2. **Test in staging**: Never run migration scripts directly in production
3. **Schedule downtime**: Migration may require brief application downtime
4. **Notify users**: Inform all users about the upcoming changes

## Migration Scripts

### Script 1: Create Default Workspaces for All Users

\`\`\`javascript
// Run this via Base44 Dashboard → Code → Functions

import { base44 } from '@base44/sdk';

async function createDefaultWorkspaces() {
  const serviceRole = base44.asServiceRole;
  const users = await serviceRole.entities.User.list();
  
  for (const user of users) {
    // Check if user already has a default workspace
    const existingWorkspaces = await serviceRole.entities.Workspace.filter({
      owner_email: user.email,
      is_default: true
    });
    
    if (existingWorkspaces.length > 0) {
      continue;
    }
    
    // Create default personal workspace
    const workspace = await serviceRole.entities.Workspace.create({
      name: \`\${user.full_name}'s Workspace\`,
      description: 'My personal workspace',
      owner_email: user.email,
      members: [user.email],
      type: 'personal',
      is_default: true,
      settings: {
        color: '#3B82F6',
        icon: '👤'
      }
    });
    
    // Set as user's active workspace
    await serviceRole.entities.User.update(user.id, {
      active_workspace_id: workspace.id
    });
    
    console.log(\`✓ Created default workspace for \${user.email}\`);
  }
}

createDefaultWorkspaces();
\`\`\`

### Script 2: Assign Existing Data to User's Default Workspace

\`\`\`javascript
async function assignDataToDefaultWorkspaces() {
  const serviceRole = base44.asServiceRole;
  const users = await serviceRole.entities.User.list();
  
  for (const user of users) {
    const defaultWorkspaces = await serviceRole.entities.Workspace.filter({
      owner_email: user.email,
      is_default: true
    });
    
    if (defaultWorkspaces.length === 0) {
      console.error(\`No default workspace for \${user.email}\`);
      continue;
    }
    
    const defaultWorkspaceId = defaultWorkspaces[0].id;
    
    // Migrate Projects
    const projects = await serviceRole.entities.Project.filter({
      created_by: user.email
    });
    
    for (const project of projects) {
      if (!project.workspace_id) {
        await serviceRole.entities.Project.update(project.id, {
          workspace_id: defaultWorkspaceId
        });
      }
    }
    
    // Repeat for Assignments, Documents, Tasks, Messages, etc.
  }
}

assignDataToDefaultWorkspaces();
\`\`\`

### Script 3: Verify Migration

\`\`\`javascript
async function verifyMigration() {
  const serviceRole = base44.asServiceRole;
  
  const entitiesToCheck = [
    'Project',
    'Assignment',
    'Document',
    'Task',
    'Message'
  ];
  
  for (const entityName of entitiesToCheck) {
    const allRecords = await serviceRole.entities[entityName].list();
    const missingWorkspace = allRecords.filter(r => !r.workspace_id);
    
    console.log(\`\${entityName}:\`);
    console.log(\`  Total: \${allRecords.length}\`);
    console.log(\`  Missing workspace_id: \${missingWorkspace.length}\`);
  }
}

verifyMigration();
\`\`\`

## Post-Migration Verification

### Checklist
- [ ] All users have default workspace
- [ ] All users have active_workspace_id set
- [ ] All Projects have workspace_id
- [ ] All Assignments have workspace_id
- [ ] All Documents have workspace_id
- [ ] All Tasks have workspace_id
- [ ] All Messages have workspace_id

### Test User Flows
1. [ ] User can log in and see default workspace
2. [ ] User can see their pre-migration data
3. [ ] User can create new data in workspace
4. [ ] User can switch between workspaces
5. [ ] Cross-workspace isolation works correctly

## Troubleshooting

### Issue: User has no default workspace
\`\`\`javascript
const workspace = await base44.asServiceRole.entities.Workspace.create({
  name: \`\${user.full_name}'s Workspace\`,
  owner_email: user.email,
  members: [user.email],
  type: 'personal',
  is_default: true
});

await base44.asServiceRole.entities.User.update(user.id, {
  active_workspace_id: workspace.id
});
\`\`\`

### Issue: Data still missing workspace_id
**Solution:** Run Script 2 again or manually update records

## Success Criteria

Migration is successful when:
- [ ] All users can log in
- [ ] All users have default workspace
- [ ] All existing data visible in workspaces
- [ ] No cross-workspace data leakage
- [ ] All CRUD operations work correctly
- [ ] Performance is acceptable
`
    }
  };

  const currentDoc = docs[activeDoc];
  const Icon = currentDoc.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Workspace Documentation
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Complete guides for using and developing with the workspace feature
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Guides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(docs).map(([key, doc]) => {
                  const DocIcon = doc.icon;
                  return (
                    <Button
                      key={key}
                      variant={activeDoc === key ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveDoc(key)}
                    >
                      <DocIcon className="w-4 h-4 mr-2" />
                      {doc.title}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => window.open('https://github.com', '_blank')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  GitHub Repo
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => window.print()}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Print Guide
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6 text-indigo-600" />
                    <CardTitle className="text-2xl">{currentDoc.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-3xl font-bold mt-6 mb-4 text-gray-900 dark:text-white border-b pb-2">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-100">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-700 dark:text-gray-200">
                          {children}
                        </h3>
                      ),
                      code: ({ inline, children, ...props }) => {
                        return inline ? (
                          <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono text-indigo-600 dark:text-indigo-400">
                            {children}
                          </code>
                        ) : (
                          <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto my-4">
                            <code className="text-sm font-mono" {...props}>
                              {children}
                            </code>
                          </pre>
                        );
                      },
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 my-3 text-gray-700 dark:text-gray-300">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1 my-3 text-gray-700 dark:text-gray-300">
                          {children}
                        </ol>
                      ),
                      p: ({ children }) => (
                        <p className="my-3 text-gray-700 dark:text-gray-300 leading-relaxed">
                          {children}
                        </p>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-indigo-500 pl-4 italic my-4 text-gray-600 dark:text-gray-400">
                          {children}
                        </blockquote>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-gray-900 dark:text-white">
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {currentDoc.content}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}