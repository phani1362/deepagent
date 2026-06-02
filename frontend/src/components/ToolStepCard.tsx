"use client";

import { ToolStep } from "@/hooks/useAgent";
import { Search, Globe, Terminal, Loader2, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

const TOOL_ICONS: Record<string, React.ReactNode> = {
  web_search: <Search className="w-3.5 h-3.5" />,
  read_url: <Globe className="w-3.5 h-3.5" />,
  execute_python: <Terminal className="w-3.5 h-3.5" />,
};

const TOOL_LABELS: Record<string, string> = {
  web_search: "Web Search",
  read_url: "Reading URL",
  execute_python: "Running Python",
};

export function ToolStepCard({ step }: { step: ToolStep }) {
  const [expanded, setExpanded] = useState(false);

  const label = TOOL_LABELS[step.tool] ?? step.tool;
  const icon = TOOL_ICONS[step.tool] ?? <Terminal className="w-3.5 h-3.5" />;
  const preview =
    step.tool === "web_search"
      ? (step.args.query as string)
      : step.tool === "read_url"
      ? (step.args.url as string)
      : "Code snippet";

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden text-sm mb-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 transition-colors text-left"
      >
        <span className="text-blue-500">{icon}</span>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="text-zinc-400 truncate flex-1">{preview}</span>
        {step.status === "running" ? (
          <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin ml-auto shrink-0" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto shrink-0" />
        )}
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 py-2 space-y-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Args</p>
            <pre className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-all bg-zinc-50 dark:bg-zinc-800 rounded p-2">
              {JSON.stringify(step.args, null, 2)}
            </pre>
          </div>
          {step.result && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Result</p>
              <pre className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-all bg-zinc-50 dark:bg-zinc-800 rounded p-2 max-h-40 overflow-y-auto">
                {step.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
