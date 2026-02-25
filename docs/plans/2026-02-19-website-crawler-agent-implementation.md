# Website Crawler Agent — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web app that crawls any website using Firecrawl, breaks it down into components/design/layout/content via 4 parallel Claude agents, and displays results as an artistic visual catalog.

**Architecture:** Next.js 15 App Router. Firecrawl scrapes pages (HTML + markdown + screenshots + branding). Four parallel Claude `generateText` calls analyze layout, components, design, and content. Results stored in Zustand, displayed as a gallery dashboard with Framer Motion animations.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Firecrawl SDK, AI SDK + Claude, Zustand, Framer Motion

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `.env.local`

**Step 1: Initialize Next.js project**

```bash
cd /Users/zibo/date-planner
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --yes
```

If prompted about overwriting, confirm yes. The repo is empty except for docs/.

**Step 2: Install dependencies**

```bash
npm install @mendable/firecrawl-js ai @ai-sdk/anthropic zustand framer-motion nanoid zod
```

**Step 3: Create .env.local**

```bash
# Create env file (DO NOT commit this)
```

Create `.env.local`:
```
FIRECRAWL_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

**Step 4: Add .env.local to .gitignore**

Verify `.env.local` is already in the generated `.gitignore`. If not, add it.

**Step 5: Verify dev server starts**

Run: `npm run dev`
Expected: Next.js dev server starts on localhost:3000

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with dependencies"
```

---

### Task 2: Firecrawl Scraper Service

**Files:**
- Create: `src/lib/scraper.ts`
- Create: `src/lib/types.ts`
- Create: `src/app/api/crawl/route.ts`

**Step 1: Create shared types**

Create `src/lib/types.ts`:

```typescript
export interface CrawlRequest {
  url: string;
  depth: number; // 1-3
}

export interface ScrapedPage {
  url: string;
  markdown: string;
  html: string;
  rawHtml: string;
  screenshot?: string;
  links: string[];
  images: string[];
  branding?: {
    colors?: string[];
    fonts?: string[];
    logos?: string[];
  };
  metadata: {
    title?: string;
    description?: string;
    language?: string;
  };
}

export interface LayoutSection {
  name: string;
  type: "header" | "hero" | "features" | "content" | "cta" | "footer" | "sidebar" | "navigation" | "other";
  layoutMethod: "grid" | "flex" | "stack" | "float" | "other";
  description: string;
  htmlSnippet: string;
}

export interface LayoutAnalysis {
  sections: LayoutSection[];
  responsiveBreakpoints: string[];
  navigationStructure: { label: string; href: string }[];
}

export interface ExtractedComponent {
  name: string;
  category: "button" | "card" | "input" | "modal" | "navbar" | "hero" | "footer" | "form" | "badge" | "other";
  html: string;
  css: string;
  variants: string[];
  description: string;
}

export interface ComponentAnalysis {
  components: ExtractedComponent[];
}

export interface DesignAnalysis {
  colors: { name: string; hex: string; usage: string }[];
  typography: {
    fontFamilies: string[];
    scale: { name: string; size: string; weight: string; lineHeight: string }[];
  };
  spacing: string[];
  borderRadius: string[];
  shadows: string[];
}

export interface ContentAnalysis {
  sections: { heading: string; text: string }[];
  images: { src: string; alt: string; width?: number; height?: number }[];
  links: { text: string; href: string; isExternal: boolean }[];
  meta: { title?: string; description?: string; ogImage?: string };
}

export interface CrawlResult {
  url: string;
  screenshot?: string;
  layout: LayoutAnalysis;
  components: ComponentAnalysis;
  design: DesignAnalysis;
  content: ContentAnalysis;
}
```

**Step 2: Create scraper service**

Create `src/lib/scraper.ts`:

