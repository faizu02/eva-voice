
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
        <div className="flex justify-center items-center pb-6">
          <button
            onClick={toggleRecording}
            className={cn(
              "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
              isRecording ? "bg-destructive" : "bg-primary hover:bg-primary/90"
            )}
          >
            {isRecording ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
            <div
              className={cn(
                "absolute w-full h-full rounded-full",
                isRecording && "animate-ripple bg-destructive"
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
