"use client";

import { useCrawlStore } from "@/lib/store";
import { TabBar } from "./TabBar";
import { ComponentsTab } from "./ComponentsTab";
import { DesignTab } from "./DesignTab";
import { LayoutTab } from "./LayoutTab";
import { ContentTab } from "./ContentTab";
import { TechStackTab } from "./TechStackTab";
import { exportStealKit } from "@/lib/export";

export function CatalogView() {
  const { results, activeTab, reset, url } = useCrawlStore();

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">steal yo website</h1>
          <p className="text-sm text-[var(--muted)]">
            {url} &mdash; {results.length} page(s) analyzed
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportStealKit(results)}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
          >
            Export Steal Kit
          </button>
          <button
            onClick={reset}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm transition hover:bg-[var(--surface)]"
          >
            New Crawl
          </button>
        </div>
      </div>

      {results[0]?.screenshot && (
        <div className="mb-8 overflow-hidden rounded-2xl border border-[var(--border)]">
          <img src={results[0].screenshot} alt="Page screenshot" className="w-full" />
        </div>
      )}

      <div className="mb-8">
        <TabBar />
      </div>

      {activeTab === "components" && <ComponentsTab />}
      {activeTab === "design" && <DesignTab />}
      {activeTab === "layout" && <LayoutTab />}
      {activeTab === "content" && <ContentTab />}
      {activeTab === "techstack" && <TechStackTab />}
    </div>
  );
}
