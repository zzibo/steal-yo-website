"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

function Sticker({ name, confidence, index }: { name: string; confidence: string; index: number }) {
  const rotation = ((index * 13) % 11) - 5;
  return (
    <motion.div
      initial={{ scale: 0, rotate: rotation * 2 }}
      animate={{ scale: 1, rotate: rotation }}
      transition={{ type: "spring", damping: 12, stiffness: 300, delay: index * 0.1 }}
      whileHover={{ scale: 1.1, rotate: 0, y: -4 }}
      className="inline-flex items-center gap-2 border-2 border-white bg-[var(--surface)] px-4 py-2 shadow-md"
    >
      <span className="text-sm font-semibold text-[var(--ink)]">{name}</span>
      <span className={`stamp px-1.5 py-0.5 text-[9px] ${
        confidence === "high" ? "text-[var(--accent-alt)]" : "text-[var(--muted)]"
      }`}>
        {confidence === "high" ? "confirmed" : "likely"}
      </span>
    </motion.div>
  );
}

function DetailCard({ title, data, index }: {
  title: string;
  data?: { name: string; version?: string; confidence: string; evidence: string[] };
  index: number;
}) {
  if (!data) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + index * 0.1 }}
      className="border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-lg text-[var(--ink)]">{title}</h3>
        <span className={`stamp px-2 py-1 text-[10px] ${
          data.confidence === "high" ? "text-[var(--accent-alt)]" : "text-[var(--muted)]"
        }`}>{data.confidence}</span>
      </div>
      <p className="mb-3 text-xl font-bold text-[var(--accent)]">
        {data.name}{data.version && <span className="ml-2 text-sm font-normal text-[var(--muted)]">v{data.version}</span>}
      </p>
      <div className="space-y-1">
        {data.evidence.map((e, i) => (
          <p key={i} className="text-xs text-[var(--muted)]">&bull; {e}</p>
        ))}
      </div>
    </motion.div>
  );
}

export function TechStackTab() {
  const { results } = useCrawlStore();
  const ts = results[0]?.techStack;

  if (!ts) return <p className="text-[var(--muted)]">No tech stack data available.</p>;

  const stickers = [ts.framework, ts.cssFramework, ts.componentLibrary, ts.buildTool].filter(Boolean);

  return (
    <div className="space-y-10">
      {/* Sticker Cluster */}
      <section className="flex flex-wrap items-center justify-center gap-4 py-8">
        {stickers.map((s, i) => (
          <Sticker key={s!.name} name={s!.name} confidence={s!.confidence} index={i} />
        ))}
      </section>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DetailCard title="Framework" data={ts.framework} index={0} />
        <DetailCard title="CSS Framework" data={ts.cssFramework} index={1} />
        <DetailCard title="Component Library" data={ts.componentLibrary} index={2} />
        <DetailCard title="Build Tool" data={ts.buildTool} index={3} />
      </div>

      {ts.otherLibraries.length > 0 && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          <h3 className="font-serif mb-4 text-lg text-[var(--ink)]">Other Libraries</h3>
          <div className="flex flex-wrap gap-3">
            {ts.otherLibraries.map((lib, i) => (
              <div key={i} className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <p className="text-sm font-medium text-[var(--ink)]">{lib.name}</p>
                <p className="font-hand text-xs text-[var(--muted)]">{lib.category}</p>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
