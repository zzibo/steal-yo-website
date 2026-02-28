import * as cheerio from "cheerio";
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
    get_link_tags: tool({
      description: "Get all <link> tags with rel, href, and type attributes (stylesheets, preloads, icons, manifests)",
      inputSchema: z.object({}),
      execute: async () => toolkit.linkTags,
    }),
    get_framework_data: tool({
      description: "Get framework-specific data objects like __NEXT_DATA__ (Next.js), __NUXT__ (Nuxt), or similar embedded JSON. Returns null if none found.",
      inputSchema: z.object({}),
      execute: async () => toolkit.frameworkData,
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
    search_inline_scripts: tool({
      description: "Search inline script content for specific patterns (framework initialization, library imports, config objects)",
      inputSchema: z.object({
        pattern: z.string().describe("Text pattern to search for, e.g. 'createApp', 'ReactDOM', 'angular.bootstrap'"),
      }),
      execute: async ({ pattern }) => {
        const matches: { context: string }[] = [];
        toolkit.$("script").each((_, el) => {
          const content = toolkit.$(el).html() || "";
          if (!toolkit.$(el).attr("src") && content.includes(pattern)) {
            const index = content.indexOf(pattern);
            matches.push({
              context: content.slice(Math.max(0, index - 100), index + 200),
            });
          }
        });
        return matches.slice(0, 5);
      },
    }),
  };
}

export function layoutTools(toolkit: PageToolkit) {
  return {
    get_landmark_sections: tool({
      description: "Get all HTML landmark elements (header, main, footer, nav, aside, section, article) with their classes and text preview",
      inputSchema: z.object({}),
      execute: async () => toolkit.landmarkSections,
    }),
    get_media_queries: tool({
      description: "Get all CSS @media queries with their breakpoint conditions and rules",
      inputSchema: z.object({}),
      execute: async () => toolkit.mediaQueries,
    }),
    get_heading_hierarchy: tool({
      description: "Get the H1-H6 heading outline of the page showing content hierarchy",
      inputSchema: z.object({}),
      execute: async () => toolkit.headingHierarchy,
    }),
    query_elements: tool({
      description: "Query elements matching a CSS selector. Returns tag name, classes, key attributes, and outer HTML (truncated). Use to inspect specific sections or components.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector like 'nav', '.hero', '[role=main]', 'section.features'"),
      }),
      execute: async ({ selector }) => {
        const results: { tag: string; classes: string; id?: string; outerHtml: string }[] = [];
        try {
          toolkit.$(selector).each((_, el) => {
            if (results.length >= 10) return;
            const $el = toolkit.$(el);
            results.push({
              tag: $el.prop("tagName")?.toLowerCase() || "",
              classes: $el.attr("class")?.slice(0, 300) || "",
              id: $el.attr("id") || undefined,
              outerHtml: toolkit.$.html(el)?.slice(0, 2000) || "",
            });
          });
        } catch { /* invalid selector */ }
        return results;
      },
    }),
    get_section_hierarchy: tool({
      description: "Get the hierarchical structure of page sections showing parent-child nesting relationships",
      inputSchema: z.object({}),
      execute: async () => {
        type SectionNode = { tag: string; classes: string; id?: string; children: SectionNode[] };
        const structuralTags = new Set(["header", "main", "footer", "nav", "aside", "section", "article"]);
        const buildTree = (selector: string): SectionNode[] => {
          const nodes: SectionNode[] = [];
          toolkit.$(selector).children().each((_, el) => {
            const $el = toolkit.$(el);
            const tag = $el.prop("tagName")?.toLowerCase() || "";
            if (!structuralTags.has(tag)) return;
            const id = $el.attr("id");
            const classes = $el.attr("class")?.slice(0, 200) || "";
            const childSelector = id ? `#${id}` : `${tag}.${(classes.split(" ")[0] || "")}`;
            const node: SectionNode = {
              tag,
              classes,
              id: id || undefined,
              children: childSelector ? buildTree(childSelector) : [],
            };
            nodes.push(node);
          });
          return nodes;
        };
        return buildTree("body");
      },
    }),
  };
}

