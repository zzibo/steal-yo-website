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
