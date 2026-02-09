"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { LinkInput } from "@/components/LinkInput";
import { Timeline } from "@/components/Timeline";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ShareButton } from "@/components/ShareButton";
import { History } from "@/components/History";
import { savePlan } from "@/lib/history";

const transport = new DefaultChatTransport({ api: "/api/plan" });

export default function Home() {
  const [input, setInput] = useState("");
  const [lastUrl, setLastUrl] = useState("");
  const savedRef = useRef(false);
  const { messages, sendMessage, status, error, setMessages } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";
  const latestAssistant = messages.findLast((m) => m.role === "assistant");
  const hasResult = !!latestAssistant && !isLoading;

  // Extract plan text from assistant parts
  const planText = latestAssistant
    ? latestAssistant.parts
        .filter((p: { type: string; text?: string }) => p.type === "text" && p.text)
        .map((p: { type: string; text?: string }) => p.text)
        .join("")
    : "";

  // Save to history when plan finishes streaming
  useEffect(() => {
    if (hasResult && planText && lastUrl && !savedRef.current) {
      savePlan({ url: lastUrl, content: planText, createdAt: new Date().toISOString() });
      savedRef.current = true;
    }
  }, [hasResult, planText, lastUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const url = input.trim();
    setLastUrl(url);
    savedRef.current = false;
    setInput("");
    sendMessage({ text: url });
  }

  function handleReset() {
    setMessages([]);
    setInput("");
    setLastUrl("");
    savedRef.current = false;
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-8 flex-1">
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

        {hasResult && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <ShareButton text={planText} />
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-800
                         bg-neutral-900 px-5 py-2.5 text-sm font-medium text-neutral-300
                         hover:bg-neutral-800 hover:text-neutral-100 hover:border-neutral-700
                         transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.033l.312.311a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-10.624-2.85a5.5 5.5 0 019.201-2.465l.312.311H11.77a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V3.53a.75.75 0 00-1.5 0v2.034l-.312-.312A7 7 0 002.63 8.39a.75.75 0 001.45.388z"
                  clipRule="evenodd"
                />
              </svg>
              Plan another date
            </button>
          </div>
        )}

        <History />
      </div>

      <footer className="w-full max-w-2xl pt-16 pb-4 text-center">
        <p className="text-xs text-neutral-600">
          Built with Claude &middot; Paste a link, plan a night
        </p>
      </footer>
    </main>
  );
}
