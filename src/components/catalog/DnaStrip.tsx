"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";
import { toast } from "sonner";

export function DnaStrip() {
  const { design, techStack, components } = useCrawlStore();

  const colors = design?.colorPalette ?? [];
  const primaryFont = design?.typography?.[0]?.family;
  const frameworkName = techStack?.framework?.name ?? techStack?.cssFramework?.name;
  const componentCount = components?.components?.length ?? 0;

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    toast.success(`Copied ${hex}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="flex flex-wrap items-center gap-4 border border-[var(--border)] bg-[var(--surface)] px-5 py-3"
      style={{ boxShadow: "2px 3px 12px var(--shadow)" }}
    >
      {/* Color dots */}
      {colors.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="mr-1 font-hand text-xs text-[var(--muted)]">palette</span>
          {colors.slice(0, 8).map((color, i) => (
            <motion.button
              key={`${color.hex}-${i}`}
              onClick={() => copyHex(color.hex)}
              title={`${color.hex} (${color.role}) — click to copy`}
              className="h-5 w-5 border border-[var(--border)] transition hover:scale-125"
              style={{ backgroundColor: color.hex }}
              whileHover={{ scale: 1.3 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>
      )}

      {/* Separator */}
      {colors.length > 0 && (primaryFont || frameworkName) && (
        <div className="h-4 w-px bg-[var(--border)]" />
      )}

      {/* Primary font */}
      {primaryFont && (
        <div className="flex items-center gap-1.5">
          <span className="font-hand text-xs text-[var(--muted)]">font</span>
          <span className="text-sm font-medium text-[var(--ink)]">{primaryFont}</span>
        </div>
      )}

      {/* Separator */}
      {primaryFont && frameworkName && (
        <div className="h-4 w-px bg-[var(--border)]" />
      )}

      {/* Framework badge */}
      {frameworkName && (
        <span className="bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">
          {frameworkName}
        </span>
      )}

      {/* Component count */}
      {componentCount > 0 && (
        <>
          <div className="h-4 w-px bg-[var(--border)]" />
          <span className="font-hand text-xs text-[var(--muted)]">
            {componentCount} component{componentCount !== 1 ? "s" : ""}
          </span>
        </>
      )}
    </motion.div>
  );
}
