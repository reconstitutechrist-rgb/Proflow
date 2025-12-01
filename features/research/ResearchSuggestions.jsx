import React from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  FileText,
  AlertTriangle,
  BookOpen,
  Scale,
  Clock,
  MessageSquare,
  Zap,
  Bot
} from "lucide-react";
import { createPageUrl } from "@/lib/utils";


export default function ResearchSuggestions({ assignment, onResearchStart }) {
  const navigate = useNavigate();

  // Dynamic suggestions based on actual assignment context
  const generateContextualSuggestions = () => {
    const projectType = assignment?.project_type || 'general';
    const location = assignment?.location || 'your area';
    const industry = assignment?.industry || 'your industry';
    
    return {
      immediate: [
        {
          icon: Shield,
          category: "Critical Compliance",
          questions: [
            `What specific licenses are required for a ${projectType} business in ${location}?`,
            `What compliance deadlines am I missing for ${industry} projects?`,
            `What are the penalty risks for non-compliance in ${industry}?`
          ],
          urgency: "high",
          color: "border-red-200 bg-red-50"
        },
        {
          icon: AlertTriangle,
          category: "Risk Assessment",
          questions: [
            `What legal risks should I be aware of for ${projectType} projects?`,
            `What insurance requirements apply to my ${industry} business?`,
            `What liability considerations exist for ${projectType} operations?`
          ],
          urgency: "high",
          color: "border-orange-200 bg-orange-50"
        }
      ],
      planning: [
        {
          icon: FileText,
          category: "Required Documentation",
          questions: [
            `What contracts and agreements do I need for ${projectType} projects?`,
            `What documentation is required for ${industry} compliance audits?`,
            `What records must I maintain for ${projectType} operations?`
          ],
          urgency: "medium",
          color: "border-blue-200 bg-blue-50"
        },
        {
          icon: Scale,
          category: "Legal Framework",
          questions: [
            `What employment laws apply to my ${industry} team?`,
            `What intellectual property protections should I implement?`,
            `What data privacy regulations affect ${projectType} projects?`
          ],
          urgency: "medium",
          color: "border-purple-200 bg-purple-50"
        }
      ],
      optimization: [
        {
          icon: BookOpen,
          category: "Industry Standards",
          questions: [
            `What industry certifications would benefit my ${projectType} business?`,
            `What best practices are standard in ${industry}?`,
            `What quality standards should I implement?`
          ],
          urgency: "low",
          color: "border-green-200 bg-green-50"
        }
      ]
    };
  };

  const suggestions = generateContextualSuggestions();

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'high':
        return <Badge className="bg-red-500 text-white text-xs">Urgent</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white text-xs">Important</Badge>;
      case 'low':
        return <Badge className="bg-green-500 text-white text-xs">Optimization</Badge>;
      default:
        return null;
    }
  };

  const handleCreateDocument = (suggestion) => {
    const query = new URLSearchParams({
      fromResearch: 'true',
      assignmentId: assignment?.id || '',
      assignmentName: assignment?.name || 'General Research',
      researchQuestion: suggestion.question,
      suggestedDocTitle: suggestion.document_title,
      recommendedActions: JSON.stringify([suggestion.question])
    }).toString();

    navigate(`${createPageUrl("DocumentStudio")}?${query}`);
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Smart Research Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <Bot className="w-12 h-12 mx-auto text-blue-600 mb-3" />
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">AI-Powered Research</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Click any question below for instant AI research, or ask your own questions in the chat.
            </p>
            <Badge className="bg-blue-600 text-white">
              <MessageSquare className="w-3 h-3 mr-1" />
              Instant Answers
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Immediate Priority Questions */}
      <Card className="border-l-4 border-l-red-500 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Immediate Priority
            <Badge className="bg-red-500 text-white">Action Required</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.immediate.map((category, categoryIndex) => (
            <div key={categoryIndex} className={`border rounded-lg p-4 ${category.color} dark:bg-opacity-20`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <category.icon className="w-4 h-4" />
                  {category.category}
                </h4>
                {getUrgencyBadge(category.urgency)}
              </div>
              <div className="space-y-2">
                {category.questions.map((question, questionIndex) => (
                  <Button
                    key={questionIndex}
                    variant="outline"
                    onClick={() => onResearchStart(question)}
                    className="w-full justify-start text-left h-auto p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3 h-3 shrink-0 text-blue-500" />
                      <span className="text-wrap text-sm text-gray-700 dark:text-gray-300">{question}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Planning Questions */}
      <Card className="border-l-4 border-l-blue-500 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Clock className="w-5 h-5" />
            Planning & Preparation
            <Badge className="bg-blue-500 text-white">Important</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.planning.map((category, categoryIndex) => (
            <div key={categoryIndex} className={`border rounded-lg p-4 ${category.color} dark:bg-opacity-20`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <category.icon className="w-4 h-4" />
                  {category.category}
                </h4>
                {getUrgencyBadge(category.urgency)}
              </div>
              <div className="space-y-2">
                {category.questions.map((question, questionIndex) => (
                  <Button
                    key={questionIndex}
                    variant="outline"
                    onClick={() => onResearchStart(question)}
                    className="w-full justify-start text-left h-auto p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3 h-3 shrink-0 text-blue-500" />
                      <span className="text-wrap text-sm text-gray-700 dark:text-gray-300">{question}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Optimization Questions */}
      <Card className="border-l-4 border-l-green-500 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <BookOpen className="w-5 h-5" />
            Growth & Optimization
            <Badge className="bg-green-500 text-white">Enhancement</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.optimization.map((category, categoryIndex) => (
            <div key={categoryIndex} className={`border rounded-lg p-4 ${category.color} dark:bg-opacity-20`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <category.icon className="w-4 h-4" />
                  {category.category}
                </h4>
                {getUrgencyBadge(category.urgency)}
              </div>
              <div className="space-y-2">
                {category.questions.map((question, questionIndex) => (
                  <Button
                    key={questionIndex}
                    variant="outline"
                    onClick={() => onResearchStart(question)}
                    className="w-full justify-start text-left h-auto p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3 h-3 shrink-0 text-blue-500" />
                      <span className="text-wrap text-sm text-gray-700 dark:text-gray-300">{question}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
