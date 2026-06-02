"use client";

import dynamic from "next/dynamic";
import { PasswordGate } from "@/components/PasswordGate";

const ChatInterface = dynamic(
  () => import("@/components/ChatInterface").then((m) => m.ChatInterface),
  { ssr: false }
);

export default function Home() {
  return (
    <PasswordGate>
      <ChatInterface />
    </PasswordGate>
  );
}
