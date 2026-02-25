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
  variants: string[];
  description: string;
}

export interface ComponentAnalysis {
  components: ExtractedComponent[];
}

export interface DesignAnalysis {
  colors: { name: string; hex: string; usage: string }[];
  typography: {
    fontFamilies: string[];
    scale: {
      name: string;
      size: string;
      weight: string;
      lineHeight: string;
    }[];
  };
  spacing: string[];
  borderRadius: string[];
  shadows: string[];
}

export interface ContentAnalysis {
  sections: { heading: string; text: string }[];
  images: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }[];
  links: { text: string; href: string; isExternal: boolean }[];
  meta: { title?: string; description?: string; ogImage?: string };
}

export interface CrawlResult {
  url: string;
  screenshot?: string;
  layout: LayoutAnalysis;
  components: ComponentAnalysis;
  design: DesignAnalysis;
  content: ContentAnalysis;
}
