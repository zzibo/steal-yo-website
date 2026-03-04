"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

export function VibeTab() {
  const { results } = useCrawlStore();
  const vibe = results[0]?.vibe;

  if (!vibe?.vibe) return <p className="text-[var(--muted)]">No vibe captured.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-[var(--border)] bg-[#faf6ee] p-8 shadow-sm"
        style={{ transform: "rotate(-0.5deg)" }}
      >
        <h2 className="font-serif mb-6 text-2xl text-[var(--ink)]">Design Vibe</h2>
        <div className="space-y-4 font-serif text-base leading-relaxed text-[var(--ink-light)]">
          {vibe.vibe.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
