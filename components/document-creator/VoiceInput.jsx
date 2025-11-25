import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, MicOff, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function VoiceInput({ isActive, onToggle, onTranscription }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions.');
      } else {
        setError(`Error: ${event.error}`);
      }
      stopRecording();
    };

    recognitionRef.current.onend = () => {
      if (isRecording) {
        // Restart if still supposed to be recording
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.error('Error restarting recognition:', err);
        }
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition not initialized");
      return;
    }

    setError(null);
    setTranscript("");
    setRecordingDuration(0);
    
    try {
      recognitionRef.current.start();
      setIsRecording(true);
      
      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      toast.success("Recording started - speak now");
    } catch (err) {
      console.error('Error starting recognition:', err);
      setError("Failed to start recording. Please try again.");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    toast.info("Recording stopped");
  };

  const handleToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleInsert = () => {
    if (transcript.trim()) {
      onTranscription(transcript.trim());
      setTranscript("");
      setRecordingDuration(0);
      toast.success("Transcription inserted into document");
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Recording Control */}
      <Button
        onClick={handleToggle}
        disabled={!!error || isProcessing}
        className={`w-full ${isRecording ? 'bg-red-600 hover:bg-red-700' : ''}`}
        variant={isRecording ? 'default' : 'outline'}
      >
        {isRecording ? (
          <>
            <MicOff className="w-4 h-4 mr-2" />
            Stop Recording ({formatDuration(recordingDuration)})
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-2" />
            Start Voice Input
          </>
        )}
      </Button>

      {/* Recording Indicator */}
      {isRecording && (
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-red-900 dark:text-red-100">
                Recording in progress...
              </span>
            </div>
            <p className="text-xs text-red-800 dark:text-red-200">
              Speak clearly into your microphone
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      {transcript && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                Transcribed
              </Badge>
              <Badge variant="outline" className="text-xs">
                {transcript.split(' ').length} words
              </Badge>
            </div>

            <div className="text-sm border rounded-lg p-3 bg-gray-50 dark:bg-gray-900 max-h-[200px] overflow-y-auto">
              {transcript}
            </div>

            <Button
              size="sm"
              onClick={handleInsert}
              className="w-full"
            >
              Insert into Document
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      {!isRecording && !transcript && !error && (
        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <Mic className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
            Click the button above to start voice dictation. Your speech will be converted to text.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}