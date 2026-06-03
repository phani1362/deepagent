"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAgent } from "@/hooks/useAgent";
import { useChatHistory, ChatSession } from "@/hooks/useChatHistory";
import { MessageBubble } from "./MessageBubble";
import { HistorySidebar } from "./HistorySidebar";
import { Send, Trash2, Bot, Zap, PanelLeftOpen, PanelLeftClose } from "lucide-react";

const EXAMPLE_QUERIES = [
  "What are the latest breakthroughs in AI agents in 2025?",
  "Analyze and compare GPT-4o vs Claude Sonnet 4 capabilities",
  "Research the current state of autonomous vehicle technology",
  "Write Python code to visualize stock market trends for NVDA",
];

export function ChatInterface() {
  const { messages, isLoading, error, sendMessage, reset, loadMessages, sessionId } = useAgent();
  const { sessions, saveSession, deleteSession } = useChatHistory();

  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [currentSessionHistoryId] = useState(() => crypto.randomUUID());

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeHistoryIdRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-save current conversation whenever assistant finishes responding
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant" || lastMsg.isStreaming) return;

    const historyId = activeHistoryIdRef.current ?? currentSessionHistoryId;
    const title =
      messages.find((m) => m.role === "user")?.content.slice(0, 60) ?? "New Chat";

    saveSession({
      id: historyId,
      title,
      createdAt: Date.now(),
      messages,
      sessionId,
    });
  }, [messages, sessionId, saveSession, currentSessionHistoryId]);

  const handleSelectSession = useCallback(
    (session: ChatSession) => {
      loadMessages(session.messages, session.sessionId);
      activeHistoryIdRef.current = session.id;
      setActiveHistoryId(session.id);
    },
    [loadMessages]
  );

  const handleNewChat = useCallback(() => {
    reset();
    activeHistoryIdRef.current = null;
    setActiveHistoryId(null);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [reset]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteSession(id);
      if (activeHistoryId === id) {
        handleNewChat();
      }
    },
    [deleteSession, activeHistoryId, handleNewChat]
  );

  const handleSubmit = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || isLoading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // If loading a past session, continuing it uses that session's history ID
    if (activeHistoryIdRef.current === null) {
      activeHistoryIdRef.current = currentSessionHistoryId;
      setActiveHistoryId(currentSessionHistoryId);
    }

    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      {sidebarOpen && (
        <HistorySidebar
          sessions={sessions}
          activeId={activeHistoryId}
          onSelect={handleSelectSession}
          onNew={handleNewChat}
          onDelete={handleDelete}
        />
      )}

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeftOpen className="w-5 h-5" />
              )}
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-white">DeepAgent</h1>
              <p className="text-xs text-zinc-500">Autonomous Research · GPT-4o · Web Search · Code Execution</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-8 pb-20">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">What do you want to research?</h2>
                <p className="text-zinc-500 max-w-md">
                  I can search the web, read articles, run Python code, and remember past research to answer your questions in depth.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSubmit(q)}
                    className="text-left px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950 transition-all text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
          )}

          {error && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                placeholder="Ask anything... (Shift+Enter for newline)"
                rows={1}
                className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-xs text-zinc-400 mt-2">
            DeepAgent can search the web, read URLs, and execute Python code.
          </p>
        </div>
      </div>
    </div>
  );
}
