"use client";

import { create } from "zustand";
import type { CrawlResult } from "./types";

export const LOADING_STAGES = [
  { label: "Crawling pages", detail: "Fetching HTML, screenshots, and assets" },
  { label: "Detecting tech stack", detail: "Identifying frameworks and libraries" },
  { label: "Analyzing layout", detail: "Mapping page sections and structure" },
  { label: "Extracting components", detail: "Finding standout UI patterns" },
  { label: "Reading the vibe", detail: "Capturing design philosophy and aesthetic" },
] as const;

interface CrawlState {
  url: string;
  depth: number;
  status: "idle" | "loading" | "done" | "error";
  loadingStage: number;
  error: string | null;
  results: CrawlResult[];
  activeTab: "components" | "vibe" | "layout" | "techstack";

  setUrl: (url: string) => void;
  setDepth: (depth: number) => void;
  setActiveTab: (tab: CrawlState["activeTab"]) => void;
  advanceStage: () => void;
  startCrawl: () => Promise<void>;
  reset: () => void;
}

export const useCrawlStore = create<CrawlState>((set, get) => ({
  url: "",
  depth: 1,
  status: "idle",
  loadingStage: 0,
  error: null,
  results: [],
  activeTab: "components",

  setUrl: (url) => set({ url }),
  setDepth: (depth) => set({ depth }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  advanceStage: () => {
    const { loadingStage } = get();
    if (loadingStage < LOADING_STAGES.length - 1) {
      set({ loadingStage: loadingStage + 1 });
    }
  },

  startCrawl: async () => {
    const { url, depth } = get();
    set({ status: "loading", loadingStage: 0, error: null, results: [] });

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
      loadingStage: 0,
      error: null,
      results: [],
      activeTab: "components",
    }),
}));
