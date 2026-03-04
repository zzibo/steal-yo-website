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
    html: z.string(),
    css: z.string(),
    variants: z.array(z.string()),
    description: z.string(),
    attribution: z.object({
      library: z.string().nullable(),
      confidence: z.enum(["high", "medium", "low"]),
      reasoning: z.string(),
    }).optional(),
  })),
});

// Matches VibeAnalysis in types.ts
export const VibeSchema = z.object({
  vibe: z.string().describe("2-4 paragraph prose description of the site's design philosophy, mood, and aesthetic"),
});
