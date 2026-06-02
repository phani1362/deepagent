"use client";

import { useState, useRef, useCallback } from "react";
import { streamChat, AgentEvent } from "@/lib/api";

export interface ToolStep {
  tool: string;
  args: Record<string, unknown>;
  result?: string;
  status: "running" | "done" | "error";
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolSteps?: ToolStep[];
  isStreaming?: boolean;
}

export function useAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      abortRef.current = false;
      setError(null);
      setIsLoading(true);

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };

      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        toolSteps: [],
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      try {
        let currentSessionId = sessionId;

        for await (const event of streamChat(text, currentSessionId)) {
          if (abortRef.current) break;

          switch (event.type) {
            case "session_id":
              currentSessionId = event.session_id ?? null;
              setSessionId(currentSessionId);
              break;

            case "tool_call":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolSteps: [
                          ...(m.toolSteps ?? []),
                          {
                            tool: event.tool!,
                            args: event.args ?? {},
                            status: "running",
                          },
                        ],
                      }
                    : m
                )
              );
              break;

            case "tool_result":
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m;
                  const steps = [...(m.toolSteps ?? [])];
                  const idx = steps.findLastIndex(
                    (s) => s.tool === event.tool && s.status === "running"
                  );
                  if (idx !== -1) {
                    steps[idx] = { ...steps[idx], result: event.result, status: "done" };
                  }
                  return { ...m, toolSteps: steps };
                })
              );
              break;

            case "token":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + (event.content ?? "") }
                    : m
                )
              );
              break;

            case "done":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m
                )
              );
              break;

            case "error":
              setError(event.message ?? "Unknown error");
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, isStreaming: false, content: `Error: ${event.message}` }
                    : m
                )
              );
              break;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setIsLoading(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );
      }
    },
    [isLoading, sessionId]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    abortRef.current = true;
  }, []);

  return { messages, isLoading, error, sendMessage, reset, sessionId };
}
