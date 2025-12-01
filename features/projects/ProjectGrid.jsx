
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

// Helper function to lighten a hex color by a given percentage
const lightenColor = (hex, percent) => {
  let f = parseInt(hex.slice(1), 16),
    t = percent < 0 ? 0 : 255,
    p = percent < 0 ? percent * -1 : percent,
    c = '#';
  for (let i = 0; i < 3; i++) {
    let v = f % 256;
    f = Math.floor(f / 256);
    let l = Math.round((t - v) * (p / 100)) + v;
    c += ('00' + l.toString(16)).slice(-2);
  }
  return c;
};

export default function ProjectGrid({ projects, onProjectClick }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <Card
          key={project.id}
          className="group cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 border-0 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden hover:-translate-y-1"
          onClick={() => onProjectClick && onProjectClick(project)}
        >
          <div
            className="h-3"
            style={{
              background: `linear-gradient(to right, ${project.color || '#3B82F6'}, ${lightenColor(project.color || '#3B82F6', 40)})`
            }}
          />
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {project.name}
                </CardTitle>
                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.goals && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Goals:</p>
                <p className="line-clamp-2">{project.goals}</p>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end">
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
