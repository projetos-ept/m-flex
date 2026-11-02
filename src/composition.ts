import type { CompositionOptions } from "../shared/document";
import { contrast, FONT_FAMILIES, mix, resolveRootStyle, type StyleTokens } from "../shared/styles";
import { download } from "./renderer";

type Box = { x: number; y: number; width: number; height: number };

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles: Partial<CSSStyleDeclaration>,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.style.boxSizing = "border-box";
  Object.assign(node.style, styles);
  if (text !== undefined) node.textContent = text;
  return node;
}

function measurementHost(): HTMLDivElement {
  const host = element("div", {
    position: "fixed",
    left: "-100000px",
    top: "0",
    pointerEvents: "none",
    zIndex: "-1",
    margin: "0",
    padding: "0",
    border: "0",
    transform: "none",
  });
  host.setAttribute("aria-hidden", "true");
  document.body.append(host);
  return host;
}

function diagramSize(svg: SVGSVGElement): { width: number; height: number } {
  const viewBox = svg.viewBox.baseVal;
  const width = viewBox.width || Number(svg.getAttribute("width"));
  const height = viewBox.height || Number(svg.getAttribute("height"));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("O mapa não tem dimensões válidas para criar a composição.");
  }
  return { width: Math.ceil(width), height: Math.ceil(height) };
}

