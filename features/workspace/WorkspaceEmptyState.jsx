import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Users, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { createPageUrl } from "@/lib/utils";

export default function WorkspaceEmptyState({ 
  workspaceName, 
  onCreateWorkspace,
  showCreateButton = true 
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        <CardContent className="pt-12 pb-12">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full blur-2xl opacity-30 animate-pulse"></div>
              <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Building2 className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome to {workspaceName || "Your Workspace"}!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                This workspace is empty. Start by creating your first project, assignment, or document.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <Sparkles className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Organize Projects
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create and manage projects with AI assistance
                </p>
              </div>

              <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                <Users className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Team Collaboration
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Invite members and work together seamlessly
                </p>
              </div>

              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                <Building2 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Stay Organized
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Keep everything separate and well-structured
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link to={createPageUrl("Projects")}>
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Project
                </Button>
              </Link>

              {showCreateButton && onCreateWorkspace && (
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={onCreateWorkspace}
                  className="border-2"
                >
                  <Building2 className="w-5 h-5 mr-2" />
                  Create New Workspace
                </Button>
              )}
            </div>

            {/* Help Link */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Need help getting started?{" "}
                <Link to={createPageUrl("Documentation")} className="text-blue-600 hover:text-blue-700 font-medium">
                  View Documentation
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
