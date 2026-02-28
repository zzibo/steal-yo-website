"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";
import { useState } from "react";

const sectionColors: Record<string, string> = {
  header: "#6366f1", hero: "#8b5cf6", features: "#06b6d4", content: "#10b981",
  cta: "#f59e0b", footer: "#64748b", sidebar: "#ec4899", navigation: "#6366f1", other: "#737373",
};

const sectionHeights: Record<string, number> = {
  header: 48, hero: 160, features: 120, content: 100,
  cta: 64, footer: 56, sidebar: 100, navigation: 40, other: 80,
};

const layoutIcons: Record<string, string> = {
  grid: "▦", flex: "⇔", stack: "≡", float: "⊞", other: "□",
};

export function LayoutTab() {
  const { results } = useCrawlStore();
  const layout = results[0]?.layout;
  const [selectedSection, setSelectedSection] = useState<number | null>(null);

  if (!layout) return <p className="text-[var(--muted)]">No layout data extracted.</p>;

  return (
    <div className="space-y-12">
      {/* Visual Wireframe */}
      <section className="bg-blueprint rounded-none p-8">
        <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Page Wireframe</h2>
        <div className="mx-auto max-w-xl overflow-hidden border-2 border-[var(--border)] bg-white/80">
          {layout.sections.map((section, i) => {
            const color = sectionColors[section.type] ?? sectionColors.other;
            const height = sectionHeights[section.type] ?? sectionHeights.other;
            const isSelected = selectedSection === i;

            return (
              <motion.div
                key={`${section.name}-${i}`}
                initial={{ opacity: 0, scaleY: 0.8 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: i * 0.06, type: "spring", damping: 25 }}
                onClick={() => setSelectedSection(isSelected ? null : i)}
                className="relative cursor-pointer border-b border-dashed transition-all"
                style={{
                  borderColor: color,
                  minHeight: `${height}px`,
                  backgroundColor: `${color}08`,
                  borderLeftWidth: "4px",
                  borderLeftStyle: "solid",
                  borderLeftColor: color,
                }}
              >
                {/* Section label */}
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg" style={{ color }} title={section.layoutMethod}>
                      {layoutIcons[section.layoutMethod] ?? layoutIcons.other}
                    </span>
                    <span className="text-sm font-medium" style={{ color }}>{section.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: color }}>
                      {section.type}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color }}>
                      {section.layoutMethod}
                    </span>
                  </div>
                </div>

                {/* Visual block representation */}
                <div className="px-4 pb-3">
                  {section.layoutMethod === "grid" && (
                    <div className="grid grid-cols-3 gap-1">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="h-6 rounded-sm" style={{ backgroundColor: `${color}20`, border: `1px dashed ${color}40` }} />
                      ))}
                    </div>
                  )}
                  {section.layoutMethod === "flex" && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="h-6 flex-1 rounded-sm" style={{ backgroundColor: `${color}20`, border: `1px dashed ${color}40` }} />
                      ))}
                    </div>
                  )}
                  {(section.layoutMethod === "stack" || section.layoutMethod === "other" || section.layoutMethod === "float") && (
                    <div className="space-y-1">
                      <div className="h-3 w-3/4 rounded-sm" style={{ backgroundColor: `${color}15` }} />
                      <div className="h-3 w-1/2 rounded-sm" style={{ backgroundColor: `${color}10` }} />
                    </div>
                  )}
                </div>

                {/* Expanded detail */}
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="border-t border-dashed px-4 py-3"
                    style={{ borderColor: `${color}30`, backgroundColor: `${color}05` }}
                  >
                    <p className="font-hand mb-2 text-sm text-[var(--muted)]">{section.description}</p>
                    <pre className="overflow-x-auto rounded bg-[var(--code-bg)] p-2 font-mono text-xs text-[var(--code-fg)]">
                      <code>{section.htmlSnippet}</code>
                    </pre>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
        <p className="font-hand mt-4 text-center text-xs text-[var(--muted)]">
          Click a section to see details
        </p>
      </section>

      {layout.navigationStructure.length > 0 && (
        <section>
          <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Navigation</h2>
          <div className="flex flex-wrap gap-2">
            {layout.navigationStructure.map((nav) => (
              <span key={nav.href} className="border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--ink)]">
                {nav.label}
              </span>
            ))}
          </div>
        </section>
      )}

      {layout.responsiveBreakpoints.length > 0 && (
        <section>
          <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Breakpoints</h2>
          <div className="flex gap-4">
            {layout.responsiveBreakpoints.map((bp) => (
              <div key={bp} className="bg-[var(--surface)] px-4 py-3 text-center">
                <span className="font-mono text-lg font-medium text-[var(--ink)]">{bp}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
