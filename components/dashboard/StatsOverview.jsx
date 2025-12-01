import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  FolderOpen,
  FileText,
  CheckCircle,
  Users
} from "lucide-react";

export default function StatsOverview({ statistics, createPageUrl }) {
  // Safely access statistics with fallback
  const stats = statistics || {
    assignments: { total: 0 },
    tasks: { total: 0, pending: 0, inProgress: 0 },
    documents: { total: 0 },
    messages: { total: 0 }
  };

  return (
    <>
      <Card className="shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100 dark:border-blue-900/50 bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Assignments
              </p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.assignments?.total || 0}
              </h3>
            </div>
            <div className="p-4 bg-blue-600 rounded-lg">
              <FolderOpen className="w-8 h-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md hover:shadow-lg transition-all duration-300 border border-green-100 dark:border-green-900/50 bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Tasks
              </p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {(stats.tasks?.pending || 0) + (stats.tasks?.inProgress || 0)}
              </h3>
            </div>
            <div className="p-4 bg-green-600 rounded-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md hover:shadow-lg transition-all duration-300 border border-purple-100 dark:border-purple-900/50 bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Documents
              </p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.documents?.total || 0}
              </h3>
            </div>
            <div className="p-4 bg-purple-600 rounded-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md hover:shadow-lg transition-all duration-300 border border-amber-100 dark:border-amber-900/50 bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Team Messages
              </p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.messages?.total || 0}
              </h3>
            </div>
            <div className="p-4 bg-amber-600 rounded-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}