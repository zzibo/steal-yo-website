"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useCrawlStore, LOADING_STAGES } from "@/lib/store";

const STAGE_DURATION = 8000;

export function LoadingSequence() {
  const { loadingStage, advanceStage, status } = useCrawlStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== "loading") return;
    timerRef.current = setInterval(() => advanceStage(), STAGE_DURATION);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status, advanceStage]);

  useEffect(() => {
    if (status !== "loading") return;
    const start = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [status]);

  const progress = ((loadingStage + 1) / LOADING_STAGES.length) * 100;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress bar */}
      <div className="mb-8 h-1 w-full overflow-hidden bg-[var(--border)]">
        <motion.div
          className="h-full bg-[var(--accent)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Stages */}
      <div className="space-y-5">
        {LOADING_STAGES.map((stage, i) => {
          const state = i < loadingStage ? "done" : i === loadingStage ? "active" : "pending";
          return (
            <motion.div
              key={stage.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: state === "pending" ? 0.35 : 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-4"
            >
              <div className="flex h-7 w-7 items-center justify-center">
                {state === "done" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-base text-[var(--accent-alt)]"
                  >
                    &#10003;
                  </motion.span>
                )}
                {state === "active" && (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="block h-5 w-5 rounded-full border-2 border-[var(--accent)] border-t-transparent"
                  />
                )}
                {state === "pending" && (
                  <span className="block h-2 w-2 rounded-full bg-[var(--border)]" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  state === "done" ? "text-[var(--accent-alt)] line-through" :
                  state === "active" ? "text-[var(--ink)]" :
                  "text-[var(--muted)]"
                }`}>
                  {stage.label}
                </p>
                {state === "active" && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-hand text-xs text-[var(--muted)]"
                  >
                    {stage.detail}
                  </motion.p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Elapsed time */}
      <p className="font-hand mt-8 text-center text-xs text-[var(--muted)]">
        {elapsed}s elapsed
      </p>
    </div>
  );
}
