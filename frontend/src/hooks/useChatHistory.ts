"use client";

import { useState, useCallback, useEffect } from "react";
import { Message } from "@/hooks/useAgent";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
  sessionId: string | null;
}

const STORAGE_KEY = "deepagent_chat_history";
const MAX_SESSIONS = 50;

function loadFromStorage(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(sessions: ChatSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {}
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    setSessions(loadFromStorage());
  }, []);

  const saveSession = useCallback((session: ChatSession) => {
    setSessions((prev) => {
      const existing = prev.findIndex((s) => s.id === session.id);
      let updated: ChatSession[];
      if (existing >= 0) {
        updated = prev.map((s) => (s.id === session.id ? session : s));
      } else {
        updated = [session, ...prev].slice(0, MAX_SESSIONS);
      }
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSessions([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return { sessions, saveSession, deleteSession, clearAll };
}
