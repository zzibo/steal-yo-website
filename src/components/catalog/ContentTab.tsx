"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

export function ContentTab() {
  const { results } = useCrawlStore();
  const content = results[0]?.content;

  if (!content) return <p className="text-[var(--muted)]">No content extracted.</p>;

  return (
    <div className="space-y-12">
      {/* Meta — File Folder */}
      <section className="border border-[var(--border)] bg-[#faf3e0] p-6">
        <h2 className="font-serif mb-4 text-xl text-[var(--ink)]">Meta</h2>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <dt className="font-hand text-xs text-[var(--muted)]">Title</dt>
            <dd className="text-sm text-[var(--ink)]">{content.meta.title ?? "\u2014"}</dd>
          </div>
          <div>
            <dt className="font-hand text-xs text-[var(--muted)]">Description</dt>
            <dd className="text-sm text-[var(--ink)]">{content.meta.description ?? "\u2014"}</dd>
          </div>
        </dl>
        {content.meta.ogImage && (
          <img src={content.meta.ogImage} alt="OG" className="mt-4 max-h-40" />
        )}
      </section>

      {/* Text — Newspaper Clippings */}
      <section>
        <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Text Content</h2>
        <div className="columns-1 gap-4 md:columns-2">
          {content.sections.map((sec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="mb-4 break-inside-avoid bg-[#faf6ee] p-4"
              style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
            >
              <span className="font-hand float-right text-[10px] text-[var(--muted)]">H{(i % 3) + 2}</span>
              <h3 className="font-serif mb-1 text-sm text-[var(--accent)]">{sec.heading}</h3>
              <p className="text-sm text-[var(--ink-light)]">{sec.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Images — Polaroids */}
      {content.images.length > 0 && (
        <section>
          <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Images ({content.images.length})</h2>
          <div className="flex flex-wrap gap-6">
            {content.images.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ rotate: 0, y: -4 }}
                transition={{ delay: i * 0.03 }}
                className="w-48 bg-white p-2 pb-8 shadow-md"
                style={{ transform: `rotate(${(i * 3 % 5) - 2}deg)` }}
              >
                <img src={img.src} alt={img.alt} className="aspect-video w-full object-cover" />
                <p className="font-hand mt-2 truncate text-xs text-[var(--muted)]">{img.alt || "No alt"}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Links — Sticky Notes */}
      {content.links.length > 0 && (
        <section>
          <h2 className="font-serif mb-6 text-xl text-[var(--ink)]">Links ({content.links.length})</h2>
          <div className="flex flex-wrap gap-3">
            {content.links.map((link, i) => {
              const colors = ["#fef3c7", "#fce7f3", "#dbeafe", "#d1fae5"];
              return (
                <div
                  key={i}
                  className="w-40 p-3 shadow-sm"
                  style={{ backgroundColor: colors[i % colors.length], transform: `rotate(${(i % 3) - 1}deg)` }}
                >
                  <p className="truncate text-xs font-medium text-[var(--ink)]">{link.text || link.href}</p>
                  <p className="font-hand text-[10px] text-[var(--muted)]">
                    {link.isExternal ? "external" : "internal"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
