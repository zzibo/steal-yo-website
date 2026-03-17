"use client";

import { useState, useEffect, useRef, useId, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ExtractedComponent, TechStackDetection } from "@/lib/types";
import { toast } from "sonner";

export function ComponentCard({ component, index, techStack, extractedStyles, externalStylesheets, fontFamilies }: {
  component: ExtractedComponent;
  index: number;
  techStack?: TechStackDetection;
  extractedStyles?: string;
  externalStylesheets?: string[];
  fontFamilies?: string[];
}) {
  const [showCode, setShowCode] = useState(false);
  const [codeTab, setCodeTab] = useState<"react" | "html" | "original">("react");
  const [iframeHeight, setIframeHeight] = useState(200);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const frameId = useId();

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  };

  // 1.1: IntersectionObserver — only load iframe when card enters viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Listen for postMessage-based resize events from the iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "resize" && e.data?.frameId === frameId) {
        const h = Math.min(Math.max(e.data.height, 80), 500);
        setIframeHeight(h);
        setIframeLoaded(true);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [frameId]);

  // Build external stylesheet links for the original HTML view
  const stylesheetLinks = (externalStylesheets ?? [])
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("\n  ");

  const extractedStyleBlock = extractedStyles
    ? `<style>${extractedStyles}</style>`
    : "";

  // 3.4: Memoize srcDoc to avoid rebuilding the template string every render
  const srcDoc = useMemo(() => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"><\/script>
  ${stylesheetLinks}
  ${extractedStyleBlock}
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, sans-serif;
    }
    /* Shimmer skeleton while loading */
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      z-index: 9999;
      transition: opacity 0.3s;
    }
    body.loaded::before {
      opacity: 0;
      pointer-events: none;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  </style>
</head>
<body>${component.recreatedHtml || component.html}
<script>
  document.body.classList.add('loaded');
  var frameId = ${JSON.stringify(frameId)};
  var ro = new ResizeObserver(function(entries) {
    for (var entry of entries) {
      var h = Math.ceil(entry.target.scrollHeight);
      window.parent.postMessage({ type: 'resize', height: h, frameId: frameId }, '*');
    }
  });
  ro.observe(document.body);
  // Initial size report
  window.parent.postMessage({ type: 'resize', height: Math.ceil(document.body.scrollHeight), frameId: frameId }, '*');
<\/script>
</body>
</html>`, [component.recreatedHtml, component.html, frameId, stylesheetLinks, extractedStyleBlock]);

  // 1.6: CSS animation delay instead of Framer Motion spring per card
  const animDelay = `${Math.min(index * 0.04, 0.3)}s`;

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden border border-[var(--border)] bg-[var(--surface)] animate-[fadeSlideIn_0.4s_ease_both]"
      style={{
        boxShadow: "2px 3px 12px var(--shadow)",
        animationDelay: animDelay,
      }}
    >
      {/* Library stamp */}
      {component.attribution?.library && (
        <div className="absolute right-2 top-2 z-10 -rotate-12 stamp px-2 py-1 text-[10px] text-[var(--accent)]">
          {component.attribution.library}
        </div>
      )}

      {/* Preview */}
      <div className="relative border-b border-dashed border-[var(--border)] bg-white">
        {!iframeLoaded && (
          <div className="absolute inset-0 z-10 animate-pulse bg-[var(--border)] opacity-30" />
        )}
        {isVisible ? (
          <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            className="w-full border-0"
            style={{ height: `${iframeHeight}px`, transition: "height 0.2s ease" }}
            sandbox="allow-same-origin allow-scripts"
            title={component.name}
          />
        ) : (
          <div
            className="w-full animate-pulse bg-[var(--border)] opacity-20"
            style={{ height: `${iframeHeight}px` }}
          />
        )}
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
          <button onClick={() => copy(component.reactCode || component.recreatedHtml || component.html, "React code")}
            className="bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--ink)]">
            Copy React
          </button>
        </div>

        {/* Code viewer */}
        <AnimatePresence>
          {showCode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 overflow-hidden"
            >
              {/* Code tabs */}
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => setCodeTab("react")}
                  className={`px-2 py-1 text-[10px] font-medium transition ${
                    codeTab === "react"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  React
                </button>
                <button
                  onClick={() => setCodeTab("html")}
                  className={`px-2 py-1 text-[10px] font-medium transition ${
                    codeTab === "html"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  HTML
                </button>
                <button
                  onClick={() => setCodeTab("original")}
                  className={`px-2 py-1 text-[10px] font-medium transition ${
                    codeTab === "original"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  Original
                </button>
              </div>

              <div className="ruled-lines overflow-x-auto bg-[var(--code-bg)] p-4" style={{ borderLeft: "2px solid rgba(200,80,60,0.3)" }}>
                {codeTab === "react" ? (
                  <>
                    <p className="mb-2 font-mono text-[10px] text-[var(--accent)] opacity-50">REACT TSX</p>
                    <pre className="font-mono text-xs text-[var(--code-fg)]"><code>{component.reactCode || "(no React component generated)"}</code></pre>
                  </>
                ) : codeTab === "html" ? (
                  <>
                    <p className="mb-2 font-mono text-[10px] text-[var(--accent)] opacity-50">TAILWIND HTML</p>
                    <pre className="font-mono text-xs text-[var(--code-fg)]"><code>{component.recreatedHtml || "(no recreation generated)"}</code></pre>
                  </>
                ) : (
                  <>
                    <p className="mb-2 font-mono text-[10px] text-[var(--accent)] opacity-50">ORIGINAL HTML</p>
                    <pre className="font-mono text-xs text-[var(--code-fg)]"><code>{component.html}</code></pre>
                    {component.css && (
                      <>
                        <p className="mb-2 mt-4 font-mono text-[10px] text-[var(--accent)] opacity-50">ORIGINAL CSS</p>
                        <pre className="font-mono text-xs text-[var(--code-fg)]"><code>{component.css}</code></pre>
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
