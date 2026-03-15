import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { tool } from "ai";
import { z } from "zod";
import type { ScrapedPage } from "../types";

// ── Pre-computed page data ────────────────────────────────────────

export interface PageToolkit {
  scriptTags: { src?: string; content?: string; type?: string }[];
  metaTags: Record<string, string>;
  linkTags: { rel: string; href: string; type?: string }[];
  cssVariables: { name: string; value: string }[];
  allColors: string[];
  fontDeclarations: { family: string; weight?: string; src?: string }[];
  mediaQueries: { query: string; rules: string }[];
  headingHierarchy: { level: number; text: string }[];
  schemaOrg: object[];
  formFields: { tag: string; type?: string; name?: string; label?: string }[];
  frameworkData: object | null;
  elementCounts: Record<string, number>;
  landmarkSections: { tag: string; classes: string; text: string }[];
  spacingValues: { property: string; value: string; count: number }[];
  borderRadiusValues: { value: string; count: number }[];
  extractedStyles: string;
  externalStylesheets: string[];
  $: cheerio.CheerioAPI;
}

export function precomputePageData(page: ScrapedPage): PageToolkit {
  const $ = cheerio.load(page.rawHtml);

  return {
    scriptTags: extractScriptTags($),
    metaTags: extractMetaTags($),
    linkTags: extractLinkTags($),
    cssVariables: extractCSSVariables($),
    allColors: extractAllColors($, page.rawHtml),
    fontDeclarations: extractFontDeclarations($, page.rawHtml),
    mediaQueries: extractMediaQueries(page.rawHtml),
    headingHierarchy: extractHeadingHierarchy($),
    schemaOrg: extractSchemaOrg($),
    formFields: extractFormFields($),
    frameworkData: extractFrameworkData($),
    elementCounts: extractElementCounts($),
    landmarkSections: extractLandmarkSections($),
    spacingValues: extractSpacingValues(page.rawHtml),
    borderRadiusValues: extractBorderRadiusValues(page.rawHtml),
    extractedStyles: extractAllInlineStyles($),
    externalStylesheets: extractExternalStylesheets($),
    $,
  };
}

// ── Extraction functions ──────────────────────────────────────────

function extractScriptTags($: cheerio.CheerioAPI) {
  const scripts: PageToolkit["scriptTags"] = [];
  $("script").each((_, el) => {
    const $el = $(el);
    scripts.push({
      src: $el.attr("src") || undefined,
      content: $el.attr("src") ? undefined : $el.html()?.slice(0, 500) || undefined,
      type: $el.attr("type") || undefined,
    });
  });
  return scripts;
}

function extractMetaTags($: cheerio.CheerioAPI) {
  const meta: Record<string, string> = {};
  $("meta").each((_, el) => {
    const $el = $(el);
    const name = $el.attr("name") || $el.attr("property") || $el.attr("http-equiv");
    const content = $el.attr("content");
    if (name && content) meta[name] = content;
  });
  const title = $("title").first().text();
  if (title) meta.title = title;
  return meta;
}

function extractLinkTags($: cheerio.CheerioAPI) {
  const links: PageToolkit["linkTags"] = [];
  $("link").each((_, el) => {
    const $el = $(el);
    const rel = $el.attr("rel");
    const href = $el.attr("href");
    if (rel && href) {
      links.push({ rel, href, type: $el.attr("type") || undefined });
    }
  });
  return links;
}

function extractCSSVariables($: cheerio.CheerioAPI) {
  const vars: PageToolkit["cssVariables"] = [];
  const seen = new Set<string>();
  $("style").each((_, el) => {
    const css = $(el).html() || "";
    const re = /--([\w-]+)\s*:\s*([^;}\n]+)/g;
    let match;
    while ((match = re.exec(css)) !== null) {
      const name = `--${match[1]}`;
      if (!seen.has(name)) {
        seen.add(name);
        vars.push({ name, value: match[2].trim() });
      }
    }
  });
  return vars;
}

