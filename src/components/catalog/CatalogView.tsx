"use client";

import { useCrawlStore } from "@/lib/store";
import { TabBar } from "./TabBar";
import { ComponentsTab } from "./ComponentsTab";
import { VibeTab } from "./VibeTab";
import { LayoutTab } from "./LayoutTab";
import { TechStackTab } from "./TechStackTab";
import { exportStealKit } from "@/lib/export";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export function CatalogView() {
  const router = useRouter();
  const { results, activeTab, reset, url } = useCrawlStore();

  const handleNewCrawl = () => {
    reset();
    router.push("/");
  };

  const tabContent: Record<string, React.ReactNode> = {
    components: <ComponentsTab />,
    vibe: <VibeTab />,
    layout: <LayoutTab />,
    techstack: <TechStackTab />,
  };

  return (
    <div className="min-h-screen px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-dashed border-[var(--border)] pb-4">
        <div>
          <h1 className="font-serif text-2xl text-[var(--ink)]">steal yo website</h1>
          <p className="font-hand text-sm text-[var(--muted)]">
            {url} &mdash; {results.length} page(s) analyzed
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportStealKit(results)}
            className="bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
          >
            Export Steal Kit
          </button>
          <button
            onClick={handleNewCrawl}
            className="border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink-light)] transition hover:bg-[var(--surface)]"
          >
            New Crawl
          </button>
        </div>
      </div>

      {/* Hero screenshot */}
      {results[0]?.screenshot && (
        <div className="mx-auto mb-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, rotate: -3, y: 20 }}
            animate={{ opacity: 1, rotate: -2, y: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="tape bg-white p-4 pb-12 shadow-lg"
            style={{ boxShadow: "4px 6px 20px var(--shadow)" }}
          >
            <img src={results[0].screenshot} alt="Page screenshot" className="w-full" />
            <p className="font-hand mt-2 text-center text-sm text-[var(--muted)]">{url}</p>
          </motion.div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8">
        <TabBar />
      </div>

      {/* Content with page-turn transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          {tabContent[activeTab]}
        </motion.div>
      </AnimatePresence>

      {/* Footer disclaimer */}
      <div className="mt-16 border-t border-dashed border-[var(--border)] pt-4 text-center">
        <p className="font-hand text-xs text-[var(--muted)]">
          Analysis of {url} &mdash; for inspiration and learning only
        </p>
      </div>
    </div>
  );
}
