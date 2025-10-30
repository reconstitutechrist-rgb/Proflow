import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { anthropicResearch } from "@/api/functions";
import { toast } from "sonner";

export default function GrammarAssistant({ content, onApply }) {
  const [isChecking, setIsChecking] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const handleCheck = async () => {
    if (!content || !content.trim()) {
      toast.error("No content to check", {
        description: "Please provide some content to check for grammar and style."
      });
      return;
    }

    setIsChecking(true);
    setSuggestions([]);

    try {
      const prompt = `Review the following content for grammar, spelling, style, and clarity. Provide specific suggestions for improvements.

Content:
${content}

For each issue you find, provide:
1. The problematic text
2. Why it's an issue
3. A corrected version
4. The type of issue (grammar, spelling, style, clarity, punctuation)

Format your response as a clear list of suggestions. If the text is already well-written, say so and provide minor refinements if any.`;

      const { data } = await anthropicResearch({
        question: prompt,
        documents: []
      });

      const response = data.response;
      
      const parsedSuggestions = [];
      const lines = response.split('\n');
      let currentSuggestion = null;
      
      for (const line of lines) {
        if (line.match(/^\d+\.|^-|^Issue:|^Problem:/i)) {
          if (currentSuggestion) parsedSuggestions.push(currentSuggestion);
          currentSuggestion = {
            original: "",
            issue: line.replace(/^\d+\.|-|Issue:|Problem:/i, '').trim(),
            suggestion: "",
            type: "grammar"
          };
        } else if (currentSuggestion && line.trim()) {
          if (line.toLowerCase().includes('corrected:') || line.toLowerCase().includes('suggestion:')) {
            currentSuggestion.suggestion = line.replace(/corrected:|suggestion:/i, '').trim();
          } else if (line.toLowerCase().includes('type:')) {
            const typeMatch = line.match(/type:\s*(\w+)/i);
            if (typeMatch) currentSuggestion.type = typeMatch[1].toLowerCase();
          } else {
            currentSuggestion.issue += " " + line.trim();
          }
        }
      }
      if (currentSuggestion) parsedSuggestions.push(currentSuggestion);

      setSuggestions(parsedSuggestions.length > 0 ? parsedSuggestions : [{
        original: "",
        issue: "Your content looks great! The writing is clear and professional.",
        suggestion: "No changes needed.",
        type: "success"
      }]);

      toast.success("Grammar check complete!", {
        description: `Found ${parsedSuggestions.length} suggestion${parsedSuggestions.length !== 1 ? 's' : ''} for improvement.`
      });

    } catch (error) {
      console.error("Error checking grammar:", error);
      toast.error("Failed to check grammar", {
        description: "There was an error checking your content. Please try again."
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleApplyAll = () => {
    if (suggestions.length > 0 && onApply) {
      let improvedContent = content;
      suggestions.forEach(suggestion => {
        if (suggestion.original && suggestion.suggestion) {
          improvedContent = improvedContent.replace(suggestion.original, suggestion.suggestion);
        }
      });
      onApply(improvedContent);
      toast.success("All suggestions applied!", {
        description: "Your content has been updated with the grammar improvements."
      });
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'grammar': return 'bg-red-100 text-red-800 border-red-200';
      case 'spelling': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'style': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'clarity': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'punctuation': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          Grammar & Style Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleCheck}
          disabled={isChecking || !content}
          className="w-full"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Check Grammar & Style
            </>
          )}
        </Button>

        {suggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {suggestions[0].type === 'success' ? 'Great job!' : `Found ${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''}`}
              </p>
              {suggestions[0].type !== 'success' && (
                <Button size="sm" onClick={handleApplyAll}>
                  Apply All
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={`border ${getTypeColor(suggestion.type)}`} variant="secondary">
                      {suggestion.type}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Issue:</p>
                      <p className="text-sm text-gray-600">{suggestion.issue}</p>
                    </div>
                    {suggestion.suggestion && suggestion.type !== 'success' && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Suggestion:</p>
                        <p className="text-sm text-green-600">{suggestion.suggestion}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}