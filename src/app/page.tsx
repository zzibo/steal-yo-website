"use client";

import { useCrawlStore } from "@/lib/store";
import { CatalogView } from "@/components/catalog/CatalogView";
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
