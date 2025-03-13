import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Keyboard, Send, Globe } from 'lucide-react';
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
        setGradioClient(client);
      } catch (error) {
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
      const result = await gradioClient.predict("/chat", {
        message: message,
        system_message: "Hello!!",
        max_tokens: 100,
        temperature: 0.6,
        top_p: 0.9,
      });

      return Array.isArray(result.data) ? result.data[0] : result.data.toString();
    } catch (error) {
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

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);

    recognition.onresult = async (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      setInterimTranscript(interimTranscript);

      if (finalTranscript) {
        recognition.stop();
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
        } finally {
          setIsLoading(false);
          setInterimTranscript('');
          if (isRecording) {
            recognition.start();
          }
        }
      }
    };

    recognition.onerror = () => setIsRecording(false);

    return recognition;
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition();
    }

    if (!recognitionRef.current) return;

    // Stop any ongoing speech when mic is clicked
    window.speechSynthesis.cancel();

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
          <p className="text-muted-foreground mt-2">
            {inputMode === 'voice'
              ? 'Press the microphone button and start speaking'
              : 'Type your message and press enter'}
          </p>
        </div>

        {inputMode === 'voice' ? (
          <div className="flex flex-col items-center justify-center">
            <div
              className={`relative w-40 h-40 mt-40 flex items-center justify-center ${isRecording ? 'recording' : ''}`}
            >
              {isRecording ? (
                <MicOff className="w-16 h-16 text-red-600" />
              ) : (
                <Mic className="w-16 h-16 text-blue-600" />
              )}
            </div>
          </div>
        ) : (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent pt-20">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center space-x-2 bg-muted p-2 rounded-lg">
                <button
                  onClick={toggleInputMode}
                  className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600"
                >
                  <Mic className="h-5 w-5" />
                </button>

                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!textInput.trim() || isLoading}
                  className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
