"use client";

import { useState } from "react";
import { LinkInput } from "@/components/LinkInput";
import { DateCard } from "@/components/DateCard";
import { CardSkeleton } from "@/components/CardSkeleton";
import type { Card } from "@/lib/card";

export default function Home() {
  const [input, setInput] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const url = input.trim();
    setIsLoading(true);
    setError(null);
    setCard(null);
    setInput("");

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }

      const data = await res.json();
      setCard(data.card);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setCard(null);
    setInput("");
    setError(null);
  }

  const cardUrl = card ? `${window.location.origin}/d/${card.slug}` : "";

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-8 flex-1">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-serif text-5xl font-bold tracking-tight">
            DateDrop
          </h1>
          <p className="text-neutral-400">
            Paste an Instagram or TikTok link. Get a shareable date card.
          </p>
        </div>

        {/* Input */}
        <LinkInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-950/50 border border-red-900 p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && <CardSkeleton />}

        {/* Card result */}
        {card && !isLoading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <DateCard card={card} />

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(cardUrl);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-white text-neutral-900 px-5 py-2.5 text-sm font-medium hover:bg-neutral-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
                  <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
                </svg>
                Copy link
              </button>
              <a
                href={`/d/${card.slug}`}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
              >
                View card
              </a>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.033l.312.311a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-10.624-2.85a5.5 5.5 0 019.201-2.465l.312.311H11.77a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V3.53a.75.75 0 00-1.5 0v2.034l-.312-.312A7 7 0 002.63 8.39a.75.75 0 001.45.388z" clipRule="evenodd" />
                </svg>
                New card
              </button>
            </div>
          </div>
        )}

        {/* Feed link */}
        <div className="text-center pt-8">
          <a
            href="/feed"
            className="text-sm text-neutral-500 hover:text-neutral-300 underline underline-offset-4 transition-colors"
          >
            Browse all date cards
          </a>
        </div>
      </div>

      <footer className="w-full max-w-2xl pt-16 pb-4 text-center">
        <p className="text-xs text-neutral-600">
          DateDrop &middot; Paste a link, plan a night
        </p>
      </footer>
    </main>
  );
}
