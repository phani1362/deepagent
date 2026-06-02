"use client";

import { useState, useEffect, FormEvent } from "react";
import { Lock } from "lucide-react";

const STORAGE_KEY = "deepagent_auth";
const PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD ?? "deepagent";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
      setInput("");
    }
  };

  if (unlocked === null) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm mx-4">
        <div className="flex flex-col items-center gap-6 bg-gray-900 rounded-2xl border border-gray-800 p-8 shadow-2xl">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600/20 border border-indigo-500/30">
            <Lock className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-white">DeepAgent</h1>
            <p className="mt-1 text-sm text-gray-400">Enter your password to continue</p>
          </div>
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
            <input
              type="password"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false); }}
              placeholder="Password"
              autoFocus
              className={`w-full rounded-lg border px-4 py-2.5 bg-gray-800 text-white text-sm placeholder-gray-500 outline-none transition focus:ring-2 ${
                error
                  ? "border-red-500 focus:ring-red-500/30"
                  : "border-gray-700 focus:ring-indigo-500/30 focus:border-indigo-500"
              }`}
            />
            {error && (
              <p className="text-xs text-red-400 text-center">Incorrect password. Try again.</p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 transition"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
