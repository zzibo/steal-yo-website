"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

function StackCard({ title, data, index }: {
  title: string;
  data?: { name: string; version?: string; confidence: string; evidence: string[] };
  index: number;
}) {
  if (!data) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
          data.confidence === "high" ? "bg-green-500/10 text-green-400" :
          data.confidence === "medium" ? "bg-yellow-500/10 text-yellow-400" :
          "bg-red-500/10 text-red-400"
        }`}>
          {data.confidence}
        </span>
      </div>
      <p className="mb-4 text-2xl font-bold text-[var(--accent)]">
        {data.name}{data.version && <span className="ml-2 text-base text-[var(--muted)]">v{data.version}</span>}
      </p>
      <div className="space-y-1">
        {data.evidence.map((e, i) => (
          <p key={i} className="text-sm text-[var(--muted)]">&bull; {e}</p>
        ))}
      </div>
    </motion.div>
  );
}

export function TechStackTab() {
  const { results } = useCrawlStore();
  const ts = results[0]?.techStack;

  if (!ts) return <p className="text-[var(--muted)]">No tech stack data available.</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <StackCard title="Framework" data={ts.framework} index={0} />
        <StackCard title="CSS Framework" data={ts.cssFramework} index={1} />
        <StackCard title="Component Library" data={ts.componentLibrary} index={2} />
        <StackCard title="Build Tool" data={ts.buildTool} index={3} />
      </div>

      {ts.metaFramework && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="mb-3 text-lg font-semibold">Meta-Framework Features</h3>
          <div className="flex flex-wrap gap-2">
            {ts.metaFramework.features.map((f) => (
              <span key={f} className="rounded-lg bg-[var(--accent)]/10 px-3 py-1.5 text-sm text-[var(--accent)]">{f}</span>
            ))}
          </div>
        </motion.div>
      )}

      {ts.otherLibraries.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="mb-4 text-lg font-semibold">Other Libraries</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ts.otherLibraries.map((lib, i) => (
              <div key={i} className="rounded-lg bg-[var(--background)] p-3">
                <p className="font-medium">{lib.name}</p>
                <p className="text-xs text-[var(--muted)]">{lib.category}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
