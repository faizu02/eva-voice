
import React, { useState } from 'react';
import { Mic, MicOff, Keyboard, Send } from 'lucide-react';
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
  const [inputMode, setInputMode] = useState<'voice' | 'keyboard'>('voice');
  const [textInput, setTextInput] = useState('');

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

  const toggleInputMode = () => {
    setInputMode(inputMode === 'voice' ? 'keyboard' : 'voice');
    setIsRecording(false);
  };

  const handleSendMessage = () => {
    if (textInput.trim()) {
      setMessages(prev => [...prev, 
        { role: 'user', content: textInput },
        { role: 'assistant', content: "I received your message: " + textInput }
      ]);
      setTextInput('');
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            Voice Assistant
          </h1>
          <p className="text-muted-foreground mt-2">
            {inputMode === 'voice' 
              ? 'Press the microphone button and start speaking' 
              : 'Type your message and press enter'}
          </p>
        </div>
      </div>
      
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
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#121212] to-transparent pt-10 pb-6">
        <div className="container max-w-4xl mx-auto px-4">
          {inputMode === 'voice' ? (
            <div className="glass p-6 rounded-xl flex justify-center items-center relative">
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
              
              <button 
                onClick={toggleInputMode}
                className="absolute right-6 bottom-6 w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 flex items-center justify-center transition-all duration-300 shadow-lg"
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
                  disabled={!textInput.trim()}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md",
                    textInput.trim() 
                      ? "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600" 
                      : "bg-gray-500/50 cursor-not-allowed"
                  )}
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
                
                <button 
                  onClick={toggleInputMode}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 flex items-center justify-center transition-all duration-300 shadow-md"
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