function extractAllColors($: cheerio.CheerioAPI, rawHtml: string) {
  const colors = new Set<string>();
  // Hex colors
  const hexRe = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
  let m;
  while ((m = hexRe.exec(rawHtml)) !== null) colors.add(m[0].toLowerCase());
  // rgb/rgba/hsl/hsla in style tags
  $("style").each((_, el) => {
    const css = $(el).html() || "";
    const funcRe = /(?:rgba?|hsla?)\([^)]+\)/gi;
    let fm;
    while ((fm = funcRe.exec(css)) !== null) colors.add(fm[0]);
  });
  return [...colors].slice(0, 100);
}

function extractFontDeclarations($: cheerio.CheerioAPI, rawHtml: string) {
  const fonts: PageToolkit["fontDeclarations"] = [];
  const seen = new Set<string>();

  // @font-face
  const ffRe = /@font-face\s*\{([^}]+)\}/gi;
  let m;
  while ((m = ffRe.exec(rawHtml)) !== null) {
    const block = m[1];
    const family = block.match(/font-family\s*:\s*['"]?([^'";,]+)/i)?.[1]?.trim();
    const weight = block.match(/font-weight\s*:\s*(\d+|\w+)/i)?.[1];
    const src = block.match(/src\s*:\s*([^;]+)/i)?.[1]?.slice(0, 200);
    if (family && !seen.has(family)) {
      seen.add(family);
      fonts.push({ family, weight, src });
    }
  }

  // Google Fonts links
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const familyMatch = href.match(/family=([^&:]+)/);
    if (familyMatch) {
      const family = decodeURIComponent(familyMatch[1]).replace(/\+/g, " ");
      if (!seen.has(family)) {
        seen.add(family);
        fonts.push({ family, src: href });
      }
    }
  });

  // font-family in CSS
  $("style").each((_, el) => {
    const css = $(el).html() || "";
    const re = /font-family\s*:\s*['"]?([^'";}\n]+)/gi;
    let fm;
    while ((fm = re.exec(css)) !== null) {
      const family = fm[1].split(",")[0].trim().replace(/['"]/g, "");
      if (family && !seen.has(family) && family.length < 50) {
        seen.add(family);
        fonts.push({ family });
      }
    }
  });

  return fonts;
}

function extractMediaQueries(rawHtml: string) {
  const queries: PageToolkit["mediaQueries"] = [];
  const re = /@media\s*([^{]+)\{((?:[^{}]*|\{[^}]*\})*)\}/gi;
  let m;
  while ((m = re.exec(rawHtml)) !== null) {
    queries.push({ query: m[1].trim(), rules: m[2].trim().slice(0, 500) });
  }
  return queries.slice(0, 30);
}

function extractHeadingHierarchy($: cheerio.CheerioAPI) {
  const headings: PageToolkit["headingHierarchy"] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const $el = $(el);
    const level = parseInt($el.prop("tagName")?.replace("H", "") || "0");
    const text = $el.text().trim().slice(0, 200);
    if (text) headings.push({ level, text });
  });
  return headings.slice(0, 50);
}

function extractSchemaOrg($: cheerio.CheerioAPI) {
  const schemas: object[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || "");
      schemas.push(json);
    } catch {
      // skip malformed JSON-LD
    }
  });
  return schemas;
}

function extractFormFields($: cheerio.CheerioAPI) {
  const fields: PageToolkit["formFields"] = [];
  $("input, textarea, select, button[type='submit']").each((_, el) => {
    const $el = $(el);
    const tag = $el.prop("tagName")?.toLowerCase() || "";
    const id = $el.attr("id");
    let label: string | undefined;
    if (id) {
      label = $(`label[for="${id}"]`).first().text().trim() || undefined;
    }
    fields.push({
      tag,
      type: $el.attr("type") || undefined,
      name: $el.attr("name") || $el.attr("id") || undefined,
      label: label || $el.attr("placeholder") || $el.attr("aria-label") || undefined,
    });
  });
  return fields.slice(0, 30);
}

function extractFrameworkData($: cheerio.CheerioAPI) {
  // __NEXT_DATA__
  const nextScript = $("#__NEXT_DATA__");
  if (nextScript.length) {
    try {
      return JSON.parse(nextScript.html() || "");
    } catch { /* skip */ }
  }
  // __NUXT__
  let nuxt: object | null = null;
  $("script").each((_, el) => {
    const content = $(el).html() || "";
    if (content.includes("__NUXT__") || content.includes("__nuxt")) {
      nuxt = { _raw: content.slice(0, 2000) };
    }
  });
  return nuxt;
}

