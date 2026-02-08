"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { LinkInput } from "@/components/LinkInput";
import { Timeline } from "@/components/Timeline";

const transport = new DefaultChatTransport({ api: "/api/plan" });

export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({ transport });

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

        {isLoading && !latestAssistant && (
          <div className="text-center text-neutral-500 animate-pulse">
            Extracting post and planning your date...
          </div>
        )}

        {latestAssistant && (
          <Timeline parts={latestAssistant.parts} />
        )}
      </div>
    </main>
  );
}
