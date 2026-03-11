# React Component Output Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change component output from raw Tailwind HTML to typed React TSX components with props, and update the export to generate usable `.tsx` files.

**Architecture:** Add a `reactCode` field to the component pipeline (types → Zod schema → AI prompt → UI → export). The AI generates both `recreatedHtml` (for iframe preview) and `reactCode` (for copy/export). Export changes from markdown ZIP to a folder of `.tsx` files + `tailwind.config.ts`.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Zod 4, Anthropic Claude (ai SDK), JSZip

**Spec:** `docs/superpowers/specs/2026-03-10-react-component-output-design.md`

---

## Chunk 1: Data Layer (Types + Schema)

### Task 1: Add `reactCode` to `ExtractedComponent` type

**Files:**
- Modify: `src/lib/types.ts:49-68`

- [ ] **Step 1: Add `reactCode` field to `ExtractedComponent`**

In `src/lib/types.ts`, add `reactCode: string;` after the `recreatedHtml` field (line 64):

```ts
export interface ExtractedComponent {
  name: string;
  category:
    | "button"
    | "card"
    | "input"
    | "modal"
    | "navbar"
    | "hero"
    | "footer"
    | "form"
    | "badge"
    | "other";
  html: string;
  css: string;
  recreatedHtml: string;
  reactCode: string;
  variants: string[];
  description: string;
  attribution?: ComponentAttribution;
}
```

- [ ] **Step 2: Update `StealKitExport` type**

Replace the `StealKitExport` interface (lines 155-161) with:

```ts
export interface StealKitExport {
  components: { filename: string; content: string }[];
  tailwindConfig: string;
  indexFile: string;
  readme: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add reactCode to ExtractedComponent, update StealKitExport type"
```

### Task 2: Add `reactCode` to Zod schema

**Files:**
- Modify: `src/lib/agents/schemas.ts:49-64`

- [ ] **Step 1: Add `reactCode` to ComponentSchema**

In `src/lib/agents/schemas.ts`, add the `reactCode` field to the component object inside `ComponentSchema` (after `recreatedHtml` on line 55):

```ts
export const ComponentSchema = z.object({
  components: z.array(z.object({
    name: z.string(),
    category: z.enum(["button", "card", "input", "modal", "navbar", "hero", "footer", "form", "badge", "other"]),
    html: z.string().describe("The original HTML from the page (for reference)"),
    css: z.string().describe("The original CSS from the page (for reference)"),
    recreatedHtml: z.string().describe("Standalone HTML recreation using Tailwind CSS classes that visually matches the original. Must be self-contained — no external images, no relative URLs. Use placeholder images via https://placehold.co/ if needed. Use inline SVGs for icons."),
    reactCode: z.string().describe("A complete, self-contained React TSX component. Include a TypeScript interface named {ComponentName}Props with typed props for all variable content (text as string, images as string URLs, handlers as () => void, lists as string[]). Use a named export function (not default). Style with Tailwind classes using the site's actual hex colors as arbitrary values (e.g. bg-[#6366f1]). Provide default values for all optional props via destructuring. Icons as inline JSX SVG elements. Images as placehold.co URLs in defaults. No imports needed — component will be used in a React + Tailwind project."),
    variants: z.array(z.string()),
    description: z.string(),
    attribution: z.object({
      library: z.string().nullable(),
      confidence: z.enum(["high", "medium", "low"]),
      reasoning: z.string(),
    }).optional(),
  })),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agents/schemas.ts
git commit -m "feat: add reactCode field to ComponentSchema with generation instructions"
```

---

## Chunk 2: AI Agent Prompt

### Task 3: Update component analysis agent prompt

**Files:**
- Modify: `src/lib/agents/components.ts:9-31` (SYSTEM_PROMPT)
- Modify: `src/lib/agents/components.ts:63` (user prompt)

- [ ] **Step 1: Replace SYSTEM_PROMPT**

Replace the entire `SYSTEM_PROMPT` constant (lines 9-31) with:

```ts
const SYSTEM_PROMPT = `You are a UI component curator and recreator. You receive pre-extracted component candidates from a webpage. Your job is to:

1. Pick the TOP 3-5 most visually interesting and unique components
2. For each, create BOTH a standalone HTML recreation AND a React TSX component

SELECTION RULES:
- Pick components that showcase the site's design craft
- SKIP generic elements: plain text links, basic divs with no styling, simple paragraphs
- Identify the component library origin (MUI, shadcn/ui, Chakra, Bootstrap, etc.) with SPECIFIC evidence
- Note variants if the candidates show multiple similar components with differences

