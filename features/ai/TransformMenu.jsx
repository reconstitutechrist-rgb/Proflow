import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  FileText,
  PenTool,
  Minimize2,
  Briefcase,
  MessageCircle,
  BookOpen,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

// Quick transform actions
const quickTransforms = [
  { id: 'summarize', label: 'Summarize', icon: FileText, description: 'Create a concise summary' },
  { id: 'simplify', label: 'Simplify', icon: Minimize2, description: 'Make it easier to understand' },
  { id: 'formal', label: 'Make Formal', icon: Briefcase, description: 'Professional business tone' },
  { id: 'friendly', label: 'Make Friendly', icon: MessageCircle, description: 'Conversational and approachable' },
  { id: 'technical', label: 'Make Technical', icon: BookOpen, description: 'Add technical detail' },
];

// Audience options for custom transform
const audiences = [
  { id: 'general', label: 'General Audience' },
  { id: 'executives', label: 'Executives' },
  { id: 'technical', label: 'Technical Team' },
  { id: 'clients', label: 'Clients' },
  { id: 'students', label: 'Students' },
];

// Style options for custom transform
const styles = [
  { id: 'concise', label: 'Concise' },
  { id: 'detailed', label: 'Detailed' },
  { id: 'formal', label: 'Formal' },
  { id: 'casual', label: 'Casual' },
  { id: 'persuasive', label: 'Persuasive' },
];

export default function TransformMenu({
  content,
  onTransform,
  disabled = false,
  variant = 'outline',
  size = 'default',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transformResult, setTransformResult] = useState('');
  const [lastTransformType, setLastTransformType] = useState('');
  const [copied, setCopied] = useState(false);

  // Custom transform options
  const [customAudience, setCustomAudience] = useState('general');
  const [customStyle, setCustomStyle] = useState('concise');
  const [customInstructions, setCustomInstructions] = useState('');

  const handleQuickTransform = async (transformType) => {
    if (!content || content.trim().length === 0) {
      toast.error('Please provide content to transform');
      return;
    }

    setIsOpen(false);
    setIsProcessing(true);
    setLastTransformType(transformType);

    try {
      let prompt = '';
      switch (transformType) {
        case 'summarize':
          prompt = `Please create a concise summary of the following content. Include key points and main takeaways:\n\n${content}`;
          break;
        case 'simplify':
          prompt = `Please rewrite the following content in simpler, easier to understand language. Use short sentences and avoid jargon:\n\n${content}`;
          break;
        case 'formal':
          prompt = `Please rewrite the following content in a formal, professional business tone suitable for executive communication:\n\n${content}`;
          break;
        case 'friendly':
          prompt = `Please rewrite the following content in a friendly, conversational tone that is approachable and engaging:\n\n${content}`;
          break;
        case 'technical':
          prompt = `Please rewrite the following content with more technical detail and precision, suitable for a technical audience:\n\n${content}`;
          break;
        default:
          prompt = content;
      }

      // Call the transform handler
      if (onTransform) {
        const result = await onTransform(prompt, transformType);
        setTransformResult(result || '');
        setIsResultDialogOpen(true);
      }
    } catch (error) {
      console.error('Transform error:', error);
      toast.error('Failed to transform content');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomTransform = async () => {
    if (!content || content.trim().length === 0) {
      toast.error('Please provide content to transform');
      return;
    }

    setIsCustomDialogOpen(false);
    setIsProcessing(true);
    setLastTransformType('custom');

    try {
      const audienceLabel = audiences.find(a => a.id === customAudience)?.label || customAudience;
      const styleLabel = styles.find(s => s.id === customStyle)?.label || customStyle;

      let prompt = `Please rewrite the following content for a ${audienceLabel} audience in a ${styleLabel} style.`;

      if (customInstructions) {
        prompt += ` Additional instructions: ${customInstructions}`;
      }

      prompt += `\n\nOriginal content:\n${content}`;

      if (onTransform) {
        const result = await onTransform(prompt, 'custom');
        setTransformResult(result || '');
        setIsResultDialogOpen(true);
      }
    } catch (error) {
      console.error('Transform error:', error);
      toast.error('Failed to transform content');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transformResult);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onTransform) {
      // This could be expanded to actually replace the original content
      toast.success('Transform applied');
    }
    setIsResultDialogOpen(false);
  };

  const handleRetry = () => {
    setIsResultDialogOpen(false);
    if (lastTransformType === 'custom') {
      setIsCustomDialogOpen(true);
    } else {
      handleQuickTransform(lastTransformType);
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={disabled || isProcessing}
            className={className}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Transform
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-gray-500 uppercase">
            Quick Transforms
          </DropdownMenuLabel>
          {quickTransforms.map((transform) => {
            const Icon = transform.icon;
            return (
              <DropdownMenuItem
                key={transform.id}
                onClick={() => handleQuickTransform(transform.id)}
                className="flex items-start gap-3 p-3 cursor-pointer"
              >
                <Icon className="w-4 h-4 mt-0.5 text-purple-600" />
                <div>
                  <p className="font-medium text-sm">{transform.label}</p>
                  <p className="text-xs text-gray-500">{transform.description}</p>
                </div>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              setIsCustomDialogOpen(true);
            }}
            className="flex items-start gap-3 p-3 cursor-pointer"
          >
            <Users className="w-4 h-4 mt-0.5 text-indigo-600" />
            <div>
              <p className="font-medium text-sm">Custom Transform</p>
              <p className="text-xs text-gray-500">Choose audience & style</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Transform Dialog */}
      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-purple-600" />
              Custom Transform
            </DialogTitle>
            <DialogDescription>
              Customize how you want to transform your content
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="audience">Target Audience</Label>
              <Select value={customAudience} onValueChange={setCustomAudience}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  {audiences.map((audience) => (
                    <SelectItem key={audience.id} value={audience.id}>
                      {audience.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="style">Writing Style</Label>
              <Select value={customStyle} onValueChange={setCustomStyle}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  {styles.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                placeholder="Any specific requirements..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomTransform}>
              <Sparkles className="w-4 h-4 mr-2" />
              Transform
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Transformed Content
            </DialogTitle>
            <DialogDescription>
              Review the transformed content below
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] mt-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
              <p className="whitespace-pre-wrap text-sm">{transformResult}</p>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleRetry} className="w-full sm:w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Different Style
            </Button>
            <Button variant="outline" onClick={handleCopy} className="w-full sm:w-auto">
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
            <Button onClick={handleApply} className="w-full sm:w-auto">
              Apply Transform
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
