
import React, { useState, useEffect } from "react";
import { DocumentPackage } from "@/api/entities"; // Kept for type definitions or potential fallback
import { Document } from "@/api/entities"; // Kept for type definitions or potential fallback

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Removed: Select components, as package type selection changed to cards and assignmentId is a prop
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter, // Added DialogFooter import
} from "@/components/ui/dialog";

import {
  Tabs,
  TabsList,
  TabsTrigger, // New import for tabbed interface
  TabsContent,
} from "@/components/ui/tabs"; // New imports for tabbed interface

import { Textarea } from "@/components/ui/textarea"; // New import for description, header/footer text

import {
  Package,
  FileText,
  Loader2,
  Palette,
  Lock,
  Code, // New icon for package templates
  TrendingUp, // New icon for package templates
  Users, // New icon for package templates
  Briefcase, // New icon for package templates
  Shield, // New icon for package templates
  Settings // Used for general settings, and now for custom package template
} from "lucide-react";

import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { toast } from "sonner";
import { db } from "@/api/db";

export default function DocumentPackager({ assignmentId, isOpen, onClose, onPackageCreated }) {
  const [packageName, setPackageName] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [packageType, setPackageType] = useState("custom");
  const [selectedDocuments, setSelectedDocuments] = useState([]); // Stores document IDs
  const [availableDocuments, setAvailableDocuments] = useState([]); // Stores full document objects
  const [sections, setSections] = useState([{ name: "Documents", order: 1 }]); // For package structure
  const [branding, setBranding] = useState({
    company_name: "",
    header_text: "", // New field
    footer_text: "", // New field
    color_scheme: "#3B82F6"
  });
  const [accessSettings, setAccessSettings] = useState({ // New state for access settings
    password_protected: false,
    password: ""
  });
  const [loading, setLoading] = useState(false); // For loading documents
  const [creating, setCreating] = useState(false); // For creating the package

  const { currentWorkspaceId } = useWorkspace(); // Get current workspace ID

  useEffect(() => {
    if (isOpen && currentWorkspaceId && assignmentId) {
      loadDocuments();
      // Reset form fields when dialog opens to ensure a fresh start
      setPackageName("");
      setPackageDescription("");
      setPackageType("custom");
      setSelectedDocuments([]);
      setSections([{ name: "Documents", order: 1 }]);
      setBranding({
        company_name: "",
        header_text: "",
        footer_text: "",
        color_scheme: "#3B82F6"
      });
      setAccessSettings({
        password_protected: false,
        password: ""
      });
    } else if (!isOpen) {
      // Optional: Clear documents when dialog closes to prevent stale data
      setAvailableDocuments([]);
    }
  }, [isOpen, currentWorkspaceId, assignmentId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);

      // CRITICAL: Only load documents from current workspace and assigned to the specific assignment
      const docs = await db.entities.Document.filter({
        workspace_id: currentWorkspaceId,
        assigned_to_assignments: { $in: [assignmentId] }
      }, "-updated_date"); // Sort by updated_date descending

      // CRITICAL: Double-check all documents are in current workspace
      const validDocs = docs.filter(doc => {
        if (doc.workspace_id !== currentWorkspaceId) {
          console.warn("Security check: Document found in different workspace, filtering out.", {
            documentId: doc.id,
            documentWorkspace: doc.workspace_id,
            currentWorkspace: currentWorkspaceId
          });
          return false;
        }
        return true;
      });

      setAvailableDocuments(validDocs);
      if (validDocs.length === 0) {
        toast.info("No documents found for this assignment in the current workspace.");
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents.");
      setAvailableDocuments([]); // Clear any partially loaded data
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDocument = (documentId) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  const handleCreatePackage = async () => {
    if (!packageName.trim()) {
      toast.error("Please enter a package name.");
      return;
    }

    if (selectedDocuments.length === 0) {
      toast.error("Please select at least one document.");
      return;
    }

    if (!currentWorkspaceId) {
      toast.error("No workspace selected. Please select a workspace.");
      return;
    }

    if (!assignmentId) {
      toast.error("No assignment specified. This package must be linked to an assignment.");
      return;
    }

    if (accessSettings.password_protected && !accessSettings.password.trim()) {
        toast.error("Please enter a password for password-protected packages.");
        return;
    }

    try {
      setCreating(true);

      // CRITICAL SECURITY CHECK: Validate all selected documents are in current workspace
      const documentsToPackage = availableDocuments.filter(doc =>
        selectedDocuments.includes(doc.id)
      );

      // Ensure all selected documents were actually found in availableDocuments (which are workspace-filtered)
      if (documentsToPackage.length !== selectedDocuments.length) {
        console.error("Security violation: Some selected documents were not found in available (workspace-filtered) documents.");
        toast.error("A security check failed. Some selected documents could not be validated. Please refresh and try again.");
        return;
      }

      const workspaceIds = documentsToPackage.map(doc => doc.workspace_id);
      const uniqueWorkspaces = [...new Set(workspaceIds)];

      if (uniqueWorkspaces.length > 1) {
        toast.error("Cannot package documents from multiple workspaces.");
        console.error("Security violation: Attempted cross-workspace packaging.", {
          workspaces: uniqueWorkspaces,
          currentWorkspace: currentWorkspaceId
        });
        return;
      }

      if (uniqueWorkspaces.length === 1 && uniqueWorkspaces[0] !== currentWorkspaceId) {
        toast.error("Selected documents are not in the current workspace.");
        console.error("Security violation: Documents workspace mismatch.", {
          documentsWorkspace: uniqueWorkspaces[0],
          currentWorkspace: currentWorkspaceId
        });
        return;
      }

      // Build included documents array with organization
      const includedDocuments = selectedDocuments.map((docId, index) => {
        const doc = availableDocuments.find(d => d.id === docId);
        return {
          document_id: docId,
          document_title: doc?.title || "Untitled Document", // Fallback title
          order: index + 1,
          section: sections[0]?.name || "Documents" // Use first section name or default
        };
      });

      // Create package with explicit workspace_id
      const packageData = {
        workspace_id: currentWorkspaceId,  // CRITICAL: Explicit workspace_id
        name: packageName,
        description: packageDescription,
        assignment_id: assignmentId, // Use the prop directly
        package_type: packageType,
        included_documents: includedDocuments,
        package_structure: {
          sections: sections
        },
        branding: branding,
        access_settings: accessSettings, // Include new access settings
        status: "generating"
      };

      const newPackage = await db.entities.DocumentPackage.create(packageData);

      toast.success("Document package created successfully.");
      onClose(); // Close the dialog
      if (onPackageCreated) onPackageCreated(newPackage);

      // Reset form state after successful creation (already handled by useEffect on subsequent opens, but good for immediate internal state reset)
      setPackageName("");
      setPackageDescription("");
      setPackageType("custom");
      setSelectedDocuments([]);
      setSections([{ name: "Documents", order: 1 }]);
      setBranding({
        company_name: "",
        header_text: "",
        footer_text: "",
        color_scheme: "#3B82F6"
      });
      setAccessSettings({
        password_protected: false,
        password: ""
      });

    } catch (error) {
      console.error("Error creating package:", error);
      toast.error("Failed to create document package.");
    } finally {
      setCreating(false);
    }
  };

  const packageTemplates = [
    {
      type: "developer",
      name: "Developer Package",
      description: "Technical documentation for developers",
      icon: <Code className="w-5 h-5" />
    },
    {
      type: "investor",
      name: "Investor Package",
      description: "Financial and business documents for investors",
      icon: <TrendingUp className="w-5 h-5" />
    },
    {
      type: "partner",
      name: "Partner Package",
      description: "Collaboration documents for partners",
      icon: <Users className="w-5 h-5" />
    },
    {
      type: "client",
      name: "Client Package",
      description: "Client-facing deliverables and reports",
      icon: <Briefcase className="w-5 h-5" />
    },
    {
      type: "compliance",
      name: "Compliance Package",
      description: "Regulatory and compliance documents",
      icon: <Shield className="w-5 h-5" />
    },
    {
      type: "custom",
      name: "Custom Package",
      description: "Build your own custom package",
      icon: <Settings className="w-5 h-5" />
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Document Package</DialogTitle>
          <DialogDescription>
            Bundle multiple documents into a professional package for sharing
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="branding">
              <Palette className="w-4 h-4 mr-2" />
              Branding
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="package-name">Package Name *</Label>
                <Input
                  id="package-name"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="e.g., Q4 Client Deliverables"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="package-description">Description</Label>
                <Textarea
                  id="package-description"
                  value={packageDescription}
                  onChange={(e) => setPackageDescription(e.target.value)}
                  placeholder="Brief description of this package..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Package Type</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {packageTemplates.map((template) => (
                    <Card
                      key={template.type}
                      className={`cursor-pointer transition-all ${
                        packageType === template.type
                          ? "border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() => setPackageType(template.type)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            packageType === template.type
                              ? "bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}>
                            {template.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {template.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {template.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Documents ({selectedDocuments.length}) *</Label>
                  {availableDocuments.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedDocuments.length === availableDocuments.length) {
                          setSelectedDocuments([]);
                        } else {
                          setSelectedDocuments(availableDocuments.map(d => d.id));
                        }
                      }}
                    >
                      {selectedDocuments.length === availableDocuments.length ? "Deselect All" : "Select All"}
                    </Button>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : availableDocuments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No documents available for this assignment in your current workspace.</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-800 max-h-[400px] overflow-y-auto">
                    {availableDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                        onClick={() => handleToggleDocument(doc.id)}
                      >
                        <Checkbox
                          checked={selectedDocuments.includes(doc.id)}
                          onCheckedChange={() => handleToggleDocument(doc.id)}
                        />
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {doc.title}
                          </p>
                          {doc.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {doc.description}
                            </p>
                          )}
                        </div>
                        {doc.document_type && (
                          <Badge variant="outline" className="text-xs">
                            {doc.document_type}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Security Notice */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                      Workspace Security
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                      Only documents from the current workspace can be included in this package.
                      All selected documents will be validated before packaging.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 pt-4">
            {/* Access Settings */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4" />
                Access Settings
              </Label>
              <div className="mt-2 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="password-protected-checkbox"
                    checked={accessSettings.password_protected}
                    onCheckedChange={(checked) => setAccessSettings(prev => ({
                      ...prev,
                      password_protected: checked
                    }))}
                  />
                  <Label htmlFor="password-protected-checkbox" className="text-sm">Password protect this package</Label>
                </div>
                {accessSettings.password_protected && (
                  <Input
                    type="password"
                    placeholder="Enter password..."
                    value={accessSettings.password}
                    onChange={(e) => setAccessSettings(prev => ({
                      ...prev,
                      password: e.target.value
                    }))}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-4 pt-4">
            {/* Branding Options */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4" />
                Branding
              </Label>
              <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Your Company Name"
                    value={branding.company_name}
                    onChange={(e) => setBranding(prev => ({
                      ...prev,
                      company_name: e.target.value
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="colorScheme">Primary Color</Label>
                  <input
                    type="color"
                    id="colorScheme"
                    value={branding.color_scheme}
                    onChange={(e) => setBranding(prev => ({
                      ...prev,
                      color_scheme: e.target.value
                    }))}
                    className="w-full h-10 rounded border"
                    style={{ background: branding.color_scheme, padding: 0 }}
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="headerText">Header Text</Label>
                  <Textarea
                    id="headerText"
                    placeholder="Text to appear in the package header..."
                    value={branding.header_text}
                    onChange={(e) => setBranding(prev => ({
                      ...prev,
                      header_text: e.target.value
                    }))}
                    rows={2}
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Textarea
                    id="footerText"
                    placeholder="Text to appear in the package footer..."
                    value={branding.footer_text}
                    onChange={(e) => setBranding(prev => ({
                      ...prev,
                      footer_text: e.target.value
                    }))}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreatePackage}
            disabled={creating || selectedDocuments.length === 0 || !packageName.trim()}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Package...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Create Package ({selectedDocuments.length} docs)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