function labelText(node: SVGGElement): string {
  return [...node.querySelectorAll("text")]
    .map((text) => {
      const lines = [...text.querySelectorAll(":scope > tspan")];
      return lines.length ? lines.map((line) => line.textContent).join(" ") : text.textContent;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeBox(node: SVGGElement, svg: SVGSVGElement, width: number, height: number): Box | null {
  const rect = node.getBoundingClientRect();
  const canvas = svg.getBoundingClientRect();
  const box = { x: rect.left - canvas.left, y: rect.top - canvas.top, width: rect.width, height: rect.height };
  // Keep the exact Mermaid geometry: cards must not expand the layout or move connectors.
  if (
    !Object.values(box).every(Number.isFinite) ||
    box.width < 18 || box.height < 18 ||
    box.x < 0 || box.y < 0 ||
    box.x + box.width > width + 1 || box.y + box.height > height + 1
  ) return null;
  return box;
}

function acceptsHTMLCard(node: SVGGElement, mindmap: boolean): boolean {
  if (mindmap) return true;
  // Flowchart shapes encode meaning (decision diamonds, start/end circles,
  // databases, etc.). Keep those SVG shapes and only restyle plain rectangles.
  return Boolean(node.querySelector("rect")) &&
    !node.querySelector("circle, ellipse, polygon, polyline, path");
}

function cardForNode(
  text: string,
  box: Box,
  tokens: StyleTokens,
  color: string,
  root: boolean,
  glass: boolean,
): HTMLDivElement {
  const rootStyle = resolveRootStyle(tokens);
  const fill = root ? rootStyle.fill : tokens.nodeStyle === "solid" ? color :
    tokens.nodeStyle === "outline" ? tokens.background : mix(color, tokens.background, 0.17);
  const ink = root ? rootStyle.text : tokens.nodeStyle === "solid" ? contrast(fill) : tokens.ink;
  const radius = root
    ? rootStyle.radius + (glass && tokens.rootRadius === undefined ? 4 : 0)
    : tokens.radius + (glass ? 4 : 0);
  const card = element("div", {
    position: "absolute",
    left: `${box.x}px`, top: `${box.y}px`, width: `${box.width}px`, height: `${box.height}px`,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0", padding: `${Math.min(8, box.height * 0.1)}px ${Math.min(10, box.width * 0.08)}px`,
    border: `${Math.min(tokens.lineWidth, 2)}px solid ${root ? rootStyle.border : color}`,
    borderRadius: `${Math.min(radius, box.height / 2)}px`,
    color: ink,
    background: glass && !root
      ? `linear-gradient(135deg, ${mix(fill, tokens.background, 0.72)}, ${fill})`
      : fill,
    boxShadow: tokens.shadow === "none" ? "none" : tokens.shadow === "offset"
      ? `3px 3px 0 ${mix(tokens.ink, tokens.background, 0.2)}`
      : `0 4px 10px ${mix(tokens.ink, tokens.background, 0.14)}, inset 0 1px 0 ${mix("#ffffff", fill, 0.18)}`,
    fontFamily: FONT_FAMILIES[tokens.font], fontSize: `${tokens.fontSize}px`,
    fontWeight: root ? "700" : "500", lineHeight: "1.18", letterSpacing: "normal",
    textAlign: "center", overflowWrap: "anywhere", whiteSpace: "normal",
    overflow: "hidden",
  });
  card.className = "mf-html-card";
  card.dataset.root = String(root);
  card.append(element("span", { display: "block", width: "100%", margin: "0", padding: "0" }, text));
  return card;
}

/** HTML authored by the app, with Mermaid retaining ownership of graph geometry. */
export async function createComposition(
  original: SVGSVGElement,
  title: string,
  tokens: StyleTokens,
  options: CompositionOptions,
): Promise<HTMLElement> {
  await document.fonts.ready;
  const svg = original.cloneNode(true) as SVGSVGElement;
  const { width: graphWidth, height: graphHeight } = diagramSize(svg);
  const poster = options.layout === "poster";
  const glass = options.layout === "glass";
  const padding = poster ? 48 : 38;
  const width = Math.max(720, graphWidth + padding * 2);
  const surface = poster ? tokens.ink : tokens.background;
  const foreground = poster ? contrast(tokens.ink) : tokens.ink;
  const host = measurementHost();

  try {
    const composition = element("article", {
      position: "relative", display: "flex", flexDirection: "column", gap: "26px",
      width: `${width}px`, padding: `${padding}px`, margin: "0", border: "0",
      borderRadius: glass ? "30px" : poster ? "0" : "22px",
      overflow: "hidden", isolation: "isolate", transform: "none",
      background: glass
        ? `radial-gradient(ellipse at 5% 0%, ${mix(tokens.palette[0], surface, 0.38)}, transparent 60%), radial-gradient(ellipse at 100% 100%, ${mix(tokens.palette[2], surface, 0.38)}, transparent 60%), ${surface}`
        : surface,
      color: foreground, fontFamily: FONT_FAMILIES[tokens.font],
      fontSize: "16px", lineHeight: "1.5", textAlign: "left",
    });
    composition.className = "mf-composition";
    composition.dataset.layout = options.layout;
    composition.setAttribute("aria-label", `Composição: ${title}`);

    const header = element("header", { position: "relative", display: "block", margin: "0", padding: "0" });
    const eyebrow = element("div", { display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" });
    const swatches = element("div", { display: "flex", gap: "4px", flexShrink: "0" });
    swatches.setAttribute("aria-hidden", "true");
    tokens.palette.forEach((color) => swatches.append(element("span", {
      display: "block", width: "9px", height: "9px", borderRadius: "50%", background: color,
    })));
    eyebrow.append(swatches, element("span", {
      fontSize: "10px", lineHeight: "1.3", letterSpacing: "2.6px", fontWeight: "700", textTransform: "uppercase",
    }, poster ? "IDEIAS EM PERSPECTIVA" : glass ? "CONEXÕES QUE INSPIRAM" : "UM UNIVERSO DE CONEXÕES"));
    header.append(eyebrow, element("h1", {
      display: "block", margin: "0", padding: "0", maxWidth: "100%",
      color: foreground, fontFamily: FONT_FAMILIES[tokens.font], fontWeight: "700",
      fontSize: poster ? "44px" : "36px", lineHeight: "1.14", letterSpacing: "-1.2px",
      overflowWrap: "anywhere",
    }, title));
    if (options.subtitle.trim()) header.append(element("p", {
      margin: "12px 0 0", padding: "0", maxWidth: "850px", color: foreground,
      opacity: "0.7", fontSize: "16px", lineHeight: "1.55", overflowWrap: "anywhere",
    }, options.subtitle));

    const separator = element("div", {
      display: "flex", gap: "0", height: poster ? "5px" : "2px", marginTop: "24px", overflow: "hidden", borderRadius: "8px",
    });
    separator.setAttribute("aria-hidden", "true");
    tokens.palette.forEach((color, index) => separator.append(element("span", {
      display: "block", flex: index === 0 ? "3" : "1", background: color,
    })));
    header.append(separator);

    const graphPanel = element("div", {
      position: "relative", display: "block", alignSelf: "center", flexShrink: "0",
      width: `${graphWidth}px`, height: `${graphHeight}px`, margin: "0", padding: "0",
      borderRadius: poster ? "18px" : "12px", overflow: "hidden",
      background: poster ? tokens.background : "transparent",
    });
    graphPanel.className = "mf-composition-map";
    svg.style.width = `${graphWidth}px`;
    svg.style.height = `${graphHeight}px`;
    svg.style.display = "block";
    svg.style.maxWidth = "none";
    svg.style.background = "transparent";
    svg.style.transform = "none";
    // The app's SVG renderer puts only the canvas background/texture at this level.
    svg.querySelectorAll<SVGRectElement>(":scope > rect").forEach((rect) => rect.remove());
    if (tokens.pattern === "dots") {
      graphPanel.style.backgroundImage = `radial-gradient(${mix(tokens.ink, tokens.background, 0.14)} 0.8px, transparent 0.8px)`;
      graphPanel.style.backgroundSize = "24px 24px";
    } else if (tokens.pattern === "grid") {
      const grid = mix(tokens.ink, tokens.background, 0.1);
      graphPanel.style.backgroundImage = `linear-gradient(${grid} 1px, transparent 1px), linear-gradient(90deg, ${grid} 1px, transparent 1px)`;
      graphPanel.style.backgroundSize = "24px 24px";
    }
    graphPanel.append(svg);
    composition.append(header, graphPanel);

    if (options.showFooter) {
      const footer = element("footer", {
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px",
        margin: "0", padding: "0", color: foreground, fontSize: "11px", lineHeight: "1.4",
      });
      footer.append(element("span", { opacity: "0.65", letterSpacing: "0.5px" }, "Pensar. Conectar. Criar."));
      footer.append(element("span", { fontWeight: "700", letterSpacing: "-0.2px" }, "Mermeid-flex"));
      composition.append(footer);
    }

    host.append(composition);
    const nodes = [...svg.querySelectorAll<SVGGElement>("g.node")];
    const diagramType = svg.getAttribute("aria-roledescription")?.toLowerCase() ?? "";
    const mindmap = !diagramType.includes("flowchart") &&
      (diagramType.includes("mindmap") || Boolean(svg.querySelector("g.node.section-root")));
    const rootNode = mindmap ? svg.querySelector<SVGGElement>("g.node.section-root") ?? nodes[0] : nodes[0];
    let cardCount = 0;
    nodes.forEach((node, index) => {
      if (!acceptsHTMLCard(node, mindmap)) return;
      const text = labelText(node);
      const box = safeBox(node, svg, graphWidth, graphHeight);
      if (!text || !box) return;
      const section = node.getAttribute("class")?.match(/section-?(\d+)/);
      const color = tokens.palette[section ? Number(section[1]) % tokens.palette.length : index % tokens.palette.length];
      const card = cardForNode(text, box, tokens, color, node === rootNode, glass);
      graphPanel.append(card);
      const label = card.firstElementChild as HTMLElement;
      let fontSize = tokens.fontSize;
      while ((label.scrollHeight > card.clientHeight - parseFloat(card.style.paddingTop) * 2 || label.scrollWidth > label.clientWidth + 1) && fontSize > 8) {
        card.style.fontSize = `${--fontSize}px`;
      }
      if (label.scrollHeight > card.clientHeight - parseFloat(card.style.paddingTop) * 2 + 1 || label.scrollWidth > label.clientWidth + 1) {
        card.remove(); // An unusual Mermaid label keeps its original SVG instead of being cropped.
        return;
      }
      node.style.visibility = "hidden";
      node.setAttribute("aria-hidden", "true");
      cardCount++;
    });
    composition.dataset.htmlCards = String(cardCount);
    composition.dataset.svgFallbacks = String(nodes.length - cardCount);
    // Freeze the complete document bounds before moving it into a pan/zoom container.
    const height = Math.ceil(composition.getBoundingClientRect().height);
    composition.style.height = `${height}px`;
    composition.dataset.exportWidth = String(width);
    composition.dataset.exportHeight = String(height);
    return composition;
  } finally {
    host.remove();
  }
}

/** Capture the whole composition, independently of the editor viewport and zoom. */
export async function exportCompositionPNG(composition: HTMLElement, filename: string): Promise<void> {
  const width = Number(composition.dataset.exportWidth);
  const height = Number(composition.dataset.exportHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Não foi possível determinar o tamanho da composição.");
  }
  const clone = composition.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.margin = "0";
  const host = measurementHost();
  host.append(clone);
  try {
    await document.fonts.ready;
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(clone, {
      width, height,
      pixelRatio: Math.min(2, 4096 / Math.max(width, height)),
      skipFonts: true,
      fontEmbedCSS: "",
      style: { transform: "none", margin: "0" },
    });
    if (!blob) throw new Error("O navegador não conseguiu criar o PNG da composição.");
    download(blob, filename);
  } finally {
    host.remove();
  }
}

/** A portable document: all presentation is inline; no script, CDN or account is needed. */
export function serializeCompositionHTML(composition: HTMLElement, title: string): string {
  const clone = composition.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.margin = "24px auto";
  const escapedTitle = document.createElement("span");
  escapedTitle.textContent = title;
  return `<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; base-uri 'none'; form-action 'none'">\n<title>${escapedTitle.innerHTML} — Mermeid-flex</title>\n<style>html,body{margin:0;min-height:100%;background:#e8e9e7}body{padding:1px 24px;overflow:auto}*{box-sizing:border-box}@media print{html,body{background:transparent;padding:0}.mf-composition{margin:0!important;break-inside:avoid}}</style>\n</head>\n<body>\n${clone.outerHTML}\n</body>\n</html>\n`;
}