export function componentTools(toolkit: PageToolkit) {
  return {
    query_elements: tool({
      description: "Find elements matching a CSS selector. Returns outer HTML (capped at 2KB each, max 10 results). Use to extract specific component HTML.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector like 'button', '.card', '[class*=btn]', 'form', '.navbar'"),
      }),
      execute: async ({ selector }) => {
        const results: { tag: string; classes: string; outerHtml: string }[] = [];
        try {
          toolkit.$(selector).each((_, el) => {
            if (results.length >= 10) return;
            const $el = toolkit.$(el);
            results.push({
              tag: $el.prop("tagName")?.toLowerCase() || "",
              classes: $el.attr("class")?.slice(0, 300) || "",
              outerHtml: toolkit.$.html(el)?.slice(0, 2000) || "",
            });
          });
        } catch { /* invalid selector */ }
        return results;
      },
    }),
    get_css_variables: tool({
      description: "Get all CSS custom properties (variables) defined in :root or style tags, e.g. --color-primary: #6366f1",
      inputSchema: z.object({}),
      execute: async () => toolkit.cssVariables,
    }),
    get_stylesheet_rules: tool({
      description: "Search CSS rules in <style> tags matching a pattern. Returns matching CSS rule blocks.",
      inputSchema: z.object({
        pattern: z.string().describe("Text to search for in CSS, e.g. '.btn', 'card', 'navbar', 'color'"),
      }),
      execute: async ({ pattern }) => {
        const results: string[] = [];
        toolkit.$("style").each((_, el) => {
          const css = toolkit.$(el).html() || "";
          const re = new RegExp(`[^{}]*${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^{]*\\{[^}]*\\}`, "gi");
          let m;
          while ((m = re.exec(css)) !== null) {
            if (results.length >= 20) break;
            results.push(m[0].trim().slice(0, 500));
          }
        });
        return results;
      },
    }),
    get_element_context: tool({
      description: "Get an element and its surrounding context (parent + siblings) to understand component composition. Returns parent HTML with the target highlighted.",
      inputSchema: z.object({
        selector: z.string().describe("CSS selector for the target element"),
      }),
      execute: async ({ selector }) => {
        const el = toolkit.$(selector).first();
        if (!el.length) return null;
        const parent = el.parent();
        return {
          target: toolkit.$.html(el)?.slice(0, 1500) || "",
          parent: {
            tag: parent.prop("tagName")?.toLowerCase() || "",
            classes: parent.attr("class")?.slice(0, 200) || "",
            childCount: parent.children().length,
            html: toolkit.$.html(parent)?.slice(0, 3000) || "",
          },
        };
      },
    }),
    check_external_stylesheets: tool({
      description: "Check if external stylesheets are loaded and identify known library CSS files (MUI, Chakra, Bootstrap, etc.)",
      inputSchema: z.object({}),
      execute: async () => {
        const libraryPatterns: [string, RegExp][] = [
          ["MUI", /mui|material/i],
          ["Chakra UI", /chakra/i],
          ["Bootstrap", /bootstrap/i],
          ["Ant Design", /antd|ant-design/i],
          ["Tailwind CSS", /tailwind/i],
          ["Bulma", /bulma/i],
          ["Foundation", /foundation/i],
          ["Semantic UI", /semantic/i],
        ];
        return toolkit.linkTags
          .filter((link) => link.rel === "stylesheet")
          .map((link) => {
            const library = libraryPatterns.find(([, re]) => re.test(link.href))?.[0] ?? null;
            return { href: link.href, library };
          });
      },
    }),
  };
}

