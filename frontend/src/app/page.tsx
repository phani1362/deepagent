"use client";

import dynamic from "next/dynamic";

const ChatInterface = dynamic(
  () => import("@/components/ChatInterface").then((m) => m.ChatInterface),
  { ssr: false }
);

export default function Home() {
  return <ChatInterface />;
}
