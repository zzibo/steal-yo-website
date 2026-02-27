"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";
import { useState } from "react";

export function DesignTab() {
  const { results } = useCrawlStore();
  const design = results[0]?.design;
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  if (!design) return <p className="text-[var(--muted)]">No design data extracted.</p>;

  const copyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  return (
    <div className="space-y-16">
      {/* Color Palette — Paint Chips */}
      <section>
        <h2 className="font-serif mb-8 text-2xl text-[var(--ink)]">Color Palette</h2>
        <div className="flex flex-wrap gap-4">
          {design.colors.map((color, i) => (
            <motion.div
              key={color.hex}
              initial={{ opacity: 0, y: -20, rotate: (i * 7 % 5) - 2 }}
              animate={{ opacity: 1, y: 0, rotate: (i * 7 % 5) - 2 }}
              whileHover={{ y: -12, rotate: 0, scale: 1.05, zIndex: 10 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => copyColor(color.hex)}
              className="w-20 cursor-pointer torn-bottom"
            >
              <div className="h-28 w-full" style={{ backgroundColor: color.hex }} />
              <div className="bg-[var(--surface)] px-2 py-2">
                <p className="font-hand text-xs text-[var(--ink)]">{color.name}</p>
                <p className="font-mono text-[10px] text-[var(--muted)]">
                  {copiedHex === color.hex ? "Copied!" : color.hex}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Typography — Specimen Sheet */}
      <section>
        <h2 className="font-serif mb-8 text-2xl text-[var(--ink)]">Type Specimen</h2>
        <div className="mb-6 flex flex-wrap gap-3">
          {design.typography.fontFamilies.map((font) => (
            <span key={font} className="border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-lg" style={{ fontFamily: font }}>
              {font}
            </span>
          ))}
        </div>
        <div className="space-y-0">
          {design.typography.scale.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-baseline justify-between border-b border-dotted border-[var(--border)] py-4"
            >
              <span style={{ fontSize: item.size, fontWeight: item.weight, lineHeight: item.lineHeight }}>
                {item.name}
              </span>
              <span className="font-mono text-xs text-[var(--muted)]">
                {item.size} / {item.weight} / {item.lineHeight}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Border Radius & Shadows */}
      <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
        <section>
          <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Border Radius</h2>
          <div className="flex flex-wrap gap-4">
            {design.borderRadius.map((radius) => (
              <div key={radius} className="text-center">
                <div className="mb-2 h-16 w-16 border-2 border-[var(--accent)] bg-[var(--surface)]" style={{ borderRadius: radius }} />
                <span className="font-mono text-xs text-[var(--muted)]">{radius}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Shadows</h2>
          <div className="space-y-4">
            {design.shadows.map((shadow) => (
              <div key={shadow} className="bg-[var(--surface)] p-4" style={{ boxShadow: shadow }}>
                <span className="font-mono text-xs text-[var(--muted)]">{shadow}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
