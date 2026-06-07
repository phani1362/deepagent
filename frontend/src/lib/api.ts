const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface AgentEvent {
  type: "session_id" | "tool_call" | "tool_result" | "token" | "usage" | "done" | "error";
  content?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: string;
  summary?: string;
  message?: string;
  session_id?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
}

export interface UploadResult {
  filename?: string;
  chunks?: number;
  characters?: number;
  error?: string;
}

export async function createSession(): Promise<string> {
  const res = await fetch(`${API_BASE}/session`, { method: "POST" });
  const data = await res.json();
  return data.session_id;
}

export async function* streamChat(
  message: string,
  sessionId: string | null
): AsyncGenerator<AgentEvent> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") return;
        try {
          yield JSON.parse(raw) as AgentEvent;
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}

export async function clearSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/session/${sessionId}`, { method: "DELETE" });
}

export async function uploadDocument(sessionId: string, file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("file", file);

  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}
