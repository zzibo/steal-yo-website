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
