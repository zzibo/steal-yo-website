import JSZip from "jszip";
import type { CrawlResult, StealKitExport } from "./types";

export function generateDesignSystemMd(results: CrawlResult[]): string {
  const design = results[0]?.design;
  if (!design) return "# Design System\n\nNo design data available.\n";

  let md = "# Design System\n\n";

  md += "## Color Palette\n\n";
  md += "| Name | Hex | Usage |\n|------|-----|-------|\n";
  design.colors.forEach((c) => {
    md += `| ${c.name} | \`${c.hex}\` | ${c.usage} |\n`;
  });

  md += "\n## Typography\n\n";
  md += `**Font Families:** ${design.typography.fontFamilies.join(", ")}\n\n`;
  md += "| Name | Size | Weight | Line Height |\n|------|------|--------|-------------|\n";
  design.typography.scale.forEach((s) => {
    md += `| ${s.name} | ${s.size} | ${s.weight} | ${s.lineHeight} |\n`;
  });

  md += "\n## Spacing\n\n";
  md += design.spacing.map((s) => `- \`${s}\``).join("\n") + "\n";

  md += "\n## Border Radius\n\n";
  md += design.borderRadius.map((r) => `- \`${r}\``).join("\n") + "\n";

  md += "\n## Shadows\n\n";
  design.shadows.forEach((s, i) => { md += `${i + 1}. \`${s}\`\n`; });

  return md;
}

export function generateTechStackMd(results: CrawlResult[]): string {
  const ts = results[0]?.techStack;
  if (!ts) return "# Tech Stack\n\nNo tech stack data available.\n";

  let md = "# Tech Stack\n\n";

  const section = (title: string, data?: { name: string; version?: string; confidence: string; evidence: string[] }) => {
    if (!data) return "";
    let s = `## ${title}\n\n**${data.name}**${data.version ? ` v${data.version}` : ""} (${data.confidence} confidence)\n\n`;
    s += "Evidence:\n";
    data.evidence.forEach((e) => { s += `- ${e}\n`; });
    return s + "\n";
  };

  md += section("Framework", ts.framework);
  md += section("CSS Framework", ts.cssFramework);
  md += section("Component Library", ts.componentLibrary);
  md += section("Build Tool", ts.buildTool);

  if (ts.metaFramework) {
    md += `## Meta-Framework Features\n\n`;
    md += ts.metaFramework.features.map((f) => `- ${f}`).join("\n") + "\n\n";
  }

  if (ts.otherLibraries.length > 0) {
    md += "## Other Libraries\n\n";
    ts.otherLibraries.forEach((lib) => {
      md += `- **${lib.name}** (${lib.category})\n`;
    });
  }

  return md;
}

export function generateStyleGuideMd(results: CrawlResult[]): string {
  const r = results[0];
  if (!r) return "# Style Guide\n\nNo data available.\n";

  let md = "# Style Guide\n\n";

  if (r.layout?.sections.length) {
    const methods = [...new Set(r.layout.sections.map((s) => s.layoutMethod))];
    md += `## Layout\n\n**Methods:** ${methods.join(", ")}\n\n`;
    r.layout.sections.forEach((s) => {
      md += `- **${s.name}** (${s.type}, ${s.layoutMethod}): ${s.description}\n`;
    });
    md += "\n";
  }

  if (r.layout?.responsiveBreakpoints.length) {
    md += "## Breakpoints\n\n";
    md += r.layout.responsiveBreakpoints.map((bp) => `- \`${bp}\``).join("\n") + "\n\n";
  }

  return md;
}

export function generateComponentFiles(results: CrawlResult[]): { filename: string; content: string }[] {
  return results.flatMap((r) => r.components.components).map((comp, i) => {
    const slug = comp.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return {
      filename: `${slug}-${i}.html`,
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${comp.name}</title>
  <style>
body { font-family: system-ui, sans-serif; padding: 2rem; background: #f5f5f5; }
${comp.css}
  </style>
</head>
<body>
  <!-- ${comp.name} (${comp.category}) -->
  <!-- ${comp.description} -->
${comp.attribution?.library ? `  <!-- Library: ${comp.attribution.library} (${comp.attribution.confidence}) -->` : "  <!-- Custom component -->"}
  ${comp.html}
</body>
</html>`,
    };
  });
}

export function generateMasterMd(results: CrawlResult[]): string {
  const url = results[0]?.url ?? "unknown";
  let md = `# Steal Kit: ${url}\n\n`;
  md += `> Inspired by ${url}. Design principles extracted for educational study.\n`;
  md += `> Generated on ${new Date().toISOString()}\n\n---\n\n`;
  md += generateTechStackMd(results) + "\n---\n\n";
  md += generateDesignSystemMd(results) + "\n---\n\n";
  md += generateStyleGuideMd(results) + "\n---\n\n";

  const comps = results.flatMap((r) => r.components.components);
  if (comps.length) {
    md += "# Component Patterns\n\n";
    comps.forEach((c) => {
      md += `## ${c.name} (${c.category})\n\n`;
      md += `${c.description}\n\n`;
      if (c.attribution?.library) md += `**Library:** ${c.attribution.library}\n\n`;
      md += "```html\n" + c.html + "\n```\n\n";
      if (c.css) md += "```css\n" + c.css + "\n```\n\n";
    });
  }

  return md;
}

export async function exportStealKit(results: CrawlResult[]): Promise<void> {
  const kit: StealKitExport = {
    designSystem: generateDesignSystemMd(results),
    techStack: generateTechStackMd(results),
    styleGuide: generateStyleGuideMd(results),
    components: generateComponentFiles(results),
    masterFile: "",
  };
  kit.masterFile = generateMasterMd(results);

  const zip = new JSZip();
  zip.file("steal-kit.md", kit.masterFile);
  zip.file("design-system.md", kit.designSystem);
  zip.file("tech-stack.md", kit.techStack);
  zip.file("style-guide.md", kit.styleGuide);

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
