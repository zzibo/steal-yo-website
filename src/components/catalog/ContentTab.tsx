"use client";

import { useCrawlStore } from "@/lib/store";
import { motion } from "framer-motion";

export function ContentTab() {
  const { results } = useCrawlStore();
  const content = results[0]?.content;

  if (!content) {
    return <p className="text-[var(--muted)]">No content extracted.</p>;
  }

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-4 text-xl font-semibold">Meta</h2>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--muted)]">Title</dt>
            <dd className="text-sm">{content.meta.title ?? "\u2014"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Description</dt>
            <dd className="text-sm">{content.meta.description ?? "\u2014"}</dd>
          </div>
        </dl>
        {content.meta.ogImage && (
          <img src={content.meta.ogImage} alt="OG Image" className="mt-4 max-h-40 rounded-lg" />
        )}
      </section>

      <section>
        <h2 className="mb-6 text-xl font-semibold">Text Content</h2>
        <div className="space-y-4">
          {content.sections.map((sec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-[var(--border)] p-4"
            >
              <h3 className="mb-1 text-sm font-medium text-[var(--accent)]">{sec.heading}</h3>
              <p className="text-sm text-[var(--muted)]">{sec.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {content.images.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold">Images ({content.images.length})</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {content.images.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="overflow-hidden rounded-xl border border-[var(--border)]"
              >
                <img src={img.src} alt={img.alt} className="aspect-video w-full object-cover" />
                <p className="truncate p-2 text-xs text-[var(--muted)]">{img.alt || "No alt text"}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {content.links.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold">Links ({content.links.length})</h2>
          <div className="space-y-1">
            {content.links.map((link, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--surface)]">
                <span className="text-sm">{link.text || link.href}</span>
                <span className="text-xs text-[var(--muted)]">
                  {link.isExternal ? "external" : "internal"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
