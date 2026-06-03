"use client";

import { ChatSession } from "@/hooks/useChatHistory";
import { Plus, Trash2, MessageSquare, Clock, History } from "lucide-react";

interface Props {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (session: ChatSession) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function HistorySidebar({ sessions, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <div className="flex flex-col h-full w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      {/* Sidebar header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <History className="w-4 h-4 text-zinc-500" />
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Chat History</span>
      </div>

      {/* New Chat button */}
      <div className="p-3">
        <button
          onClick={onNew}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white text-sm font-medium transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto pb-4">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-400">
              Your conversations will appear here
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5 px-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onSelect(s)}
                  className={`group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    activeId === s.id
                      ? "bg-violet-50 dark:bg-violet-950/60 text-violet-900 dark:text-violet-100"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                  onClick={() => onSelect(s)}
                >
                  <MessageSquare
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      activeId === s.id ? "text-violet-500" : "text-zinc-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-5">{s.title}</p>
                    <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDate(s.createdAt)}
                      <span className="text-zinc-300 dark:text-zinc-600">·</span>
                      {s.messages.filter((m) => m.role === "user").length} msg
                      {s.messages.filter((m) => m.role === "user").length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all shrink-0 mt-0.5"
                    aria-label="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
