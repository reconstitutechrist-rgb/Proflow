import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";

export default function WorkspaceLoadingState({ message = "Loading workspace..." }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Animated Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Building2 className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Loading Spinner */}
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />

            {/* Loading Text */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {message}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Please wait while we prepare your workspace...
              </p>
            </div>

            {/* Progress Dots */}
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}