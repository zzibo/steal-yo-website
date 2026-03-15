"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SHORTCUTS = [
  { keys: ["?"], description: "Toggle this help overlay" },
  { keys: ["\u2318", "1"], description: "Scroll to DNA section" },
  { keys: ["\u2318", "2"], description: "Scroll to Design section" },
  { keys: ["\u2318", "3"], description: "Scroll to Components section" },
  { keys: ["\u2318", "4"], description: "Scroll to Layout section" },
  { keys: ["\u2318", "5"], description: "Scroll to Tech Stack section" },
];

const SECTION_IDS = ["dna", "design", "components", "layout", "techstack"];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // ? key toggles help overlay
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // Cmd+1 through Cmd+5 scroll to sections
      if (e.metaKey || e.ctrlKey) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 5) {
          e.preventDefault();
          const sectionId = SECTION_IDS[num - 1];
          const el = document.getElementById(sectionId);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ backdropFilter: "blur(4px)", backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md border border-[var(--border)] bg-[var(--surface)] p-8"
            style={{ boxShadow: "4px 6px 20px var(--shadow)" }}
          >
            <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Keyboard Shortcuts</h2>
            <div className="space-y-3">
              {SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.description}
                  className="flex items-center justify-between border-b border-dashed border-[var(--border)] pb-3 last:border-0"
                >
                  <span className="text-sm text-[var(--ink)]">{shortcut.description}</span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="inline-flex h-6 min-w-[24px] items-center justify-center border border-[var(--border)] bg-[var(--background)] px-1.5 font-mono text-xs text-[var(--ink)]"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center font-hand text-xs text-[var(--muted)]">
              Press ? to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
