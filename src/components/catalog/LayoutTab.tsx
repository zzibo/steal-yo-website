"use client";

import { useCrawlStore } from "@/lib/store";
import { ComponentCard } from "./ComponentCard";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import type { LayoutSection, ExtractedComponent } from "@/lib/types";

const sectionColors: Record<string, string> = {
  header: "#6366f1", hero: "#8b5cf6", features: "#06b6d4", content: "#10b981",
  cta: "#f59e0b", footer: "#64748b", sidebar: "#ec4899", navigation: "#6366f1", other: "#737373",
};

// Map component categories to layout section types they likely belong to
const CATEGORY_TO_SECTION: Record<string, string[]> = {
  navbar: ["header", "navigation"],
  hero: ["hero"],
  button: ["cta", "hero", "features"],
  card: ["features", "content"],
  form: ["cta", "content"],
  footer: ["footer"],
  badge: ["features", "content"],
  input: ["cta", "content"],
  modal: [],
  other: [],
};

function matchComponentsToSections(
  sections: LayoutSection[],
  components: ExtractedComponent[],
): Map<number, ExtractedComponent[]> {
  const map = new Map<number, ExtractedComponent[]>();
  const placed = new Set<number>();

  // First pass: match by category → section type
  for (let ci = 0; ci < components.length; ci++) {
    const comp = components[ci];
    const targetTypes = CATEGORY_TO_SECTION[comp.category] ?? [];

    for (const targetType of targetTypes) {
      const sectionIdx = sections.findIndex((s) => s.type === targetType);
      if (sectionIdx !== -1) {
        if (!map.has(sectionIdx)) map.set(sectionIdx, []);
        map.get(sectionIdx)!.push(comp);
        placed.add(ci);
        break;
      }
    }
  }

  // Second pass: match by name similarity (fuzzy)
  for (let ci = 0; ci < components.length; ci++) {
    if (placed.has(ci)) continue;
    const comp = components[ci];
    const nameLC = comp.name.toLowerCase();

    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      if (
        nameLC.includes(section.type) ||
        nameLC.includes(section.name.toLowerCase()) ||
        section.name.toLowerCase().includes(comp.category) ||
        section.description.toLowerCase().includes(nameLC)
      ) {
        if (!map.has(si)) map.set(si, []);
        map.get(si)!.push(comp);
        placed.add(ci);
        break;
      }
    }
  }

  // Remaining unmatched: put in the first "content" or "features" section, or last section
  const contentIdx = sections.findIndex((s) => s.type === "content" || s.type === "features");
  const fallbackIdx = contentIdx !== -1 ? contentIdx : sections.length - 1;

  for (let ci = 0; ci < components.length; ci++) {
    if (placed.has(ci)) continue;
    if (fallbackIdx >= 0) {
      if (!map.has(fallbackIdx)) map.set(fallbackIdx, []);
      map.get(fallbackIdx)!.push(components[ci]);
    }
  }

  return map;
}

