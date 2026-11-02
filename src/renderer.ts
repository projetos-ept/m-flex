import DOMPurify from "dompurify";
import {
  contrast,
  FONT_FAMILIES,
  mix,
  resolveRootStyle,
  type StyleTokens,
} from "../shared/styles";
import { validateSource } from "../shared/document";

const NS = "http://www.w3.org/2000/svg";
let serial = 0;
let queue = Promise.resolve();
export async function renderDiagram(
  source: string,
  tokens: StyleTokens,
): Promise<SVGSVGElement> {
  let result: SVGSVGElement | undefined;
  const job = queue
    .catch(() => {})
    .then(async () => {
      const error = validateSource(source);
      if (error) throw new Error(error);
      const { default: mermaid } = await import("mermaid");
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        suppressErrorRendering: true,
        theme: "base",
        fontFamily: FONT_FAMILIES[tokens.font],
        fontSize: tokens.fontSize,
        htmlLabels: false,
        maxTextSize: 16000,
        maxEdges: 180,
        themeVariables: {
          fontFamily: FONT_FAMILIES[tokens.font],
          fontSize: `${tokens.fontSize}px`,
          primaryColor: mix(tokens.palette[0], tokens.background),
          primaryTextColor: tokens.ink,
          primaryBorderColor: tokens.palette[0],
          lineColor: tokens.palette[0],
          secondaryColor: mix(tokens.palette[1], tokens.background),
          tertiaryColor: mix(tokens.palette[2], tokens.background),
          textColor: tokens.ink,
          mainBkg: tokens.background,
          background: tokens.background,
          ...Object.fromEntries(
            tokens.palette.flatMap((c, i) => [
              [`cScale${i}`, mix(c, tokens.background, 0.24)],
              [`cScaleLabel${i}`, tokens.ink],
            ]),
          ),
        },
        mindmap: { padding: 18, useMaxWidth: false },
        flowchart: {
          htmlLabels: false,
          useMaxWidth: false,
          curve: "basis",
          nodeSpacing: tokens.spacing,
          rankSpacing: tokens.spacing + 10,
        },
      });
      const id = `mfdiagram${++serial}`;
      const { svg } = await mermaid.render(id, source);
      const safe = DOMPurify.sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ["a", "image", "foreignObject"],
      });
      const holder = document.createElement("div");
      holder.innerHTML = safe;
      const element = holder.querySelector("svg");
      if (!element) throw new Error("Não foi possível desenhar este mapa.");
      styleSVG(element, tokens, id);
      result = element;
    });
  queue = job;
  await job;
  return result!;
}
function styleSVG(svg: SVGSVGElement, t: StyleTokens, id: string) {
  svg.setAttribute("xmlns", NS);
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    "Mapa mental gerado a partir do código Mermaid",
  );
  svg.style.maxWidth = "none";
  svg.style.background = t.background;
  svg.style.fontFamily = FONT_FAMILIES[t.font];
  const nodes = svg.querySelectorAll<SVGGElement>("g.node");
  const flowchart = svg.getAttribute("aria-roledescription")?.toLowerCase().includes("flowchart");
  const rootNode = flowchart ? nodes[0] : svg.querySelector<SVGGElement>("g.node.section-root") ?? nodes[0];
  const rootStyle = resolveRootStyle(t);
  nodes.forEach((node, index) => {
    const section = node.getAttribute("class")?.match(/section-?(\d+)/);
    const color = t.palette[section ? Number(section[1]) % 6 : index % 6];
    const root = node === rootNode;
    const fill = root
      ? rootStyle.fill
      : t.nodeStyle === "solid"
        ? color
        : t.nodeStyle === "outline"
          ? t.background
          : mix(color, t.background, 0.21);
    const ink = root
      ? rootStyle.text
      : t.nodeStyle === "solid"
        ? contrast(color)
        : t.ink;
    node
      .querySelectorAll<SVGElement>(
        ".node-bkg, .label-container, :scope > rect, :scope > circle, :scope > ellipse, :scope > polygon, :scope > path",
      )
      .forEach((shape) => {
        shape.style.fill = fill;
        shape.style.stroke = root ? rootStyle.border : color;
        shape.style.strokeWidth = String(t.lineWidth * 0.65);
        if (shape.tagName.toLowerCase() === "rect") {
          shape.setAttribute("rx", String(root ? rootStyle.radius : t.radius));
          shape.setAttribute("ry", String(root ? rootStyle.radius : t.radius));
        }
        if (t.shadow !== "none")
          shape.style.filter =
            t.shadow === "offset"
              ? `drop-shadow(3px 3px 0 ${mix(t.ink, t.background, 0.2)})`
              : `drop-shadow(0 3px 4px ${mix(t.ink, t.background, 0.13)})`;
      });
    node.querySelectorAll<SVGElement>("text,tspan").forEach((text) => {
      text.style.fill = ink;
      text.style.fontFamily = FONT_FAMILIES[t.font];
      text.style.fontSize = `${t.fontSize}px`;
      text.style.fontWeight = root ? "700" : "500";
    });
    // Mermaid 11.17 centers circle labels at x=0; preserve that alignment in standalone SVG.
    if (
      node.classList.contains("section-root") &&
      node.querySelector(":scope > circle")
    ) {
      node
        .querySelectorAll("text")
        .forEach((text) => text.setAttribute("text-anchor", "middle"));
    }
  });
  svg
    .querySelectorAll<SVGElement>(
      '.edge, .edgePath path, .flowchart-link, [class*="section-edge-"]',
    )
    .forEach((edge, index) => {
      if (edge.closest("g.node")) return;
      const section = edge.getAttribute("class")?.match(/section-edge-(\d+)/);
      edge.style.stroke =
        t.palette[section ? Number(section[1]) % 6 : index % 6];
      edge.style.strokeWidth = String(t.lineWidth);
      edge.style.strokeDasharray =
        t.lineStyle === "dashed"
          ? "7 5"
          : t.lineStyle === "dotted"
            ? "2 5"
            : "none";
      edge.style.strokeLinecap = "round";
    });
  const viewBox = svg.getAttribute("viewBox")?.split(/[ ,]+/).map(Number) ?? [
    0, 0, 800, 600,
  ];
  const [x, y, w, h] = viewBox;
  const padding = 35;
  svg.setAttribute(
    "viewBox",
    `${x - padding} ${y - padding} ${w + padding * 2} ${h + padding * 2}`,
  );
  svg.setAttribute("width", String(w + padding * 2));
  svg.setAttribute("height", String(h + padding * 2));
  const background = document.createElementNS(NS, "rect");
  background.setAttribute("x", String(x - padding));
  background.setAttribute("y", String(y - padding));
  background.setAttribute("width", String(w + padding * 2));
  background.setAttribute("height", String(h + padding * 2));
  background.setAttribute("fill", t.background);
  svg.insertBefore(background, svg.firstChild);
  if (t.pattern !== "none") {
    const defs = document.createElementNS(NS, "defs");
    const pattern = document.createElementNS(NS, "pattern");
    pattern.setAttribute("id", `${id}bg`);
    pattern.setAttribute("width", "24");
    pattern.setAttribute("height", "24");
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    const mark = document.createElementNS(
      NS,
      t.pattern === "dots" ? "circle" : "path",
    );
    if (t.pattern === "dots") {
      mark.setAttribute("cx", "1");
      mark.setAttribute("cy", "1");
      mark.setAttribute("r", ".8");
      mark.setAttribute("fill", mix(t.ink, t.background, 0.15));
    } else {
      mark.setAttribute("d", "M 24 0 L 0 0 0 24");
      mark.setAttribute("fill", "none");
      mark.setAttribute("stroke", mix(t.ink, t.background, 0.1));
      mark.setAttribute("stroke-width", ".7");
    }
    pattern.append(mark);
    defs.append(pattern);
    svg.insertBefore(defs, background);
    const texture = background.cloneNode(true) as SVGRectElement;
    texture.setAttribute("fill", `url(#${id}bg)`);
    background.after(texture);
  }
}
export function serializeSVG(svg: SVGSVGElement): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}`;
}
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.className = "download-ready";
  link.textContent = `Baixar ${filename}`;
  document.querySelector(".download-ready")?.remove();
  document.querySelector(".export-preview")?.remove();
  // Attach to the active dialog so modal inertness does not swallow activation.
  (
    document.querySelector("dialog[open] #dialog-content") ?? document.body
  ).append(link);
  if (blob.type === "image/png" || blob.type === "image/svg+xml") {
    const preview = document.createElement("img");
    preview.src = url;
    preview.alt = `Prévia da exportação ${filename}`;
    preview.className = "export-preview";
    link.before(preview);
  }
  link.click();
  // A visible fallback allows a direct user gesture in browsers that block automatic downloads.
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 300000);
}
export async function exportPNG(svg: SVGSVGElement, filename: string) {
  const [, , width, height] = svg
    .getAttribute("viewBox")!
    .split(/[ ,]+/)
    .map(Number);
  const scale = Math.min(2, 4096 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const image = new Image();
  // Data URL keeps the standalone SVG self-contained in the canvas.
  image.src =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(serializeSVG(svg));
  await image.decode();
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Exportação PNG indisponível neste navegador.");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (v) => (v ? resolve(v) : reject(new Error("Falha ao criar PNG."))),
      "image/png",
    ),
  );
  download(blob, filename);
}