```typescript
import FirecrawlApp from "@mendable/firecrawl-js";
import type { ScrapedPage, CrawlRequest } from "./types";

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY!,
});

export async function scrapePage(url: string): Promise<ScrapedPage> {
  const result = await firecrawl.scrape(url, {
    formats: ["markdown", "html", "rawHtml", "screenshot", "links", "images", "branding"],
    onlyMainContent: false, // we want full page for layout analysis
  });

  if (!result.markdown) {
    throw new Error(`Failed to scrape ${url}: no content returned`);
  }

  return {
    url,
    markdown: result.markdown ?? "",
    html: result.html ?? "",
    rawHtml: result.rawHtml ?? "",
    screenshot: result.screenshot,
    links: result.links ?? [],
    images: result.images ?? [],
    branding: result.branding as ScrapedPage["branding"],
    metadata: {
      title: Array.isArray(result.metadata?.title) ? result.metadata.title[0] : result.metadata?.title,
      description: Array.isArray(result.metadata?.description) ? result.metadata.description[0] : result.metadata?.description,
      language: Array.isArray(result.metadata?.language) ? result.metadata.language[0] : result.metadata?.language,
    },
  };
}

export async function crawlPages(request: CrawlRequest): Promise<ScrapedPage[]> {
  const visited = new Set<string>();
  const pages: ScrapedPage[] = [];
  const queue: { url: string; currentDepth: number }[] = [
    { url: request.url, currentDepth: 1 },
  ];

  while (queue.length > 0 && pages.length < 10) { // cap at 10 pages
    const item = queue.shift()!;
    if (visited.has(item.url)) continue;
    visited.add(item.url);

    const page = await scrapePage(item.url);
    pages.push(page);

    // Queue child links if we haven't hit max depth
    if (item.currentDepth < request.depth) {
      const baseHost = new URL(request.url).hostname;
      const childLinks = page.links
        .filter((link) => {
          try {
            return new URL(link).hostname === baseHost;
          } catch {
            return false;
          }
        })
        .slice(0, 5); // max 5 links per page

      for (const link of childLinks) {
        if (!visited.has(link)) {
          queue.push({ url: link, currentDepth: item.currentDepth + 1 });
        }
      }
    }
  }

  return pages;
}
```

**Step 3: Create API route**

Create `src/app/api/crawl/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { crawlPages } from "@/lib/scraper";
import type { CrawlRequest } from "@/lib/types";

export async function POST(req: Request) {
  let body: Partial<CrawlRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { url, depth = 1 } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  if (depth < 1 || depth > 3) {
    return NextResponse.json({ error: "Depth must be 1-3" }, { status: 400 });
  }

  try {
    const pages = await crawlPages({ url, depth });
    return NextResponse.json({ pages });
  } catch (err) {
    console.error("Crawl error:", err);
    return NextResponse.json(
      { error: "Crawl failed: " + (err instanceof Error ? err.message : "unknown error") },
      { status: 500 }
    );
  }
}

export const maxDuration = 120; // allow up to 2 min for deep crawls
```

**Step 4: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/scraper.ts src/app/api/crawl/route.ts
git commit -m "feat: add Firecrawl scraper service with configurable depth"
```

---

### Task 3: AI Analysis Agents

**Files:**
- Create: `src/lib/agents/layout.ts`
- Create: `src/lib/agents/components.ts`
- Create: `src/lib/agents/design.ts`
- Create: `src/lib/agents/content.ts`
- Create: `src/lib/agents/index.ts`
- Create: `src/app/api/analyze/route.ts`

**Step 1: Create Layout Agent**

Create `src/lib/agents/layout.ts`:

```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LayoutAnalysis, ScrapedPage } from "../types";

const SYSTEM_PROMPT = `You are a layout analysis agent. Given a webpage's HTML, identify all major sections and their layout methods.

Return ONLY valid JSON matching this schema:
{
  "sections": [
    {
      "name": "string (e.g. 'Hero Section')",
      "type": "header|hero|features|content|cta|footer|sidebar|navigation|other",
      "layoutMethod": "grid|flex|stack|float|other",
      "description": "string (1-2 sentences about this section)",
      "htmlSnippet": "string (the outer HTML tag with classes, NOT full content, e.g. '<section class=\"flex items-center gap-8 py-20\">')"
    }
  ],
  "responsiveBreakpoints": ["string (e.g. '768px', '1024px')"],
  "navigationStructure": [{ "label": "string", "href": "string" }]
}`;

