import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeepAgent — Autonomous Research Assistant",
  description: "AI agent that searches the web, reads articles, and runs code to answer complex questions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}
