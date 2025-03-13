
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Keyboard, Send, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Client } from '@gradio/client';

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
      
      // Update interim transcript for UI feedback
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
    
    // In voice mode, we don't add to the chat messages
    // We just process the voice input and speak the response
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
      // In keyboard mode, add to chat and process normally
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

      console.log("Gradio response:", result.data);
      return result.data.toString();
    } catch (error) {
      console.error("Error calling Gradio API:", error);
      return "Sorry, I couldn't process your request at the moment.";
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech first
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
        
        {inputMode === 'keyboard' ? (
          <div className="flex-1 overflow-auto mb-20">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex w-max max-w-[80%] rounded-lg px-4 py-3",
                    message.role === 'user'
                      ? "ml-auto bg-blue-500 text-white"
                      : "bg-muted"
                  )}
                >
                  {message.content}
                </div>
              ))}
              {isLoading && (
                <div className="bg-muted w-max max-w-[80%] rounded-lg px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce"></div>
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></div>
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center mb-20">
            <div className="relative">
              <Globe className="w-32 h-32 text-blue-500 animate-pulse" />
              {isRecording && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-blue-500/20 w-40 h-40 rounded-full animate-ping absolute"></div>
                  <div className="bg-blue-500/40 w-32 h-32 rounded-full animate-ping absolute" style={{ animationDelay: '0.2s' }}></div>
                  <div className="bg-blue-500/60 w-24 h-24 rounded-full animate-ping absolute" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}
            </div>
            {interimTranscript && (
              <div className="absolute bottom-40 left-0 right-0 text-center">
                <div className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg max-w-[80%]">
                  {interimTranscript}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent pt-20">
          <div className="max-w-3xl mx-auto">
            {inputMode === 'keyboard' ? (
              <div className="flex items-center space-x-2 bg-muted p-2 rounded-lg">
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
                  className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
                <button
                  onClick={toggleInputMode}
                  className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <Mic className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex justify-center items-center space-x-4">
                <button
                  onClick={toggleRecording}
                  className={cn(
                    "p-6 rounded-full flex items-center justify-center transition-colors",
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  )}
                  disabled={isLoading}
                >
                  {isRecording ? (
                    <MicOff className="h-8 w-8" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </button>
                <button
                  onClick={toggleInputMode}
                  className="p-4 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <Keyboard className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
