import type { ScrapedPage } from "../types";
import type { PageToolkit } from "./page-tools";

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error("Unreachable");
}

export function buildPageOverview(
  page: ScrapedPage,
  toolkit: PageToolkit,
): string {
  const meta = toolkit.metaTags;
  const tagCounts = toolkit.elementCounts;
  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => `${tag}:${count}`)
    .join(", ");

  const lines = [
    `URL: ${page.url}`,
    `Title: ${meta.title || page.metadata.title || "unknown"}`,
    `Description: ${meta.description || page.metadata.description || "none"}`,
    "",
    `Element counts: ${topTags}`,
    `Scripts: ${toolkit.scriptTags.length}`,
    `Stylesheets: ${toolkit.linkTags.filter((l) => l.rel === "stylesheet").length}`,
    `CSS variables: ${toolkit.cssVariables.length}`,
    `Unique colors: ${toolkit.allColors.length}`,
    `Font declarations: ${toolkit.fontDeclarations.length}`,
    `Headings: ${toolkit.headingHierarchy.map((h) => `H${h.level}`).join(", ") || "none"}`,
    `Landmarks: ${toolkit.landmarkSections.map((s) => s.tag).join(", ") || "none"}`,
    `Forms: ${toolkit.formFields.length} fields`,
  ];

  if (toolkit.frameworkData) {
    lines.push(`Framework data: found (${Object.keys(toolkit.frameworkData).length} top-level keys)`);
  }

  return lines.join("\n");
}
