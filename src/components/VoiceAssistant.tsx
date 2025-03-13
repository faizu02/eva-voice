import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Keyboard, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Client } from '@gradio/client';
import './VoiceAssistant.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! How can I help you today?' }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'keyboard'>('voice');
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gradioClient, setGradioClient] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [interimTranscript, setInterimTranscript] = useState('');

  useEffect(() => {
    const initClient = async () => {
      try {
        const client = await Client.connect("Faizal2805/expo");
        console.log("✅ Gradio client connected:", client);
        setGradioClient(client);
      } catch (error) {
        console.error("❌ Failed to connect to Gradio:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to the AI service",
          variant: "destructive"
        });
      }
    };
    
    initClient();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessageToGradio = async (message: string): Promise<string> => {
    if (!gradioClient) {
      toast({
        title: "Service Unavailable",
        description: "AI service is not connected. Please try again later.",
        variant: "destructive"
      });
      return "Sorry, I'm not connected to my AI service right now.";
    }

    try {
      console.log("📤 Sending message to Gradio:", message);
      const result = await gradioClient.predict("/chat", {
        message: message,
        system_message: "Hello!!",
        max_tokens: 100,
        temperature: 0.6,
        top_p: 0.9,
      });

      console.log("📥 Gradio response:", result.data);
      return Array.isArray(result.data) ? result.data[0] : result.data.toString();
    } catch (error) {
      console.error("❌ Error calling Gradio API:", error);
      return "Sorry, I couldn't process your request at the moment.";
    }
  };

  const handleSendMessage = async () => {
    if (textInput.trim()) {
      const userMessage = textInput;
      setTextInput('');

      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

      try {
        setIsLoading(true);
        const responseText = await sendMessageToGradio(userMessage);
        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      } catch (error) {
        console.error('❌ API error:', error);
        toast({
          title: "Error",
          description: "Failed to get a response. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive"
      });
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      console.log("🎤 Voice recognition started");
    };

    recognition.onend = () => {
      setIsRecording(false);
      console.log("🎤 Voice recognition ended");
    };

    recognition.onresult = async (event: any) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          setInterimTranscript(event.results[i][0].transcript);
        }
      }

      if (finalTranscript) {
        console.log("🗣️ Final transcript:", finalTranscript);

        recognition.stop(); // Prevent multiple requests

        setMessages(prev => [...prev, { role: 'user', content: finalTranscript }]);

        try {
          setIsLoading(true);
          const responseText = await sendMessageToGradio(finalTranscript);
          setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);

          if (inputMode === 'voice') {
            const utterance = new SpeechSynthesisUtterance(responseText);
            utterance.rate = 0.8;
            utterance.pitch = 0.9;
            utterance.volume = 1.5;
            window.speechSynthesis.speak(utterance);
          }
        } catch (error) {
          console.error('❌ API error:', error);
          toast({
            title: "Error",
            description: "Failed to get a response. Please try again.",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
          setInterimTranscript('');

          if (isRecording) {
            recognition.start(); // Restart recognition after processing
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Recognition error:', event.error);
      setIsRecording(false);
    };

    return recognition;
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition();
    }

    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const toggleInputMode = () => {
    if (inputMode === 'voice') {
      if (isRecording && recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setInputMode('keyboard');
    } else {
      setInputMode('voice');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container max-w-4xl mx-auto p-4 pt-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
            EVA
          </h1>
        </div>

        <div className="flex items-center justify-center mt-40">
          <button
            onClick={toggleRecording}
            className={cn(
              "p-4 rounded-full",
              isRecording ? "bg-red-500 text-white" : "bg-blue-500 text-white"
            )}
          >
            {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>

          <button
            onClick={toggleInputMode}
            className="p-4 rounded-full bg-muted text-foreground hover:bg-muted/80"
          >
            <Keyboard className="h-6 w-6" />
          </button>
        </div>

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