function extractElementCounts($: cheerio.CheerioAPI) {
  const counts: Record<string, number> = {};
  const tags = ["div", "span", "p", "a", "img", "button", "input", "form", "section", "article", "header", "footer", "nav", "aside", "ul", "ol", "li", "table", "svg", "iframe"];
  for (const tag of tags) {
    const n = $(tag).length;
    if (n > 0) counts[tag] = n;
  }
  return counts;
}

function extractLandmarkSections($: cheerio.CheerioAPI) {
  const sections: PageToolkit["landmarkSections"] = [];
  const selectors = ["header", "main", "footer", "nav", "aside", "section", "article", '[role="banner"]', '[role="main"]', '[role="contentinfo"]', '[role="navigation"]'];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const $el = $(el);
      sections.push({
        tag: $el.prop("tagName")?.toLowerCase() || sel,
        classes: $el.attr("class")?.slice(0, 200) || "",
        text: $el.text().trim().slice(0, 300),
      });
    });
  }
  return sections.slice(0, 30);
}

function extractSpacingValues(rawHtml: string) {
  const counts = new Map<string, { property: string; count: number }>();
  const re = /(?:padding|margin|gap)\s*:\s*([^;}\n]+)/gi;
  let m;
  while ((m = re.exec(rawHtml)) !== null) {
    const prop = m[0].split(":")[0].trim();
    const val = m[1].trim();
    const key = `${prop}:${val}`;
    const existing = counts.get(key);
    if (existing) existing.count++;
    else counts.set(key, { property: prop, count: 1 });
  }
  return [...counts.entries()]
    .map(([key, { property, count }]) => ({ property, value: key.split(":")[1], count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);
}

function extractBorderRadiusValues(rawHtml: string) {
  const counts = new Map<string, number>();
  const re = /border-radius\s*:\s*([^;}\n]+)/gi;
  let m;
  while ((m = re.exec(rawHtml)) !== null) {
    const val = m[1].trim();
    counts.set(val, (counts.get(val) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function extractAllInlineStyles($: cheerio.CheerioAPI): string {
  const styles: string[] = [];
  $("style").each((_, el) => {
    const css = $(el).html();
    if (css) styles.push(css);
  });
  // Cap at 200KB to avoid bloating the response
  const combined = styles.join("\n");
  return combined.slice(0, 200_000);
}

function extractExternalStylesheets($: cheerio.CheerioAPI): string[] {
  const urls: string[] = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) urls.push(href);
  });
  return urls;
}

export async function fetchExternalStyles(
  stylesheetUrls: string[],
  baseUrl: string,
): Promise<string> {
  const results: string[] = [];
  let totalSize = 0;
  const MAX_SIZE = 200_000;

  for (const href of stylesheetUrls.slice(0, 5)) {
    if (totalSize >= MAX_SIZE) break;
    try {
      const resolvedUrl = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(resolvedUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const css = await res.text();
        const remaining = MAX_SIZE - totalSize;
        results.push(css.slice(0, remaining));
        totalSize += Math.min(css.length, remaining);
      }
    } catch { /* skip failed fetches */ }
  }
  return results.join("\n\n");
}

// ── Component candidate extraction ───────────────────────────────

export interface ComponentCandidate {
  selector: string;
  tag: string;
  classes: string;
  outerHtml: string;
  matchingCss: string;
  parentTag: string;
  parentClasses: string;
  siblingCount: number;
  score: number;
  metrics: {
    subtreeSize: number;
    contentLength: number;
    interactiveCount: number;
    childDiversity: number;
    depth: number;
  };
}

// Class-name selectors kept as ONE signal source among many
const CLASS_NAME_SELECTORS = [
  '[class*="card"]', '[class*="Card"]',
  '[class*="hero"]', '[class*="Hero"]',
  '[class*="pricing"]', '[class*="Pricing"]',
  '[class*="feature"]', '[class*="Feature"]',
  '[class*="testimonial"]', '[class*="Testimonial"]',
  '[class*="cta"]', '[class*="CTA"]',
  '[class*="banner"]', '[class*="Banner"]',
  '[class*="modal"]', '[class*="Modal"]',
  '[class*="accordion"]', '[class*="Accordion"]',
  '[class*="carousel"]', '[class*="Carousel"]',
  '[class*="slider"]', '[class*="Slider"]',
  '[class*="tooltip"]', '[class*="Tooltip"]',
  'form',
  'table',
];

// Semantic / structural selectors for Phase 1
const SEMANTIC_SELECTORS = [
  'section', 'article', 'aside', 'main > *', 'header', 'footer', 'nav',
  '[role="banner"]', '[role="main"]', '[role="contentinfo"]', '[role="navigation"]',
];

function getDepth($: cheerio.CheerioAPI, el: AnyNode): number {
  let depth = 0;
  let current = $(el).parent();
  while (current.length && current.prop("tagName")) {
    depth++;
    current = current.parent();
  }
  return depth;
}

function getStructuralSignature($: cheerio.CheerioAPI, el: AnyNode): string {
  const $el = $(el);
  // Child tag sequence
  const childTags: string[] = [];
  $el.children().each((_, child) => {
    childTags.push($(child).prop("tagName")?.toLowerCase() || "?");
  });
  // Class word stems (strip hashes/numbers, keep semantic words)
  const classes = ($el.attr("class") || "")
    .split(/\s+/)
    .map(c => c.replace(/[_-]?[a-f0-9]{5,}/gi, "").replace(/\d+/g, ""))
    .filter(c => c.length > 2)
    .sort();
  return `${childTags.join(",")}|${classes.join(",")}`;
}

function scoreElement($: cheerio.CheerioAPI, el: AnyNode): { score: number; metrics: ComponentCandidate["metrics"] } {
  const $el = $(el);
  const subtreeSize = $el.find("*").length;
  const contentLength = $el.text().trim().length;
  const interactiveCount = $el.find("a, button, input, select, svg, img").length;

  const childTagNames = new Set<string>();
  $el.children().each((_, child) => {
    const tag = $(child).prop("tagName")?.toLowerCase();
    if (tag) childTagNames.add(tag);
  });
  const childDiversity = childTagNames.size;

  const depth = getDepth($, el);

  // Weighted composite score
  // Normalize each signal to a rough 0-1 range, then apply weights
  const subtreeScore = Math.min(subtreeSize / 50, 1) * 0.30;
  const contentScore = Math.min(contentLength / 500, 1) * 0.25;
  const interactiveScore = Math.min(interactiveCount / 10, 1) * 0.15;
  const diversityScore = Math.min(childDiversity / 6, 1) * 0.15;
  const depthPenalty = (depth > 10 ? Math.min((depth - 10) / 5, 1) : 0) * 0.15;

  const score = subtreeScore + contentScore + interactiveScore + diversityScore - depthPenalty;

  return {
    score,
    metrics: { subtreeSize, contentLength, interactiveCount, childDiversity, depth },
  };
}

export function extractCandidateComponents(toolkit: PageToolkit): ComponentCandidate[] {
  const $ = toolkit.$;

  // ── Phase 1: Broad collection ──────────────────────────────────
  const seen = new Set<AnyNode>();
  const rawCandidates: { el: AnyNode; source: string }[] = [];

  const collect = (selector: string) => {
    try {
      $(selector).each((_, el) => {
        if (!seen.has(el)) {
          seen.add(el);
          rawCandidates.push({ el, source: selector });
        }
      });
    } catch { /* invalid selector, skip */ }
  };

  // Semantic HTML + ARIA landmarks
  for (const sel of SEMANTIC_SELECTORS) collect(sel);
  // Class-name selectors
  for (const sel of CLASS_NAME_SELECTORS) collect(sel);
  // Structural heuristic: elements with ≥3 children and ≥100 chars text
  $("body *").each((_, el) => {
    if (seen.has(el)) return;
    const $el = $(el);
    if ($el.children().length >= 3 && $el.text().trim().length >= 100) {
      seen.add(el);
      rawCandidates.push({ el, source: "structural-heuristic" });
    }
  });

  // ── Phase 2: Score and rank ────────────────────────────────────
  const scored: {
    el: AnyNode;
    source: string;
    score: number;
    metrics: ComponentCandidate["metrics"];
  }[] = [];

  for (const { el, source } of rawCandidates) {
    const $el = $(el);
    const outerHtml = $.html(el) || "";

    // Skip tiny elements
    if (outerHtml.length < 80) continue;
    // Skip leaf nodes with barely any text
    if ($el.children().length === 0 && $el.text().trim().length < 20) continue;
    // Skip enormous elements (likely the whole page body or main wrapper)
    if (outerHtml.length > 50_000) continue;

    const { score, metrics } = scoreElement($, el);
    scored.push({ el, source, score, metrics });
  }

  scored.sort((a, b) => b.score - a.score);

  // ── Phase 3: Deduplicate by structural signature ───────────────
  const signatureGroups = new Map<string, typeof scored>();
  for (const item of scored) {
    const sig = getStructuralSignature($, item.el);
    const group = signatureGroups.get(sig);
    if (group) {
      group.push(item);
    } else {
      signatureGroups.set(sig, [item]);
    }
  }

  // Keep only highest-scored element from each group
  const deduplicated: typeof scored = [];
  for (const group of signatureGroups.values()) {
    // Already sorted by score descending, so first is best
    deduplicated.push(group[0]);
  }

  deduplicated.sort((a, b) => b.score - a.score);

  // ── Phase 4: Build final candidates (top 20) ──────────────────
  const candidates: ComponentCandidate[] = [];
  for (const { el, source, score, metrics } of deduplicated.slice(0, 12)) {
    const $el = $(el);
    const classes = $el.attr("class")?.slice(0, 300) || "";
    const parent = $el.parent();
    const matchingCss = findMatchingCssRules(toolkit, classes);

    candidates.push({
      selector: source,
      tag: $el.prop("tagName")?.toLowerCase() || "",
      classes,
      outerHtml: $.html(el)?.slice(0, 3000) || "",
      matchingCss,
      parentTag: parent.prop("tagName")?.toLowerCase() || "",
      parentClasses: parent.attr("class")?.slice(0, 200) || "",
      siblingCount: parent.children().length,
      score,
      metrics,
    });
  }

  return candidates;
}

function findMatchingCssRules(toolkit: PageToolkit, classes: string): string {
  if (!classes) return "";
  const classNames = classes.split(/\s+/).filter(Boolean).slice(0, 5);
  const rules: string[] = [];

  toolkit.$("style").each((_, el) => {
    const css = toolkit.$(el).html() || "";
    for (const className of classNames) {
      const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`[^{}]*\\.${escaped}[^{]*\\{[^}]*\\}`, "gi");
      let m;
      while ((m = re.exec(css)) !== null) {
        if (rules.length >= 15) break;
        rules.push(m[0].trim().slice(0, 500));
      }
    }
  });

  return rules.join("\n\n").slice(0, 3000);
}

// ── Tool factory functions ────────────────────────────────────────

export function techStackTools(toolkit: PageToolkit) {
  return {
    get_script_tags: tool({
      description: "Get all <script> tags from the page with their src URLs, inline content (first 500 chars), and type attributes",
      inputSchema: z.object({}),
      execute: async () => toolkit.scriptTags,
    }),
    get_meta_tags: tool({
      description: "Get all <meta> tags as key-value pairs (name/property → content), plus the <title> text",
      inputSchema: z.object({}),
      execute: async () => toolkit.metaTags,
    }),
    get_html_attributes: tool({
      description: "Get attributes from <html> and <body> tags (ng-version, data-framework, data-reactroot, etc.)",
      inputSchema: z.object({}),
      execute: async () => ({
        html: {
          attributes: toolkit.$("html").attr() || {},
          classes: toolkit.$("html").attr("class") || "",
        },
        body: {
          attributes: toolkit.$("body").attr() || {},
          classes: toolkit.$("body").attr("class") || "",
        },
      }),
    }),
  };
}

