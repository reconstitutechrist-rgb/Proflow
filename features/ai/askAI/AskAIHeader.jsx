import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Brain,
  MessageSquare,
  Plus,
  Save,
  Trash2,
  FolderOpen,
  History,
  Search,
  DollarSign,
  Clock,
  ArrowUpDown,
  Download,
  FileDown,
  FileText,
  Info,
  Layers,
} from "lucide-react";
import ContextualTooltip from "@/components/ContextualTooltip";

export function AskAIHeader({
  useRAG,
  setUseRAG,
  isProcessing,
  isProcessingEmbeddings,
  docsWithRealEmbeddings,
  totalEmbeddingCost,
  messages,
  sessions,
  sortedSessions,
  loading,
  loadingSessions,
  isSessionsSheetOpen,
  setIsSessionsSheetOpen,
  sessionSearchQuery,
  setSessionSearchQuery,
  sessionSortBy,
  setSessionSortBy,
  currentSession,
  sessionModified,
  uploadedDocuments,
  setDeleteConfirmSession,
  handleLoadSession,
  setIsSaveDialogOpen,
  setSessionName,
  setSessionDescription,
  handleNewConversation,
  setIsExportDialogOpen,
  setExportFormat,
  setShowSessionTemplates,
  setShowKeyboardShortcuts,
}) {
  return (
    <div className="flex items-center justify-between p-4 pb-0 flex-shrink-0">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          Ask AI
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Upload documents and have intelligent conversations powered by{' '}
          {useRAG ? (
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              Advanced RAG with Semantic Chunking
            </span>
          ) : (
            <span>full document context</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => setShowSessionTemplates(true)}
          className="rounded-xl"
          title="Choose from pre-configured templates"
        >
          <Layers className="w-4 h-4 mr-2" />
          Templates
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowKeyboardShortcuts(true)}
          className="rounded-xl"
          title="Show keyboard shortcuts (Press ?)"
        >
          <Info className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border" id="rag-toggle">
          <ContextualTooltip
            content="Enable Retrieval-Augmented Generation to search through your documents for relevant context before answering questions"
            position="bottom"
          >
            <div className="flex items-center gap-3">
              <Brain className={`w-5 h-5 ${useRAG ? 'text-blue-600' : 'text-gray-400'}`} />
              <Label htmlFor="rag-switch" className="text-sm font-medium cursor-pointer">
                Smart RAG
              </Label>
            </div>
          </ContextualTooltip>
          <Switch
            id="rag-switch"
            checked={useRAG}
            onCheckedChange={setUseRAG}
            disabled={isProcessing || isProcessingEmbeddings}
          />
          {useRAG && docsWithRealEmbeddings.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              OpenAI + Semantic
            </Badge>
          )}
          {totalEmbeddingCost > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <DollarSign className="w-3 h-3" />
              <span>${totalEmbeddingCost.toFixed(4)}</span>
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => { setExportFormat('markdown'); setIsExportDialogOpen(true); }}>
                <FileDown className="w-4 h-4 mr-2" />
                Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setExportFormat('pdf'); setIsExportDialogOpen(true); }}>
                <FileDown className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Sheet open={isSessionsSheetOpen} onOpenChange={setIsSessionsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="rounded-xl">
              <History className="w-4 h-4 mr-2" />
              Sessions ({sessions.length})
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[500px] sm:w-[600px] flex flex-col p-6">
            <SheetHeader className="mb-4">
              <SheetTitle>Saved Sessions</SheetTitle>
            </SheetHeader>

            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search sessions..."
                  value={sessionSearchQuery}
                  onChange={(e) => setSessionSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={sessionSortBy} onValueChange={setSessionSortBy}>
                <SelectTrigger>
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="messages">Most Messages</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="flex-1 pr-2">
              {loading || loadingSessions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : sortedSessions.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">
                    {sessionSearchQuery ? "No sessions found" : "No saved sessions yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        currentSession?.id === session.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => handleLoadSession(session)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-gray-900 dark:text-white">{session.name}</p>
                          {session.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmSession(session);
                          }}
                          className="flex-shrink-0 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>{session.message_count || 0} messages</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>{session.documents?.length || 0} docs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(session.last_activity || session.updated_date || session.created_date).toLocaleDateString()}</span>
                        </div>
                        {session.total_embedding_cost > 0 && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>${session.total_embedding_cost.toFixed(4)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {(messages.length > 0 || uploadedDocuments.length > 0) && (
          <Button
            variant={sessionModified ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (currentSession) {
                setSessionName(currentSession.name);
                setSessionDescription(currentSession.description || "");
              } else {
                setSessionName("");
                setSessionDescription("");
              }
              setIsSaveDialogOpen(true);
            }}
            className="rounded-xl"
          >
            <Save className="w-4 h-4 mr-2" />
            {currentSession ? "Update" : "Save"}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleNewConversation}
          className="rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          New
        </Button>
      </div>
    </div>
  );
}

export default AskAIHeader;
