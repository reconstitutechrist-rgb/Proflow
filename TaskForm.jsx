import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, FolderOpen, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { db } from "@/api/db";
import { toast } from "sonner";

export default function TaskForm({ task, assignmentId, currentUser, onSubmit, onCancel }) { // Changed assignment to assignmentId, onSave to onSubmit. Removed 'assignments' and 'users' props.
    const [users, setUsers] = React.useState([]); // State to hold fetched users
    const [assignmentsList, setAssignmentsList] = React.useState([]); // State to hold fetched assignments

    const [taskData, setTaskData] = React.useState(task || {
        title: "",
        description: "",
        assignment_id: assignmentId || null, // Initialized with assignmentId prop, or null
        assigned_to: currentUser?.email || null,
        status: "todo",
        priority: "medium",
        due_date: null,
        ai_keywords: []
    });

    const [isGeneratingKeywords, setIsGeneratingKeywords] = React.useState(false);

    const { currentWorkspaceId } = useWorkspace(); // Get current workspace ID from context

    // Effect to load users and assignments when currentWorkspaceId changes
    useEffect(() => {
        if (currentWorkspaceId) {
            loadUsers();
            loadAssignments();
        }
    }, [currentWorkspaceId]);

    const loadUsers = async () => {
        try {
            const usersData = await db.entities.User.list();
            setUsers(usersData);
        } catch (error) {
            console.error("Error loading users:", error);
            toast.error("Failed to load users.");
        }
    };

    const loadAssignments = async () => {
        try {
            const assignmentsData = await db.entities.Assignment.filter({ workspace_id: currentWorkspaceId });
            setAssignmentsList(assignmentsData);
        } catch (error) {
            console.error("Error loading assignments:", error);
            toast.error("Failed to load assignments.");
        }
    };

    const generateAIKeywords = async (title, description) => {
        // AI keyword generation disabled - return empty array
        // Can be re-enabled when LLM integration is configured
        return [];
    };

    const handleSubmit = async (e) => { // Renamed from handleSave
        e.preventDefault();

        // Added validation as per outline
        if (!taskData.title.trim()) {
            toast.error("Please enter a task title");
            return;
        }

        if (!taskData.assigned_to) {
            toast.error("Please assign the task to someone");
            return;
        }
        
        try {
            // Generate AI keywords before saving
            const aiKeywords = await generateAIKeywords(
                taskData.title, 
                taskData.description
            );

            // Construct submitData including workspace_id and potentially overriding assignment_id
            const submitData = {
                ...taskData,
                workspace_id: currentWorkspaceId, // Add workspace_id from context
                assignment_id: assignmentId || taskData.assignment_id, // Prioritize assignmentId prop if present, else use taskData's
                ai_keywords: aiKeywords
            };

            onSubmit(submitData); // Changed onSubmit
        } catch (error) {
            console.error("Error saving task:", error);
            alert("Failed to save task. Please try again.");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-8"
        >
            <form onSubmit={handleSubmit} className="space-y-4"> {/* Changed handleSubmit */}
                <Input
                    placeholder="What needs to be done?"
                    value={taskData.title}
                    onChange={(e) => setTaskData({...taskData, title: e.target.value})}
                    className="text-lg"
                    required
                />
                
                <Textarea
                    placeholder="Add details..."
                    value={taskData.description}
                    onChange={(e) => setTaskData({...taskData, description: e.target.value})}
                    className="h-24"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Assignment Selection */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Assignment</label>
                        <Select
                            value={taskData.assignment_id || "none"} // Handle null for empty state
                            onValueChange={(value) => setTaskData({...taskData, assignment_id: value === "none" ? null : value})} // Set to null if "none" selected
                            // Disable if an assignmentId is provided as a prop and matches the current task assignment
                            disabled={!!assignmentId && taskData.assignment_id === assignmentId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select assignment" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Assignment</SelectItem>
                                {assignmentsList && assignmentsList.map(a => ( // Using local state 'assignmentsList'
                                    <SelectItem key={a.id} value={a.id}>
                                        <div className="flex items-center gap-2">
                                            <FolderOpen className="w-4 h-4" />
                                            {a.title}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Assignee Selection */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Assigned To</label>
                        <Select
                            value={taskData.assigned_to || "none"} // Handle null for empty state
                            onValueChange={(value) => setTaskData({...taskData, assigned_to: value === "none" ? null : value})} // Set to null if "none" selected
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Unassigned</SelectItem>
                                {users && users.map(user => ( // Using local state 'users'
                                    <SelectItem key={user.email} value={user.email}>
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            {user.full_name || user.email}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex gap-4 flex-wrap">
                    <Select
                        value={taskData.priority}
                        onValueChange={(value) => setTaskData({...taskData, priority: value})}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={taskData.status}
                        onValueChange={(value) => setTaskData({...taskData, status: value})}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>

                </div>

                {/* AI Keywords Preview (if editing existing task) */}
                {task && taskData.ai_keywords && taskData.ai_keywords.length > 0 && (
                    <div>
                        <label className="text-sm font-medium text-gray-600">AI-Generated Keywords</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {taskData.ai_keywords.map((keyword, index) => (
                                <span 
                                    key={index}
                                    className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                                >
                                    {keyword}
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Keywords will be updated when you save changes
                        </p>
                    </div>
                )}
                
                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        className="bg-indigo-600 hover:bg-indigo-700"
                        disabled={isGeneratingKeywords}
                    >
                        {isGeneratingKeywords ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating Keywords...
                            </>
                        ) : (
                            task ? 'Update Task' : 'Create Task'
                        )}
                    </Button>
                </div>
            </form>
        </motion.div>
    );
}
