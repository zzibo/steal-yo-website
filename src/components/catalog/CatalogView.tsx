"use client";

import { useCrawlStore } from "@/lib/store";
import { TabBar } from "./TabBar";
import { ComponentsTab } from "./ComponentsTab";
import { DesignTab } from "./DesignTab";
import { LayoutTab } from "./LayoutTab";
import { ContentTab } from "./ContentTab";

export function CatalogView() {
  const { results, activeTab, reset, url } = useCrawlStore();

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalog</h1>
          <p className="text-sm text-[var(--muted)]">
            {url} &mdash; {results.length} page(s) analyzed
          </p>
        </div>
        <button
          onClick={reset}
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm transition hover:bg-[var(--surface)]"
        >
          New Crawl
        </button>
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
    </div>
  );
}
