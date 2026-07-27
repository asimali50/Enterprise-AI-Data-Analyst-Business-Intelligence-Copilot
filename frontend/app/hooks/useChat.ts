"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/api";
import type { ChatMessage } from "@/types";

export function useChat(datasetId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const qc = useQueryClient();

  // Load chat history
  const { data: history } = useQuery({
    queryKey: ["chatHistory", datasetId],
    queryFn: () => api.getChatHistory(datasetId!),
    enabled: !!datasetId,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      api.sendChatMessage({
        dataset_id: datasetId!,
        message,
        conversation_history: messages.slice(-10),
      }),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    },
  });

  const sendMessage = useCallback(
    (message: string) => {
      if (!datasetId || !message.trim()) return;
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      sendMutation.mutate(message);
    },
    [datasetId, sendMutation],
  );

  return {
    messages: history?.messages
      ? [...history.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })), ...messages]
      : messages,
    sendMessage,
    isLoading: sendMutation.isPending,
    error: sendMutation.error,
  };
}
