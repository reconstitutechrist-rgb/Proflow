import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Upload,
  FileText,
  X,
  Eye,
  EyeOff,
  Layers,
  Target,
  Globe,
  Link2,
} from "lucide-react";
import DragDropZone from "@/components/DragDropZone";
import ProgressIndicator from "@/components/ProgressIndicator";
import { MEMORY_LIMITS } from "@/hooks/useAskAI";

export function AskAIDocumentSidebar({
  uploadedDocuments,
  assignments,
  projects,
  selectedAssignment,
  selectedProject,
  contextType,
  setSelectedAssignment,
  setSelectedProject,
  setContextType,
  isUploading,
  isProcessingEmbeddings,
  embeddingProgress,
  useRAG,
  docsWithEmbeddings,
  docsWithRealEmbeddings,
  docsWithSimulatedEmbeddings,
  docsWithSemanticChunking,
  excludedDocumentCount,
  documentCapacityPercent,
  fileInputRef,
  handleFileUpload,
  handleRemoveDocument,
  toggleDocumentInContext,
  handleDragDropFiles,
}) {
  return (
    <Card className="w-80 flex-shrink-0 shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Documents</CardTitle>
          <Badge variant="secondary">
            {uploadedDocuments.length}/{MEMORY_LIMITS.MAX_DOCUMENTS}
          </Badge>
        </div>
        {documentCapacityPercent > 60 && (
          <div className="mt-2">
            <Progress value={documentCapacityPercent} className="h-1.5" />
            <p className="text-xs text-gray-500 mt-1">
              {MEMORY_LIMITS.MAX_DOCUMENTS - uploadedDocuments.length} slots remaining
            </p>
          </div>
        )}
      </CardHeader>

      {/* Auto-loaded documents indicator */}
      {uploadedDocuments.filter(d => d.autoLoaded).length > 0 && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
          <div className="p-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <span className="text-xs font-medium text-purple-900 dark:text-purple-100">
                {uploadedDocuments.filter(d => d.autoLoaded).length} linked document(s) auto-loaded
              </span>
            </div>
          </div>
        </div>
      )}

      {useRAG && uploadedDocuments.length > 0 && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                  {docsWithEmbeddings.length}/{uploadedDocuments.length} processed
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {docsWithRealEmbeddings.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0">
                    {docsWithRealEmbeddings.length} AI
                  </Badge>
                )}
                {docsWithSemanticChunking.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0">
                    {docsWithSemanticChunking.length} sem
                  </Badge>
                )}
                {docsWithSimulatedEmbeddings.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0">
                    {docsWithSimulatedEmbeddings.length} sim
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <CardContent className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <Select
            value={
              contextType === "project" && selectedProject
                ? `project:${selectedProject.id}`
                : contextType === "assignment" && selectedAssignment
                ? `assignment:${selectedAssignment.id}`
                : "none"
            }
            onValueChange={(value) => {
              if (value === "none") {
                setContextType("none");
                setSelectedAssignment(null);
                setSelectedProject(null);
              } else if (value.startsWith("project:")) {
                const projectId = value.replace("project:", "");
                const project = projects.find(p => p.id === projectId);
                setContextType("project");
                setSelectedProject(project || null);
                setSelectedAssignment(null);
              } else if (value.startsWith("assignment:")) {
                const assignmentId = value.replace("assignment:", "");
                const assignment = assignments.find(a => a.id === assignmentId);
                setContextType("assignment");
                setSelectedAssignment(assignment || null);
                setSelectedProject(null);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue>
                {contextType === "project" && selectedProject ? (
                  <span className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    {selectedProject.name}
                  </span>
                ) : contextType === "assignment" && selectedAssignment ? (
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    {selectedAssignment.name}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    General (no context)
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  General (no context)
                </span>
              </SelectItem>
              {projects.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Projects</div>
                  {projects.map((project) => (
                    <SelectItem key={`project:${project.id}`} value={`project:${project.id}`}>
                      <span className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-purple-600" />
                        {project.name}
                      </span>
                    </SelectItem>
                  ))}
                </>
              )}
              {assignments.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Assignments</div>
                  {assignments.map((assignment) => (
                    <SelectItem key={`assignment:${assignment.id}`} value={`assignment:${assignment.id}`}>
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        {assignment.name}
                      </span>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4" id="upload-zone">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.pdf,.doc,.docx,.md,.csv,.json"
            onChange={handleFileUpload}
            disabled={isUploading || uploadedDocuments.length >= MEMORY_LIMITS.MAX_DOCUMENTS}
            className="hidden"
          />

          {uploadedDocuments.length === 0 ? (
            <DragDropZone
              onFilesSelected={handleDragDropFiles}
              accept=".txt,.pdf,.doc,.docx,.md,.csv,.json"
              multiple={true}
              disabled={isUploading || uploadedDocuments.length >= MEMORY_LIMITS.MAX_DOCUMENTS}
            />
          ) : (
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || uploadedDocuments.length >= MEMORY_LIMITS.MAX_DOCUMENTS}
              className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload More Documents
                </>
              )}
            </Button>
          )}
        </div>

        {isProcessingEmbeddings && (
          <div className="mb-4">
            <ProgressIndicator
              operation="Generating embeddings"
              current={embeddingProgress.current}
              total={embeddingProgress.total}
              message="Processing documents and creating vector embeddings..."
              canCancel={false}
            />
          </div>
        )}

        {excludedDocumentCount > 0 && (
          <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {excludedDocumentCount} document{excludedDocumentCount > 1 ? 's' : ''} excluded from context
            </p>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="space-y-3">
            {uploadedDocuments.length > 0 ? (
              uploadedDocuments.map((doc) => (
                <Card
                  key={doc.id}
                  className={`transition-all ${
                    doc.includedInContext === false
                      ? 'opacity-50 bg-gray-100 dark:bg-gray-800'
                      : 'hover:shadow-md'
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {doc.name}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                            onClick={() => handleRemoveDocument(doc.id)}
                            title="Remove document"
                          >
                            <X className="w-4 h-4 mr-1" />
                            <span className="text-xs">Remove</span>
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {doc.autoLoaded && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            >
                              <Link2 className="w-3 h-3 mr-1" />
                              Linked
                            </Badge>
                          )}
                          {doc.embeddingModel && (
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                doc.embeddingModel === 'text-embedding-ada-002'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              {doc.embeddingModel === 'text-embedding-ada-002' ? '✓ OpenAI' : '⚠ Simulated'}
                            </Badge>
                          )}
                          {doc.chunkingStrategy && (
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                doc.chunkingStrategy === 'semantic'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              {doc.chunkingStrategy === 'semantic' ? '🧠 Semantic' : '📝 Simple'}
                            </Badge>
                          )}
                          {doc.fromCache && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              Cached
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500">
                            {(doc.size / 1024).toFixed(1)} KB
                            {doc.tokenCount > 0 && ` • ${doc.tokenCount} tokens`}
                            {doc.estimatedCost > 0 && ` • $${doc.estimatedCost.toFixed(4)}`}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-2 text-xs"
                            onClick={() => toggleDocumentInContext(doc.id)}
                            title={doc.includedInContext === false ? "Include in context" : "Exclude from context"}
                          >
                            {doc.includedInContext === false ? (
                              <>
                                <EyeOff className="w-3 h-3 mr-1" />
                                <span>Excluded</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3 mr-1" />
                                <span>Included</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-sm text-gray-500 mb-2">No documents uploaded</p>
                <p className="text-xs text-gray-400">Upload documents to start asking questions</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default AskAIDocumentSidebar;
