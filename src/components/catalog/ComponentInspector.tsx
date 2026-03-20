"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExtractedComponent } from "@/lib/types";

type ViewportSize = "phone" | "tablet" | "desktop";
const VIEWPORTS: Record<ViewportSize, { label: string; width: number }> = {
  phone: { label: "Phone", width: 375 },
  tablet: { label: "Tablet", width: 768 },
  desktop: { label: "Desktop", width: 1280 },
};

interface ComponentInspectorProps {
  component: ExtractedComponent;
  srcDoc: string;
  onClose: () => void;
}

export function ComponentInspector({ component, srcDoc, onClose }: ComponentInspectorProps) {
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [codeTab, setCodeTab] = useState<"react" | "html">("react");
  const [copied, setCopied] = useState(false);

  const copyCode = useCallback(() => {
    const text = codeTab === "react"
      ? (component.reactCode || "(no React component generated)")
      : (component.recreatedHtml || component.html);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [codeTab, component]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const currentCode = codeTab === "react"
    ? (component.reactCode || "(no React component generated)")
    : (component.recreatedHtml || "(no recreation generated)");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex"
        style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="m-4 flex flex-1 flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3">
            <div className="flex items-center gap-4">
              <h2 className="font-serif text-lg text-[var(--ink)]">{component.name}</h2>
              <span className="font-hand text-xs text-[var(--accent)]">{component.category}</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Viewport controls */}
              <div className="flex gap-1">
                {(Object.keys(VIEWPORTS) as ViewportSize[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setViewport(key)}
                    className={`px-3 py-1 text-xs font-medium transition ${
                      viewport === key
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {VIEWPORTS[key].label} {VIEWPORTS[key].width}
                  </button>
                ))}
              </div>
              {/* Close */}
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center text-[var(--muted)] transition hover:text-[var(--ink)]"
                title="Close (Esc)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Preview */}
            <div className="flex flex-1 items-center justify-center overflow-auto bg-[var(--background)] p-8">
              <div
                className="border border-dashed border-[var(--border)] bg-white transition-all duration-300"
                style={{ width: VIEWPORTS[viewport].width, maxWidth: "100%" }}
              >
                <iframe
                  srcDoc={srcDoc}
                  className="w-full border-0"
                  style={{ height: "100%", minHeight: 400 }}
                  sandbox="allow-same-origin allow-scripts"
                  title={`${component.name} preview`}
                />
              </div>
            </div>

            {/* Code panel */}
            <div className="flex w-[500px] flex-col border-l border-[var(--border)]">
              {/* Code tabs */}
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => setCodeTab("react")}
                    className={`px-3 py-1 text-xs font-medium transition ${
                      codeTab === "react"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    React
                  </button>
                  <button
                    onClick={() => setCodeTab("html")}
                    className={`px-3 py-1 text-xs font-medium transition ${
                      codeTab === "html"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    HTML
                  </button>
                </div>
                <button
                  onClick={copyCode}
                  className="bg-[var(--background)] px-3 py-1 text-xs text-[var(--muted)] transition hover:text-[var(--ink)]"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              {/* Code content */}
              <div className="flex-1 overflow-auto bg-[var(--code-bg)] p-4">
                <pre className="font-mono text-xs leading-relaxed text-[var(--code-fg)]">
                  <code>{currentCode}</code>
                </pre>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
