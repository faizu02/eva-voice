
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Keyboard, Send, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Client } from '@gradio/client';

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

  // Initialize Gradio client
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

  // Scroll to bottom when messages change
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
        temperature: 0.7,
        top_p: 0.9,
      });

      console.log("📥 Gradio response:", result.data);
      return result.data.toString();
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

  // Initialize speech recognition
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
        console.log("🗣️ Final transcript:", finalTranscript);
        
        // Stop recognition temporarily to process the response
        recognition.stop();
        
        // Add user message to the conversation if in keyboard mode
        if (inputMode === 'keyboard') {
          setMessages(prev => [...prev, { role: 'user', content: finalTranscript }]);
        }
        
        try {
          setIsLoading(true);
          const responseText = await sendMessageToGradio(finalTranscript);
          
          // Add assistant response to the conversation if in keyboard mode
          if (inputMode === 'keyboard') {
            setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
          } else {
            // In voice mode, we use speech synthesis to speak the response
            const utterance = new SpeechSynthesisUtterance(responseText);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
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
          
          // Restart recognition
          if (isRecording) {
            recognition.start();
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
    // If switching from voice to keyboard
    if (inputMode === 'voice') {
      if (isRecording && recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setInputMode('keyboard');
    } else {
      // Switching from keyboard to voice
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
          // Voice Mode UI
          <div className="flex flex-col items-center justify-center">
            <div className="globe-container mb-8">
              <div className="globe-ripple"></div>
              <Globe className="text-blue-500 h-20 w-20" />
            </div>
            
            {interimTranscript && (
              <div className="text-center mb-8 animate-pulse">
                <p className="text-lg text-muted-foreground">{interimTranscript}</p>
              </div>
            )}
            
            {isLoading && (
              <div className="text-center mb-8">
                <div className="flex space-x-2 justify-center">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce"></div>
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}

            <div className="flex space-x-4 mt-4">
              <button
                onClick={toggleRecording}
                className={cn(
                  "p-4 rounded-full flex items-center justify-center",
                  isRecording 
                    ? "bg-red-500 text-white hover:bg-red-600" 
                    : "bg-blue-500 text-white hover:bg-blue-600"
                )}
              >
                {isRecording ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
                {isRecording && (
                  <span className="absolute -bottom-6 text-sm font-medium text-red-500">Recording...</span>
                )}
              </button>
              
              <button
                onClick={toggleInputMode}
                className="p-4 rounded-full bg-muted text-foreground hover:bg-muted/80"
              >
                <Keyboard className="h-6 w-6" />
              </button>
            </div>
          </div>
        ) : (
          // Keyboard Mode UI
          <>
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
                    className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