export function designTools(toolkit: PageToolkit) {
  return {
    get_css_variables: tool({
      description: "Get all CSS custom properties (design tokens) from :root and style tags",
      inputSchema: z.object({}),
      execute: async () => toolkit.cssVariables,
    }),
    get_all_colors: tool({
      description: "Get all unique color values found in the page (hex, rgb, rgba, hsl). Includes colors from inline styles and style tags.",
      inputSchema: z.object({}),
      execute: async () => toolkit.allColors,
    }),
    get_font_declarations: tool({
      description: "Get all font declarations: @font-face rules, Google Fonts links, and font-family usage in CSS",
      inputSchema: z.object({}),
      execute: async () => toolkit.fontDeclarations,
    }),
    get_spacing_and_radii: tool({
      description: "Get padding, margin, gap, and border-radius values found in CSS with usage frequency counts",
      inputSchema: z.object({}),
      execute: async () => ({
        spacing: toolkit.spacingValues,
        borderRadius: toolkit.borderRadiusValues,
      }),
    }),
    analyze_color_usage: tool({
      description: "Analyze which colors are used where (backgrounds, text, borders) with usage counts",
      inputSchema: z.object({}),
      execute: async () => {
        const usage = new Map<string, { bg: number; text: number; border: number }>();
        toolkit.$("style").each((_, styleEl) => {
          const css = toolkit.$(styleEl).html() || "";
          for (const match of css.matchAll(/background(?:-color)?\s*:\s*([#\w(),./ -]+)/gi)) {
            const color = match[1].trim().toLowerCase();
            const e = usage.get(color) || { bg: 0, text: 0, border: 0 };
            e.bg++;
            usage.set(color, e);
          }
          for (const match of css.matchAll(/(?:^|[{;\s])color\s*:\s*([#\w(),./ -]+)/gi)) {
            const color = match[1].trim().toLowerCase();
            const e = usage.get(color) || { bg: 0, text: 0, border: 0 };
            e.text++;
            usage.set(color, e);
          }
          for (const match of css.matchAll(/border(?:-color)?\s*:[^;]*?([#]\w{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/gi)) {
            const color = match[1].trim().toLowerCase();
            const e = usage.get(color) || { bg: 0, text: 0, border: 0 };
            e.border++;
            usage.set(color, e);
          }
        });
        return [...usage.entries()]
          .map(([color, counts]) => ({ color, ...counts }))
          .filter(({ bg, text, border }) => bg + text + border > 0)
          .sort((a, b) => (b.bg + b.text + b.border) - (a.bg + a.text + a.border))
          .slice(0, 50);
      },
    }),
    analyze_typography_usage: tool({
      description: "Get actual font sizes, weights, and line heights used on headings and body text elements",
      inputSchema: z.object({}),
      execute: async () => {
        const selectors = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "li"];
        const results: { tag: string; fontSize: string; fontWeight: string; lineHeight: string; fontFamily: string; count: number }[] = [];
        for (const sel of selectors) {
          const count = toolkit.$(sel).length;
          if (count === 0) continue;
          let fontSize = "", fontWeight = "", lineHeight = "", fontFamily = "";
          toolkit.$("style").each((_, styleEl) => {
            const css = toolkit.$(styleEl).html() || "";
            const re = new RegExp(`(?:^|[},\\s])${sel}\\s*\\{([^}]+)\\}`, "gi");
            const match = re.exec(css);
            if (match) {
              const rules = match[1];
              fontSize = rules.match(/font-size\s*:\s*([^;]+)/i)?.[1]?.trim() || fontSize;
              fontWeight = rules.match(/font-weight\s*:\s*([^;]+)/i)?.[1]?.trim() || fontWeight;
              lineHeight = rules.match(/line-height\s*:\s*([^;]+)/i)?.[1]?.trim() || lineHeight;
              fontFamily = rules.match(/font-family\s*:\s*([^;]+)/i)?.[1]?.trim() || fontFamily;
            }
          });
          results.push({ tag: sel, fontSize: fontSize || "inherit", fontWeight: fontWeight || "normal", lineHeight: lineHeight || "normal", fontFamily: fontFamily || "inherit", count });
        }
        return results;
      },
    }),
  };
}

export function contentTools(toolkit: PageToolkit) {
  return {
    get_heading_hierarchy: tool({
      description: "Get the full H1-H6 heading outline showing the content structure",
      inputSchema: z.object({}),
      execute: async () => toolkit.headingHierarchy,
    }),
    get_schema_org: tool({
      description: "Get all JSON-LD structured data (Schema.org) found in the page",
      inputSchema: z.object({}),
      execute: async () => toolkit.schemaOrg,
    }),
    get_meta_tags: tool({
      description: "Get all meta tags including title, description, OG tags, author, etc.",
      inputSchema: z.object({}),
      execute: async () => toolkit.metaTags,
    }),
    get_form_fields: tool({
      description: "Get all form inputs, textareas, selects, and submit buttons with their labels",
      inputSchema: z.object({}),
      execute: async () => toolkit.formFields,
    }),
    query_ctas: tool({
      description: "Find all call-to-action buttons and prominent action links on the page",
      inputSchema: z.object({}),
      execute: async () => {
        const ctas: { text: string; href: string; tag: string; classes: string }[] = [];
        toolkit.$("button, [role='button'], .btn, [class*='button'], a.cta, a[class*='cta']").each((_, el) => {
          const $el = toolkit.$(el);
          const text = $el.text().trim();
          if (text && ctas.length < 20) {
            ctas.push({
              text,
              href: $el.attr("href") || $el.closest("a").attr("href") || "",
              tag: $el.prop("tagName")?.toLowerCase() || "",
              classes: $el.attr("class")?.slice(0, 200) || "",
            });
          }
        });
        // Also find prominent action links
        const actionWords = ["get started", "sign up", "try", "download", "buy", "subscribe", "learn more", "contact", "start free", "book a demo"];
        toolkit.$("a").each((_, el) => {
          const $el = toolkit.$(el);
          const text = $el.text().trim().toLowerCase();
          if (actionWords.some((w) => text.includes(w)) && ctas.length < 25) {
            ctas.push({
              text: $el.text().trim(),
              href: $el.attr("href") || "",
              tag: "a",
              classes: $el.attr("class")?.slice(0, 200) || "",
            });
          }
        });
        return ctas;
      },
    }),
  };
}
