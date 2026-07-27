"use client";

import { Suspense, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { SuggestedQuestions } from "@/components/chat/SuggestedQuestions";
import { useChat } from "@/hooks/useChat";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

function ChatContent() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");
  const { messages, sendMessage, isLoading } = useChat(datasetId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!datasetId) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">AI Data Chat</h1>
          <p className="text-muted-foreground mb-6">
            Upload and analyze a dataset first, then ask questions about it here.
          </p>
          <a href="/dashboard" className="text-primary hover:underline">
            Go to Dashboard →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-6 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-lg font-semibold">Data Chat</h1>
          <p className="text-xs text-muted-foreground">
            Ask questions about your dataset • Context-aware AI responses
          </p>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ textAlign: "center", paddingTop: 48, paddingBottom: 48 }}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <p className="text-muted-foreground mb-6">What would you like to know about your data?</p>
              <SuggestedQuestions onAsk={sendMessage} />
            </motion.div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChatMessage message={msg} />
            </motion.div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                AI
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ borderTopWidth: 1, borderTopStyle: "solid", borderColor: "var(--border)", paddingTop: 16 }}>
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}
