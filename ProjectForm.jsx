import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// ProjectForm component - renders inside parent Dialog
export default function ProjectForm({ project, onCancel, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    goals: ""
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        goals: project.goals || ""
      });
    } else {
      setFormData({
        name: "",
        description: "",
        goals: ""
      });
    }
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to save project", {
        description: error.message || "Please try again"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold">
          {project ? "Edit Project" : "Create New Project"}
        </DialogTitle>
        <DialogDescription>
          {project ? "Update project details" : "Create a new project to organize your assignments"}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Project description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="goals">Goals & Objectives</Label>
            <Textarea
              id="goals"
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              placeholder="What are the main goals of this project?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              project ? "Update Project" : "Create Project"
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
