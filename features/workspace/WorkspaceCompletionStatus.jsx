import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Circle,
  Shield,
  Code,
  FileText,
  Zap,
  TrendingUp,
  Award
} from "lucide-react";

export default function WorkspaceCompletionStatus() {
  const completionData = {
    pages: {
      total: 13,
      completed: 10,
      items: [
        { name: "Dashboard", status: "complete" },
        { name: "Projects", status: "complete" },
        { name: "Assignments", status: "complete" },
        { name: "Documents", status: "complete" },
        { name: "Tasks", status: "complete" },
        { name: "Chat", status: "complete" },
        { name: "Research", status: "complete" },
        { name: "Generate", status: "complete" },
        { name: "AskAI", status: "complete" },
        { name: "DocumentCreator", status: "complete" },
        { name: "Users", status: "enhanced" },
        { name: "Preferences", status: "n/a" },
        { name: "Workspaces", status: "optimized" }
      ]
    },
    security: {
      total: 5,
      completed: 5,
      items: [
        { name: "DocumentDuplicateDialog", status: "complete" },
        { name: "FileShareDialog", status: "complete" },
        { name: "DocumentPackager", status: "complete" },
        { name: "CreateFolderDialog", status: "complete" },
        { name: "FolderStructure", status: "complete" }
      ]
    },
    highPriority: {
      total: 7,
      completed: 7,
      items: [
        { name: "DocumentVersionHistory", status: "complete" },
        { name: "AISummaryButton", status: "complete" },
        { name: "TaskDependencyTracker", status: "complete" },
        { name: "WorkflowPatternRecognition", status: "complete" },
        { name: "ThreadSearch", status: "complete" },
        { name: "PromptBuilderWizard", status: "complete" },
        { name: "DocumentRefiner", status: "complete" }
      ]
    },
    mediumPriority: {
      total: 10,
      completed: 10,
      items: [
        { name: "AIDocumentAnalyzer", status: "complete" },
        { name: "AIProjectExpert", status: "complete" },
        { name: "ProjectInsights", status: "complete" },
        { name: "ContentRewriter", status: "complete" },
        { name: "GrammarAssistant", status: "complete" },
        { name: "AudienceRewriter", status: "complete" },
        { name: "DocToPdfConverter", status: "complete" },
        { name: "DocumentQA", status: "complete" },
        { name: "SmartTaskSuggestions", status: "complete" },
        { name: "ProjectHealthOverview", status: "complete" }
      ]
    },
    polish: {
      total: 6,
      completed: 6,
      items: [
        { name: "WorkspacePerformanceMonitor", status: "complete" },
        { name: "WorkspaceLoadingState", status: "complete" },
        { name: "WorkspaceEmptyState", status: "complete" },
        { name: "OptimizedWorkspaceContext", status: "complete" },
        { name: "WorkspaceHealthCheck", status: "complete" },
        { name: "Documentation Pages", status: "complete" }
      ]
    }
  };

  const totalCompleted = 
    completionData.pages.completed +
    completionData.security.completed +
    completionData.highPriority.completed +
    completionData.mediumPriority.completed +
    completionData.polish.completed;

  const totalItems =
    completionData.pages.total +
    completionData.security.total +
    completionData.highPriority.total +
    completionData.mediumPriority.total +
    completionData.polish.total;

  const completionPercentage = Math.round((totalCompleted / totalItems) * 100);

  const getStatusIcon = (status) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "enhanced":
      case "optimized":
        return <Zap className="w-4 h-4 text-blue-600" />;
      case "n/a":
        return <Circle className="w-4 h-4 text-gray-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const CategorySection = ({ title, icon: Icon, data, color }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${color}`} />
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <Badge variant="secondary" className={`${color} bg-opacity-10`}>
          {data.completed}/{data.total}
        </Badge>
      </div>
      <div className="space-y-1">
        {data.items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm py-1">
            {getStatusIcon(item.status)}
            <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
            {(item.status === "enhanced" || item.status === "optimized") && (
              <Badge variant="outline" className="text-xs">
                {item.status}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-gray-900 dark:to-slate-900">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Workspace Feature Completion</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive implementation status
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {completionPercentage}%
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Complete</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Overall Progress</span>
            <span className="font-medium">{totalCompleted}/{totalItems} items</span>
          </div>
          <Progress value={completionPercentage} className="h-3" />
        </div>

        {/* Category Breakdown */}
        <div className="grid md:grid-cols-2 gap-6 pt-4">
          <CategorySection
            title="Pages"
            icon={FileText}
            data={completionData.pages}
            color="text-blue-600"
          />

          <CategorySection
            title="Security (P0)"
            icon={Shield}
            data={completionData.security}
            color="text-red-600"
          />

          <CategorySection
            title="High Priority (P1)"
            icon={TrendingUp}
            data={completionData.highPriority}
            color="text-orange-600"
          />

          <CategorySection
            title="Medium Priority (P2)"
            icon={Code}
            data={completionData.mediumPriority}
            color="text-green-600"
          />

          <CategorySection
            title="Polish & Performance"
            icon={Zap}
            data={completionData.polish}
            color="text-purple-600"
          />
        </div>

        {/* Achievement Badge */}
        {completionPercentage === 100 && (
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-green-600" />
              <div>
                <h4 className="font-semibold text-green-900 dark:text-green-100">
                  🎉 Feature Complete!
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  All workspace isolation components have been successfully implemented and tested.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}