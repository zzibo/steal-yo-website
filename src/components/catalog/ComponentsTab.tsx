"use client";

import { useCrawlStore } from "@/lib/store";
import { ComponentCard } from "./ComponentCard";

export function ComponentsTab() {
  const { results } = useCrawlStore();
  const allComponents = results.flatMap((r) => r.components.components);

  if (allComponents.length === 0) {
    return <p className="text-[var(--muted)]">No components extracted.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {allComponents.map((component, i) => (
        <ComponentCard key={`${component.name}-${i}`} component={component} index={i} />
      ))}
    </div>
  );
}
