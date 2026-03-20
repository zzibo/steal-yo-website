export interface CrawlRequest {
  url: string;
  depth: number; // 1-3
}

export interface ScrapedPage {
  url: string;
  markdown: string;
  html: string;
  rawHtml: string;
  screenshot?: string;
  links: string[];
  images: string[];
  branding?: {
    colors?: string[];
    fonts?: string[];
    logos?: string[];
  };
  metadata: {
    title?: string;
    description?: string;
    language?: string;
  };
}

export interface LayoutSection {
  name: string;
  type:
    | "header"
    | "hero"
    | "features"
    | "content"
    | "cta"
    | "footer"
    | "sidebar"
    | "navigation"
    | "other";
  layoutMethod: "grid" | "flex" | "stack" | "float" | "other";
  description: string;
  htmlSnippet: string;
}

export interface LayoutAnalysis {
  sections: LayoutSection[];
  responsiveBreakpoints: string[];
  navigationStructure: { label: string; href: string }[];
}

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
  tsxValid?: boolean;
  variants: string[];
  description: string;
  attribution?: ComponentAttribution;
}

export interface ComponentAnalysis {
  components: ExtractedComponent[];
}

export interface DesignAnalysis {
  styleClassification: {
    primary: string;
    secondary: string[];
    summary: string;
  };
  colorPalette: {
    hex: string;
    role: "primary" | "secondary" | "accent" | "background" | "surface" | "text" | "muted" | "border" | "error" | "success";
    name: string;
  }[];
  typography: {
    family: string;
    role: "heading" | "body" | "accent" | "mono" | "display";
    weights: string[];
    style: string;
  }[];
  spacing: {
    system: string;
    density: "compact" | "comfortable" | "spacious";
  };
  effects: {
    borderRadius: string;
    shadows: string;
    animations: string;
  };
}

export interface CrawlResult {
  url: string;
  screenshot?: string;
  layout: LayoutAnalysis;
  components: ComponentAnalysis;
  design: DesignAnalysis;
  techStack: TechStackDetection;
  extractedStyles?: string;
  externalStylesheets?: string[];
}

export interface TechStackDetection {
  framework?: {
    name: string;
    version?: string;
    confidence: "high" | "medium" | "low";
    evidence: string[];
  };
  cssFramework?: {
    name: string;
    version?: string;
    confidence: "high" | "medium" | "low";
    evidence: string[];
  };
  componentLibrary?: {
    name: string;
    version?: string;
    confidence: "high" | "medium" | "low";
    evidence: string[];
  };
  buildTool?: {
    name: string;
    confidence: "high" | "medium" | "low";
    evidence: string[];
  };
  metaFramework?: {
    features: string[];
    confidence: "high" | "medium" | "low";
    evidence: string[];
  };
  otherLibraries: {
    name: string;
    category: "animation" | "forms" | "state" | "styling" | "utility" | "other";
    evidence: string[];
  }[];
}

export interface ComponentAttribution {
  library: string | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

export interface SynthesizedResults {
  globalColors: { hex: string; role: string; name: string; pageCount: number }[];
  globalComponents: { name: string; category: string; pageUrls: string[] }[];
  sharedSections: { type: string; name: string; pageCount: number }[];
}

export interface StealKitExport {
  components: { filename: string; content: string }[];
  stories: { filename: string; content: string }[];
  tailwindConfig: string;
  packageJson: string;
  indexFile: string;
  readme: string;
}