RECREATION RULES for recreatedHtml:
- Write clean, self-contained HTML that uses ONLY Tailwind CSS classes for styling
- The recreation should visually match the original component's appearance (colors, spacing, typography, layout)
- Extract actual colors from the original CSS/classes and use them as Tailwind arbitrary values like bg-[#6366f1]
- Use inline SVGs for any icons (do NOT reference external icon files)
- For images, use https://placehold.co/ placeholder URLs (e.g. https://placehold.co/400x200/e2e8f0/64748b?text=Hero+Image)
- NO relative URLs, NO external dependencies, NO JavaScript
- The HTML must render correctly on its own inside a <body> tag with only Tailwind CSS loaded
- Match the original's border-radius, shadows, padding, gaps, and font sizes as closely as possible

REACT COMPONENT RULES for reactCode:
- Write a complete, copy-pasteable React TSX component
- Start with a TypeScript interface named {ComponentName}Props
- Use a named export: export function ComponentName({ ...props }: ComponentNameProps)
- All styling via Tailwind classes using the site's actual hex colors as arbitrary values (e.g. bg-[#6366f1], text-[#1a1a2e])
- Create typed props for ALL variable content:
  - Text content → string props with realistic default values from the original
  - Images → string props defaulting to placehold.co URLs
  - Click handlers → optional () => void props
  - Lists/arrays → string[] props with example defaults from the original
  - Variants → a variant prop with union type (e.g. variant?: "primary" | "secondary") if the component has visual variants, with conditional Tailwind classes
- Provide default values for ALL optional props via destructuring defaults
- Icons: use inline JSX SVG elements (NOT imported from a library)
- Do NOT include any import statements — the component will be added to a project that already has React
- The component name must be valid PascalCase (e.g. PricingCard, HeroSection, NavBar)
- The React component and the HTML recreation must render the SAME visual output

Quality over quantity. Only include components worth studying.`;
```

- [ ] **Step 2: Update user prompt**

Replace the user prompt string on line 63:

```ts
prompt: `Pick the 3-5 best components from these ${candidates.length} candidates. For each, provide:
1. The original html/css
2. A standalone Tailwind HTML recreation in recreatedHtml
3. A typed React TSX component in reactCode

${overview}${techContext}${cssVarsBlock}

## Component Candidates

${candidatesText}`,
```

- [ ] **Step 3: Verify the app builds**

Run: `cd /Users/zibo/steal-yo-website && npx next build`
Expected: Build succeeds (or only pre-existing warnings)

- [ ] **Step 4: Commit**

```bash
git add src/lib/agents/components.ts
git commit -m "feat: update component agent to generate React TSX components"
```

---

## Chunk 3: UI — ComponentCard React Tab

### Task 4: Add React tab to ComponentCard

**Files:**
- Modify: `src/components/catalog/ComponentCard.tsx`

- [ ] **Step 1: Update code tab state type and default**

Change line 16 from:
```ts
const [codeTab, setCodeTab] = useState<"recreation" | "original">("recreation");
```
to:
```ts
const [codeTab, setCodeTab] = useState<"react" | "html" | "original">("react");
```

- [ ] **Step 2: Update copy button**

Change the copy button (line 115-118) from:
```tsx
<button onClick={() => copy(component.recreatedHtml || component.html, "html")}
  className="bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--ink)]">
  {copied === "html" ? "Copied!" : "Copy HTML"}
</button>
```
to:
```tsx
<button onClick={() => copy(component.reactCode || component.recreatedHtml || component.html, "code")}
  className="bg-[var(--background)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--ink)]">
  {copied === "code" ? "Copied!" : "Copy React"}
</button>
```

- [ ] **Step 3: Replace code tabs UI**

Replace the code tabs div (lines 132-153) with three tabs:

```tsx
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
```

- [ ] **Step 4: Replace code viewer content**

Replace the code viewer div content (lines 155-173) with:

```tsx
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
```

- [ ] **Step 5: Commit**

```bash
git add src/components/catalog/ComponentCard.tsx
git commit -m "feat: add React tab to ComponentCard, default to React code view"
```

---

## Chunk 4: Export — TSX Files + Tailwind Config

### Task 5: Rewrite export to generate TSX files

**Files:**
- Modify: `src/lib/export.ts`

- [ ] **Step 1: Replace the entire `src/lib/export.ts`**

Replace the full file content with:

```ts
import JSZip from "jszip";
import type { CrawlResult, StealKitExport } from "./types";

function toPascalCase(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function deduplicateNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  return names.map((name) => {
    const count = counts.get(name) || 0;
    counts.set(name, count + 1);
    return count === 0 ? name : `${name}${count + 1}`;
  });
}

export function generateComponentFiles(results: CrawlResult[]): { filename: string; content: string }[] {
  const components = results.flatMap((r) => r.components.components);
  const rawNames = components.map((c) => toPascalCase(c.name) || `Component`);
  const names = deduplicateNames(rawNames);

  return components.map((comp, i) => ({
    filename: `${names[i]}.tsx`,
    content: comp.reactCode || `// No React component was generated for: ${comp.name}\n// Original HTML:\n// ${comp.html.slice(0, 200)}`,
  }));
}

