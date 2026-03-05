"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

export function VibeTab() {
  const { results } = useCrawlStore();
  const design = results[0]?.design;

  if (!design?.styleClassification) return <p className="text-[var(--muted)]">No design data captured.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-[var(--border)] bg-[#faf6ee] p-8 shadow-sm"
        style={{ transform: "rotate(-0.5deg)" }}
      >
        <h2 className="font-serif mb-6 text-2xl text-[var(--ink)]">Design System</h2>
        <div className="space-y-4 font-serif text-base leading-relaxed text-[var(--ink-light)]">
          <p><strong>Style:</strong> {design.styleClassification.primary}</p>
          <p>{design.styleClassification.summary}</p>
          {design.colorPalette.length > 0 && (
            <div>
              <strong>Colors:</strong>
              <div className="mt-2 flex flex-wrap gap-2">
                {design.colorPalette.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] px-2 py-1 text-sm">
                    <span className="inline-block h-3 w-3 rounded-full border border-[var(--border)]" style={{ backgroundColor: c.hex }} />
                    {c.name} ({c.role})
                  </span>
                ))}
              </div>
            </div>
          )}
          {design.typography.length > 0 && (
            <div>
              <strong>Typography:</strong>
              {design.typography.map((t, i) => (
                <p key={i} className="ml-4">{t.family} ({t.role}) - {t.style}</p>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