export async function analyzeLayout(page: ScrapedPage): Promise<LayoutAnalysis> {
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT,
    prompt: `Analyze the layout of this page:\n\nURL: ${page.url}\n\nHTML:\n${page.html.slice(0, 15000)}`,
  });

  return JSON.parse(text);
}
```

**Step 2: Create Component Agent**

Create `src/lib/agents/components.ts`:

```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ComponentAnalysis, ScrapedPage } from "../types";

const SYSTEM_PROMPT = `You are a UI component extraction agent. Given a webpage's HTML, identify all reusable UI components.

For each component, extract its HTML and inline/relevant CSS. Focus on: buttons, cards, inputs, modals, navbars, heroes, footers, forms, badges.

Return ONLY valid JSON matching this schema:
{
  "components": [
    {
      "name": "string (e.g. 'Primary Button')",
      "category": "button|card|input|modal|navbar|hero|footer|form|badge|other",
      "html": "string (complete HTML of the component)",
      "css": "string (relevant CSS rules for the component)",
      "variants": ["string (e.g. 'primary', 'secondary', 'outline')"],
      "description": "string (what this component does, 1 sentence)"
    }
  ]
}

Extract the ACTUAL HTML and CSS from the page. Do not invent or embellish.`;

export async function analyzeComponents(page: ScrapedPage): Promise<ComponentAnalysis> {
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT,
    prompt: `Extract all reusable UI components from this page:\n\nURL: ${page.url}\n\nHTML:\n${page.rawHtml.slice(0, 30000)}`,
  });

  return JSON.parse(text);
}
```

**Step 3: Create Design Agent**

Create `src/lib/agents/design.ts`:

```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { DesignAnalysis, ScrapedPage } from "../types";

const SYSTEM_PROMPT = `You are a design token extraction agent. Given a webpage's HTML and branding data, extract the complete design system.

Return ONLY valid JSON matching this schema:
{
  "colors": [{ "name": "string (e.g. 'Primary')", "hex": "string (e.g. '#3B82F6')", "usage": "string (e.g. 'buttons, links')" }],
  "typography": {
    "fontFamilies": ["string"],
    "scale": [{ "name": "string (e.g. 'H1')", "size": "string (e.g. '48px')", "weight": "string (e.g. '700')", "lineHeight": "string (e.g. '1.2')" }]
  },
  "spacing": ["string (e.g. '4px', '8px', '16px')"],
  "borderRadius": ["string (e.g. '4px', '8px', '9999px')"],
  "shadows": ["string (e.g. '0 1px 3px rgba(0,0,0,0.1)')"]
}

Extract actual values from the CSS/HTML. Do not invent values.`;

export async function analyzeDesign(page: ScrapedPage): Promise<DesignAnalysis> {
  let brandingContext = "";
  if (page.branding) {
    brandingContext = `\n\nBranding data from Firecrawl:\nColors: ${JSON.stringify(page.branding.colors)}\nFonts: ${JSON.stringify(page.branding.fonts)}`;
  }

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT,
    prompt: `Extract the design system from this page:\n\nURL: ${page.url}${brandingContext}\n\nHTML:\n${page.rawHtml.slice(0, 20000)}`,
  });

  return JSON.parse(text);
}
```

**Step 4: Create Content Agent**

Create `src/lib/agents/content.ts`:

```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ContentAnalysis, ScrapedPage } from "../types";

const SYSTEM_PROMPT = `You are a content extraction agent. Given a webpage's markdown and metadata, extract all meaningful content organized by section.

Return ONLY valid JSON matching this schema:
{
  "sections": [{ "heading": "string", "text": "string" }],
  "images": [{ "src": "string", "alt": "string" }],
  "links": [{ "text": "string", "href": "string", "isExternal": "boolean" }],
  "meta": { "title": "string", "description": "string", "ogImage": "string or null" }
}`;

