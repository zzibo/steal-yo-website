"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCrawlStore } from "@/lib/store";

export function LoadingSequence() {
  const { status } = useCrawlStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== "crawling") return;
    const start = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [status]);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress bar */}
      <div className="mb-8 h-1 w-full overflow-hidden bg-[var(--border)]">
        <motion.div
          className="h-full bg-[var(--accent)]"
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 30, ease: "linear" }}
        />
      </div>

      {/* Active stage */}
      <div className="flex items-center justify-center gap-4">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="block h-5 w-5 rounded-full border-2 border-[var(--accent)] border-t-transparent"
        />
        <p className="text-sm font-medium text-[var(--ink)]">
          Crawling pages...
        </p>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-hand mt-4 text-center text-xs text-[var(--muted)]"
      >
        Fetching HTML, screenshots, and assets
      </motion.p>

      {/* Elapsed time */}
      <p className="font-hand mt-8 text-center text-xs text-[var(--muted)]">
        {elapsed}s elapsed
      </p>
    </div>
  );
}
