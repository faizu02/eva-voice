
import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const VoiceAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! How can I help you today?' }
  ]);
  const [isRecording, setIsRecording] = useState(false);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Start recording logic here
    } else {
      // Stop recording and process audio here
      const mockUserMessage = "This is a sample user message";
      setMessages(prev => [...prev, 
        { role: 'user', content: mockUserMessage },
        { role: 'assistant', content: "I'm a voice assistant. I heard what you said!" }
      ]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container max-w-4xl mx-auto p-4 pt-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            Voice Assistant
          </h1>
          <p className="text-muted-foreground mt-2">
            Press the microphone button and start speaking
          </p>
        </div>
      </div>
      
      <div className="flex-1 container max-w-4xl mx-auto p-4 overflow-y-auto space-y-6">
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
        </div>
      </div>

      <div className="container max-w-4xl mx-auto p-4">
        <div className="glass p-6 rounded-xl flex justify-center items-center">
          <button
            onClick={toggleRecording}
            className={cn(
              "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
              isRecording ? "bg-gradient-to-r from-red-500 to-pink-500" : "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
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
        </div>
      </div>
    </div>
  );
};
