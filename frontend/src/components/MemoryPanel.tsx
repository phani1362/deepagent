"use client";

import { useEffect, useState } from "react";
import { Brain, Trash2, X, Loader2 } from "lucide-react";
import { fetchMemories, deleteMemory, MemoryItem } from "@/lib/api";

export function MemoryPanel({ sessionId, onClose }: { sessionId: string | null; onClose: () => void }) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const items = await fetchMemories(showAll ? null : sessionId);
      setMemories(items);
    } catch {
      setMemories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, showAll]);

  const handleDelete = async (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    await deleteMemory(id);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-600" />
            <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">What DeepAgent remembers</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="accent-violet-600"
            />
            Show memories from all sessions
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            </div>
          ) : memories.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">
              No long-term memories yet — they&apos;re saved automatically as you research.
            </p>
          ) : (
            memories.map((m) => (
              <div
                key={m.id}
                className="group flex items-start gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-500 truncate">{m.original_query}</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2 mt-0.5">{m.summary}</p>
                  <p className="text-[11px] text-zinc-400 mt-1">{new Date(m.timestamp).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500 shrink-0"
                  title="Forget this memory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
