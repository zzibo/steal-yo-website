# React Component Output

## Problem

Extracted components are raw Tailwind HTML blobs. Users can't plug them into a React project without manual conversion. The export (markdown ZIP) is not useful.

## Solution

Change the component analysis output from raw HTML to typed React TSX components with props. Update the preview, copy, and export flows to match.

## Scope

Only the component output format changes. Crawling, design tab, layout tab, tech stack tab, and the app UI remain unchanged.

## Changes

### 1. Type: `ExtractedComponent`

Add a `reactCode` field. Keep `recreatedHtml` for the iframe preview.

```ts
export interface ExtractedComponent {
  name: string;
  category: "button" | "card" | "input" | "modal" | "navbar" | "hero" | "footer" | "form" | "badge" | "other";
  html: string;           // original HTML (unchanged)
  css: string;            // original CSS (unchanged)
  recreatedHtml: string;  // standalone Tailwind HTML for iframe preview
  reactCode: string;      // NEW: full React TSX component with typed props
  variants: string[];
  description: string;
  attribution?: ComponentAttribution;
}
```

### 2. Schema: `ComponentSchema`

Add `reactCode` field to the Zod schema. The schema description tells Claude:

```
A complete, self-contained React TSX component. Must include:
- A TypeScript interface named {ComponentName}Props
- A named export function component (not default export)
- All styling via Tailwind classes
- Props for variable content (text, images, callbacks)
- Default values for all optional props via destructuring defaults
- Icons as inline JSX SVG elements (not imported)
- Images as placehold.co URLs in default prop values
- No imports (the component will be used in a React project that already has React in scope)

The component should be copy-pasteable into any React + Tailwind project.
```

### 3. Agent: `analyzeComponents` prompt

Update the system prompt to generate both `recreatedHtml` and `reactCode` for each component.

**React code generation rules** (added to system prompt):

- Component name: PascalCase, sanitized from the extracted name. If the name is generic or collides, append the category (e.g. `HeroSection`, `PricingCard`).
- Props interface: extract all variable content as typed props. Text content = `string`, images = `string` (URL), click handlers = `() => void`, lists = `string[]`. Every prop gets a default value.
- Variant prop: if the component has visual variants (e.g. primary/secondary button), add a `variant` prop with a union type and conditional Tailwind classes.
- Colors: use Tailwind arbitrary values with the site's actual hex colors (e.g. `bg-[#6366f1]`). Do NOT use semantic token names — the component should work without any custom Tailwind config.
- The `recreatedHtml` and `reactCode` must render the same visual output. The HTML version is for preview; the React version is for use.

### 4. UI: `ComponentCard`

- Code viewer tabs change to: **"React"** (default) | "HTML" | "Original"
- "React" tab shows `reactCode` with TSX syntax
- "HTML" tab shows `recreatedHtml` (current behavior)
- "Original" tab shows `html` + `css` (current behavior)
- Copy button copies `reactCode` by default
- Preview iframe still renders `recreatedHtml` in a sandboxed iframe (unchanged mechanism)

### 5. Export

Replaces the current markdown ZIP entirely. New export structure:

```
steal-kit/
  components/
    PricingCard.tsx
    HeroSection.tsx
    NavBar.tsx
    ...
  tailwind.config.ts
  index.ts
  README.md
```

**Component files** (`.tsx`): the `reactCode` string written directly to file. One file per component.

**Component naming/deduplication**: sanitize to PascalCase, strip invalid identifier characters. If two components produce the same name, append a numeric suffix (e.g. `Card.tsx`, `Card2.tsx`).

**`tailwind.config.ts`**: generated from the existing `DesignAnalysis` data. Maps extracted colors, fonts, and spacing into Tailwind's `theme.extend`. Components use arbitrary values (`bg-[#6366f1]`) so this config is a convenience reference, not a hard dependency.

```ts
// Example output
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./components/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1",
        secondary: "#a855f7",
        accent: "#f59e0b",
        background: "#ffffff",
        surface: "#f8fafc",
        // ... from DesignAnalysis.colorPalette
      },
      fontFamily: {
        heading: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        // ... from DesignAnalysis.typography
      },
      borderRadius: {
        DEFAULT: "12px",
        // ... from DesignAnalysis.effects.borderRadius
      },
    },
  },
  plugins: [],
};

export default config;
```

**`index.ts`**: barrel export of all components.

```ts
export { PricingCard } from "./components/PricingCard";
export type { PricingCardProps } from "./components/PricingCard";
// ...
```

**`README.md`**: condensed version of the current master markdown — site URL, design summary, tech stack. Short.

**`StealKitExport` type** updated to reflect the new structure:

```ts
export interface StealKitExport {
  components: { filename: string; content: string }[];  // .tsx files
  tailwindConfig: string;
  indexFile: string;
  readme: string;
}
```

### 6. What stays the same

- Crawl pipeline (Firecrawl scraping, page-tools pre-extraction)
- Component candidate detection (class-name selectors + Cheerio)
- Design, Layout, Tech Stack tabs and their agents
- App UI/UX (neo-brutalist aesthetic, tabs, loading sequence)
- API routes structure
- Preview iframe mechanism

## Files to modify

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `reactCode` to `ExtractedComponent`, update `StealKitExport` |
| `src/lib/agents/schemas.ts` | Add `reactCode` to `ComponentSchema` with detailed description |
| `src/lib/agents/components.ts` | Update system prompt with React generation rules |
| `src/components/catalog/ComponentCard.tsx` | Add React tab (default), update copy behavior |
| `src/lib/export.ts` | Replace markdown ZIP with `.tsx` files, `tailwind.config.ts`, `index.ts`, `README.md` |

## Out of scope

- Vision-based component detection (future enhancement)
- Streaming results
- Other framework support (Vue, Svelte)
- In-browser code editor
- Component playground
