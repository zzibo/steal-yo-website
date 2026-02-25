"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

const sectionColors: Record<string, string> = {
  header: "#6366f1",
  hero: "#8b5cf6",
  features: "#06b6d4",
  content: "#10b981",
  cta: "#f59e0b",
  footer: "#64748b",
  sidebar: "#ec4899",
  navigation: "#6366f1",
  other: "#737373",
};

export function LayoutTab() {
  const { results } = useCrawlStore();
  const layout = results[0]?.layout;

  if (!layout) {
    return <p className="text-[var(--muted)]">No layout data extracted.</p>;
  }

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-6 text-xl font-semibold">Page Structure</h2>
        <div className="mx-auto max-w-2xl space-y-3">
          {layout.sections.map((section, i) => (
            <motion.div
              key={section.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="overflow-hidden rounded-xl border border-[var(--border)]"
              style={{ borderLeftColor: sectionColors[section.type] ?? sectionColors.other, borderLeftWidth: 4 }}
            >
              <div className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-medium">{section.name}</h3>
                  <p className="text-sm text-[var(--muted)]">{section.description}</p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs text-[var(--muted)]">
                    {section.type}
                  </span>
                  <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs text-[var(--accent)]">
                    {section.layoutMethod}
                  </span>
                </div>
              </div>
              <pre className="border-t border-[var(--border)] bg-[var(--background)] p-3 text-xs text-[var(--muted)]">
                <code>{section.htmlSnippet}</code>
              </pre>
            </motion.div>
          ))}
        </div>
      </section>

      {layout.navigationStructure.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold">Navigation</h2>
          <div className="flex flex-wrap gap-2">
            {layout.navigationStructure.map((nav) => (
              <span
                key={nav.href}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
              >
                {nav.label}
              </span>
            ))}
          </div>
        </section>
      )}

      {layout.responsiveBreakpoints.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold">Responsive Breakpoints</h2>
          <div className="flex gap-4">
            {layout.responsiveBreakpoints.map((bp) => (
              <div key={bp} className="rounded-xl bg-[var(--surface)] px-4 py-3 text-center">
                <span className="font-mono text-lg font-medium">{bp}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
