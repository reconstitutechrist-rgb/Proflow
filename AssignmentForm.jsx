import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Target } from "lucide-react";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AssignmentForm({
  assignment,
  onSubmit,
  onCancel,
  defaultProjectId = null,
  projects = []
}) {
  const [formData, setFormData] = useState({
    project_id: "",
    title: "",
    description: ""
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (assignment) {
      setFormData({
        project_id: assignment.project_id || defaultProjectId || "",
        title: assignment.title || "",
        description: assignment.description || ""
      });
    } else {
      setFormData({
        project_id: defaultProjectId || "",
        title: "",
        description: ""
      });
    }
  }, [assignment, defaultProjectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter an assignment title");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        ...formData,
        project_id: formData.project_id || null
      });
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold">
          {assignment ? "Edit Assignment" : "Create New Assignment"}
        </DialogTitle>
        <DialogDescription>
          {assignment ? "Update assignment details" : "Create a new assignment to organize your work"}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* Project Selection */}
          <div>
            <Label htmlFor="project" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Project (Optional)
            </Label>
            <Select
              value={formData.project_id || "none"}
              onValueChange={(value) => setFormData({
                ...formData,
                project_id: value === "none" ? "" : value
              })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project (Standalone)</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Title */}
          <div>
            <Label htmlFor="title">Assignment Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter assignment title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the assignment objectives and deliverables..."
              rows={4}
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
              assignment ? "Update Assignment" : "Create Assignment"
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
