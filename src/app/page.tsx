"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCrawlStore } from "@/lib/store";
import { LoadingSequence } from "@/components/LoadingSequence";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const router = useRouter();
  const { url, depth, status, error, setUrl, setDepth, startCrawl, results } = useCrawlStore();
  const isLoading = status === "loading";
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (status === "done" && results.length > 0 && !hasNavigated.current) {
      hasNavigated.current = true;
      router.push("/results");
    }
    if (status === "idle") {
      hasNavigated.current = false;
    }
  }, [status, results, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 1.1, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        className="w-full max-w-xl text-center"
      >
        <h1 className="font-serif mb-2 text-6xl tracking-tight text-[var(--ink)]">
          steal yo website
        </h1>
        <p className="font-hand mb-12 text-lg text-[var(--muted)]">
          Paste any URL. Study its design DNA.
        </p>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <LoadingSequence />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex flex-col gap-4"
            >
              <input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-none border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-lg text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-hand text-sm text-[var(--muted)]">Depth</span>
                  {[1, 2, 3].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDepth(d)}
                      className={`h-9 w-9 text-sm font-medium transition ${
                        depth === d
                          ? "bg-[var(--accent)] text-white"
                          : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <button
                  onClick={startCrawl}
                  disabled={!url}
                  className="bg-[var(--accent)] px-8 py-3 font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  Crawl
                </button>
              </div>

              {error && (
                <p className="text-sm text-[var(--accent)]">{error}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 text-xs text-[var(--muted)]">
          For inspiration and learning. Respect original creators&apos; work.
        </p>
      </motion.div>
    </main>
  );
}
