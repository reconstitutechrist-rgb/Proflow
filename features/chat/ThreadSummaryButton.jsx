import React, { useState } from 'react';
import { InvokeLLM } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  Target,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ListPlus, // Added new icon for 'create tasks'
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ThreadSummaryButton({
  messages,
  threadTopic,
  assignmentName,
  onActionItemsExtracted,
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState(null);
  const [isCreatingTasks, setIsCreatingTasks] = useState(false); // New state to track task creation
  const [tasksCreated, setTasksCreated] = useState(false); // New state to confirm tasks created

  const generateSummary = async () => {
    if (messages.length < 5) {
      setError('Need at least 5 messages to generate a meaningful summary');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setTasksCreated(false); // Reset tasksCreated state when a new summary is being generated

    try {
      // Format messages for AI analysis
      const chatContent = messages.map((msg) => ({
        author: msg.author_name || msg.author_email,
        timestamp: new Date(msg.created_date).toLocaleString(),
        content: msg.content,
        type: msg.message_type,
      }));

      const response = await InvokeLLM({
        prompt: `You are analyzing a team chat conversation to extract key information. This is from a ${threadTopic ? 'focused discussion thread' : 'general team chat'} about "${assignmentName}".

Chat Messages (${messages.length} total):
${JSON.stringify(chatContent, null, 2)}

Please analyze this conversation and provide:

1. **Executive Summary**: A concise 2-3 sentence overview of what was discussed
2. **Key Decisions**: Any decisions that were made, including who made them
3. **Action Items**: Specific tasks or actions that need to be taken, including who should do them (if mentioned) and any deadlines
4. **Important Topics**: Main themes or subjects that were discussed
5. **Participants Summary**: Who contributed most and their main points

Be specific and actionable. Extract exact quotes when relevant for decisions or action items.`,
        response_json_schema: {
          type: 'object',
          properties: {
            executive_summary: { type: 'string' },
            key_decisions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  decision: { type: 'string' },
                  decision_maker: { type: 'string' },
                  rationale: { type: 'string' },
                  timestamp: { type: 'string' },
                },
              },
            },
            action_items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  task: { type: 'string' },
                  assignee: { type: 'string' },
                  deadline: { type: 'string' },
                  priority: { type: 'string' },
                  context: { type: 'string' },
                },
              },
            },
            important_topics: {
              type: 'array',
              items: { type: 'string' },
            },
            participants_summary: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  contribution: { type: 'string' },
                  message_count: { type: 'number' },
                },
              },
            },
            confidence_score: { type: 'number' },
          },
        },
      });

      setSummary(response);
      setIsExpanded(true);

      // The onActionItemsExtracted call is now moved to handleCreateTasks,
      // to be triggered explicitly by the user clicking the "Create Tasks" button.
    } catch (err) {
      console.error('Error generating summary:', err);
      setError('Failed to generate summary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // New function to handle the creation of tasks from extracted action items
  const handleCreateTasks = async () => {
    if (!summary || !summary.action_items || summary.action_items.length === 0) {
      setError('No action items to create tasks from.');
      return;
    }

    setIsCreatingTasks(true);
    setError(null);

    try {
      if (onActionItemsExtracted) {
        await onActionItemsExtracted(summary.action_items); // Assuming onActionItemsExtracted might be an async operation
      }
      setTasksCreated(true); // Set confirmation state on success
    } catch (err) {
      console.error('Error creating tasks:', err);
      setError('Failed to create tasks. Please try again.');
      setTasksCreated(false); // Reset on error
    } finally {
      setIsCreatingTasks(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Button */}
      <Button
        onClick={generateSummary}
        disabled={isGenerating || messages.length < 5}
        variant="outline"
        className="w-full border-purple-200 hover:border-purple-300 hover:bg-purple-50"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing conversation...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Summarize Conversation ({messages.length} messages)
          </>
        )}
      </Button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary Display */}
      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <CardContent className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">AI Conversation Summary</h3>
                      <p className="text-xs text-gray-600">
                        Generated from {messages.length} messages
                        {summary.confidence_score &&
                          ` • ${Math.round(summary.confidence_score)}% confidence`}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Executive Summary */}
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    Executive Summary
                  </h4>
                  <p className="text-gray-700 leading-relaxed">{summary.executive_summary}</p>
                </div>

                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* Key Decisions */}
                    {summary.key_decisions?.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border border-green-100">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Key Decisions ({summary.key_decisions.length})
                        </h4>
                        <div className="space-y-3">
                          {summary.key_decisions.map((decision, idx) => (
                            <div key={idx} className="border-l-4 border-green-500 pl-3 py-2">
                              <p className="font-medium text-gray-900">{decision.decision}</p>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                <span className="font-medium">{decision.decision_maker}</span>
                                {decision.timestamp && <span>• {decision.timestamp}</span>}
                              </div>
                              {decision.rationale && (
                                <p className="text-sm text-gray-600 mt-1 italic">
                                  {decision.rationale}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Items - Now with Create Tasks Button */}
                    {summary.action_items?.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border border-orange-100">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            <Target className="w-4 h-4 text-orange-600" />
                            Action Items ({summary.action_items.length})
                          </h4>
                          {/* Button to create tasks from action items */}
                          <Button
                            onClick={handleCreateTasks}
                            disabled={isCreatingTasks || tasksCreated}
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 border-orange-200 hover:border-orange-300 hover:bg-orange-50"
                          >
                            {isCreatingTasks ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : tasksCreated ? (
                              <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
                            ) : (
                              <ListPlus className="w-4 h-4 mr-1" />
                            )}
                            {isCreatingTasks
                              ? 'Creating Tasks...'
                              : tasksCreated
                                ? 'Tasks Created!'
                                : 'Create Tasks'}
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {summary.action_items.map((item, idx) => (
                            <div key={idx} className="border-l-4 border-orange-500 pl-3 py-2">
                              <p className="font-medium text-gray-900">{item.task}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {item.assignee && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.assignee}
                                  </Badge>
                                )}
                                {item.deadline && (
                                  <Badge variant="outline" className="text-xs">
                                    Due: {item.deadline}
                                  </Badge>
                                )}
                                {item.priority && (
                                  <Badge
                                    className={`text-xs ${
                                      item.priority.toLowerCase() === 'high' ||
                                      item.priority.toLowerCase() === 'urgent'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {item.priority}
                                  </Badge>
                                )}
                              </div>
                              {item.context && (
                                <p className="text-sm text-gray-600 mt-1">{item.context}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Important Topics */}
                    {summary.important_topics?.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <h4 className="font-medium text-gray-900 mb-2">Important Topics</h4>
                        <div className="flex flex-wrap gap-2">
                          {summary.important_topics.map((topic, idx) => (
                            <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Participants Summary */}
                    {summary.participants_summary?.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border border-indigo-100">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600" />
                          Participants ({summary.participants_summary.length})
                        </h4>
                        <div className="space-y-2">
                          {summary.participants_summary.map((participant, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-indigo-700">
                                  {participant.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">
                                    {participant.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {participant.message_count} messages
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {participant.contribution}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
