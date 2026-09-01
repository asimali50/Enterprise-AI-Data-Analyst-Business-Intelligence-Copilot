"use client";

import { Suspense, useRef, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { SuggestedQuestions } from "@/components/chat/SuggestedQuestions";
import { useChat } from "@/hooks/useChat";
import { EmptyState } from "@/components/ui/empty-state";
import { motion } from "framer-motion";
import { MessageSquareText } from "lucide-react";

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");
  usePageTitle("Chat with Data");
  const { messages, sendMessage, isLoading, error } = useChat(datasetId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!datasetId) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <EmptyState
            icon={MessageSquareText}
            title="Chat with your data"
            description="Select a dataset to ask questions in plain English and get AI-powered answers about your data."
            action={{ label: "Go to Datasets", onClick: () => router.push("/datasets") }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto w-full px-6 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-lg font-semibold">Chat with Data</h1>
          <p className="text-xs text-muted-foreground">
            Ask questions about your dataset &middot; Context-aware AI responses &middot; Natural language insights
          </p>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center pt-12 pb-8"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
                <MessageSquareText className="h-8 w-8 text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-lg font-medium mb-1">What would you like to know?</p>
              <p className="text-sm text-muted-foreground mb-6">Ask questions about your data in plain English</p>
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

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <MessageSquareText className="h-4 w-4 shrink-0" />
              <span>
                {error instanceof Error
                  ? error.message
                  : "Failed to generate a response. Check that an AI provider is configured."}
              </span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border pt-4">
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </div>
      </div>
    </AppShell>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-border" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent" style={{ animationDuration: "0.6s" }} />
              </div>
              <p className="text-sm text-muted-foreground">Loading chat...</p>
            </div>
          </div>
        </div>
      </AppShell>
    }>
      <ChatContent />
    </Suspense>
  );
}
