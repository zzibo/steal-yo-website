"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

const tabs = [
  { id: "design" as const, label: "Design", color: "#2d6a4f" },
  { id: "components" as const, label: "Components", color: "#c85d3e" },
  { id: "layout" as const, label: "Layout", color: "#5b7fa5" },
  { id: "techstack" as const, label: "Tech Stack", color: "#7c5cbf" },
];

export function TabBar() {
  const { activeTab, setActiveTab } = useCrawlStore();

  return (
    <div className="flex gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className="relative px-5 py-2.5 text-sm font-medium transition"
          style={{
            borderTop: `3px solid ${activeTab === tab.id ? tab.color : "transparent"}`,
            background: activeTab === tab.id ? "var(--surface)" : "transparent",
            color: activeTab === tab.id ? "var(--ink)" : "var(--muted)",
          }}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 border border-[var(--border)] border-b-0 bg-[var(--surface)]"
              style={{ borderTop: `3px solid ${tab.color}` }}
              transition={{ type: "spring", duration: 0.4 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
