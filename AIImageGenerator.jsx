import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Image as ImageIcon, RefreshCw, Plus, AlertTriangle, Info, BarChart3, TrendingUp, PieChart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIImageGenerator({ onInsertImage, documentContext }) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [generationCount, setGenerationCount] = useState(0);
  const [activeTab, setActiveTab] = useState("standard");

  // Debug logging
  useEffect(() => {
    console.log('=== AIImageGenerator Context Debug ===');
    console.log('Has Assignment:', !!documentContext?.selectedAssignment);
    console.log('Assignment Name:', documentContext?.selectedAssignment?.name);
    console.log('All Tasks Count:', documentContext?.allTasks?.length || 0);
    console.log('All Tasks:', documentContext?.allTasks);
    console.log('=====================================');
  }, [documentContext]);

  const styles = [
    { value: "realistic", label: "Photorealistic", description: "Life-like, high-detail photography" },
    { value: "illustration", label: "Illustration", description: "Hand-drawn or digital art style" },
    { value: "abstract", label: "Abstract", description: "Non-representational, conceptual art" },
    { value: "minimalist", label: "Minimalist", description: "Simple, clean, essential elements" },
    { value: "professional", label: "Professional/Corporate", description: "Business-appropriate imagery" },
    { value: "creative", label: "Creative/Artistic", description: "Expressive and imaginative" },
    { value: "infographic", label: "Infographic/Data Viz", description: "Chart, graph, or data visualization style" }
  ];

  // Extract context-aware information
  const contextInfo = useMemo(() => {
    const info = {
      hasAssignment: false,
      hasTask: false,
      assignmentName: null,
      assignmentDescription: null,
      taskTitle: null,
      taskDescription: null,
      taskStatus: null,
      taskPriority: null,
      allTasks: [],
      taskStats: null
    };

    if (documentContext?.selectedAssignment) {
      info.hasAssignment = true;
      info.assignmentName = documentContext.selectedAssignment.name;
      info.assignmentDescription = documentContext.selectedAssignment.description;
    }

    if (documentContext?.selectedTask) {
      info.hasTask = true;
      info.taskTitle = documentContext.selectedTask.title;
      info.taskDescription = documentContext.selectedTask.description;
      info.taskStatus = documentContext.selectedTask.status;
      info.taskPriority = documentContext.selectedTask.priority;
    }

    if (documentContext?.allTasks && documentContext.allTasks.length > 0) {
      info.allTasks = documentContext.allTasks;
      
      // Calculate task statistics
      const statusCounts = {};
      const priorityCounts = {};
      
      documentContext.allTasks.forEach(task => {
        const taskStatus = task.status || 'todo';
        const taskPriority = task.priority || 'medium';
        
        statusCounts[taskStatus] = (statusCounts[taskStatus] || 0) + 1;
        priorityCounts[taskPriority] = (priorityCounts[taskPriority] || 0) + 1;
      });

      info.taskStats = {
        total: documentContext.allTasks.length,
        byStatus: statusCounts,
        byPriority: priorityCounts,
        completed: statusCounts['completed'] || 0,
        inProgress: statusCounts['in_progress'] || 0,
        todo: statusCounts['todo'] || 0,
        review: statusCounts['review'] || 0
      };
      
      console.log('Task Stats Generated:', info.taskStats);
    }

    return info;
  }, [documentContext]);

  // Data visualization suggestions
  const dataVizSuggestions = useMemo(() => {
    const suggestions = [];

    if (contextInfo.taskStats && contextInfo.taskStats.total > 0) {
      console.log('Generating Data Viz Suggestions for', contextInfo.taskStats.total, 'tasks');
      
      // Task Status Breakdown - Pie Chart
      suggestions.push({
        type: "Task Status Breakdown",
        icon: PieChart,
        description: `${contextInfo.taskStats.total} total tasks`,
        data: contextInfo.taskStats.byStatus,
        prompt: `Create a professional pie chart showing task status distribution for "${contextInfo.assignmentName}". 

Data breakdown:
${Object.entries(contextInfo.taskStats.byStatus).map(([status, count]) => `- ${status.replace('_', ' ')}: ${count} tasks (${Math.round((count / contextInfo.taskStats.total) * 100)}%)`).join('\n')}

Requirements:
- Use clean, modern corporate colors: blue (#3B82F6) for todo, yellow (#F59E0B) for in progress, green (#10B981) for completed, purple (#8B5CF6) for review
- Label each section clearly with both the status name and the exact count
- Show percentage for each slice
- Include a title "Task Status Overview"
- Professional infographic style with clear typography
- Clean white or light gray background
- Add a subtle shadow for depth
- Make it suitable for business presentations`
      });

      // Priority Distribution - Bar Chart
      if (Object.keys(contextInfo.taskStats.byPriority).length > 0) {
        suggestions.push({
          type: "Priority Distribution",
          icon: BarChart3,
          description: `Across ${contextInfo.taskStats.total} tasks`,
          data: contextInfo.taskStats.byPriority,
          prompt: `Create a horizontal bar chart showing task priority distribution for "${contextInfo.assignmentName}".

Data breakdown:
${Object.entries(contextInfo.taskStats.byPriority).map(([priority, count]) => `- ${priority}: ${count} tasks (${Math.round((count / contextInfo.taskStats.total) * 100)}%)`).join('\n')}

Requirements:
- Use professional colors: red (#EF4444) for urgent, orange (#F97316) for high, yellow (#F59E0B) for medium, green (#10B981) for low
- Horizontal bars with clear labels on the left
- Show exact count values on or next to each bar
- Include light grid lines for easier reading
- Title: "Task Priority Breakdown"
- Professional infographic style
- Clean white or light gray background
- Modern, business-appropriate design`
        });
      }

      // Project Progress - Progress Ring
      if (contextInfo.taskStats.completed > 0) {
        const percentage = Math.round((contextInfo.taskStats.completed / contextInfo.taskStats.total) * 100);
        suggestions.push({
          type: "Project Progress",
          icon: TrendingUp,
          description: `${percentage}% complete`,
          data: {
            completed: contextInfo.taskStats.completed,
            total: contextInfo.taskStats.total,
            percentage: percentage
          },
          prompt: `Create a modern circular progress indicator for "${contextInfo.assignmentName}".

Progress data:
- Completed: ${contextInfo.taskStats.completed} tasks
- Total: ${contextInfo.taskStats.total} tasks
- Progress: ${percentage}%

Requirements:
- Large circular progress ring (donut chart style)
- Show ${percentage}% prominently in the center in large, bold typography
- Use a gradient from blue (#3B82F6) to green (#10B981) for the completed portion
- Light gray for the remaining portion
- Include small text below percentage: "${contextInfo.taskStats.completed} of ${contextInfo.taskStats.total} tasks"
- Title at top: "Project Progress"
- Clean, minimal design
- Professional corporate style
- White or light background
- Suitable for executive presentations`
        });
      }

      // Workflow Status - Horizontal Flow
      suggestions.push({
        type: "Workflow Status",
        icon: BarChart3,
        description: "Current workflow state",
        data: {
          todo: contextInfo.taskStats.todo,
          inProgress: contextInfo.taskStats.inProgress,
          review: contextInfo.taskStats.review || 0,
          completed: contextInfo.taskStats.completed
        },
        prompt: `Create a horizontal workflow diagram showing the current state of "${contextInfo.assignmentName}".

Workflow data:
- To Do: ${contextInfo.taskStats.todo} tasks
- In Progress: ${contextInfo.taskStats.inProgress} tasks
- Review: ${contextInfo.taskStats.review || 0} tasks
- Completed: ${contextInfo.taskStats.completed} tasks

Requirements:
- Horizontal flow from left to right
- 4 connected stages/boxes with arrows between them
- Stage 1 (To Do): ${contextInfo.taskStats.todo} tasks - gray color (#6B7280)
- Stage 2 (In Progress): ${contextInfo.taskStats.inProgress} tasks - blue color (#3B82F6)
- Stage 3 (Review): ${contextInfo.taskStats.review || 0} tasks - purple color (#8B5CF6)
- Stage 4 (Completed): ${contextInfo.taskStats.completed} tasks - green color (#10B981)
- Show count inside each box in large numbers
- Stage names below or above boxes
- Arrows connecting the stages
- Title: "Project Workflow Status"
- Professional infographic style
- Clean design suitable for business presentations`
      });

      console.log('Generated', suggestions.length, 'data viz suggestions');
    } else {
      console.log('No task stats available - no suggestions generated');
    }

    return suggestions;
  }, [contextInfo]);

  // Dynamic quick prompts based on context
  const quickPrompts = useMemo(() => {
    const prompts = {
      standard: [
        {
          category: "Business",
          prompts: [
            "Professional team meeting in modern office",
            "Business handshake, corporate setting",
            "Data analytics dashboard on screen",
            "Product launch presentation"
          ]
        },
        {
          category: "Technology",
          prompts: [
            "Futuristic cityscape with technology",
            "Cloud computing network visualization",
            "AI neural network diagram",
            "Modern workspace with laptops"
          ]
        },
        {
          category: "Abstract",
          prompts: [
            "Growth and progress concept",
            "Innovation and creativity visualization",
            "Success and achievement metaphor",
            "Teamwork and collaboration"
          ]
        }
      ],
      contextual: []
    };

    // Add context-aware prompts
    if (contextInfo.hasAssignment) {
      prompts.contextual.push({
        category: `For: ${contextInfo.assignmentName}`,
        prompts: [
          `Team working on ${contextInfo.assignmentName}`,
          `Visual concept representing ${contextInfo.assignmentName}`,
          `Professional illustration of ${contextInfo.assignmentName} success`,
          `Modern workspace for ${contextInfo.assignmentName} project`
        ]
      });
    }

    if (contextInfo.hasTask) {
      prompts.contextual.push({
        category: `For Task: ${contextInfo.taskTitle}`,
        prompts: [
          `Visual representation of ${contextInfo.taskTitle}`,
          `${contextInfo.taskPriority} priority task illustration`,
          `Professional diagram for ${contextInfo.taskTitle}`,
          `Abstract concept of ${contextInfo.taskTitle}`
        ]
      });
    }

    return prompts;
  }, [contextInfo]);

  const currentStyle = styles.find(s => s.value === style);

  const handleGenerate = async (customPrompt = null, isDataViz = false) => {
    const finalPrompt = customPrompt || prompt;
    
    if (!finalPrompt.trim()) {
      toast.error("Please enter an image description");
      return;
    }

    // Warn about costs after 5 generations
    if (generationCount >= 5) {
      const confirm = window.confirm(
        `You've generated ${generationCount} images in this session.\n\n` +
        `Image generation can be costly. Continue?`
      );
      if (!confirm) return;
    }

    // Warn about data visualization accuracy and time
    if (isDataViz) {
      toast.info("Generating data visualization. This may take 10-15 seconds.", {
        duration: 5000
      });
    }

    try {
      setIsGenerating(true);

      // Build context-enriched prompt
      let enhancedPrompt = finalPrompt;

      // For data viz, the prompt is already comprehensive from the suggestion
      // For standard images, add context if available
      if (!isDataViz && !customPrompt) {
        if (contextInfo.hasAssignment && !finalPrompt.toLowerCase().includes(contextInfo.assignmentName.toLowerCase())) {
          enhancedPrompt = `${finalPrompt} (context: for ${contextInfo.assignmentName} project)`;
        }
        
        if (contextInfo.hasTask && !finalPrompt.toLowerCase().includes(contextInfo.taskTitle.toLowerCase())) {
          enhancedPrompt = `${finalPrompt} (related to task: ${contextInfo.taskTitle})`;
        }
      }

      // Add style - for data viz use infographic style
      const finalStyle = isDataViz ? "infographic" : style;
      enhancedPrompt = `${enhancedPrompt}, ${finalStyle} style, high quality, professional`;

      console.log('Generating image with prompt:', enhancedPrompt);

      const response = await base44.integrations.Core.GenerateImage({
        prompt: enhancedPrompt
      });

      const newImage = {
        id: Date.now(),
        url: response.url,
        prompt: finalPrompt,
        style: finalStyle,
        timestamp: new Date().toISOString(),
        isDataViz: isDataViz
      };

      setGeneratedImages([newImage, ...generatedImages]);
      setSelectedImage(newImage);
      setGenerationCount(prev => prev + 1);
      toast.success("Image generated successfully");

    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = (image) => {
    onInsertImage(image.url);
    toast.success("Image inserted into document");
  };

  const handleVariation = async (image) => {
    setPrompt(image.prompt);
    setStyle(image.style);
    await handleGenerate(image.prompt, image.isDataViz);
  };

  const handleQuickPrompt = (promptText) => {
    setPrompt(promptText);
  };

  const handleDataVizGenerate = (suggestion) => {
    console.log('Generating data viz:', suggestion.type);
    handleGenerate(suggestion.prompt, true);
  };

  const hasDataVizData = contextInfo.taskStats && contextInfo.taskStats.total > 0;

  return (
    <div className="space-y-4">
      {/* Cost Warning */}
      {generationCount >= 3 && (
        <Alert variant="warning" className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-xs text-yellow-900 dark:text-yellow-100">
            {generationCount} images generated this session. Image generation incurs costs.
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Context Info */}
      {(contextInfo.hasAssignment || contextInfo.hasTask) && (
        <Alert className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
          <Info className="w-4 h-4 text-indigo-600" />
          <AlertDescription className="text-xs text-indigo-900 dark:text-indigo-100">
            <strong>Context:</strong>
            {contextInfo.hasAssignment && ` ${contextInfo.assignmentName}`}
            {contextInfo.hasTask && ` • Task: ${contextInfo.taskTitle}`}
            {contextInfo.taskStats && ` • ${contextInfo.taskStats.total} tasks (${contextInfo.taskStats.completed} completed)`}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for Standard vs Data Viz */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">
            <ImageIcon className="w-4 h-4 mr-2" />
            Standard Images
          </TabsTrigger>
          <TabsTrigger 
            value="dataviz" 
            disabled={!hasDataVizData}
            title={!hasDataVizData ? 'Link this document to an assignment with tasks to unlock data visualizations' : 'View data visualization options'}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Data Viz
            {hasDataVizData && (
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 h-4">
                {dataVizSuggestions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-4 mt-4">
          {/* Style Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Style</label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {styles.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    <div>
                      <div className="font-medium">{s.label}</div>
                      <div className="text-xs text-gray-500">{s.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Prompts with Context-Aware Section */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Prompts</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
              {/* Context-aware prompts first */}
              {quickPrompts.contextual.length > 0 && (
                <>
                  {quickPrompts.contextual.map((category, idx) => (
                    <div key={`contextual-${idx}`}>
                      <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1 px-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {category.category}
                      </div>
                      {category.prompts.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleQuickPrompt(p)}
                          className="w-full text-left text-xs px-2 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  ))}
                  <div className="border-t my-2"></div>
                </>
              )}

              {/* Standard prompts */}
              {quickPrompts.standard.map((category, idx) => (
                <div key={`standard-${idx}`}>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 px-2">
                    {category.category}
                  </div>
                  {category.prompts.map((p, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => handleQuickPrompt(p)}
                      className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Image Description */}
          <div>
            <label className="text-sm font-medium mb-2 block">Image Description</label>
            <Textarea
              placeholder="E.g., 'A modern office workspace with plants and natural lighting' or 'Abstract diagram showing data flow in a cloud system'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Current Style Info */}
          <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
              <strong>Selected Style:</strong> {currentStyle.label} - {currentStyle.description}
            </AlertDescription>
          </Alert>

          {/* Generate Button */}
          <Button
            onClick={() => handleGenerate()}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Image...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Image
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="dataviz" className="space-y-4 mt-4">
          <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-900 dark:text-amber-100">
              <strong>Note:</strong> AI-generated charts are visual interpretations. For precise data visualizations, consider using dedicated charting tools.
            </AlertDescription>
          </Alert>

          <div>
            <label className="text-sm font-medium mb-2 block">Available Data Visualizations</label>
            {dataVizSuggestions.length > 0 ? (
              <div className="space-y-3">
                {dataVizSuggestions.map((suggestion, idx) => (
                  <Card key={idx} className="border hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex-shrink-0">
                          <suggestion.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm">{suggestion.type}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {suggestion.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {Object.entries(suggestion.data).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key.replace('_', ' ')}: {typeof value === 'object' ? JSON.stringify(value) : value}
                              </Badge>
                            ))}
                          </div>
                          <Button
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() => handleDataVizGenerate(suggestion)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 mr-2" />
                                Generate This Chart
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed rounded-lg">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">No data available for visualization</p>
                <p className="text-xs mt-1">
                  {contextInfo.hasAssignment 
                    ? `This assignment "${contextInfo.assignmentName}" doesn't have any tasks yet. Add tasks to see chart options.` 
                    : "Link this document to an assignment with tasks to see chart options."}
                </p>
                {!contextInfo.hasAssignment && (
                  <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">
                    💡 Use the "Link to Assignment" dropdown above to get started
                  </p>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Generated Images Gallery */}
      {generatedImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Generated Images</label>
            <Badge variant="outline" className="text-xs">
              {generatedImages.length} total
            </Badge>
          </div>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {generatedImages.map((image) => (
              <Card 
                key={image.id}
                className={`cursor-pointer transition-all ${
                  selectedImage?.id === image.id ? 'ring-2 ring-indigo-500' : ''
                }`}
                onClick={() => setSelectedImage(image)}
              >
                <CardContent className="pt-4 space-y-3">
                  <img 
                    src={image.url} 
                    alt={image.prompt}
                    className="w-full h-48 object-cover rounded-lg"
                    loading="lazy"
                  />
                  
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {image.prompt}
                    </p>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {styles.find(s => s.value === image.style)?.label}
                      </Badge>
                      {image.isDataViz && (
                        <Badge className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                          <BarChart3 className="w-3 h-3 mr-1" />
                          Data Viz
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs text-gray-500">
                        {new Date(image.timestamp).toLocaleTimeString()}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVariation(image);
                        }}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Variation
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsert(image);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Insert
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {generatedImages.length === 0 && !isGenerating && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No images generated yet</p>
          <p className="text-xs mt-1">
            {hasDataVizData 
              ? "Generate standard images or data visualizations"
              : "Describe the image you want and click generate"
            }
          </p>
        </div>
      )}
    </div>
  );
}