
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
  const [isSpeaking, setIsSpeaking] = useState(false);

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

  // Speech synthesis speaking status tracking
  useEffect(() => {
    const handleSpeechStart = () => setIsSpeaking(true);
    const handleSpeechEnd = () => setIsSpeaking(false);
    
    speechSynthesis.addEventListener('start', handleSpeechStart);
    speechSynthesis.addEventListener('end', handleSpeechEnd);
    
    return () => {
      speechSynthesis.removeEventListener('start', handleSpeechStart);
      speechSynthesis.removeEventListener('end', handleSpeechEnd);
    };
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

  // Stop any ongoing speech synthesis
  const stopSpeaking = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
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
      // Clear any previous transcript when starting new recognition
      setInterimTranscript('');
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
        
        // Stop recognition to process this complete input and prevent multiple recognitions
        recognition.stop();
        
        // Clear interim transcript when we have final
        setInterimTranscript('');
        
        // Add user message to conversation
        setMessages(prev => [...prev, { role: 'user', content: finalTranscript }]);
        
        try {
          setIsLoading(true);
          const responseText = await sendMessageToGradio(finalTranscript);
          
          // Add assistant response to the conversation
          setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
          
          // In voice mode, we use speech synthesis to speak the response
          if (inputMode === 'voice' && !isSpeaking) {
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
    // Stop any ongoing speech synthesis first
    stopSpeaking();
    
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
    // Stop any ongoing speech
    stopSpeaking();
    
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-400 via-blue-450 to-blue-500 bg-clip-text text-transparent">
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
  <div className="relative flex items-center justify-center border border-zinc-700 rounded-lg bg-zinc-900 p-4">
    <div className={`relative w-40 h-40 mt-20 mb-20 flex items-center justify-center ${isRecording ? 'recording' : ''}`}>
      <div className={`absolute inset-0 rounded-full ${isRecording ? 'bg-red-100' : 'bg-blue-100'} opacity-20`}></div>
      <div className={`absolute inset-4 rounded-full ${isRecording ? 'bg-red-200 animate-pulse' : 'bg-blue-200'} opacity-20`}></div>
      <div className={`absolute inset-8 rounded-full ${isRecording ? 'bg-red-300 animate-ping' : 'bg-blue-300'} opacity-20`}></div>
      {isRecording ? (
        <div className="z-10 text-red-600">
          <MicOff className="w-16 h-16" />
        </div>
      ) : (
        <div className="z-10 text-blue-600">
          <Mic className="w-16 h-16" />
        </div>
      )}
    </div>
  </div>

  {interimTranscript && (
    <div className="text-center mb-8 animate-pulse mt-8">
      <p className="text-lg text-muted-foreground">{interimTranscript}</p>
    </div>
  )}

  {isLoading && (
    <div className="text-center mb-8 mt-8">
      <div className="flex space-x-2 justify-center">
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce"></div>
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></div>
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></div>
      </div>
    </div>
  )}

  <div className=" bg-gradient-to-t from-background to-transparent p-0 m-0">
   <div className="fixed bottom-0 left-100 right-100 p-4 pt-20">
    <div className="text-center  mt-40">
      <div className="relative">
        <div className="absolute -inset-2 border border-zinc-700 bg-zinc-900 rounded-lg bg-[conic-gradient(at_bottom_right,_var(--tw-gradient-stops))] from-gray-600 via-fuchsia-600 to-blue-600 opacity-50 blur-2xl"></div>
        <div className="relative flex items-center space-x-2 bg-muted p-2 rounded-lg border border-zinc-700 bg-zinc-900">
          <div className="flex space-x-4">
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
            </button>
            
            <button
              onClick={toggleInputMode}
              className="p-4 rounded-full bg-muted text-foreground hover:bg-muted/80"
            >
              <Keyboard className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
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
                <div className="relative">
                  <div className="absolute -inset-2 rounded-lg bg-[conic-gradient(at_bottom_right,_var(--tw-gradient-stops))] from-gray-600 via-fuchsia-600 to-blue-600 opacity-50 blur-2xl"></div>
                  <div className="relative flex items-center space-x-2 bg-muted p-2 rounded-lg border border-zinc-700 bg-zinc-900">
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
            </div>
          </>
        )}
      </div>
    </div>
  );
};
