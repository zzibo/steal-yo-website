"use client";

import { ChangeEvent, FormEvent, useMemo } from "react";

interface LinkInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

type Platform = "instagram" | "tiktok" | null;

function detectPlatform(url: string): Platform {
  try {
    const trimmed = url.trim();
    if (!trimmed) return null;

    // Handle URLs without protocol
    const withProtocol = trimmed.match(/^https?:\/\//)
      ? trimmed
      : `https://${trimmed}`;

    const parsed = new URL(withProtocol);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) {
      return "instagram";
    }
    if (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) {
      return "tiktok";
    }
  } catch {
    // Not a valid URL yet
  }
  return null;
}

function isValidUrl(url: string): boolean {
  return detectPlatform(url) !== null;
}

export function LinkInput({ value, onChange, onSubmit, isLoading }: LinkInputProps) {
  const platform = useMemo(() => detectPlatform(value), [value]);
  const hasText = value.trim().length > 0;
  const isValid = isValidUrl(value);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid && hasText) return;
    onSubmit(e);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative flex gap-3">
        <div className="relative flex-1">
          <input
            type="url"
            value={value}
            onChange={onChange}
            placeholder="Paste an Instagram or TikTok link..."
            className={`w-full rounded-xl bg-neutral-900 border px-4 py-3
                       text-neutral-100 placeholder:text-neutral-600
                       focus:outline-none focus:ring-1
                       transition-colors
                       ${hasText && !isValid
                         ? "border-red-800/60 focus:border-red-700 focus:ring-red-800/40"
                         : platform
                           ? "border-neutral-700 focus:border-neutral-500 focus:ring-neutral-600"
                           : "border-neutral-800 focus:border-neutral-600 focus:ring-neutral-600"
                       }
                       ${platform ? "pr-28" : ""}`}
            disabled={isLoading}
            required
          />
          {platform && (
            <span
              className={`absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5
                         text-xs font-medium px-2.5 py-1 rounded-lg transition-colors
                         ${platform === "instagram"
                           ? "bg-pink-950/50 text-pink-400 border border-pink-900/40"
                           : "bg-cyan-950/50 text-cyan-400 border border-cyan-900/40"
                         }`}
            >
              {platform === "instagram" ? (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                  Instagram
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48 6.3 6.3 0 001.86-4.49V8.74a8.26 8.26 0 004.84 1.56V6.8a4.84 4.84 0 01-1.12-.11z" />
                  </svg>
                  TikTok
                </>
              )}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || (hasText && !isValid)}
          className="rounded-xl bg-white text-neutral-950 px-6 py-3 font-medium
                     hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors shrink-0"
        >
          {isLoading ? "Creating..." : "Drop"}
        </button>
      </div>
      {hasText && !isValid && (
        <p className="text-xs text-red-400/80 pl-1">
          Please enter a valid Instagram or TikTok URL
        </p>
      )}
    </form>
  );
}
