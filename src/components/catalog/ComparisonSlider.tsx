"use client";

import { useState, useRef, useCallback } from "react";

interface ComparisonSliderProps {
  leftSrcDoc: string;
  rightSrcDoc: string;
  height?: number;
}

export function ComparisonSlider({ leftSrcDoc, rightSrcDoc, height = 400 }: ComparisonSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative cursor-col-resize select-none overflow-hidden border border-[var(--border)]"
      style={{ height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Left: Original */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <iframe
          srcDoc={leftSrcDoc}
          className="h-full w-full border-0"
          sandbox="allow-same-origin allow-scripts"
          title="Original"
        />
      </div>

      {/* Right: Recreation */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        <iframe
          srcDoc={rightSrcDoc}
          className="h-full w-full border-0"
          sandbox="allow-same-origin allow-scripts"
          title="Recreation"
        />
      </div>

      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 z-10 w-0.5 bg-[var(--accent)]"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        {/* Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--surface)] shadow-md">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[var(--accent)]">
            <path d="M3 6H1M11 6H9M3 6L5 4M3 6L5 8M9 6L7 4M9 6L7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-2 left-3 z-10 bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--ink)] opacity-80 border border-[var(--border)]">
        Original
      </div>
      <div className="absolute top-2 right-3 z-10 bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--ink)] opacity-80 border border-[var(--border)]">
        Recreation
      </div>
    </div>
  );
}
