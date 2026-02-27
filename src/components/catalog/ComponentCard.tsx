"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ExtractedComponent } from "@/lib/types";

export function ComponentCard({ component, index }: { component: ExtractedComponent; index: number }) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="border-b border-[var(--border)] bg-white p-6">
        <iframe
          srcDoc={`<!DOCTYPE html><html><head><style>body{margin:0;padding:16px;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:60px;}${component.css}</style></head><body>${component.html}</body></html>`}
          className="h-24 w-full border-0"
          sandbox="allow-same-origin"
          title={component.name}
        />
      </div>

      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">{component.name}</h3>
          <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs text-[var(--accent)]">
            {component.category}
          </span>
        </div>
        <p className="mb-3 text-sm text-[var(--muted)]">{component.description}</p>

        {component.variants.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {component.variants.map((v) => (
              <span key={v} className="rounded-md bg-[var(--background)] px-2 py-0.5 text-xs text-[var(--muted)]">
                {v}
              </span>
            ))}
          </div>
        )}

        {component.attribution?.library && (
          <div className="mb-3 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-purple-400">{component.attribution.library}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                component.attribution.confidence === "high" ? "bg-green-500/10 text-green-400" :
                component.attribution.confidence === "medium" ? "bg-yellow-500/10 text-yellow-400" :
                "bg-red-500/10 text-red-400"
              }`}>{component.attribution.confidence}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">{component.attribution.reasoning}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setShowCode(!showCode)}
            className="rounded-lg bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-white"
          >
            {showCode ? "Hide Code" : "View Code"}
          </button>
          <button
            onClick={() => copy(component.html, "html")}
            className="rounded-lg bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-white"
          >
            {copied === "html" ? "Copied!" : "Copy HTML"}
          </button>
          <button
            onClick={() => copy(component.css, "css")}
            className="rounded-lg bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-white"
          >
            {copied === "css" ? "Copied!" : "Copy CSS"}
          </button>
        </div>

        {showCode && (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="mt-3 overflow-x-auto rounded-lg bg-[var(--background)] p-3 text-xs text-[var(--muted)]"
          >
            <code>{component.html}</code>
          </motion.pre>
        )}
      </div>
    </motion.div>
  );
}
