"use client";

import { create } from "zustand";
import type { CrawlResult } from "./types";

interface CrawlState {
  url: string;
  depth: number;
  status: "idle" | "crawling" | "analyzing" | "done" | "error";
  error: string | null;
  results: CrawlResult[];
  activeTab: "components" | "design" | "layout" | "content";

  setUrl: (url: string) => void;
  setDepth: (depth: number) => void;
  setActiveTab: (tab: CrawlState["activeTab"]) => void;
  startCrawl: () => Promise<void>;
  reset: () => void;
}

export const useCrawlStore = create<CrawlState>((set, get) => ({
  url: "",
  depth: 1,
  status: "idle",
  error: null,
  results: [],
  activeTab: "components",

  setUrl: (url) => set({ url }),
  setDepth: (depth) => set({ depth }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  startCrawl: async () => {
    const { url, depth } = get();
    set({ status: "crawling", error: null, results: [] });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, depth }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Crawl failed");
      }

      set({ status: "analyzing" });
      const data = await res.json();
      set({ status: "done", results: data.results });
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  },

  reset: () =>
    set({
      url: "",
      depth: 1,
      status: "idle",
      error: null,
      results: [],
      activeTab: "components",
    }),
}));
