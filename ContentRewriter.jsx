import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Copy, Check, Loader2 } from "lucide-react";
import { anthropicResearch } from "@/api/functions";
import { toast } from "sonner";

export default function ContentRewriter({ content, onApply }) {
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewrittenContent, setRewrittenContent] = useState("");
  const [rewriteStyle, setRewriteStyle] = useState("concise");
  const [targetAudience, setTargetAudience] = useState("general");

  const handleRewrite = async () => {
    if (!content || !content.trim()) {
      toast.error("No content to rewrite", {
        description: "Please provide some content to rewrite."
      });
      return;
    }

    setIsRewriting(true);
    setRewrittenContent("");

    try {
      const styleInstructions = {
        concise: "Make this text more concise and to-the-point while preserving all key information.",
        formal: "Rewrite this in a more formal, professional tone suitable for business documents.",
        friendly: "Make this sound more friendly and approachable while maintaining professionalism.",
        persuasive: "Rewrite this to be more persuasive and compelling.",
        technical: "Make this more technical and detailed, adding relevant technical language.",
        simple: "Simplify this text to make it easier to understand for a general audience."
      };

      const audienceInstructions = {
        general: "for a general audience",
        executive: "for executive leadership and C-suite",
        technical: "for technical professionals and engineers",
        client: "for clients and external stakeholders",
        team: "for internal team members"
      };

      const prompt = `Rewrite the following content with these requirements:

Style: ${styleInstructions[rewriteStyle]}
Target Audience: ${audienceInstructions[targetAudience]}

Original Content:
${content}

Provide a rewritten version that is professional, clear, and tailored to the specified style and audience. Maintain the original structure and key points but improve the language, tone, and clarity.`;

      const { data } = await anthropicResearch({
        question: prompt,
        documents: []
      });

      setRewrittenContent(data.response);
      toast.success("Content rewritten successfully!", {
        description: "Review the rewritten version and apply if you're happy with it."
      });

    } catch (error) {
      console.error("Error rewriting content:", error);
      toast.error("Failed to rewrite content", {
        description: "There was an error rewriting your content. Please try again."
      });
    } finally {
      setIsRewriting(false);
    }
  };

  const handleCopy = () => {
    if (rewrittenContent) {
      navigator.clipboard.writeText(rewrittenContent);
      toast.success("Rewritten content copied!", {
        description: "The content has been copied to your clipboard."
      });
    }
  };

  const handleApply = () => {
    if (rewrittenContent && onApply) {
      onApply(rewrittenContent);
      toast.success("Content applied successfully!", {
        description: "The rewritten content has been applied to your document."
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-600" />
          Content Rewriter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Rewrite Style</Label>
            <Select value={rewriteStyle} onValueChange={setRewriteStyle}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">More Concise</SelectItem>
                <SelectItem value="formal">More Formal</SelectItem>
                <SelectItem value="friendly">More Friendly</SelectItem>
                <SelectItem value="persuasive">More Persuasive</SelectItem>
                <SelectItem value="technical">More Technical</SelectItem>
                <SelectItem value="simple">Simpler Language</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Target Audience</Label>
            <Select value={targetAudience} onValueChange={setTargetAudience}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Audience</SelectItem>
                <SelectItem value="executive">Executive Leadership</SelectItem>
                <SelectItem value="technical">Technical Professionals</SelectItem>
                <SelectItem value="client">Clients/External</SelectItem>
                <SelectItem value="team">Internal Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleRewrite}
          disabled={isRewriting || !content}
          className="w-full"
        >
          {isRewriting ? (
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

        {rewrittenContent && (
          <div className="space-y-3">
            <div>
              <Label>Rewritten Content</Label>
              <Textarea
                value={rewrittenContent}
                onChange={(e) => setRewrittenContent(e.target.value)}
                className="mt-2 min-h-48"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopy} className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button onClick={handleApply} className="flex-1 bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 mr-2" />
                Apply to Document
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}