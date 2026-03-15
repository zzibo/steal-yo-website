"use client";

import { useCrawlStore } from "@/lib/store";
import { ComponentsTab } from "./ComponentsTab";
import { DesignTab } from "./DesignTab";
import { LayoutTab } from "./LayoutTab";
import { TechStackTab } from "./TechStackTab";
import { DnaStrip } from "./DnaStrip";
import { SectionNav } from "./SectionNav";
import { exportStealKit } from "@/lib/export";
import { motion } from "framer-motion";

/* Skeleton placeholders for sections still loading */
function SkeletonBlock({ lines = 4, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-3 border border-[var(--border)] bg-[var(--surface)] p-6 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded bg-[var(--border)]"
          style={{ width: `${70 - i * 10}%`, animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}

function DesignSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock lines={3} />
      <div className="flex gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 w-16 animate-pulse rounded border border-[var(--border)] bg-[var(--border)]" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
      <SkeletonBlock lines={4} />
    </div>
  );
}

function ComponentsSkeleton() {
  return (
    <div className="columns-1 gap-6 md:columns-2 lg:columns-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="mb-6 break-inside-avoid">
          <div className="border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
            <div className="h-32 animate-pulse rounded bg-[var(--border)]" style={{ animationDelay: `${i * 80}ms` }} />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--border)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LayoutSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse border border-dashed border-[var(--border)] p-4"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="mb-2 h-4 w-1/4 rounded bg-[var(--border)]" />
          <div className="h-12 rounded bg-[var(--border)] opacity-50" />
        </div>
      ))}
    </div>
  );
}

function SectionSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
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
  const { results, reset, url, status, screenshot, pageCount, design, components, layout, techStack } = useCrawlStore();

  const handleNewCrawl = () => {
    reset();
  };

  const isDone = status === "done";
  const displayPageCount = isDone ? results.length : pageCount;

  return (
    <div className="relative min-h-screen px-6 py-8">
      <SectionNav />

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

      {/* DNA Strip */}
      <div id="dna" className="mb-10 scroll-mt-8">
        <DnaStrip />
      </div>

      {/* Design */}
      <div id="design" className="mb-12 scroll-mt-8">
        <h2 className="font-serif mb-4 text-xl text-[var(--ink)] border-b border-dashed border-[var(--border)] pb-2">
          Design System
        </h2>
        {design ? <DesignTab /> : <><SectionSpinner label="design system" /><DesignSkeleton /></>}
      </div>

      {/* Components */}
      <div id="components" className="mb-12 scroll-mt-8">
        <h2 className="font-serif mb-4 text-xl text-[var(--ink)] border-b border-dashed border-[var(--border)] pb-2">
          Components
        </h2>
        {components ? <ComponentsTab /> : <><SectionSpinner label="components" /><ComponentsSkeleton /></>}
      </div>

      {/* Layout */}
      <div id="layout" className="mb-12 scroll-mt-8">
        <h2 className="font-serif mb-4 text-xl text-[var(--ink)] border-b border-dashed border-[var(--border)] pb-2">
          Layout
        </h2>
        {layout ? <LayoutTab /> : <><SectionSpinner label="layout" /><LayoutSkeleton /></>}
      </div>

      {/* Tech Stack */}
      {(techStack || !isDone) && (
        <div id="techstack" className="mb-12 scroll-mt-8">
          <h2 className="font-serif mb-4 text-xl text-[var(--ink)] border-b border-dashed border-[var(--border)] pb-2">
            Tech Stack
          </h2>
          {techStack ? <TechStackTab /> : <SectionSpinner label="tech stack" />}
        </div>
      )}

      {/* Footer disclaimer */}
      <div className="mt-16 border-t border-dashed border-[var(--border)] pt-4 text-center">
        <p className="font-hand text-xs text-[var(--muted)]">
          Analysis of {url} &mdash; for inspiration and learning only
        </p>
      </div>
    </div>
  );
}
