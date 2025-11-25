
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FolderPlus, // Changed from Plus, Folder
  Loader2     // New import for loading spinner
} from "lucide-react";
import { useWorkspace } from "@/components/workspace/WorkspaceContext"; // New import
import { toast } from "sonner"; // New import
import { base44 } from "@/api/base44Client"; // New import as per outline

export default function CreateFolderDialog({ 
  parentPath = "/", // Renamed from currentPath, with default value
  isOpen, 
  onClose, 
  onFolderCreated 
}) {
  const [folderName, setFolderName] = useState("");
  const [creating, setCreating] = useState(false); // Renamed from isCreating

  const { currentWorkspaceId } = useWorkspace(); // New hook for workspace context

  const handleCreate = async () => {
    // Basic validation
    if (!folderName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }

    if (!currentWorkspaceId) {
      toast.error("No workspace selected. Please select a workspace to create folders.");
      return;
    }

    setCreating(true);

    try {
      // Create the new folder path
      const folderPath = parentPath === "/" 
        ? `/${folderName}` 
        : `${parentPath}/${folderName}`;

      // Create a placeholder document to represent the folder
      const folderDocument = {
        workspace_id: currentWorkspaceId,  // CRITICAL: Explicit workspace_id for security
        title: folderName,
        description: "Folder",
        folder_path: folderPath,
        document_type: "folder_placeholder",
        content: "",
        file_url: "",
        assigned_to_assignments: [] // Added as per new document structure
      };

      // Assuming base44 is globally available or imported in a parent context
      // If `Document` from "@/api/entities" is still the correct way,
      // this line would need adjustment to match the `base44` structure.
      // Based on the outline, `base44.entities.Document.create` is expected.
      const newFolder = await base44.entities.Document.create(folderDocument);

      toast.success(`Folder "${folderName}" created successfully`);
      
      setFolderName(""); // Reset input field
      onClose(); // Close the dialog
      if (onFolderCreated) onFolderCreated(newFolder); // Pass the created folder object
      
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Failed to create folder. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}> {/* Simplified onOpenChange */}
      <DialogContent> {/* className="sm:max-w-md" removed */}
        <DialogHeader>
          <DialogTitle> {/* Folder icon and custom class removed */}
            Create New Folder
          </DialogTitle>
          <DialogDescription>
            Create a new folder{parentPath !== "/" ? ` in ${parentPath}` : ""} {/* Dynamic description */}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4"> {/* Added py-4 for consistent padding */}
          {/* Removed Current Path Display */}

          {/* Folder Name Input */}
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name *</Label> {/* Added asterisk */}
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                // setError("") removed as toast is used
              }}
              placeholder="Enter folder name..." // Updated placeholder
              // className="focus:ring-2 focus:ring-blue-500" removed
              autoFocus
              onKeyPress={(e) => { // New: Handle Enter key press
                if (e.key === "Enter" && folderName.trim()) {
                  handleCreate();
                }
              }}
            />
          </div>

          {/* Preview Path */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"> {/* Updated styling */}
            <p className="text-xs text-blue-800 dark:text-blue-300">
              <span className="font-medium">📁 Folder will be created in:</span>
              <br />
              <span className="font-mono">{parentPath === "/" ? "/" : parentPath}/{folderName || "..."}</span> {/* Dynamic path preview */}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
              🔒 Folder will be created in the current workspace
            </p>
          </div>

          {/* Error Message removed - replaced by toast */}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose} // Simplified call
            disabled={creating} // Use 'creating' state
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={creating || !folderName.trim()} // Disabled if creating or folder name is empty
            // className="bg-blue-600 hover:bg-blue-700" removed
          >
            {creating ? ( // Use 'creating' state
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {/* New loading icon */}
                Creating...
              </>
            ) : (
              <>
                <FolderPlus className="w-4 h-4 mr-2" /> {/* Changed icon to FolderPlus */}
                Create Folder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