export async function analyzeContent(page: ScrapedPage): Promise<ContentAnalysis> {
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT,
    prompt: `Extract all content from this page:\n\nURL: ${page.url}\nTitle: ${page.metadata.title ?? "unknown"}\nDescription: ${page.metadata.description ?? "none"}\n\nMarkdown:\n${page.markdown.slice(0, 20000)}\n\nImages found: ${JSON.stringify(page.images.slice(0, 20))}\nLinks found: ${JSON.stringify(page.links.slice(0, 30))}`,
  });

  return JSON.parse(text);
}
```

**Step 5: Create agent orchestrator**

Create `src/lib/agents/index.ts`:

```typescript
import { analyzeLayout } from "./layout";
import { analyzeComponents } from "./components";
import { analyzeDesign } from "./design";
import { analyzeContent } from "./content";
import type { ScrapedPage, CrawlResult } from "../types";

export async function analyzePage(page: ScrapedPage): Promise<CrawlResult> {
  const [layout, components, design, content] = await Promise.all([
    analyzeLayout(page),
    analyzeComponents(page),
    analyzeDesign(page),
    analyzeContent(page),
  ]);

  return {
    url: page.url,
    screenshot: page.screenshot,
    layout,
    components,
    design,
    content,
  };
}
```

**Step 6: Create analyze API route**

Create `src/app/api/analyze/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { crawlPages } from "@/lib/scraper";
import { analyzePage } from "@/lib/agents";
import type { CrawlRequest, CrawlResult } from "@/lib/types";

export async function POST(req: Request) {
  let body: Partial<CrawlRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { url, depth = 1 } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  if (depth < 1 || depth > 3) {
    return NextResponse.json({ error: "Depth must be 1-3" }, { status: 400 });
  }

  try {
    // Step 1: Crawl
    const pages = await crawlPages({ url, depth });

    // Step 2: Analyze all pages in parallel
    const results: CrawlResult[] = await Promise.all(
      pages.map((page) => analyzePage(page))
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Analysis failed: " + (err instanceof Error ? err.message : "unknown error") },
      { status: 500 }
    );
  }
}

export const maxDuration = 300; // 5 min for deep crawls with analysis
```

**Step 7: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 8: Commit**

```bash
git add src/lib/agents/ src/app/api/analyze/
git commit -m "feat: add 4 parallel AI analysis agents (layout, components, design, content)"
```

---

### Task 4: Zustand Store

**Files:**
- Create: `src/lib/store.ts`

**Step 1: Create store**

Create `src/lib/store.ts`:

```typescript
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
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat: add Zustand store for crawl state management"
```

---

### Task 5: Landing Page — URL Input

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Step 1: Update globals.css with base styles**

Replace `src/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0a0a0a;
  --foreground: #ededed;
  --accent: #6366f1;
  --accent-hover: #818cf8;
  --surface: #141414;
  --surface-hover: #1e1e1e;
  --border: #262626;
  --muted: #737373;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, sans-serif;
}
```

**Step 2: Update layout.tsx**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crawl Agent — Website Analyzer",
  description: "Crawl any website and get an artistic catalog of its components, design, and content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
```

**Step 3: Create landing page**

Replace `src/app/page.tsx` with:

```tsx
"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

export default function Home() {
  const { url, depth, status, error, setUrl, setDepth, startCrawl, results } = useCrawlStore();

  const isLoading = status === "crawling" || status === "analyzing";

  if (status === "done" && results.length > 0) {
    return <CatalogView />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl text-center"
      >
        <h1 className="mb-2 text-5xl font-bold tracking-tight">
          Crawl Agent
        </h1>
        <p className="mb-12 text-[var(--muted)]">
          Paste any URL. Get an artistic catalog of its DNA.
        </p>

        <div className="flex flex-col gap-4">
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-lg outline-none transition focus:border-[var(--accent)] disabled:opacity-50"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--muted)]">Depth</span>
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  disabled={isLoading}
                  className={`h-9 w-9 rounded-lg text-sm font-medium transition ${
                    depth === d
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={startCrawl}
              disabled={!url || isLoading}
              className="rounded-xl bg-[var(--accent)] px-8 py-3 font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isLoading ? (status === "crawling" ? "Crawling..." : "Analyzing...") : "Crawl"}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>
      </motion.div>
    </main>
  );
}