export function LayoutTab() {
  const { results, layout: streamedLayout, components: streamedComponents, techStack: streamedTechStack } = useCrawlStore();
  const layout = streamedLayout || results[0]?.layout;
  const allComponents = streamedComponents?.components ?? results.flatMap((r) => r.components.components);
  const techStack = streamedTechStack || results[0]?.techStack;
  const extractedStyles = results[0]?.extractedStyles;
  const externalStylesheets = results[0]?.externalStylesheets;
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  // 1.3: Memoize the O(n*m) matching computation
  const sectionComponents = useMemo(
    () => layout ? matchComponentsToSections(layout.sections, allComponents) : new Map<number, ExtractedComponent[]>(),
    [layout?.sections, allComponents],
  );

  if (!layout) return <p className="text-[var(--muted)]">No layout data extracted.</p>;

  return (
    <div className="space-y-10">
      {/* Page recreation */}
      <div className="mx-auto max-w-3xl">
        <p className="font-hand mb-4 text-center text-sm text-[var(--muted)]">
          Scroll to explore the page structure with extracted components
        </p>

        {/* Browser chrome frame */}
        <div className="overflow-hidden border border-[var(--border)] bg-white shadow-lg" style={{ borderRadius: "8px 8px 0 0" }}>
          {/* Browser top bar */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[#f5f3ef] px-4 py-2">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <div className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="ml-4 flex-1 rounded bg-white px-3 py-1 text-xs text-[var(--muted)] border border-[var(--border)]">
              {results[0]?.url || ""}
            </div>
          </div>

          {/* Page content — scrollable sections */}
          <div className="relative">
            {layout.sections.map((section, i) => {
              const color = sectionColors[section.type] ?? sectionColors.other;
              const matched = sectionComponents.get(i) ?? [];
              const isExpanded = expandedSection === i;

              return (
                <motion.div
                  key={`${section.name}-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative border-b border-dashed transition-colors"
                  style={{
                    borderColor: `${color}30`,
                    backgroundColor: `${color}06`,
                  }}
                >
                  {/* Section label overlay */}
                  <div
                    className="flex cursor-pointer items-center justify-between px-4 py-2"
                    style={{ borderLeft: `3px solid ${color}` }}
                    onClick={() => setExpandedSection(isExpanded ? null : i)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                        style={{ backgroundColor: color }}
                      >
                        {section.type}
                      </span>
                      <span className="text-sm font-medium text-[var(--ink)]">{section.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--muted)]">
                      {matched.length > 0 && `${matched.length} component${matched.length > 1 ? "s" : ""} · `}
                      {section.layoutMethod}
                    </span>
                  </div>

                  {/* Section body — shows layout representation + matched components */}
                  <div className="px-4 pb-4" style={{ borderLeft: `3px solid ${color}40` }}>
                    {/* Description */}
                    <p className="font-hand mb-3 text-xs text-[var(--muted)]">{section.description}</p>

                    {/* 1.2: Only render ComponentCards when section is expanded */}
                    {matched.length > 0 && isExpanded && (
                      <div className={
                        section.layoutMethod === "grid"
                          ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
                          : section.layoutMethod === "flex"
                          ? "flex flex-wrap gap-4"
                          : "space-y-4"
                      }>
                        {matched.map((comp, ci) => (
                          <div key={`${comp.name}-${ci}`} className={
                            section.layoutMethod === "flex" ? "flex-1 min-w-[200px]" : ""
                          }>
                            <ComponentCard
                              component={comp}
                              index={i * 10 + ci}
                              techStack={techStack}
                              extractedStyles={extractedStyles}
                              externalStylesheets={externalStylesheets}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Collapsed summary when section has components but isn't expanded */}
                    {matched.length > 0 && !isExpanded && (
                      <p className="text-xs text-[var(--muted)] italic">
                        {matched.length} component{matched.length > 1 ? "s" : ""} — click to expand
                      </p>
                    )}

                    {/* If no components, show wireframe placeholder */}
                    {matched.length === 0 && (
                      <div className="rounded border border-dashed p-4" style={{ borderColor: `${color}30` }}>
                        {section.layoutMethod === "grid" && (
                          <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((n) => (
                              <div key={n} className="h-10 rounded" style={{ backgroundColor: `${color}12` }} />
                            ))}
                          </div>
                        )}
                        {section.layoutMethod === "flex" && (
                          <div className="flex gap-2">
                            {[1, 2, 3, 4].map((n) => (
                              <div key={n} className="h-8 flex-1 rounded" style={{ backgroundColor: `${color}12` }} />
                            ))}
                          </div>
                        )}
                        {(section.layoutMethod === "stack" || section.layoutMethod === "other" || section.layoutMethod === "float") && (
                          <div className="space-y-2">
                            <div className="h-4 w-3/4 rounded" style={{ backgroundColor: `${color}12` }} />
                            <div className="h-4 w-1/2 rounded" style={{ backgroundColor: `${color}08` }} />
                            <div className="h-4 w-2/3 rounded" style={{ backgroundColor: `${color}06` }} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* HTML snippet toggle */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 overflow-hidden"
                        >
                          <pre className="overflow-x-auto rounded bg-[var(--code-bg)] p-3 font-mono text-xs text-[var(--code-fg)]">
                            <code>{section.htmlSnippet}</code>
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation and breakpoints below */}
      <div className="mx-auto max-w-3xl grid gap-8 md:grid-cols-2">
        {layout.navigationStructure.length > 0 && (
          <section>
            <h3 className="font-serif mb-3 text-lg text-[var(--ink)]">Navigation</h3>
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
            <h3 className="font-serif mb-3 text-lg text-[var(--ink)]">Breakpoints</h3>
            <div className="flex flex-wrap gap-3">
              {layout.responsiveBreakpoints.map((bp) => (
                <div key={bp} className="bg-[var(--surface)] px-4 py-2 text-center border border-[var(--border)]">
                  <span className="font-mono text-sm font-medium text-[var(--ink)]">{bp}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
