"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";
import { toast } from "sonner";

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`Copied ${label}`);
}

export function DesignTab() {
  const { results, design: streamedDesign } = useCrawlStore();
  const design = streamedDesign || results[0]?.design;

  if (!design) return <p className="text-[var(--muted)]">No design data extracted.</p>;

  return (
    <div className="space-y-8">
      {/* Style Classification */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <h3 className="font-serif mb-4 text-lg text-[var(--ink)]">Style</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="bg-[var(--accent)] px-3 py-1 text-sm font-medium text-white">
            {design.styleClassification.primary}
          </span>
          {design.styleClassification.secondary.map((tag) => (
            <span key={tag} className="border border-[var(--border)] px-3 py-1 text-sm text-[var(--muted)]">
              {tag}
            </span>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-[var(--ink-light)]">
          {design.styleClassification.summary}
        </p>
      </motion.div>

      {/* Color Palette */}
      {design.colorPalette.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="border border-[var(--border)] bg-[var(--surface)] p-6"
        >
          <h3 className="font-serif mb-4 text-lg text-[var(--ink)]">Color Palette</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {design.colorPalette.map((color, i) => (
              <div key={`${color.hex}-${i}`} className="text-center">
                <button
                  onClick={() => copyToClipboard(color.hex, color.hex)}
                  className="mx-auto mb-2 h-16 w-16 border border-[var(--border)] cursor-pointer hover:scale-110 active:scale-95 transition"
                  style={{ backgroundColor: color.hex }}
                  title={`Click to copy ${color.hex}`}
                />
                <p className="font-mono text-xs text-[var(--ink)]">{color.hex}</p>
                <p className="text-[10px] text-[var(--muted)]">{color.role}</p>
                <p className="text-[10px] text-[var(--ink-light)]">{color.name}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Typography */}
      {design.typography.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-[var(--border)] bg-[var(--surface)] p-6"
        >
          <h3 className="font-serif mb-4 text-lg text-[var(--ink)]">Typography</h3>
          <div className="space-y-4">
            {design.typography.map((font, i) => (
              <div key={`${font.family}-${i}`} className="flex items-start justify-between border-b border-dashed border-[var(--border)] pb-3 last:border-0">
                <div>
                  <button
                    onClick={() => copyToClipboard(font.family, font.family)}
                    className="text-sm font-medium text-[var(--ink)] cursor-pointer hover:text-[var(--accent)] transition text-left"
                    title={`Click to copy "${font.family}"`}
                  >
                    {font.family}
                  </button>
                  <p className="text-xs text-[var(--muted)]">{font.style}</p>
                  {font.weights.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {font.weights.map((w) => (
                        <span key={w} className="bg-[var(--background)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">{w}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-[var(--accent)]">{font.role}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Spacing & Effects */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <h3 className="font-serif mb-4 text-lg text-[var(--ink)]">Spacing & Effects</h3>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">Spacing</p>
            <p className="text-sm text-[var(--ink)]">{design.spacing.system}</p>
            <p className="text-xs text-[var(--accent)]">{design.spacing.density}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">Corners</p>
            <p className="text-sm text-[var(--ink)]">{design.effects.borderRadius}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">Shadows</p>
            <p className="text-sm text-[var(--ink)]">{design.effects.shadows}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">Animation</p>
            <p className="text-sm text-[var(--ink)]">{design.effects.animations}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
