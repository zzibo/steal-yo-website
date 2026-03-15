"use client";

import { useCrawlStore } from "@/lib/store";
import { TabBar } from "./TabBar";
import { ComponentsTab } from "./ComponentsTab";
import { DesignTab } from "./DesignTab";
import { LayoutTab } from "./LayoutTab";
import { TechStackTab } from "./TechStackTab";
import { exportStealKit } from "@/lib/export";
import { motion, AnimatePresence } from "framer-motion";

function TabSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="block h-6 w-6 rounded-full border-2 border-[var(--accent)] border-t-transparent"
      />
      <p className="font-hand text-sm text-[var(--muted)]">Analyzing {label}...</p>
    </div>
  );
}

export function CatalogView() {
  const { results, activeTab, reset, url, status, screenshot, pageCount, design, components, layout, techStack } = useCrawlStore();

  const handleNewCrawl = () => {
    reset();
  };

  const isDone = status === "done";
  const displayPageCount = isDone ? results.length : pageCount;

  const tabContent: Record<string, React.ReactNode> = {
    design: design ? <DesignTab /> : <TabSpinner label="design system" />,
    components: components ? <ComponentsTab /> : <TabSpinner label="components" />,
    layout: layout ? <LayoutTab /> : <TabSpinner label="layout" />,
    techstack: techStack ? <TechStackTab /> : <TabSpinner label="tech stack" />,
  };

  return (
    <div className="min-h-screen px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-dashed border-[var(--border)] pb-4">
        <div>
          <h1 className="font-serif text-2xl text-[var(--ink)]">steal yo website</h1>
          <p className="font-hand text-sm text-[var(--muted)]">
            {url} &mdash; {displayPageCount} page(s) {isDone ? "analyzed" : "analyzing..."}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => isDone && exportStealKit(results)}
            disabled={!isDone}
            className="bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
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
      {screenshot && (
        <div className="mx-auto mb-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, rotate: -3, y: 20 }}
            animate={{ opacity: 1, rotate: -2, y: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="tape bg-white p-4 pb-12 shadow-lg"
            style={{ boxShadow: "4px 6px 20px var(--shadow)" }}
          >
            <img src={screenshot} alt="Page screenshot" className="w-full" />
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
