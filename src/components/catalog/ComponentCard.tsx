"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExtractedComponent, TechStackDetection } from "@/lib/types";

export function ComponentCard({ component, index, techStack }: {
  component: ExtractedComponent;
  index: number;
  techStack?: TechStackDetection;
}) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState(120);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const rotation = ((index * 7) % 5) - 2;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (doc?.body) {
        const height = doc.body.scrollHeight;
        setIframeHeight(Math.min(Math.max(height, 60), 400));
      }
    } catch {
      // sandbox may block access
    }
  }, []);

  const cssFramework = techStack?.cssFramework?.name?.toLowerCase() ?? "";
  const cdnLinks: string[] = [];
  if (cssFramework.includes("bootstrap")) {
    cdnLinks.push(`<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css">`);
  }

  const srcDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  ${cdnLinks.join("\n  ")}
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60px;
    }
    ${component.css}
  </style>
</head>
<body>${component.html}</body>
</html>`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -30, rotate: rotation, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, rotate: rotation, scale: 1 }}
      whileHover={{ rotate: 0, y: -4, scale: 1.02, boxShadow: "4px 8px 24px var(--shadow)" }}
      transition={{ type: "spring", damping: 20, stiffness: 150, delay: Math.min(index * 0.06, 0.5) }}
      className="tape relative overflow-hidden bg-[var(--surface)]"
      style={{ boxShadow: "2px 3px 12px var(--shadow)" }}
    >
      {/* Library stamp */}
      {component.attribution?.library && (
        <div className="absolute right-2 top-2 z-10 -rotate-12 stamp px-2 py-1 text-[10px] text-[var(--accent)]">
          {component.attribution.library}
        </div>
      )}

      {/* Preview */}
      <div className="border-b border-dashed border-[var(--border)] bg-white p-4">
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          className="w-full border-0"
          style={{ height: `${iframeHeight}px` }}
          sandbox="allow-same-origin allow-scripts"
          title={component.name}
          onLoad={handleIframeLoad}
        />
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium text-[var(--ink)]">{component.name}</h3>
          <span className="font-hand text-xs text-[var(--accent)]">{component.category}</span>
        </div>
        <p className="mb-3 text-sm text-[var(--muted)]">{component.description}</p>

        {component.variants.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {component.variants.map((v) => (
              <span key={v} className="bg-[var(--background)] px-2 py-0.5 text-xs text-[var(--muted)]">{v}</span>
            ))}
          </div>
        )}

        {component.attribution?.library && (
          <div className="mb-3 border-l-2 border-[var(--accent)] bg-[var(--background)] px-3 py-2">
            <p className="text-xs font-medium text-[var(--accent)]">{component.attribution.library}</p>
            <p className="text-xs text-[var(--muted)]">{component.attribution.reasoning}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => setShowCode(!showCode)}
            className="bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--ink)]">
            {showCode ? "Hide Code" : "View Code"}
          </button>
          <button onClick={() => copy(component.html, "html")}
            className="bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--ink)]">
            {copied === "html" ? "Copied!" : "Copy HTML"}
          </button>
          <button onClick={() => copy(component.css, "css")}
            className="bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--ink)]">
            {copied === "css" ? "Copied!" : "Copy CSS"}
          </button>
        </div>

        {/* Code notebook */}
        <AnimatePresence>
          {showCode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 overflow-hidden"
            >
              <div className="ruled-lines overflow-x-auto bg-[var(--code-bg)] p-4" style={{ borderLeft: "2px solid rgba(200,80,60,0.3)" }}>
                <p className="mb-2 font-mono text-[10px] text-[var(--accent)] opacity-50">HTML</p>
                <pre className="font-mono text-xs text-[var(--code-fg)]"><code>{component.html}</code></pre>
                {component.css && (
                  <>
                    <p className="mb-2 mt-4 font-mono text-[10px] text-[var(--accent)] opacity-50">CSS</p>
                    <pre className="font-mono text-xs text-[var(--code-fg)]"><code>{component.css}</code></pre>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
