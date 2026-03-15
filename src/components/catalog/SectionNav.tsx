"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const sections = [
  { id: "dna", label: "DNA" },
  { id: "design", label: "Design" },
  { id: "components", label: "Components" },
  { id: "layout", label: "Layout" },
  { id: "techstack", label: "Tech Stack" },
];

export function SectionNav() {
  const [active, setActive] = useState("dna");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most-visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 xl:flex">
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => scrollTo(s.id)}
          className="group relative flex items-center"
          title={s.label}
        >
          <motion.div
            className="h-2.5 w-2.5 rounded-full border border-[var(--border)] transition-colors"
            animate={{
              backgroundColor: active === s.id ? "var(--accent)" : "var(--surface)",
              scale: active === s.id ? 1.3 : 1,
            }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          />
          <span className="pointer-events-none absolute left-6 whitespace-nowrap rounded bg-[var(--code-bg)] px-2 py-1 font-hand text-xs text-[var(--code-fg)] opacity-0 transition group-hover:opacity-100">
            {s.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
