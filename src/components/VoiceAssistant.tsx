
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
      // Start recording
      const isSupported = setupSpeechRecognition();
      if (!isSupported) return;
      
      recognitionRef.current?.start();
      setIsRecording(true);
    } else {
      // Stop recording
      recognitionRef.current?.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (transcript: string) => {
    if (!transcript.trim()) return;
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: transcript }]);
    
    try {
      setIsLoading(true);
      
      // Call the API using the provided code
      const responseText = await sendMessage(transcript);
      
      // Add assistant response to chat
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      
      // Speak the response
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

  // Function to send message to API
  const sendMessage = async (message: string): Promise<string> => {
    const url = "https://hf.space/embed/Faizal2805/expo/api/predict/";

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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log(result.data); // Display response data
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
      speech.volume = 1; // Loud voice
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
      
      // Add user message to chat
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      
      try {
        setIsLoading(true);
        
        // Call the API using the provided code
        const responseText = await sendMessage(userMessage);
        
        // Add assistant response to chat
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
      
      {inputMode === 'keyboard' && (
        <div className="flex-1 container max-w-4xl mx-auto px-4 pb-24 overflow-y-auto space-y-6">
          <div className="flex flex-col space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "message-container",
                  message.role === "user" ? "user-message" : "assistant-message"
                )}
              >
                {message.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
      
      {inputMode === 'voice' && (
        <div className="flex-1 container max-w-4xl mx-auto px-4 pb-24 flex items-center justify-center">
          <div className="globe-container">
            <Globe 
              size={120} 
              className={cn(
                "text-blue-500 transition-all duration-500",
                isRecording ? "animate-pulse scale-110" : "opacity-60"
              )} 
            />
            {isRecording && (
              <div className="globe-ripple"></div>
            )}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#121212] to-transparent pt-10 pb-6">
        <div className="container max-w-4xl mx-auto px-4">
          {inputMode === 'voice' ? (
            <div className="glass p-6 rounded-xl flex justify-center items-center relative">
              <button
                onClick={toggleRecording}
                className={cn(
                  "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                  isRecording ? "bg-gradient-to-r from-red-500 to-pink-500" : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                )}
              >
                {isRecording ? (
                  <MicOff className="w-6 h-6 text-white z-10" />
                ) : (
                  <Mic className="w-6 h-6 text-white z-10" />
                )}
                <div
                  className={cn(
                    "absolute w-full h-full rounded-full",
                    isRecording && "animate-ripple bg-red-500/50"
                  )}
                />
              </button>
              
              <button 
                onClick={toggleInputMode}
                className="absolute right-6 bottom-6 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 flex items-center justify-center transition-all duration-300 shadow-lg"
              >
                <Keyboard className="w-5 h-5 text-white" />
              </button>
            </div>
          ) : (
            <div className="glass p-4 rounded-xl flex items-center gap-3 relative">
              <div className="flex-1">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message here..."
                  className="w-full bg-transparent border-none focus:outline-none resize-none text-white placeholder-white/40 min-h-[60px] max-h-[200px] overflow-y-auto"
                  rows={1}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleSendMessage}
                  disabled={!textInput.trim() || isLoading}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md",
                    textInput.trim() && !isLoading
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600" 
                      : "bg-gray-500/50 cursor-not-allowed"
                  )}
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
                
                <button 
                  onClick={toggleInputMode}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 flex items-center justify-center transition-all duration-300 shadow-md"
                >
                  <Mic className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
