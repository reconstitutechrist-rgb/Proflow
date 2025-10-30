import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Loader2, Copy, CheckCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { base44 } from "@/api/base44Client";

export default function ContentRewriter({ content, onRewriteComplete }) {
  const [rewriting, setRewriting] = useState(false);
  const [rewriteStyle, setRewriteStyle] = useState("professional");
  const [copied, setCopied] = useState(false);

  const { currentWorkspaceId } = useWorkspace();

  const handleRewrite = async () => {
    if (!content || !content.trim() || !currentWorkspaceId) {
      toast.error("No content to rewrite or workspace selected.");
      return;
    }

    try {
      setRewriting(true);

      const styleInstructions = {
        professional: "Make the content more professional and formal",
        casual: "Make the content more casual and conversational",
        technical: "Make the content more technical and detailed",
        simple: "Simplify the content for better readability",
        persuasive: "Make the content more persuasive and compelling"
      };

      const prompt = `Rewrite the following content with this style: ${styleInstructions[rewriteStyle]}

Original content:
${content}

Return ONLY the rewritten content, maintaining the same general structure and key information but with the requested style adjustments.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      toast.success("Content rewritten successfully");

      if (onRewriteComplete) {
        onRewriteComplete(response);
      }
    } catch (error) {
      console.error("Error rewriting content:", error);
      toast.error("Failed to rewrite content");
    } finally {
      setRewriting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Rewrite Style</Label>
        <Select value={rewriteStyle} onValueChange={setRewriteStyle}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="simple">Simple</SelectItem>
            <SelectItem value="persuasive">Persuasive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleRewrite}
        disabled={rewriting || !content?.trim() || !currentWorkspaceId}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {rewriting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Rewriting...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Rewrite Content
          </>
        )}
      </Button>
    </div>
  );
}