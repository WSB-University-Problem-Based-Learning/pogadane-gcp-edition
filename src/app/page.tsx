"use client"

import { MessageCard } from "@/components/message-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Message } from "@/types";
import { Loader, Mic, Send, Sparkles, Upload, User2 } from 'lucide-react';
import React from "react";

export default function Home() {
  const [conversation, setConversation] = React.useState<Message[]>([
    { role: 'agent', type: 'welcome', content: "Hello! Provide a file or YouTube link. I'll process it in the background." }
  ])

  const [query, setQuery] = React.useState('')
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);

  const conversationEndRef = React.useRef<HTMLDivElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  React.useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  const processData = async (data: File | string, userMessage: string) => {
    setConversation(prev => [...prev, { role: 'user', type: 'request', content: userMessage }]);
    setIsProcessing(true);
    setConversation(prev => [...prev, { role: 'agent', type: 'thinking', content: "Processing directly... This might take a moment." }]);

    try {
      const response = await (async () => {
        if (typeof data === 'string') {
          return fetch('/api/submit',{
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: data })
          });
        } else {
          const formData = new FormData();

          formData.append('file', data);

          return fetch('/api/submit', {
            method: 'POST',
            body: formData
          });
        }
      })();

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process job.');
      }
        
      setConversation(prev => [...prev.filter(m => m.type !== 'thinking'), 
        { role: 'agent', type: 'transcription', content: result.transcription || '' },
        { role: 'agent', type: 'translation', content: result.translation || '' }
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown submission error occurred.";

      setConversation(prev => [...prev.filter(m => m.type !== 'thinking'),
        { role: 'agent', type: 'error', content: message }
      ]);
    } finally {
      setIsProcessing(false);
    }
};

  const handleUrlSubmit = () => {
    if (!query.trim()) {
      return
    }

    processData(query, `Processing URL: ${query}`)
    setQuery('')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) {
      return
    }

    processData(file, `Processing file: ${file.name}`)
    e.target.value = ''
  }

  return (
    <React.Fragment>
      <main className="flex-1 overflow-y-auto py-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {conversation.map((msg, index) => {
            if (msg.role === 'agent') {
              if (msg.type === 'thinking') return <MessageCard key={index} role={msg.role} icon={<Loader className="w-5 h-5"/>} title="Processing...">{msg.content}</MessageCard>;
              if (msg.type === 'error') return <MessageCard key={index} role={msg.role} icon={<Sparkles className="w-5 h-5"/>} title="Error" isError>{msg.content}</MessageCard>;
              return <MessageCard key={index} icon={<Sparkles className="w-5 h-5"/>} role={msg.role} title={msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}>{msg.content}</MessageCard>;
            }
            if (msg.role === 'user') {
                return <MessageCard key={index} role={msg.role} icon={<User2 className="w-5 h-5"/>} title="You">{msg.content}</MessageCard>
            }
            return null;
          })}
          <div ref={conversationEndRef} />
        </div>
      </main>
      <footer className="p-4 bg-card/80 backdrop-blur-sm border-t border-border sticky bottom-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" disabled={isProcessing}>
              <Mic className="size-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-5" />
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="audio/*" />
            <div className="relative flex-grow w-full">
              <Input 
                placeholder="Paste a YouTube URL to process..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isProcessing}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <Button
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                disabled={isProcessing || !query.trim()}
                onClick={handleUrlSubmit}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </React.Fragment>
  );
}
