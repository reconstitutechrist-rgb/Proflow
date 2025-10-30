import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Upload, MessageSquare, Users } from "lucide-react";

export default function QuickActions() {
  const actions = [
    {
      title: "New Assignment",
      icon: Plus,
      url: createPageUrl("Assignments") + "?action=create",
      variant: "default"
    },
    {
      title: "Upload Document",
      icon: Upload,
      url: createPageUrl("Documents") + "?action=upload",
      variant: "outline"
    },
    {
      title: "Join Chat",
      icon: MessageSquare,
      url: createPageUrl("Chat"),
      variant: "outline"
    }
  ];

  return (
    <div className="flex items-center gap-4">
      {actions.map((action) => (
        <Link key={action.title} to={action.url}>
          <Button variant={action.variant} className="flex items-center gap-3 px-6 py-3 h-12">
            <action.icon className="w-5 h-5" />
            <span className="hidden sm:block font-medium">{action.title}</span>
          </Button>
        </Link>
      ))}
    </div>
  );
}