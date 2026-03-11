import { z } from "zod";

// Matches TechStackDetection in types.ts
const TechEntrySchema = z.object({
  name: z.string(),
  version: z.string().nullable().optional(),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.array(z.string()),
});

export const TechStackSchema = z.object({
  framework: TechEntrySchema.nullable().optional(),
  cssFramework: TechEntrySchema.nullable().optional(),
  componentLibrary: TechEntrySchema.nullable().optional(),
  buildTool: z.object({
    name: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
    evidence: z.array(z.string()),
  }).nullable().optional(),
  metaFramework: z.object({
    features: z.array(z.string()),
    confidence: z.enum(["high", "medium", "low"]),
    evidence: z.array(z.string()),
  }).nullable().optional(),
  otherLibraries: z.array(z.object({
    name: z.string(),
    category: z.enum(["animation", "forms", "state", "styling", "utility", "other"]),
    evidence: z.array(z.string()),
  })),
});

// Matches LayoutAnalysis in types.ts
export const LayoutSchema = z.object({
  sections: z.array(z.object({
    name: z.string(),
    type: z.enum(["header", "hero", "features", "content", "cta", "footer", "sidebar", "navigation", "other"]),
    layoutMethod: z.enum(["grid", "flex", "stack", "float", "other"]),
    description: z.string(),
    htmlSnippet: z.string(),
  })),
  responsiveBreakpoints: z.array(z.string()),
  navigationStructure: z.array(z.object({
    label: z.string(),
    href: z.string(),
  })),
});

// Matches ComponentAnalysis in types.ts
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

// Matches DesignAnalysis in types.ts
export const DesignSchema = z.object({
  styleClassification: z.object({
    primary: z.string().describe("Primary design style: neo-brutalist, glassmorphism, minimalist, corporate, editorial, playful, etc."),
    secondary: z.array(z.string()).describe("Supporting style tags"),
    summary: z.string().describe("2-3 sentence design brief"),
  }),
  colorPalette: z.array(z.object({
    hex: z.string().describe("Hex color code like #6366f1"),
    role: z.enum(["primary", "secondary", "accent", "background", "surface", "text", "muted", "border", "error", "success"]),
    name: z.string().describe("Human-readable color name like 'Deep Navy'"),
  })),
  typography: z.array(z.object({
    family: z.string(),
    role: z.enum(["heading", "body", "accent", "mono", "display"]),
    weights: z.array(z.string()),
    style: z.string().describe("Classification like 'geometric sans-serif', 'humanist serif'"),
  })),
  spacing: z.object({
    system: z.string().describe("Spacing system: '8px grid', '4px base', 'fluid/clamp-based', 'tailwind default'"),
    density: z.enum(["compact", "comfortable", "spacious"]),
  }),
  effects: z.object({
    borderRadius: z.string().describe("e.g. 'sharp (0px)', 'subtle (4px)', 'rounded (12px)', 'pill'"),
    shadows: z.string().describe("e.g. 'flat', 'subtle elevation', 'dramatic depth'"),
    animations: z.string().describe("e.g. 'none', 'micro-interactions', 'heavy motion'"),
  }),
});
