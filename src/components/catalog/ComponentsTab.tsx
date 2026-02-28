"use client";

import { useCrawlStore } from "@/lib/store";
import { ComponentCard } from "./ComponentCard";
import { useState } from "react";

export function ComponentsTab() {
  const { results } = useCrawlStore();
  const techStack = results[0]?.techStack;
  const extractedStyles = results[0]?.extractedStyles;
  const externalStylesheets = results[0]?.externalStylesheets;
  const fontFamilies = results[0]?.design?.typography?.fontFamilies;
  const allComponents = results.flatMap((r) => r.components.components);
  const [filter, setFilter] = useState("all");

  const categories = ["all", ...new Set(allComponents.map((c) => c.category))];
  const filtered = filter === "all" ? allComponents : allComponents.filter((c) => c.category === filter);

  if (allComponents.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-2xl text-[var(--ink)]">No components found</p>
        <p className="font-hand mt-2 text-[var(--muted)]">Try crawling a different URL or increasing depth</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              filter === cat
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="columns-1 gap-6 md:columns-2 lg:columns-3">
        {filtered.map((component, i) => (
          <div key={`${component.name}-${i}`} className="mb-6 break-inside-avoid">
            <ComponentCard
              component={component}
              index={i}
              techStack={techStack}
              extractedStyles={extractedStyles}
              externalStylesheets={externalStylesheets}
              fontFamilies={fontFamilies}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
