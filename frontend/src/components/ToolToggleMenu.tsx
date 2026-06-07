"use client";

import { useState, useRef, useEffect } from "react";
import { Wrench, ChevronDown } from "lucide-react";

export const AVAILABLE_TOOLS = [
  { id: "web_search", label: "Web Search" },
  { id: "read_url", label: "Read URLs" },
  { id: "execute_code", label: "Code Execution" },
  { id: "search_documents", label: "Document Search" },
] as const;

export function ToolToggleMenu({
  enabledTools,
  onChange,
}: {
  enabledTools: string[];
  onChange: (tools: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) => {
    if (enabledTools.includes(id)) {
      onChange(enabledTools.filter((t) => t !== id));
    } else {
      onChange([...enabledTools, id]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Choose which tools the agent may use for this conversation"
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-violet-600 transition-colors px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
      >
        <Wrench className="w-3.5 h-3.5" />
        Tools ({enabledTools.length}/{AVAILABLE_TOOLS.length})
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-56 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-2 z-20">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide px-2 py-1">
            Tools the agent can use
          </p>
          {AVAILABLE_TOOLS.map((tool) => (
            <label
              key={tool.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300"
            >
              <input
                type="checkbox"
                checked={enabledTools.includes(tool.id)}
                onChange={() => toggle(tool.id)}
                className="accent-violet-600"
              />
              {tool.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