// Placeholder — built in Task 6
function CatalogView() {
  const { reset } = useCrawlStore();
  return (
    <div className="p-8">
      <button onClick={reset} className="text-[var(--accent)] underline">
        Back
      </button>
      <p className="mt-4 text-[var(--muted)]">Catalog coming in next task...</p>
    </div>
  );
}
```

**Step 4: Verify dev server renders**

Run: `npm run dev`
Visit: http://localhost:3000
Expected: Dark page with "Crawl Agent" heading, URL input, depth selector (1/2/3), and Crawl button

**Step 5: Commit**

```bash
git add src/app/page.tsx src/app/globals.css src/app/layout.tsx
git commit -m "feat: add landing page with URL input and depth selector"
```

---

### Task 6: Catalog Dashboard — Components Tab

**Files:**
- Create: `src/components/catalog/CatalogView.tsx`
- Create: `src/components/catalog/TabBar.tsx`
- Create: `src/components/catalog/ComponentCard.tsx`
- Create: `src/components/catalog/ComponentsTab.tsx`
- Modify: `src/app/page.tsx` (replace placeholder CatalogView import)

**Step 1: Create TabBar**

Create `src/components/catalog/TabBar.tsx`:

```tsx
"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

const tabs = [
  { id: "components" as const, label: "Components" },
  { id: "design" as const, label: "Design" },
  { id: "layout" as const, label: "Layout" },
  { id: "content" as const, label: "Content" },
];

export function TabBar() {
  const { activeTab, setActiveTab } = useCrawlStore();

  return (
    <div className="flex gap-1 rounded-xl bg-[var(--surface)] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`relative rounded-lg px-5 py-2.5 text-sm font-medium transition ${
            activeTab === tab.id ? "text-white" : "text-[var(--muted)] hover:text-white"
          }`}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 rounded-lg bg-[var(--accent)]"
              transition={{ type: "spring", duration: 0.4 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Create ComponentCard**

Create `src/components/catalog/ComponentCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ExtractedComponent } from "@/lib/types";

