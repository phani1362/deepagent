"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "@/hooks/useAgent";
import { ToolStepCard } from "./ToolStepCard";
import { Bot, User, Loader2, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

const VERDICT_STYLES = {
  verified: {
    icon: ShieldCheck,
    classes: "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900",
    label: "Self-checked: claims supported by sources",
  },
  issues_found: {
    icon: ShieldAlert,
    classes: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900",
    label: "Self-check flagged possible issues",
  },
  unverified: {
    icon: ShieldQuestion,
    classes: "text-zinc-500 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
    label: "Not independently verified",
  },
} as const;

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={`max-w-[80%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {/* Tool steps (assistant only) */}
        {!isUser && message.toolSteps && message.toolSteps.length > 0 && (
          <div className="w-full">
            {message.toolSteps.map((step, i) => (
              <ToolStepCard key={i} step={step} />
            ))}
          </div>
        )}

        {/* Message text */}
        {(message.content || message.isStreaming) && (
          <div
            className={`rounded-2xl px-4 py-3 ${
              isUser
                ? "bg-blue-600 text-white rounded-tr-sm"
                : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-tl-sm"
            }`}
          >
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content || ""}
                </ReactMarkdown>
                {message.isStreaming && !message.content && (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                )}
                {message.isStreaming && message.content && (
                  <span className="inline-block w-1.5 h-4 bg-zinc-400 animate-pulse ml-0.5 rounded-sm align-middle" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Self-verification badge (assistant only) */}
        {!isUser && message.verification && !message.isStreaming && (
          (() => {
            const style = VERDICT_STYLES[message.verification.verdict] ?? VERDICT_STYLES.unverified;
            const Icon = style.icon;
            return (
              <div
                title={message.verification.notes}
                className={`flex items-start gap-2 text-xs px-3 py-2 rounded-xl border max-w-full ${style.classes}`}
              >
                <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium">{style.label}.</span>{" "}
                  <span className="opacity-80">{message.verification.notes}</span>
                </span>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
