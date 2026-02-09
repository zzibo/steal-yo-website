"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { LinkInput } from "@/components/LinkInput";
import { Timeline } from "@/components/Timeline";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

const transport = new DefaultChatTransport({ api: "/api/plan" });

export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";
  const latestAssistant = messages.findLast((m) => m.role === "assistant");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const url = input.trim();
    setInput("");
    sendMessage({ text: url });
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Date Planner</h1>
          <p className="text-neutral-400">
            Paste an Instagram or TikTok link. Get a full date plan.
          </p>
        </div>

        <LinkInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />

        {error && (
          <div className="rounded-xl bg-red-950/50 border border-red-900 p-4 text-red-300 text-sm">
            Something went wrong. Check your API keys or try a different link.
          </div>
        )}

        {isLoading && !latestAssistant && <LoadingSkeleton />}

        {latestAssistant && (
          <Timeline
            parts={latestAssistant.parts}
            isStreaming={status === "streaming"}
          />
        )}
      </div>
    </main>
  );
}