export function generateTailwindConfig(results: CrawlResult[]): string {
  const design = results[0]?.design;
  if (!design) return `import type { Config } from "tailwindcss";\n\nconst config: Config = {\n  content: ["./components/**/*.tsx"],\n  theme: { extend: {} },\n  plugins: [],\n};\n\nexport default config;\n`;

  const colors: Record<string, string> = {};
  for (const c of design.colorPalette) {
    colors[c.role] = c.hex;
  }

  const fontFamily: Record<string, string[]> = {};
  for (const t of design.typography) {
    fontFamily[t.role] = [t.family, t.role === "mono" ? "monospace" : "sans-serif"];
  }

  const theme = {
    colors: Object.keys(colors).length > 0 ? colors : undefined,
    fontFamily: Object.keys(fontFamily).length > 0 ? fontFamily : undefined,
  };

  const themeEntries = Object.entries(theme).filter(([, v]) => v !== undefined);
  const themeStr = themeEntries.length > 0
    ? themeEntries.map(([key, val]) => `      ${key}: ${JSON.stringify(val, null, 8).replace(/\n/g, "\n      ")}`).join(",\n")
    : "";

  return `import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./components/**/*.tsx"],
  theme: {
    extend: {
${themeStr}
    },
  },
  plugins: [],
};

export default config;
`;
}

export function generateIndexFile(results: CrawlResult[]): string {
  const components = results.flatMap((r) => r.components.components);
  const rawNames = components.map((c) => toPascalCase(c.name) || `Component`);
  const names = deduplicateNames(rawNames);

  return names.map((name) =>
    `export { ${name} } from "./components/${name}";`
  ).join("\n") + "\n";
}

export function generateReadme(results: CrawlResult[]): string {
  const url = results[0]?.url ?? "unknown";
  const design = results[0]?.design;
  const techStack = results[0]?.techStack;
  const componentCount = results.flatMap((r) => r.components.components).length;

  let md = `# Steal Kit: ${url}\n\n`;
  md += `> Design system and components extracted from ${url}\n`;
  md += `> Generated on ${new Date().toISOString().split("T")[0]}\n\n`;

  md += `## Quick Start\n\n`;
  md += `1. Copy the \`components/\` folder into your React + Tailwind project\n`;
  md += `2. Import what you need:\n\n`;
  md += "```tsx\nimport { ComponentName } from \"./steal-kit\";\n```\n\n";
  md += `Components use Tailwind arbitrary values for colors, so they work without any config changes.\n`;
  md += `The included \`tailwind.config.ts\` maps the site's design tokens if you want to use them.\n\n`;

  if (design) {
    md += `## Design\n\n`;
    md += `**Style:** ${design.styleClassification.primary}\n`;
    md += `${design.styleClassification.summary}\n\n`;
  }

  if (techStack?.framework) {
    md += `## Original Tech Stack\n\n`;
    md += `- Framework: ${techStack.framework.name}\n`;
    if (techStack.cssFramework) md += `- CSS: ${techStack.cssFramework.name}\n`;
    if (techStack.componentLibrary) md += `- Components: ${techStack.componentLibrary.name}\n`;
    md += `\n`;
  }

  md += `## Components (${componentCount})\n\n`;
  results.flatMap((r) => r.components.components).forEach((c) => {
    md += `- **${c.name}** (${c.category}): ${c.description}\n`;
  });

  return md;
}

export async function exportStealKit(results: CrawlResult[]): Promise<void> {
  if (!results || results.length === 0) {
    throw new Error("No results to export. Please crawl a website first.");
  }

  const kit: StealKitExport = {
    components: generateComponentFiles(results),
    tailwindConfig: generateTailwindConfig(results),
    indexFile: generateIndexFile(results),
    readme: generateReadme(results),
  };

  const zip = new JSZip();
  zip.file("tailwind.config.ts", kit.tailwindConfig);
  zip.file("index.ts", kit.indexFile);
  zip.file("README.md", kit.readme);

  const folder = zip.folder("components");
  kit.components.forEach((c) => folder?.file(c.filename, c.content));

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `steal-kit-${new Date().toISOString().split("T")[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/zibo/steal-yo-website && npx next build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/lib/export.ts
git commit -m "feat: export generates .tsx files, tailwind.config.ts, and barrel index"
```

---

## Chunk 5: Verify & Final Commit

### Task 6: Full build verification

- [ ] **Step 1: Run build**

Run: `cd /Users/zibo/steal-yo-website && npx next build`
Expected: Build succeeds with no type errors

- [ ] **Step 2: Fix any type errors**

If build fails due to type mismatches (likely in files that reference the old `StealKitExport` fields like `design`, `techStack`, `styleGuide`, `masterFile`), search for usages and update them:

Run: `grep -r "StealKitExport\|generateDesignMd\|generateTechStackMd\|generateStyleGuideMd\|generateMasterMd" src/ --include="*.ts" --include="*.tsx"`

Remove any references to the old export functions that are no longer used. The only export function callers should be `exportStealKit` in the results page.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: resolve any remaining type issues from export refactor"
```