export function ComponentCard({ component, index }: { component: ExtractedComponent; index: number }) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyHtml = () => {
    navigator.clipboard.writeText(component.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
    >
      {/* Live preview */}
      <div className="border-b border-[var(--border)] bg-white p-6">
        <iframe
          srcDoc={`<!DOCTYPE html><html><head><style>body{margin:0;padding:16px;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:60px;}${component.css}</style></head><body>${component.html}</body></html>`}
          className="h-24 w-full border-0"
          sandbox="allow-same-origin"
          title={component.name}
        />
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">{component.name}</h3>
          <span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-0.5 text-xs text-[var(--accent)]">
            {component.category}
          </span>
        </div>
        <p className="mb-3 text-sm text-[var(--muted)]">{component.description}</p>

        {component.variants.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {component.variants.map((v) => (
              <span key={v} className="rounded-md bg-[var(--background)] px-2 py-0.5 text-xs text-[var(--muted)]">
                {v}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setShowCode(!showCode)}
            className="rounded-lg bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-white"
          >
            {showCode ? "Hide Code" : "View Code"}
          </button>
          <button
            onClick={copyHtml}
            className="rounded-lg bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-white"
          >
            {copied ? "Copied!" : "Copy HTML"}
          </button>
        </div>

        {showCode && (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="mt-3 overflow-x-auto rounded-lg bg-[var(--background)] p-3 text-xs text-[var(--muted)]"
          >
            <code>{component.html}</code>
          </motion.pre>
        )}
      </div>
    </motion.div>
  );
}
```

**Step 3: Create ComponentsTab**

Create `src/components/catalog/ComponentsTab.tsx`:

```tsx
"use client";

import { useCrawlStore } from "@/lib/store";
import { ComponentCard } from "./ComponentCard";

export function ComponentsTab() {
  const { results } = useCrawlStore();
  const allComponents = results.flatMap((r) => r.components.components);

  if (allComponents.length === 0) {
    return <p className="text-[var(--muted)]">No components extracted.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {allComponents.map((component, i) => (
        <ComponentCard key={`${component.name}-${i}`} component={component} index={i} />
      ))}
    </div>
  );
}
```

**Step 4: Create CatalogView**

Create `src/components/catalog/CatalogView.tsx`:

```tsx
"use client";

import { useCrawlStore } from "@/lib/store";
import { TabBar } from "./TabBar";
import { ComponentsTab } from "./ComponentsTab";

export function CatalogView() {
  const { results, activeTab, reset, url } = useCrawlStore();

  return (
    <div className="min-h-screen px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalog</h1>
          <p className="text-sm text-[var(--muted)]">
            {url} — {results.length} page(s) analyzed
          </p>
        </div>
        <button
          onClick={reset}
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm transition hover:bg-[var(--surface)]"
        >
          New Crawl
        </button>
      </div>

      {/* Screenshot */}
      {results[0]?.screenshot && (
        <div className="mb-8 overflow-hidden rounded-2xl border border-[var(--border)]">
          <img src={results[0].screenshot} alt="Page screenshot" className="w-full" />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8">
        <TabBar />
      </div>

      {/* Tab content */}
      {activeTab === "components" && <ComponentsTab />}
      {activeTab === "design" && <p className="text-[var(--muted)]">Design tab coming next...</p>}
      {activeTab === "layout" && <p className="text-[var(--muted)]">Layout tab coming next...</p>}
      {activeTab === "content" && <p className="text-[var(--muted)]">Content tab coming next...</p>}
    </div>
  );
}
```

**Step 5: Update page.tsx to import CatalogView**

In `src/app/page.tsx`, replace the placeholder `CatalogView` function at the bottom and add the import:

Add at the top:
```tsx
import { CatalogView } from "@/components/catalog/CatalogView";
```

Remove the placeholder `function CatalogView()` at the bottom.

In the main component, update the conditional render:
```tsx
if (status === "done" && results.length > 0) {
  return <CatalogView />;
}
```

**Step 6: Verify dev server renders**

Run: `npm run dev`
Expected: Landing page still works. (Can't test catalog view without real API keys, but TypeScript should compile.)

**Step 7: Commit**

```bash
git add src/components/catalog/ src/app/page.tsx
git commit -m "feat: add catalog dashboard with components tab and live previews"
```

---

### Task 7: Catalog Dashboard — Design Tab

**Files:**
- Create: `src/components/catalog/DesignTab.tsx`
- Modify: `src/components/catalog/CatalogView.tsx`

**Step 1: Create DesignTab**

Create `src/components/catalog/DesignTab.tsx`:

```tsx
"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

export function DesignTab() {
  const { results } = useCrawlStore();
  const design = results[0]?.design;

  if (!design) {
    return <p className="text-[var(--muted)]">No design data extracted.</p>;
  }

  return (
    <div className="space-y-12">
      {/* Color Palette */}
      <section>
        <h2 className="mb-6 text-xl font-semibold">Color Palette</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {design.colors.map((color, i) => (
            <motion.div
              key={color.hex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group cursor-pointer"
              onClick={() => navigator.clipboard.writeText(color.hex)}
            >
              <div
                className="mb-3 aspect-square rounded-2xl border border-[var(--border)] shadow-lg transition group-hover:scale-105"
                style={{ backgroundColor: color.hex }}
              />
              <p className="text-sm font-medium">{color.name}</p>
              <p className="font-mono text-xs text-[var(--muted)]">{color.hex}</p>
              <p className="text-xs text-[var(--muted)]">{color.usage}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section>
        <h2 className="mb-6 text-xl font-semibold">Typography</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {design.typography.fontFamilies.map((font) => (
            <span key={font} className="rounded-lg bg-[var(--surface)] px-3 py-1.5 text-sm">
              {font}
            </span>
          ))}
        </div>
        <div className="space-y-4">
          {design.typography.scale.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-baseline justify-between border-b border-[var(--border)] pb-4"
            >
              <span
                style={{
                  fontSize: item.size,
                  fontWeight: item.weight,
                  lineHeight: item.lineHeight,
                }}
              >
                {item.name}
              </span>
              <span className="font-mono text-xs text-[var(--muted)]">
                {item.size} / {item.weight} / {item.lineHeight}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Spacing & Radii */}
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <section>
          <h2 className="mb-6 text-xl font-semibold">Border Radius</h2>
          <div className="flex flex-wrap gap-4">
            {design.borderRadius.map((radius) => (
              <div key={radius} className="text-center">
                <div
                  className="mb-2 h-16 w-16 border-2 border-[var(--accent)] bg-[var(--surface)]"
                  style={{ borderRadius: radius }}
                />
                <span className="font-mono text-xs text-[var(--muted)]">{radius}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-xl font-semibold">Shadows</h2>
          <div className="space-y-4">
            {design.shadows.map((shadow) => (
              <div
                key={shadow}
                className="rounded-xl bg-white p-4"
                style={{ boxShadow: shadow }}
              >
                <span className="font-mono text-xs text-gray-500">{shadow}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
```

**Step 2: Wire into CatalogView**

In `src/components/catalog/CatalogView.tsx`, add import:
```tsx
import { DesignTab } from "./DesignTab";
```

Replace the design placeholder:
```tsx
{activeTab === "design" && <DesignTab />}
```

**Step 3: Commit**

```bash
git add src/components/catalog/DesignTab.tsx src/components/catalog/CatalogView.tsx
git commit -m "feat: add design tab with color swatches, typography specimens, and radius/shadow previews"
```

---

### Task 8: Catalog Dashboard — Layout Tab

**Files:**
- Create: `src/components/catalog/LayoutTab.tsx`
- Modify: `src/components/catalog/CatalogView.tsx`

**Step 1: Create LayoutTab**

Create `src/components/catalog/LayoutTab.tsx`:

```tsx
"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

const sectionColors: Record<string, string> = {
  header: "#6366f1",
  hero: "#8b5cf6",
  features: "#06b6d4",
  content: "#10b981",
  cta: "#f59e0b",
  footer: "#64748b",
  sidebar: "#ec4899",
  navigation: "#6366f1",
  other: "#737373",
};

export function LayoutTab() {
  const { results } = useCrawlStore();
  const layout = results[0]?.layout;

  if (!layout) {
    return <p className="text-[var(--muted)]">No layout data extracted.</p>;
  }

  return (
    <div className="space-y-12">
      {/* Wireframe-style section map */}
      <section>
        <h2 className="mb-6 text-xl font-semibold">Page Structure</h2>
        <div className="mx-auto max-w-2xl space-y-3">
          {layout.sections.map((section, i) => (
            <motion.div
              key={section.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="overflow-hidden rounded-xl border border-[var(--border)]"
              style={{ borderLeftColor: sectionColors[section.type] ?? sectionColors.other, borderLeftWidth: 4 }}
            >
              <div className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-medium">{section.name}</h3>
                  <p className="text-sm text-[var(--muted)]">{section.description}</p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs text-[var(--muted)]">
                    {section.type}
                  </span>
                  <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs text-[var(--accent)]">
                    {section.layoutMethod}
                  </span>
                </div>
              </div>
              <pre className="border-t border-[var(--border)] bg-[var(--background)] p-3 text-xs text-[var(--muted)]">
                <code>{section.htmlSnippet}</code>
              </pre>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Navigation */}
      {layout.navigationStructure.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold">Navigation</h2>
          <div className="flex flex-wrap gap-2">
            {layout.navigationStructure.map((nav) => (
              <span
                key={nav.href}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
              >
                {nav.label}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Breakpoints */}
      {layout.responsiveBreakpoints.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold">Responsive Breakpoints</h2>
          <div className="flex gap-4">
            {layout.responsiveBreakpoints.map((bp) => (
              <div key={bp} className="rounded-xl bg-[var(--surface)] px-4 py-3 text-center">
                <span className="font-mono text-lg font-medium">{bp}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

**Step 2: Wire into CatalogView**

In `src/components/catalog/CatalogView.tsx`, add import and replace placeholder:
```tsx
import { LayoutTab } from "./LayoutTab";
```
```tsx
{activeTab === "layout" && <LayoutTab />}
```

**Step 3: Commit**

```bash
git add src/components/catalog/LayoutTab.tsx src/components/catalog/CatalogView.tsx
git commit -m "feat: add layout tab with wireframe section map and navigation structure"
```

---

### Task 9: Catalog Dashboard — Content Tab

**Files:**
- Create: `src/components/catalog/ContentTab.tsx`
- Modify: `src/components/catalog/CatalogView.tsx`

**Step 1: Create ContentTab**

Create `src/components/catalog/ContentTab.tsx`:

```tsx
"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

export function ContentTab() {
  const { results } = useCrawlStore();
  const content = results[0]?.content;

  if (!content) {
    return <p className="text-[var(--muted)]">No content extracted.</p>;
  }

  return (
    <div className="space-y-12">
      {/* Meta */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-4 text-xl font-semibold">Meta</h2>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--muted)]">Title</dt>
            <dd className="text-sm">{content.meta.title ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Description</dt>
            <dd className="text-sm">{content.meta.description ?? "—"}</dd>
          </div>
        </dl>
        {content.meta.ogImage && (
          <img src={content.meta.ogImage} alt="OG Image" className="mt-4 max-h-40 rounded-lg" />
        )}
      </section>

      {/* Text Sections */}
      <section>
        <h2 className="mb-6 text-xl font-semibold">Text Content</h2>
        <div className="space-y-4">
          {content.sections.map((sec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-[var(--border)] p-4"
            >
              <h3 className="mb-1 text-sm font-medium text-[var(--accent)]">{sec.heading}</h3>
              <p className="text-sm text-[var(--muted)]">{sec.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Images */}
      {content.images.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold">Images ({content.images.length})</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {content.images.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="overflow-hidden rounded-xl border border-[var(--border)]"
              >
                <img src={img.src} alt={img.alt} className="aspect-video w-full object-cover" />
                <p className="p-2 text-xs text-[var(--muted)] truncate">{img.alt || "No alt text"}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Links */}
      {content.links.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold">Links ({content.links.length})</h2>
          <div className="space-y-1">
            {content.links.map((link, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--surface)]">
                <span className="text-sm">{link.text || link.href}</span>
                <span className="text-xs text-[var(--muted)]">
                  {link.isExternal ? "external" : "internal"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

**Step 2: Wire into CatalogView**

In `src/components/catalog/CatalogView.tsx`, add import and replace placeholder:
```tsx
import { ContentTab } from "./ContentTab";
```
```tsx
{activeTab === "content" && <ContentTab />}
```

**Step 3: Commit**

```bash
git add src/components/catalog/ContentTab.tsx src/components/catalog/CatalogView.tsx
git commit -m "feat: add content tab with meta, text sections, images gallery, and links"
```

---

### Task 10: Integration Test — End to End

**Step 1: Add API keys to .env.local**

Ensure both `FIRECRAWL_API_KEY` and `ANTHROPIC_API_KEY` are set in `.env.local`.

**Step 2: Start dev server**

Run: `npm run dev`

**Step 3: Test with a real URL**

Visit http://localhost:3000, paste a URL (e.g., `https://stripe.com`), set depth to 1, click Crawl.

Expected:
- Button shows "Crawling..." then "Analyzing..."
- After 30-60 seconds, catalog view appears
- Components tab shows extracted components with live previews
- Design tab shows color swatches and typography
- Layout tab shows page sections
- Content tab shows text, images, links

**Step 4: Fix any issues found during testing**

Address any TypeScript errors, rendering bugs, or API response mismatches.

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address integration test issues"
```

---

### Task 11: Final Polish & Push

**Step 1: Update repo description on GitHub**

```bash
gh repo edit zzibo/date-planner --description "AI-powered website crawler that breaks down any site into an artistic catalog of components, design tokens, and content"
```

**Step 2: Push all commits**

```bash
git push origin main
```

**Step 3: Verify remote is up to date**

```bash
git log --oneline -5
```

---

Plan complete and saved to `docs/plans/2026-02-19-website-crawler-agent-implementation.md`.
