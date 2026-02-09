"use client";

import ReactMarkdown from "react-markdown";

interface TimelineProps {
  parts: Array<{ type: string; text?: string }>;
  isStreaming?: boolean;
}

export function Timeline({ parts, isStreaming }: TimelineProps) {
  const text = parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("");

  if (!text) return null;

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
      <div className="prose prose-invert prose-sm max-w-none
                      prose-headings:text-neutral-100 prose-headings:font-semibold
                      prose-strong:text-neutral-100
                      prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                      prose-li:text-neutral-300
                      prose-p:text-neutral-300">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
      {isStreaming && (
        <div className="mt-4 flex items-center gap-2 text-neutral-500 text-xs">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Planning...
        </div>
      )}
    </div>
  );
}
