import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Keyboard, Send, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Client } from '@gradio/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Define SpeechRecognition for TypeScript compatibility
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

  // Initialize Gradio client
  useEffect(() => {
    const initClient = async () => {
      try {
        const client = await Client.connect("Faizal2805/expo");
        setGradioClient(client);
      } catch (error) {
        console.error("Failed to connect to Gradio:", error);
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

      setInterimTranscript(transcript);

      if (event.results[0].isFinal) {
        setInterimTranscript('');
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
      setInterimTranscript('');
    }
  };

  const sendVoiceMessage = async (transcript: string) => {
    if (!transcript.trim()) return;

    if (inputMode === 'voice') {
      try {
        setIsLoading(true);
        const responseText = await sendMessageToGradio(transcript);
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
    } else {
      setMessages(prev => [...prev, { role: 'user', content: transcript }]);

      try {
        setIsLoading(true);
        const responseText = await sendMessageToGradio(transcript);
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
      const result = await gradioClient.predict("/chat", {
        message: message,
        system_message: "Hello!!",
        max_tokens: 100,
        temperature: 0.7,
        top_p: 0.9,
      });

      return result.data.toString();
    } catch (error) {
      console.error("Error calling Gradio API:", error);
      return "Sorry, I couldn't process your request at the moment.";
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

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
    setInterimTranscript('');
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
    <div className="flex items-center space-x-4">
      <button
        onClick={toggleRecording}
        className={cn(
          "p-6 rounded-full",
          isRecording ? "bg-red-500 text-white" : "bg-blue-500 text-white"
        )}
        disabled={isLoading}
      >
        {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
      </button>

      <button
        onClick={toggleInputMode}
        className="p-4 rounded-full bg-gray-200 hover:bg-gray-300"
      >
        <Keyboard className="h-6 w-6" />
      </button>

      <input
        type="text"
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="bg-muted border-0 focus:ring-0"
        disabled={isLoading}
      />
    </div>
  );
};
