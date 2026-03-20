"use client";

import { create } from "zustand";
import type { CrawlResult, TechStackDetection, DesignAnalysis, LayoutAnalysis, ComponentAnalysis, SynthesizedResults } from "./types";

export type AnalysisStatus = "idle" | "crawling" | "analyzing" | "done" | "error";

interface CrawlState {
  url: string;
  depth: number;
  status: AnalysisStatus;
  error: string | null;

  // Incremental results (populated by SSE events)
  screenshot?: string;
  pageCount: number;
  techStack?: TechStackDetection;
  design?: DesignAnalysis;
  layout?: LayoutAnalysis;
  components?: ComponentAnalysis;
  extractedStyles?: string;
  externalStylesheets?: string[];
  synthesis?: SynthesizedResults;

  // Assembled results (for export compatibility)
  results: CrawlResult[];

  setUrl: (url: string) => void;
  setDepth: (depth: number) => void;
  startCrawl: () => Promise<void>;
  reset: () => void;
}

function parseSSE(text: string): { event: string; data: string }[] {
  const events: { event: string; data: string }[] = [];
  const blocks = text.split("\n\n").filter(Boolean);
  for (const block of blocks) {
    let event = "";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7);
      else if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (event && data) events.push({ event, data });
  }
  return events;
}

export const useCrawlStore = create<CrawlState>((set, get) => ({
  url: "",
  depth: 1,
  status: "idle",
  error: null,
  screenshot: undefined,
  pageCount: 0,
  techStack: undefined,
  design: undefined,
  layout: undefined,
  components: undefined,
  extractedStyles: undefined,
  externalStylesheets: undefined,
  synthesis: undefined,
  results: [],

  setUrl: (url) => set({ url }),
  setDepth: (depth) => set({ depth }),

  startCrawl: async () => {
    const { url, depth } = get();
    set({
      status: "crawling",
      error: null,
      results: [],
      screenshot: undefined,
      pageCount: 0,
      techStack: undefined,
      design: undefined,
      layout: undefined,
      components: undefined,
      extractedStyles: undefined,
      externalStylesheets: undefined,
      synthesis: undefined,
    });

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

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse complete SSE events from buffer
        const lastDoubleNewline = buffer.lastIndexOf("\n\n");
        if (lastDoubleNewline === -1) continue;

        const complete = buffer.slice(0, lastDoubleNewline + 2);
        buffer = buffer.slice(lastDoubleNewline + 2);

        const events = parseSSE(complete);

        // 1.5: Batch all updates from this chunk into a single set() call
        const batch: Partial<CrawlState> = {};

        for (const { event, data } of events) {
          try {
            const parsed = JSON.parse(data);
            switch (event) {
              case "crawl_done":
                batch.status = "analyzing";
                batch.screenshot = parsed.screenshot || undefined;
                batch.pageCount = parsed.pageCount || 0;
                break;
              case "techstack_done":
                batch.techStack = parsed;
                break;
              case "design_done":
                batch.design = parsed;
                break;
              case "layout_done":
                batch.layout = parsed;
                break;
              case "components_done":
                batch.components = parsed;
                break;
              case "synthesis_done":
                batch.synthesis = parsed;
                break;
              case "done":
                batch.status = "done";
                batch.results = parsed.results || [];
                break;
              case "error":
                batch.status = "error";
                batch.error = parsed.error || "Unknown error";
                break;
            }
          } catch {
            // skip malformed event data
          }
        }

        if (Object.keys(batch).length > 0) {
          set(batch);
        }
      }
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
      screenshot: undefined,
      pageCount: 0,
      techStack: undefined,
      design: undefined,
      layout: undefined,
      components: undefined,
      extractedStyles: undefined,
      externalStylesheets: undefined,
      synthesis: undefined,
    }),
}));
