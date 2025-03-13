import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Keyboard, Send, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Define the SpeechRecognition interface to fix TypeScript errors
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setupSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition",
        variant: "destructive"
      });
      return false;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      if (event.results[0].isFinal) {
        setTextInput(transcript);
        sendVoiceMessage(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
      toast({
        title: "Error",
        description: `Speech recognition error: ${event.error}`,
        variant: "destructive"
      });
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    return true;
  };

  const toggleRecording = () => {
    if (!isRecording) {
      const isSupported = setupSpeechRecognition();
      if (!isSupported) return;
      
      recognitionRef.current?.start();
      setIsRecording(true);
    } else {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (transcript: string) => {
    if (!transcript.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: transcript }]);

    try {
      setIsLoading(true);

      const responseText = await sendMessage(transcript);

      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);

      speakResponse(responseText);
      
    } catch (error) {
      console.error('API error:', error);
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Updated sendMessage function with correct URL and improved CORS handling
  const sendMessage = async (message: string): Promise<string> => {
    const url = "https://Faizal2805-expo.hf.space/api/predict/";

    const payload = {
      data: [
        message,
        "Hello!!", // system_message
        1,         // max_tokens
        0.1,       // temperature
        0.1        // top_p
      ]
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        mode: "cors", // Enable CORS
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // Allow all origins
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allow common methods
          "Access-Control-Allow-Headers": "Content-Type" // Allow content-type header
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log(result.data);
      return result.data.toString();
    } catch (error) {
      console.error("Error:", error);
      return "Sorry, I couldn't process your request at the moment.";
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance();
      speech.text = text;
      speech.volume = 1;
      speech.rate = 1;
      speech.pitch = 1;
      window.speechSynthesis.speak(speech);
    }
  };

  const toggleInputMode = () => {
    setInputMode(inputMode === 'voice' ? 'keyboard' : 'voice');
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleSendMessage = async () => {
    if (textInput.trim()) {
      const userMessage = textInput;
      setTextInput('');

      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

      try {
        setIsLoading(true);

        const responseText = await sendMessage(userMessage);

        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      } catch (error) {
        console.error('API error:', error);
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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container max-w-4xl mx-auto p-4 pt-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
            EVA
          </h1>
          <p className="text-muted-foreground mt-2">
            {inputMode === 'voice' 
              ? 'Press the microphone button and start speaking' 
              : 'Type your message and press enter'}
          </p>
        </div>
      </div>
    </div>
  );
};
