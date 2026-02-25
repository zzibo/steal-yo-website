"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

export function DesignTab() {
  const { results } = useCrawlStore();
  const design = results[0]?.design;

  if (!design) {
    return <p className="text-[var(--muted)]">No design data extracted.</p>;
  }

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-6 text-xl font-semibold">Color Palette</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {design.colors.map((color, i) => (
            <motion.div
              key={color.hex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group cursor-pointer"
              onClick={() => navigator.clipboard.writeText(color.hex)}
            >
              <div
                className="mb-3 aspect-square rounded-2xl border border-[var(--border)] shadow-lg transition group-hover:scale-105"
                style={{ backgroundColor: color.hex }}
              />
              <p className="text-sm font-medium">{color.name}</p>
              <p className="font-mono text-xs text-[var(--muted)]">{color.hex}</p>
              <p className="text-xs text-[var(--muted)]">{color.usage}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-xl font-semibold">Typography</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {design.typography.fontFamilies.map((font) => (
            <span key={font} className="rounded-lg bg-[var(--surface)] px-3 py-1.5 text-sm">
              {font}
            </span>
          ))}
        </div>
        <div className="space-y-4">
          {design.typography.scale.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-baseline justify-between border-b border-[var(--border)] pb-4"
            >
              <span
                style={{
                  fontSize: item.size,
                  fontWeight: item.weight,
                  lineHeight: item.lineHeight,
                }}
              >
                {item.name}
              </span>
              <span className="font-mono text-xs text-[var(--muted)]">
                {item.size} / {item.weight} / {item.lineHeight}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <section>
          <h2 className="mb-6 text-xl font-semibold">Border Radius</h2>
          <div className="flex flex-wrap gap-4">
            {design.borderRadius.map((radius) => (
              <div key={radius} className="text-center">
                <div
                  className="mb-2 h-16 w-16 border-2 border-[var(--accent)] bg-[var(--surface)]"
                  style={{ borderRadius: radius }}
                />
                <span className="font-mono text-xs text-[var(--muted)]">{radius}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-xl font-semibold">Shadows</h2>
          <div className="space-y-4">
            {design.shadows.map((shadow) => (
              <div
                key={shadow}
                className="rounded-xl bg-white p-4"
                style={{ boxShadow: shadow }}
              >
                <span className="font-mono text-xs text-gray-500">{shadow}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
