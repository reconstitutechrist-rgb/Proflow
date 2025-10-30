import React, { useState, useEffect } from "react";
import { Assignment } from "@/api/entities";
import { Project } from "@/api/entities";
import { User } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
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
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Loader2, X, Plus, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AssignmentForm({ 
  assignment, 
  onSubmit, 
  onClose,
  isOpen = false,
  currentUser,
  defaultProjectId = null,
  projects = []
}) {
  const [currentAssignment, setCurrentAssignment] = useState(assignment || {
    project_id: defaultProjectId || "",
    name: "",
    description: "",
    status: "planning",
    priority: "medium",
    start_date: "",
    end_date: "",
    assignment_manager: currentUser?.email || "",
    team_members: [],
    client_contact: "",
    color: "#3B82F6",
    ai_keywords: []
  });

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (assignment) {
      setCurrentAssignment({
        project_id: assignment.project_id || defaultProjectId || "",
        name: assignment.name || "",
        description: assignment.description || "",
        status: assignment.status || "planning",
        priority: assignment.priority || "medium",
        start_date: assignment.start_date || "",
        end_date: assignment.end_date || "",
        assignment_manager: assignment.assignment_manager || currentUser?.email || "",
        team_members: assignment.team_members || [],
        client_contact: assignment.client_contact || "",
        color: assignment.color || "#3B82F6",
        ai_keywords: assignment.ai_keywords || []
      });
    } else {
      setCurrentAssignment({
        project_id: defaultProjectId || "",
        name: "",
        description: "",
        status: "planning",
        priority: "medium",
        start_date: "",
        end_date: "",
        assignment_manager: currentUser?.email || "",
        team_members: [],
        client_contact: "",
        color: "#3B82F6",
        ai_keywords: []
      });
    }
  }, [assignment, currentUser, isOpen, defaultProjectId]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const usersData = await User.list();
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const generateAIKeywords = async (name, description) => {
    if (!name.trim() && !description.trim()) return [];

    try {
      setIsGeneratingKeywords(true);
      
      const prompt = `Analyze the following assignment information and generate 8-12 relevant keywords and phrases that would help team members find this assignment through semantic search. Focus on key concepts, industry terms, objectives, and related topics.

Assignment Name: ${name}
Description: ${description}

Generate keywords as a JSON array of strings. Include:
- Core business concepts and objectives
- Industry-specific terminology
- Related activities and processes
- Potential deliverables or outcomes
- Skills or departments involved

Return only the JSON array, no other text.`;

      const response = await InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            keywords: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      return response.keywords || [];
    } catch (error) {
      console.error("Error generating AI keywords:", error);
      return [];
    } finally {
      setIsGeneratingKeywords(false);
    }
  };

  const handleAddTeamMember = () => {
    if (selectedMember && !currentAssignment.team_members.includes(selectedMember)) {
      setCurrentAssignment({
        ...currentAssignment,
        team_members: [...currentAssignment.team_members, selectedMember]
      });
      setSelectedMember("");
    }
  };

  const handleRemoveTeamMember = (email) => {
    setCurrentAssignment({
      ...currentAssignment,
      team_members: currentAssignment.team_members.filter(member => member !== email)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentAssignment.name.trim()) {
      toast.error("Assignment name is required");
      return;
    }
    
    try {
      // Generate AI keywords before saving
      const aiKeywords = await generateAIKeywords(
        currentAssignment.name, 
        currentAssignment.description
      );

      const assignmentWithAI = {
        ...currentAssignment,
        ai_keywords: aiKeywords,
        // Remove project_id if it's empty string
        project_id: currentAssignment.project_id || null
      };

      await onSubmit(assignmentWithAI);
      onClose();
    } catch (error) {
      console.error("Error saving assignment:", error);
      toast.error("Failed to save assignment. Please try again.");
    }
  };

  const assignmentColors = [
    { value: "#3B82F6", label: "Blue" },
    { value: "#10B981", label: "Green" },
    { value: "#F59E0B", label: "Amber" },
    { value: "#EF4444", label: "Red" },
    { value: "#8B5CF6", label: "Purple" },
    { value: "#EC4899", label: "Pink" },
    { value: "#06B6D4", label: "Cyan" },
  ];

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {assignment ? 'Edit Assignment' : 'Create New Assignment'}
          </DialogTitle>
        </DialogHeader>
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Selection */}
            <div>
              <Label htmlFor="project" className="text-base font-semibold flex items-center gap-2">
                <Target className="w-4 h-4" />
                Project (Optional)
              </Label>
              <Select
                value={currentAssignment.project_id || "none"}
                onValueChange={(value) => setCurrentAssignment({
                  ...currentAssignment,
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
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentAssignment.project_id && currentAssignment.project_id !== "none" && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  This assignment will be part of: {getProjectName(currentAssignment.project_id)}
                </p>
              )}
            </div>

            {/* Assignment Name */}
            <div>
              <Label htmlFor="name" className="text-base font-semibold">Assignment Name *</Label>
              <Input
                id="name"
                placeholder="Enter assignment name..."
                value={currentAssignment.name}
                onChange={(e) => setCurrentAssignment({...currentAssignment, name: e.target.value})}
                className="text-lg mt-2"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-base font-semibold">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the assignment objectives, scope, and key deliverables..."
                value={currentAssignment.description}
                onChange={(e) => setCurrentAssignment({...currentAssignment, description: e.target.value})}
                className="mt-2 h-32"
              />
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status" className="text-base font-semibold">Status</Label>
                <Select
                  value={currentAssignment.status}
                  onValueChange={(value) => setCurrentAssignment({...currentAssignment, status: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority" className="text-base font-semibold">Priority</Label>
                <Select
                  value={currentAssignment.priority}
                  onValueChange={(value) => setCurrentAssignment({...currentAssignment, priority: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date" className="text-base font-semibold">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={currentAssignment.start_date}
                  onChange={(e) => setCurrentAssignment({...currentAssignment, start_date: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="end_date" className="text-base font-semibold">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={currentAssignment.end_date}
                  onChange={(e) => setCurrentAssignment({...currentAssignment, end_date: e.target.value})}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Assignment Manager */}
            <div>
              <Label htmlFor="manager" className="text-base font-semibold">Assignment Manager</Label>
              <Select
                value={currentAssignment.assignment_manager}
                onValueChange={(value) => setCurrentAssignment({...currentAssignment, assignment_manager: value})}
                disabled={loadingUsers}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select manager..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Members */}
            <div>
              <Label className="text-base font-semibold">Team Members</Label>
              <div className="flex gap-2 mt-2">
                <Select
                  value={selectedMember}
                  onValueChange={setSelectedMember}
                  disabled={loadingUsers}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Add team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(user => 
                        !currentAssignment.team_members.includes(user.email) &&
                        user.email !== currentAssignment.assignment_manager
                      )
                      .map((user) => (
                        <SelectItem key={user.email} value={user.email}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddTeamMember}
                  disabled={!selectedMember}
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {currentAssignment.team_members.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {currentAssignment.team_members.map((email) => {
                    const user = users.find(u => u.email === email);
                    return (
                      <Badge key={email} variant="secondary" className="flex items-center gap-2">
                        {user?.full_name || email}
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamMember(email)}
                          className="hover:text-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Client Contact */}
            <div>
              <Label htmlFor="client_contact" className="text-base font-semibold">Client Contact (Optional)</Label>
              <Input
                id="client_contact"
                type="email"
                placeholder="client@example.com"
                value={currentAssignment.client_contact}
                onChange={(e) => setCurrentAssignment({...currentAssignment, client_contact: e.target.value})}
                className="mt-2"
              />
            </div>

            {/* Color */}
            <div>
              <Label className="text-base font-semibold">Color</Label>
              <div className="flex gap-3 mt-2">
                {assignmentColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setCurrentAssignment({...currentAssignment, color: color.value})}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      currentAssignment.color === color.value 
                        ? 'border-gray-900 dark:border-white scale-110' 
                        : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* AI Keywords Preview */}
            {assignment && currentAssignment.ai_keywords && currentAssignment.ai_keywords.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">AI-Generated Keywords</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentAssignment.ai_keywords.map((keyword, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Keywords will be updated when you save changes
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isGeneratingKeywords}
              >
                {isGeneratingKeywords ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating AI Keywords...
                  </>
                ) : (
                  assignment ? 'Update Assignment' : 'Create Assignment'
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}