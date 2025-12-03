import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Square,
  ArrowRight,
  Pencil,
  Type,
  Undo2,
  Trash2
} from 'lucide-react';

const TOOLS = {
  RECTANGLE: 'rectangle',
  ARROW: 'arrow',
  FREEHAND: 'freehand',
  TEXT: 'text'
};

const COLORS = {
  RED: '#ef4444',
  BLUE: '#3b82f6',
  GREEN: '#22c55e',
  YELLOW: '#eab308'
};

/**
 * Canvas-based screenshot annotation tool
 */
export function ScreenshotAnnotator({
  screenshotDataUrl,
  annotations,
  onAnnotationsChange,
  onClose
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [tool, setTool] = useState(TOOLS.RECTANGLE);
  const [color, setColor] = useState(COLORS.RED);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef(null);

  // Load and scale image
  useEffect(() => {
    if (!screenshotDataUrl || !containerRef.current) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;

      // Calculate scaled size to fit container
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight - 60; // Leave room for toolbar

      const scale = Math.min(
        containerWidth / img.width,
        containerHeight / img.height,
        1 // Don't scale up
      );

      setCanvasSize({
        width: img.width * scale,
        height: img.height * scale
      });
      setImageLoaded(true);
    };
    img.src = screenshotDataUrl;
  }, [screenshotDataUrl]);

  // Draw everything on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');

    // Clear and draw background image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw all saved annotations
    annotations.forEach(ann => drawAnnotation(ctx, ann));

    // Draw current annotation being drawn
    if (currentAnnotation) {
      drawAnnotation(ctx, currentAnnotation);
    }
  }, [annotations, currentAnnotation, imageLoaded]);

  // Redraw when dependencies change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Draw a single annotation
  const drawAnnotation = (ctx, ann) => {
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (ann.type) {
      case TOOLS.RECTANGLE:
        ctx.beginPath();
        ctx.rect(ann.startX, ann.startY, ann.endX - ann.startX, ann.endY - ann.startY);
        ctx.stroke();
        break;

      case TOOLS.ARROW:
        drawArrow(ctx, ann.startX, ann.startY, ann.endX, ann.endY);
        break;

      case TOOLS.FREEHAND:
        if (ann.points && ann.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          ann.points.forEach(point => ctx.lineTo(point.x, point.y));
          ctx.stroke();
        }
        break;

      case TOOLS.TEXT:
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillStyle = ann.color;
        // Draw text background
        const textMetrics = ctx.measureText(ann.text || 'Text');
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(
          ann.startX - 4,
          ann.startY - 16,
          textMetrics.width + 8,
          22
        );
        ctx.fillStyle = ann.color;
        ctx.fillText(ann.text || 'Text', ann.startX, ann.startY);
        break;
    }
  };

  // Draw arrow with head
  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  // Get mouse position relative to canvas
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    setIsDrawing(true);

    if (tool === TOOLS.TEXT) {
      const text = prompt('Enter text:');
      if (text) {
        const newAnnotation = {
          type: TOOLS.TEXT,
          startX: pos.x,
          startY: pos.y,
          text,
          color
        };
        onAnnotationsChange([...annotations, newAnnotation]);
      }
      setIsDrawing(false);
      return;
    }

    setCurrentAnnotation({
      type: tool,
      startX: pos.x,
      startY: pos.y,
      endX: pos.x,
      endY: pos.y,
      points: tool === TOOLS.FREEHAND ? [pos] : undefined,
      color
    });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentAnnotation) return;

    const pos = getMousePos(e);

    if (tool === TOOLS.FREEHAND) {
      setCurrentAnnotation(prev => ({
        ...prev,
        points: [...prev.points, pos]
      }));
    } else {
      setCurrentAnnotation(prev => ({
        ...prev,
        endX: pos.x,
        endY: pos.y
      }));
    }
  };

  const handleMouseUp = () => {
    if (currentAnnotation) {
      onAnnotationsChange([...annotations, currentAnnotation]);
    }
    setIsDrawing(false);
    setCurrentAnnotation(null);
  };

  const handleUndo = () => {
    onAnnotationsChange(annotations.slice(0, -1));
  };

  const handleClear = () => {
    onAnnotationsChange([]);
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-gray-900"
      data-bug-reporter="annotator"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-gray-800 border-b border-gray-700">
        {/* Tool selection */}
        <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
          <Button
            variant={tool === TOOLS.RECTANGLE ? 'default' : 'ghost'}
            size="icon"
            className="w-8 h-8"
            onClick={() => setTool(TOOLS.RECTANGLE)}
            title="Rectangle"
          >
            <Square className="w-4 h-4" />
          </Button>
          <Button
            variant={tool === TOOLS.ARROW ? 'default' : 'ghost'}
            size="icon"
            className="w-8 h-8"
            onClick={() => setTool(TOOLS.ARROW)}
            title="Arrow"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant={tool === TOOLS.FREEHAND ? 'default' : 'ghost'}
            size="icon"
            className="w-8 h-8"
            onClick={() => setTool(TOOLS.FREEHAND)}
            title="Freehand"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant={tool === TOOLS.TEXT ? 'default' : 'ghost'}
            size="icon"
            className="w-8 h-8"
            onClick={() => setTool(TOOLS.TEXT)}
            title="Text"
          >
            <Type className="w-4 h-4" />
          </Button>
        </div>

        {/* Color selection */}
        <div className="flex items-center gap-1 ml-2">
          {Object.entries(COLORS).map(([name, hex]) => (
            <button
              key={name}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                color === hex ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: hex }}
              onClick={() => setColor(hex)}
              title={name}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={annotations.length === 0}
            className="text-gray-300 hover:text-white"
          >
            <Undo2 className="w-4 h-4 mr-1" />
            Undo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={annotations.length === 0}
            className="text-gray-300 hover:text-white"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="ml-2"
          >
            Done
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {imageLoaded ? (
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="rounded-lg shadow-xl cursor-crosshair"
            style={{
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
        ) : (
          <div className="text-gray-400">Loading screenshot...</div>
        )}
      </div>

      {/* Annotation count */}
      {annotations.length > 0 && (
        <div className="px-4 py-2 text-center text-sm text-gray-400 border-t border-gray-700">
          {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default ScreenshotAnnotator;
