import "./style.css";
import {
  createIcons,
  Network,
  Code2,
  Sparkles,
  Palette,
  FolderOpen,
  Plus,
  Upload,
  Download,
  Cloud,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  SlidersHorizontal,
  Search,
  Maximize,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Copy,
  HelpCircle,
  FileJson,
  Image,
  FileCode2,
  Trash2,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  LogOut,
  PanelLeftClose,
  LayoutTemplate,
  LoaderCircle,
  ArrowRight,
  RotateCcw,
} from "lucide";
import { PRESETS, resolveStyle, resolveRootStyle, contrast, type StyleTokens } from "../shared/styles";
import { buildExternalAIPrompt } from "../shared/external-prompt";
import { readCentralLabel, updateCentralLabel } from "../shared/central-node";
import {
  createDocument,
  TEMPLATES,
  parseDocument,
  MAX_DOCUMENT_BYTES,
  resolveComposition,
  type MapDocument,
} from "../shared/document";
import {
  api,
  connected,
  readLibrary,
  setToken,
  validateImport,
  writeLibrary,
  type LocalMap,
} from "./storage";
import { download, exportPNG, renderDiagram, serializeSVG } from "./renderer";
import { createComposition, exportCompositionPNG, serializeCompositionHTML } from "./composition";

const icons = {
  Network,
  Code2,
  Sparkles,
  Palette,
  FolderOpen,
  Plus,
  Upload,
  Download,
  Cloud,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  SlidersHorizontal,
  Search,
  Maximize,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Copy,
  HelpCircle,
  FileJson,
  Image,
  FileCode2,
  Trash2,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  LogOut,
  PanelLeftClose,
  LayoutTemplate,
  LoaderCircle,
  ArrowRight,
  RotateCcw,
};
const icon = (name: string) => `<i data-lucide="${name}"></i>`;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
function refreshIcons() {
  createIcons({ icons, attrs: { "stroke-width": 1.65 } });
}
let library: LocalMap[] = [];
let startupError = "";
let storageBlocked = false;
try {
  library = readLibrary();
} catch {
  startupError =
    "Não foi possível ler a biblioteca local. Ela foi preservada; exporte o mapa atual para evitar perdas.";
  storageBlocked = true;
}
let current: LocalMap = library[0] ?? {
  document: createDocument(),
  revision: 0,
  dirty: true,
};
if (!library.length) library = [current];
let renderVersion = 0,
  renderTimer = 0,
  saveTimer = 0,
  currentSVG: SVGSVGElement | null = null,
  currentComposition: HTMLElement | null = null,
  renderedSource = "",
  renderValid = false;
let category = "Todos",
  query = "",
  styleTab: "presets" | "custom" = "presets";
let history: string[] = [],
  future: string[] = [];
let zoom = 1,
  panX = 0,
  panY = 0;
let viewTouched = false,
  inFlightSave = false;
const app = $("#app");
app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="Mermeid-flex início"><span class="brand-icon">${icon("network")}</span><span>Mermeid<span class="brand-light">-flex</span><small>IDEIAS GANHAM FORMA</small></span></a>
    <div class="project-title"><span class="project-dot"></span><input id="title" aria-label="Título do mapa" maxlength="100" value="${esc(current.document.title)}"><span class="version-badge">MAPA MENTAL</span></div>
    <div class="top-actions"><button class="button ghost cloud-button" data-action="cloud">${icon("cloud")}<span id="connection-label">Conectar nuvem</span></button><button class="button export-button" data-action="export">${icon("download")}<span>Exportar</span>${icon("chevron-down")}</button></div>
  </header>
  <div class="workspace">
    <nav class="rail" aria-label="Ferramentas"><div class="rail-top"><button class="rail-button active" data-action="editor" title="Editor Mermaid" aria-label="Editor Mermaid">${icon("code-2")}</button><button class="rail-button" data-action="library" title="Meus mapas" aria-label="Meus mapas">${icon("folder-open")}</button><button class="rail-button" data-action="templates" title="Modelos" aria-label="Modelos">${icon("layout-template")}</button><span class="rail-divider"></span><button class="rail-button ai-icon" data-action="ai" title="Criar com IA" aria-label="Criar com IA">${icon("sparkles")}</button></div><div class="rail-bottom"><button class="rail-button" data-action="help" title="Guia rápido" aria-label="Guia rápido">${icon("help-circle")}</button><span class="avatar" title="Espaço pessoal">mf</span></div></nav>
    <aside class="editor-panel" aria-label="Editor de código">
      <div class="panel-heading"><div><span class="eyebrow">SEU PONTO DE PARTIDA</span><h2>Uma ideia, um mapa.</h2></div><button class="icon-button hide-editor" data-action="editor" title="Recolher editor" aria-label="Recolher editor">${icon("panel-left-close")}</button></div>
      <p class="panel-intro">Escreva em Mermaid.<br>Deixe as conexões aparecerem.</p>
      <button class="ai-banner" data-action="ai"><span class="ai-banner-icon">${icon("sparkles")}</span><span><strong>Comece com uma ideia</strong><small>A IA transforma em um mapa</small></span>${icon("arrow-up-right")}</button>
      <div class="code-toolbar"><span>${icon("code-2")} Código Mermaid</span><button class="text-button" data-action="templates">Modelos ${icon("chevron-down")}</button></div>
      <div class="code-editor"><div class="line-numbers" aria-hidden="true" id="line-numbers"></div><textarea id="source" aria-label="Código Mermaid" spellcheck="false" autocapitalize="off" autocomplete="off" maxlength="16000"></textarea></div>
      <div class="code-footer"><span id="line-count"></span><span>UTF-8 <b>Mermaid</b></span></div>
      <div class="editor-actions json-actions"><button class="button secondary" data-action="import">${icon("upload")} Importar JSON</button><button class="button secondary" data-download="json">${icon("file-json")} Exportar JSON</button></div>
      <div class="editor-actions prompt-actions"><button class="button secondary" data-action="external-prompt">${icon("copy")} Copiar prompt IA</button><button class="icon-button" data-action="copy" title="Copiar código" aria-label="Copiar código">${icon("code-2")}</button></div>
      <div class="editor-tip">${icon("help-circle")}<span>A indentação cria a hierarquia.<br><button class="text-link" data-action="help">Conheça a sintaxe ${icon("arrow-right")}</button></span></div>
      <div class="local-status">${icon("shield-check")}<span id="save-status">Rascunho neste navegador</span></div>
    </aside>
    <main class="canvas-panel" aria-label="Visualização do mapa">
      <div class="canvas-top"><div class="breadcrumb">Meu espaço ${icon("chevron-right")}<span id="canvas-title"></span></div><div class="canvas-actions"><span class="live-status" id="render-status"><span></span> Ao vivo</span><button class="icon-button" data-action="fullscreen" title="Tela cheia" aria-label="Tela cheia">${icon("maximize")}</button></div></div>
      <div class="canvas-label"><span class="eyebrow">CONECTE O QUE IMPORTA</span><h1>Seu próximo grande <em>insight.</em></h1><p>Um espaço para explorar, organizar e dar vida às ideias.</p></div>
      <div id="canvas" class="canvas" tabindex="0" aria-label="Mapa interativo. Arraste para mover. Use os botões para ampliar."><div id="diagram"></div><div class="canvas-loading" id="loading">${icon("loader-circle")}Conectando suas ideias…</div></div>
      <div class="render-error" id="render-error" role="alert" hidden></div>
      <div class="canvas-bottom"><div class="map-meta"><span class="style-dot" id="style-dot"></span><span id="active-style"></span><span class="meta-divider">/</span><span id="node-count"></span></div><div class="zoom-controls"><button class="icon-button" data-action="zoom-out" title="Diminuir" aria-label="Diminuir zoom">${icon("zoom-out")}</button><button class="zoom-value" data-action="fit" title="Ajustar à tela" id="zoom-value">100%</button><button class="icon-button" data-action="zoom-in" title="Ampliar" aria-label="Ampliar zoom">${icon("zoom-in")}</button><span></span><button class="icon-button" data-action="fit" title="Ajustar à tela" aria-label="Ajustar à tela">${icon("maximize")}</button></div></div>
      <div class="canvas-history"><button class="icon-button" data-action="undo" aria-label="Desfazer código" title="Desfazer código">${icon("undo-2")}</button><button class="icon-button" data-action="redo" aria-label="Refazer código" title="Refazer código">${icon("redo-2")}</button></div>
    </main>
    <aside class="style-panel" aria-label="Estilos visuais"><div class="style-heading"><span class="style-heading-icon">${icon("palette")}</span><div><h2>Vista sua ideia.</h2><p>Seu mapa, sua personalidade.</p></div></div>
      <div id="composition-controls"></div>
      <button class="button secondary full central-node-button" data-action="central-node">${icon("sliders-horizontal")} Personalizar nó central</button>
      <div class="segmented" role="tablist" aria-label="Configurações de estilo"><button id="presets-tab" role="tab" aria-selected="true" data-action="presets">Estilos <span>36</span></button><button id="custom-tab" role="tab" aria-selected="false" data-action="custom">${icon("sliders-horizontal")} Ajustes</button></div>
      <div id="styles-content"></div>
      <div class="style-bottom">${icon("sparkles")}<span>Experimente. O conteúdo continua seu.</span></div>
    </aside>
  </div>
  <footer class="statusbar"><span><i class="status-dot"></i> Feito para pensar visualmente.</span><span>Mermaid + imaginação <span class="footer-separator">·</span> <button data-action="cloud" class="text-button">${icon("cloud")} Cloudflare ready</button></span></footer>
  <input type="file" id="import-file" accept=".json,application/json" hidden>
  <dialog id="dialog" aria-labelledby="dialog-title"><div id="dialog-content"></div></dialog>
  <div id="toast" role="status" aria-live="polite"></div>
`;
$("#source").textContent = current.document.source;
refreshIcons();

function toast(message: string) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  window.setTimeout(() => $("#toast").classList.remove("show"), 5500);
}
function persist() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      if (storageBlocked) throw new Error();
      writeLibrary(library);
      $("#save-status").textContent = connected()
        ? current.dirty
          ? "Rascunho local · nuvem pendente"
          : "Salvo localmente e na nuvem"
        : "Salvo neste navegador";
    } catch {
      $("#save-status").textContent = "Não salvo · exporte seu JSON";
      toast(
        "Armazenamento local indisponível ou cheio. Exporte seu mapa em JSON.",
      );
    }
  }, 350);
}
function changed(render = true) {
  current.document.updatedAt = new Date().toISOString();
  current.dirty = true;
  persist();
  if (render) scheduleRender();
}
function syncEditor() {
  const input = $<HTMLTextAreaElement>("#source");
  input.value = current.document.source;
  $<HTMLInputElement>("#title").value = current.document.title;
  $("#canvas-title").textContent = current.document.title;
  updateLines();
  renderCompositionControls();
  renderStyles();
  scheduleRender();
  persist();
}
function updateLines() {
  const lines = current.document.source.split("\n").length;
  $("#line-count").textContent = `${lines} linhas`;
  $("#line-numbers").textContent = Array.from(
    { length: lines },
    (_, i) => i + 1,
  ).join("\n");
}
function scheduleRender() {
  renderValid = false;
  const version = ++renderVersion;
  clearTimeout(renderTimer);
  $("#render-status").innerHTML = '<span class="pending"></span> Atualizando';
  renderTimer = window.setTimeout(() => void draw(version), 360);
}
async function draw(version: number) {
  const document = current.document;
  const source = document.source;
  const tokens = resolveStyle(
    document.style.presetId,
    document.style.overrides,
  );
  try {
    const svg = await renderDiagram(source, tokens);
    if (version !== renderVersion) return;
    const options = resolveComposition(document);
    const composition = options.enabled
      ? await createComposition(svg, document.title, tokens, options)
      : null;
    if (version !== renderVersion) return;
    const modeChanged = Boolean(currentComposition) !== Boolean(composition);
    const sourceChanged = source !== renderedSource;
    renderedSource = source;
    currentSVG = svg;
    currentComposition = composition;
    renderValid = true;
    $("#diagram").replaceChildren(composition ?? svg);
    $(".canvas-panel").classList.toggle("composition-mode", options.enabled);
    $("#render-error").hidden = true;
    $("#loading").hidden = true;
    $("#render-status").innerHTML = "<span></span> Ao vivo";
    const canvas = $("#canvas");
    canvas.style.backgroundColor = tokens.background;
    canvas.style.setProperty("--pattern-color", `${tokens.ink}20`);
    canvas.dataset.pattern = tokens.pattern;
    $("#node-count").textContent =
      `${svg.querySelectorAll("g.node").length} nós`;
    if (sourceChanged || modeChanged || !viewTouched) fit();
    else transform();
  } catch (error) {
    if (version !== renderVersion) return;
    renderValid = false;
    $("#loading").hidden = true;
    const message = error instanceof Error ? error.message : "Código inválido.";
    $("#render-error").textContent =
      `Revise seu Mermaid. ${message.slice(0, 350)}${currentSVG ? " A prévia mostra o último mapa válido." : ""}`;
    $("#render-error").hidden = false;
    $("#render-status").innerHTML =
      '<span class="invalid"></span> Revisar código';
  }
  refreshIcons();
}
function transform() {
  $("#diagram").style.transform =
    `translate(${panX}px,${panY}px) scale(${zoom})`;
  $("#zoom-value").textContent = `${Math.round(zoom * 100)}%`;
}
function fit() {
  if (!currentSVG) return;
  const w = currentComposition?.offsetWidth || Number(currentSVG.getAttribute("width")),
    h = currentComposition?.offsetHeight || Number(currentSVG.getAttribute("height"));
  const box = $("#canvas").getBoundingClientRect();
  zoom = Math.min((box.width - 32) / w, (box.height - 32) / h, 1.4);
  zoom = Math.max(0.08, zoom);
  panX = (box.width - w * zoom) / 2;
  panY = (box.height - h * zoom) / 2;
  viewTouched = false;
  transform();
}
function zoomBy(factor: number) {
  const box = $("#canvas").getBoundingClientRect();
  const next = Math.max(0.08, Math.min(4, zoom * factor));
  panX = box.width / 2 - (box.width / 2 - panX) * (next / zoom);
  panY = box.height / 2 - (box.height / 2 - panY) * (next / zoom);
  zoom = next;
  viewTouched = true;
  transform();
}
function miniPreview(t: StyleTokens, id: string) {
  return `<svg class="style-preview" viewBox="0 0 150 72" aria-hidden="true" style="background:${t.background}"><g fill="none" stroke-width="${t.lineWidth}" stroke-linecap="round" ${t.lineStyle !== "solid" ? `stroke-dasharray="${t.lineStyle === "dotted" ? "1 4" : "4 3"}"` : ""}><path d="M72 37 C56 37 57 17 34 17 M72 37 C56 37 56 57 34 57" stroke="${t.palette[0]}"/><path d="M77 37 C97 37 93 15 118 15 M77 37 C97 37 93 56 118 56" stroke="${t.palette[1]}"/></g><g stroke-width="1"><rect x="52" y="27" width="47" height="20" rx="${Math.min(t.radius, 9)}" fill="${t.ink}"/><rect x="13" y="10" width="34" height="14" rx="${Math.min(t.radius, 5)}" fill="${t.palette[0]}" fill-opacity=".38" stroke="${t.palette[0]}"/><rect x="16" y="50" width="30" height="13" rx="${Math.min(t.radius, 5)}" fill="${t.palette[2]}" fill-opacity=".38" stroke="${t.palette[2]}"/><rect x="108" y="9" width="29" height="13" rx="${Math.min(t.radius, 5)}" fill="${t.palette[1]}" fill-opacity=".38" stroke="${t.palette[1]}"/><rect x="108" y="50" width="29" height="13" rx="${Math.min(t.radius, 5)}" fill="${t.palette[3]}" fill-opacity=".38" stroke="${t.palette[3]}"/></g><path d="M64 37h22" stroke="${t.background}" stroke-width="2" opacity=".8"/></svg>`;
}
function renderCompositionControls() {
  const options = resolveComposition(current.document);
  $("#composition-controls").innerHTML = `<div class="composition-switch"><span>${icon("layout-template")} Composição HTML</span><button type="button" role="switch" aria-label="Composição HTML" aria-checked="${options.enabled}" data-action="toggle-composition"><span></span></button></div><div class="composition-settings" ${options.enabled ? "" : "hidden"}><div class="composition-layouts" aria-label="Layout da composição">${([["studio", "Estúdio"], ["poster", "Pôster"], ["glass", "Glass"]] as const).map(([id, label]) => `<button data-composition-layout="${id}" aria-pressed="${options.layout === id}">${label}</button>`).join("")}</div><details class="composition-details"><summary>Personalizar a composição</summary><label class="field"><span>Subtítulo</span><input id="composition-subtitle" aria-label="Subtítulo da composição" maxlength="180" value="${esc(options.subtitle)}"></label><label class="composition-footer"><input id="composition-footer" type="checkbox" ${options.showFooter ? "checked" : ""}> Mostrar rodapé</label><p>PNG e HTML levam a composição inteira.</p></details></div>`;
  $("#composition-subtitle").addEventListener("input", (event) => {
    current.document.composition = { ...resolveComposition(current.document), subtitle: (event.target as HTMLInputElement).value };
    changed();
  });
  $("#composition-footer").addEventListener("change", (event) => {
    current.document.composition = { ...resolveComposition(current.document), showFooter: (event.target as HTMLInputElement).checked };
    changed();
  });
  refreshIcons();
}
function renderStyles() {
  const preset = PRESETS.find((p) => p.id === current.document.style.presetId)!;
  const t = resolveStyle(preset.id, current.document.style.overrides);
  $("#active-style").textContent =
    preset.name +
    (Object.keys(current.document.style.overrides).length
      ? " · personalizado"
      : "");
  $("#style-dot").style.backgroundColor = t.palette[0];
  $("#presets-tab").setAttribute(
    "aria-selected",
    String(styleTab === "presets"),
  );
  $("#custom-tab").setAttribute("aria-selected", String(styleTab === "custom"));
  if (styleTab === "presets") {
    const filtered = PRESETS.filter(
      (p) =>
        (category === "Todos" || p.category === category) &&
        p.name
          .toLocaleLowerCase("pt-BR")
          .includes(query.toLocaleLowerCase("pt-BR")),
    );
    $("#styles-content").innerHTML =
      `<label class="style-search">${icon("search")}<input id="style-search" placeholder="Encontre seu estilo…" aria-label="Buscar estilos" value="${esc(query)}"></label><div class="category-scroll" aria-label="Filtrar estilos">${["Todos", "Orgânicos", "Pastéis", "Editoriais", "Escuros", "Vibrantes", "Técnicos"].map((c) => `<button class="category ${category === c ? "selected" : ""}" data-category="${c}" aria-pressed="${category === c}">${c}</button>`).join("")}</div><div class="styles-count">${filtered.length} ESTILOS PARA EXPLORAR</div><div class="preset-grid">${
        filtered
          .map(
            (p) =>
              `<button class="preset-card ${preset.id === p.id ? "selected" : ""}" data-preset="${p.id}" aria-pressed="${preset.id === p.id}" title="${p.description}">${miniPreview(p.tokens, p.id)}<span class="preset-name">${p.name}${preset.id === p.id ? icon("check") : ""}</span><span class="palette-dots">${p.tokens.palette
                .slice(0, 5)
                .map((c) => `<i style="background:${c}"></i>`)
                .join("")}</span></button>`,
          )
          .join("") || '<p class="empty">Nenhum estilo encontrado.</p>'
      }</div>`;
    $("#style-search").addEventListener("input", (event) => {
      query = (event.target as HTMLInputElement).value;
      const start = (event.target as HTMLInputElement).selectionStart;
      renderStyles();
      $<HTMLInputElement>("#style-search").focus();
      $<HTMLInputElement>("#style-search").setSelectionRange(start, start);
    });
  } else {
    const select = (
      key: keyof StyleTokens,
      label: string,
      options: [string, string][],
    ) =>
      `<label class="field"><span>${label}</span><select data-token="${key}">${options.map(([value, name]) => `<option value="${value}" ${String(t[key]) === value ? "selected" : ""}>${name}</option>`).join("")}</select></label>`;
    const range = (
      key: keyof StyleTokens,
      label: string,
      min: number,
      max: number,
      step = 1,
    ) =>
      `<label class="field"><span>${label}<output>${t[key]}</output></span><input aria-label="${label}" data-token="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${t[key]}"></label>`;
    $("#styles-content").innerHTML =
      `<div class="custom-controls"><div class="custom-current"><span class="eyebrow">BASE ATUAL</span><strong>${preset.name}</strong><p>Pequenos detalhes. Um mapa só seu.</p></div><label class="field"><span>Paleta dos ramos</span><div class="palette-inputs">${t.palette.map((c, i) => `<input type="color" aria-label="Cor do ramo ${i + 1}" data-palette="${i}" value="${c}">`).join("")}</div></label><div class="color-pair"><label>Fundo<input type="color" data-token="background" value="${t.background}" aria-label="Cor do fundo"></label><label>Texto<input type="color" data-token="ink" value="${t.ink}" aria-label="Cor do texto"></label></div>${select(
        "font",
        "Tipografia",
        [
          ["sans", "Moderna · sem serifa"],
          ["serif", "Editorial · com serifa"],
          ["mono", "Técnica · monoespaçada"],
        ],
      )}${range("fontSize", "Tamanho do texto", 12, 26)}${select(
        "nodeStyle",
        "Aparência dos nós",
        [
          ["soft", "Preenchimento suave"],
          ["outline", "Contorno"],
          ["solid", "Cor sólida"],
        ],
      )}${range("radius", "Cantos dos retângulos", 0, 32)}${select(
        "shadow",
        "Sombra",
        [
          ["none", "Sem sombra"],
          ["soft", "Suave"],
          ["offset", "Gráfica"],
        ],
      )}<div class="control-separator"></div>${select("lineStyle", "Conexões", [
        ["solid", "Contínuas"],
        ["dashed", "Tracejadas"],
        ["dotted", "Pontilhadas"],
      ])}${range("lineWidth", "Espessura da linha", 1, 5, 0.5)}${select(
        "pattern",
        "Textura do fundo",
        [
          ["dots", "Pontos"],
          ["grid", "Grade"],
          ["none", "Lisa"],
        ],
      )}${range("spacing", "Espaçamento (fluxogramas)", 20, 80)}<button class="button secondary full" data-action="reset-style">${icon("rotate-ccw")} Restaurar estilo</button><p class="control-note">Cantos afetam nós retangulares. O espaçamento radial é calculado pelo Mermaid.</p></div>`;
    $("#styles-content")
      .querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "[data-token],[data-palette]",
      )
      .forEach((input) =>
        input.addEventListener("input", () => {
          if (input.dataset.palette) {
            const palette = [
              ...resolveStyle(preset.id, current.document.style.overrides)
                .palette,
            ];
            palette[Number(input.dataset.palette)] = input.value;
            current.document.style.overrides.palette = palette;
          } else {
            const key = input.dataset.token as keyof StyleTokens;
            const value =
              input instanceof HTMLInputElement && input.type === "range"
                ? Number(input.value)
                : input.value;
            Object.assign(current.document.style.overrides, { [key]: value });
            input
              .closest("label")
              ?.querySelector("output")
              ?.replaceChildren(String(value));
          }
          changed();
          $("#active-style").textContent = preset.name + " · personalizado";
        }),
      );
  }
  refreshIcons();
}
function openDialog(title: string, subtitle: string, content: string) {
  const d = $<HTMLDialogElement>("#dialog");
  $("#dialog-content").innerHTML =
    `<div class="dialog-heading"><div><span class="eyebrow">MERMEID-FLEX STUDIO</span><h2 id="dialog-title">${title}</h2><p>${subtitle}</p></div><button class="icon-button" data-action="close-dialog" aria-label="Fechar janela">${icon("x")}</button></div>${content}`;
  if (!d.open) d.showModal();
  refreshIcons();
}
function closeDialog() {
  $<HTMLDialogElement>("#dialog").close();
}
function newMap(document: MapDocument) {
  if (library.length >= 100) {
    toast(
      "Sua biblioteca local chegou a 100 mapas. Exporte e exclua um mapa antes de continuar.",
    );
    return;
  }
  current = { document, revision: 0, dirty: true };
  library.unshift(current);
  history = [];
  future = [];
  viewTouched = false;
  closeDialog();
  syncEditor();
}
function templatesDialog() {
  openDialog(
    "Toda ideia começa em algum lugar.",
    "Escolha um ponto de partida. Seu mapa atual fica salvo na biblioteca.",
    `<div class="template-list">${TEMPLATES.map((t, i) => `<button class="template-card" data-template="${t.id}"><span class="template-number">0${i + 1}</span><span><small>${t.label}</small><strong>${t.name}</strong></span>${icon("arrow-up-right")}</button>`).join("")}<button class="template-card" data-template="blank"><span class="template-number">${icon("plus")}</span><span><small>Do zero</small><strong>Uma página em branco</strong></span>${icon("arrow-up-right")}</button></div>`,
  );
}
function exportDialog() {
  const composition = resolveComposition(current.document).enabled;
  openDialog(
    "Leve suas ideias com você.",
    "Leve a arte inteira em PNG ou HTML. Guarde o JSON para continuar editando.",
    `<div class="export-options"><button data-download="png" ${!renderValid ? "disabled" : ""}>${icon("image")}<strong>${composition ? "Composição PNG" : "Imagem PNG"}</strong><small>${composition ? "Fundo, título, cartões e rodapé" : "Mapa completo"} · até 4096 px</small></button><button data-download="html" ${!renderValid || !composition ? "disabled" : ""}>${icon("layout-template")}<strong>Composição HTML</strong><small>${composition ? "Arquivo independente · div + estilos" : "Ative a composição HTML no painel"}</small></button><button data-download="json">${icon("file-json")}<strong>Projeto JSON</strong><small>Editável · formato completo</small></button><button data-download="svg" ${!renderValid ? "disabled" : ""}>${icon("file-code-2")}<strong>Diagrama SVG</strong><small>Vetorial · apenas o mapa Mermaid</small></button><button data-download="mmd">${icon("code-2")}<strong>Código Mermaid</strong><small>.mmd · texto UTF-8</small></button></div><p class="dialog-note">PNG captura toda a arte, independentemente do zoom. HTML preserva a composição; SVG contém apenas o diagrama. JSON exige um documento válido.</p>`,
  );
}
function externalPromptDialog() {
  openDialog(
    "Seu mapa, na IA que você escolher.",
    "Defina o tema, copie o prompt e cole na sua IA externa.",
    `<form id="external-prompt-form"><label class="field"><span>Tema e orientações do mapa</span><textarea id="external-topic" aria-label="Tema para a IA externa" maxlength="2000" rows="3" required></textarea></label><p class="dialog-note">O prompt leva os estilos atuais e pede um JSON Mermeid-flex. Salve a resposta como .json e use Importar JSON. A importação confere o formato e a sintaxe Mermaid.</p><details class="prompt-details"><summary>Ver o prompt completo</summary><label class="field"><span>Prompt pronto para copiar</span><textarea id="external-prompt-preview" aria-label="Prompt para IA externa" readonly rows="9" spellcheck="false"></textarea></label></details><p id="external-prompt-error" class="form-error" role="alert"></p><button id="copy-external-prompt" class="button primary full" type="submit">${icon("copy")} Copiar prompt</button><p class="dialog-note">A cópia é local: nenhum serviço de IA é chamado e nenhuma chave de acesso é incluída.</p></form>`,
  );
  const topic = $<HTMLTextAreaElement>("#external-topic");
  const preview = $<HTMLTextAreaElement>("#external-prompt-preview");
  const button = $<HTMLButtonElement>("#copy-external-prompt");
  const error = $("#external-prompt-error");
  topic.value = current.document.title;
  const updatePrompt = () => {
    try {
      preview.value = buildExternalAIPrompt(current.document, topic.value);
      error.textContent = "";
      button.disabled = false;
    } catch (err) {
      preview.value = "";
      button.disabled = true;
      error.textContent = errorMessage(err);
    }
  };
  topic.addEventListener("input", updatePrompt);
  updatePrompt();
  $("#external-prompt-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!preview.value || button.disabled) return;
    try {
      await navigator.clipboard.writeText(preview.value);
      toast("Prompt copiado. Cole na IA externa e importe o JSON da resposta.");
    } catch {
      $<HTMLDetailsElement>(".prompt-details").open = true;
      preview.focus();
      preview.select();
      error.textContent = "O navegador bloqueou a cópia automática. O prompt está selecionado: use Ctrl+C ou ⌘C.";
    }
  });
}
function centralNodeDialog() {
  const editing = current;
  const source = current.document.source;
  const label = readCentralLabel(source);
  const tokens = resolveStyle(current.document.style.presetId, current.document.style.overrides);
  const root = resolveRootStyle(tokens);
  openDialog(
    "Uma identidade para o centro.",
    "Personalize o destaque principal do seu mapa.",
    `<form id="central-node-form">${label === null ? '<p class="dialog-note">O rótulo deste formato deve ser editado no código. Em fluxogramas, as cores abaixo afetam o primeiro nó.</p>' : `<label class="field"><span>Texto do nó central</span><input id="central-label" aria-label="Texto do nó central" maxlength="100" required value="${esc(label)}"></label>`}<div class="central-colors"><label>Fundo<input id="central-fill" type="color" aria-label="Fundo do nó central" value="${root.fill}"></label><label>Texto<input id="central-text" type="color" aria-label="Cor do texto central" value="${root.text}" ${tokens.rootText ? "" : "disabled"}></label><label>Borda<input id="central-border" type="color" aria-label="Borda do nó central" value="${root.border}"></label></div><label class="composition-footer"><input id="central-auto-text" type="checkbox" ${tokens.rootText ? "" : "checked"}> Contraste automático do texto</label><label class="field central-radius"><span>Arredondamento <output id="central-radius-value">${root.radius}</output></span><input id="central-radius" type="range" min="0" max="80" value="${root.radius}" aria-label="Arredondamento do nó central"></label><p class="dialog-note">Arredondamento afeta cartões HTML e retângulos SVG. O texto altera o nó no Mermaid, preservando seus ramos; o título do projeto continua independente.</p><p id="central-error" class="form-error" role="alert"></p><button class="button primary full" type="submit">${icon("check")} Aplicar ao mapa</button><button class="button ghost full" type="button" data-action="reset-central-style">${icon("rotate-ccw")} Usar cores e cantos do estilo</button></form>`,
  );
  const fill = $<HTMLInputElement>("#central-fill");
  const text = $<HTMLInputElement>("#central-text");
  const auto = $<HTMLInputElement>("#central-auto-text");
  const radius = $<HTMLInputElement>("#central-radius");
  const form = $("#central-node-form");
  const syncContrast = () => {
    text.disabled = auto.checked;
    if (auto.checked) text.value = contrast(fill.value);
  };
  fill.addEventListener("input", syncContrast);
  auto.addEventListener("change", syncContrast);
  radius.addEventListener("input", () => { $("#central-radius-value").textContent = radius.value; });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $<HTMLButtonElement>('#central-node-form button[type="submit"]');
    button.disabled = true;
    try {
      const labelInput = document.querySelector<HTMLInputElement>("#central-label");
      const nextSource = labelInput && labelInput.value !== label
        ? updateCentralLabel(source, labelInput.value)
        : source;
      const overrides = { ...current.document.style.overrides };
      if (fill.value.toLowerCase() !== root.fill.toLowerCase()) overrides.rootFill = fill.value;
      if (auto.checked) delete overrides.rootText;
      else overrides.rootText = text.value;
      const border = $<HTMLInputElement>("#central-border").value;
      if (border.toLowerCase() !== root.border.toLowerCase()) overrides.rootBorder = border;
      if (Number(radius.value) !== root.radius) overrides.rootRadius = Number(radius.value);
      parseDocument({ ...current.document, source: nextSource, style: { ...current.document.style, overrides } });
      await renderDiagram(nextSource, resolveStyle(current.document.style.presetId, overrides));
      if (current !== editing || current.document.source !== source || !form.isConnected || !$<HTMLDialogElement>("#dialog").open) return;
      if (nextSource !== source) {
        history.push(source);
        if (history.length > 80) history.shift();
        future = [];
      }
      current.document.source = nextSource;
      current.document.style.overrides = overrides;
      closeDialog();
      changed();
      syncEditor();
      toast("Nó central atualizado.");
    } catch (err) {
      form.querySelector<HTMLElement>("#central-error")!.textContent = errorMessage(err);
    } finally {
      button.disabled = false;
    }
  });
}
interface CloudStatus {
  aiEnabled: boolean;
  r2Enabled: boolean;
  model: string;
  day: string;
  limits: Record<string, number>;
  usage: { category: string; used: number }[];
}
async function cloudDialog() {
  if (!connected()) {
    openDialog(
      "Suas ideias, também na nuvem.",
      "Conecte seu espaço Cloudflare para salvar mapas e usar a IA.",
      `<div class="cloud-services"><span>${icon("hard-drive")} D1 <small>Mapas</small></span><span>${icon("cloud")} R2 <small>Snapshots</small></span><span>${icon("sparkles")} Workers AI <small>Geração</small></span></div><form id="connect-form"><label class="field"><span>Chave de acesso do seu espaço</span><input id="access-token" type="password" required minlength="32" maxlength="256" autocomplete="off" placeholder="APP_ACCESS_TOKEN" aria-describedby="token-note"></label><p class="dialog-note" id="token-note">Use o segredo APP_ACCESS_TOKEN definido no seu Worker. Não use o token da sua conta Cloudflare. A chave fica apenas na memória desta aba.</p><p class="form-error" id="connect-error" role="alert"></p><button class="button primary full" type="submit">${icon("cloud")} Conectar espaço</button></form><div class="callout">Edição, estilos e exportação já funcionam localmente. Veja o guia de implantação nos arquivos do projeto para configurar a nuvem.</div>`,
    );
    $("#connect-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = $<HTMLButtonElement>("#connect-form button");
      button.disabled = true;
      setToken($<HTMLInputElement>("#access-token").value.trim());
      try {
        await api<CloudStatus>("/status");
        $("#connection-label").textContent = "Nuvem conectada";
        closeDialog();
        toast(
          "Espaço conectado. A chave será esquecida ao fechar ou recarregar a aba.",
        );
        persist();
      } catch (error) {
        setToken("");
        $("#connect-error").textContent = errorMessage(error);
      } finally {
        button.disabled = false;
      }
    });
    return;
  }
  openDialog(
    "Seu espaço Cloudflare.",
    "O rascunho local continua disponível mesmo sem conexão.",
    `<p class="dialog-note">Consultando seu espaço…</p>`,
  );
  try {
    const status = await api<CloudStatus>("/status");
    openDialog(
      "Seu espaço Cloudflare.",
      "Um espaço privado compartilhado por quem possui a chave.",
      `<div class="usage-grid">${[
        ["ai", "Gerações IA"],
        ["write", "Gravações D1"],
        ["r2", "Operações R2"],
        ["read", "Consultas API"],
      ]
        .map(
          ([key, label]) =>
            `<div><small>${label}</small><strong>${status.usage.find((u) => u.category === key)?.used ?? 0}<span> / ${status.limits[key]}</span></strong></div>`,
        )
        .join(
          "",
        )}</div><p class="dialog-note">Limites internos diários · renovação às 00:00 UTC. Não representam o consumo total nem o saldo de Neurons da conta.</p><div class="service-state"><span>Workers AI</span><b>${status.aiEnabled ? "Ativada" : "Desativada"}</b></div><div class="service-state"><span>R2 snapshots</span><b>${status.r2Enabled ? "Configurado" : "Não configurado"}</b></div><div class="dialog-actions"><button class="button secondary" data-action="disconnect">${icon("log-out")} Desconectar</button><button class="button primary" data-action="save-cloud">${icon("cloud")} Salvar mapa no D1</button></div><p class="dialog-note">Salvar na nuvem é manual. Crie e recupere snapshots na biblioteca.</p>`,
    );
  } catch (error) {
    closeDialog();
    toast(errorMessage(error));
  }
}
function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}
async function saveCloud() {
  if (!connected()) {
    await cloudDialog();
    return;
  }
  if (inFlightSave) return;
  inFlightSave = true;
  const target = current;
  let sent = "";
  try {
    const document = parseDocument(structuredClone(target.document));
    sent = JSON.stringify(target.document);
    const data = await api<{ document: MapDocument; revision: number }>(
      `/maps/${document.id}`,
      {
        method: "PUT",
        body: JSON.stringify({ document, baseRevision: target.revision }),
      },
    );
    target.revision = data.revision;
    if (JSON.stringify(target.document) === sent) {
      target.document = parseDocument(data.document);
      target.dirty = false;
    }
    persist();
    toast(
      target.dirty
        ? "Versão enviada. Há novas alterações locais pendentes."
        : "Mapa salvo no D1.",
    );
    if ($<HTMLDialogElement>("#dialog").open) closeDialog();
  } catch (error) {
    toast(errorMessage(error));
  } finally {
    inFlightSave = false;
  }
}
function libraryDialog() {
  openDialog(
    "Uma biblioteca de possibilidades.",
    "Seus mapas locais e as versões guardadas na nuvem.",
    `<div class="library-toolbar"><span>${library.length} mapas neste navegador</span><button class="button secondary" data-action="templates">${icon("plus")} Novo mapa</button></div><div class="map-list">${library.map((item) => `<div class="map-row"><button class="map-open" data-local-id="${item.document.id}">${icon("network")}<span><strong>${esc(item.document.title)}</strong><small>${item.document.style.presetId} · ${item.revision ? (item.dirty ? "Alterações locais" : "Sincronizado") : "Local"}${item.document.id === current.document.id ? " · Aberto" : ""}</small></span></button><button class="icon-button" data-duplicate-id="${item.document.id}" title="Duplicar mapa" aria-label="Duplicar ${esc(item.document.title)}">${icon("copy")}</button><button class="icon-button" data-delete-local="${item.document.id}" title="Excluir localmente" aria-label="Excluir localmente ${esc(item.document.title)}">${icon("trash-2")}</button></div>`).join("")}</div><div class="library-cloud-heading"><h3>${icon("cloud")} Mapas na nuvem</h3><button class="text-button" data-action="load-cloud">${icon("refresh-cw")} Atualizar</button></div><div id="cloud-list"><p class="empty">${connected() ? "Clique em Atualizar para consultar o D1." : "Conecte a nuvem para acessar seus mapas salvos."}</p></div>`,
  );
}
interface CloudMap {
  id: string;
  title: string;
  revision: number;
  updated_at: string;
}
async function loadCloud() {
  if (!connected()) {
    await cloudDialog();
    return;
  }
  const list = $("#cloud-list");
  if (!list) return;
  list.textContent = "Buscando mapas…";
  try {
    const data = await api<{ maps: CloudMap[] }>("/maps");
    list.innerHTML =
      data.maps
        .map(
          (item) =>
            `<div class="cloud-map"><div class="map-row"><button class="map-open" data-cloud-id="${item.id}">${icon("cloud")}<span><strong>${esc(item.title)}</strong><small>Revisão ${item.revision} · ${new Date(item.updated_at).toLocaleDateString("pt-BR")}</small></span></button><button class="icon-button" data-delete-cloud="${item.id}" data-revision="${item.revision}" aria-label="Excluir da nuvem ${esc(item.title)}" title="Excluir da nuvem">${icon("trash-2")}</button></div><div class="snapshot-actions"><button class="text-button" data-snapshot="${item.id}">${icon("hard-drive")} Criar snapshot R2</button><button class="text-button" data-restore="${item.id}">${icon("rotate-ccw")} Recuperar snapshot</button></div></div>`,
        )
        .join("") ||
      '<p class="empty">Nenhum mapa salvo na nuvem. Use Ctrl+S para salvar o mapa aberto.</p>';
    refreshIcons();
  } catch (error) {
    list.textContent = errorMessage(error);
  }
}
async function openCloud(id: string) {
  try {
    const data = await api<{ document: MapDocument; revision: number }>(
      `/maps/${id}`,
    );
    const doc = parseDocument(data.document);
    const local = library.find((m) => m.document.id === id);
    if (local?.dirty) {
      if (
        !confirm(
          "Há alterações locais neste mapa. Abrir a nuvem substituirá esse rascunho. Cancele para duplicar ou exportar antes.",
        )
      )
        return;
    }
    if (!local && library.length >= 100)
      throw new Error(
        "A biblioteca local está cheia. Exporte e remova um mapa.",
      );
    if (local) {
      local.document = doc;
      local.revision = data.revision;
      local.dirty = false;
      current = local;
    } else {
      current = { document: doc, revision: data.revision, dirty: false };
      library.unshift(current);
    }
    history = [];
    future = [];
    closeDialog();
    syncEditor();
    toast("Versão da nuvem aberta.");
  } catch (error) {
    toast(errorMessage(error));
  }
}
function aiDialog() {
  openDialog(
    "Dê um começo à sua ideia.",
    "Descreva um tema. Workers AI organiza as primeiras conexões.",
    `<form id="ai-form"><label class="field"><span>O que vamos explorar?</span><textarea id="ai-prompt" rows="5" minlength="10" maxlength="3000" required placeholder="Ex.: um mapa mental sobre aprendizagem criativa, com técnicas, ferramentas e formas de aplicar em sala de aula."></textarea></label><div class="prompt-suggestions"><button type="button" data-prompt="Organize um mapa mental sobre pensamento criativo, com técnicas, hábitos e aplicações.">Pensamento criativo</button><button type="button" data-prompt="Crie um plano de estudos organizado por objetivos, rotina, revisão e prática.">Plano de estudos</button></div><p class="dialog-note">O tema será enviado à Cloudflare Workers AI. Uma geração cria um mapa novo. Revise o conteúdo antes de usar.</p><p id="ai-error" class="form-error" role="alert"></p><button class="button primary full" type="submit" id="generate-button">${icon("sparkles")} Gerar mapa mental</button></form><div class="callout">${connected() ? "Até 20 tentativas por dia neste espaço; a franquia de IA é compartilhada pela conta." : "Conecte seu espaço no botão “Conectar nuvem” e ative a IA no Worker para gerar mapas."}</div>`,
  );
  $("#ai-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!connected()) {
      $("#ai-error").textContent = "Conecte a nuvem antes de gerar um mapa.";
      return;
    }
    const prompt = $<HTMLTextAreaElement>("#ai-prompt").value.trim();
    const button = $<HTMLButtonElement>("#generate-button");
    const error = $("#ai-error");
    button.disabled = true;
    button.textContent = "Organizando suas ideias…";
    error.textContent = "";
    try {
      const response = await api<{ source: string }>("/ai/generate", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      const doc = createDocument(prompt.slice(0, 70), response.source);
      doc.style = structuredClone(current.document.style);
      parseDocument(doc);
      await renderDiagram(
        doc.source,
        resolveStyle(doc.style.presetId, doc.style.overrides),
      );
      newMap(doc);
      toast("Seu novo mapa está pronto. Revise e personalize.");
    } catch (err) {
      error.textContent = errorMessage(err);
    } finally {
      button.disabled = false;
      button.innerHTML = icon("sparkles") + " Gerar mapa mental";
      refreshIcons();
    }
  });
}
function helpDialog() {
  openDialog(
    "Pequeno código. Grandes conexões.",
    "Mermeid-flex usa Mermaid de verdade, com um subconjunto seguro.",
    `<div class="help-content"><h3>Mapas mentais</h3><p>Escreva <code>mindmap</code>. Indente os filhos com dois espaços. O nó principal pode usar círculos duplos.</p><pre>mindmap\n  root((Minha ideia))\n    Primeiro ramo\n      Um detalhe\n    Segundo ramo</pre><h3>Fluxogramas</h3><pre>flowchart LR\n  A[Ideia] --> B[Protótipo]\n  B --> C{Funciona?}\n  C -->|Sim| D[Lançamento]</pre><p>Direções: LR, RL, TB, TD e BT. Não há suporte a outros tipos de diagrama, HTML, links, ícones externos ou diretivas CSS. Estilize pelo painel.</p><h3>Seu fluxo de trabalho</h3><p>Os rascunhos são salvos neste navegador. Use JSON como cópia portátil. A nuvem é opcional, com gravação manual no D1 e snapshots manuais no R2.</p><dl><dt>Ctrl / ⌘ + Enter</dt><dd>Atualizar visualização</dd><dt>Ctrl / ⌘ + S</dt><dd>Salvar no D1 quando conectado</dd><dt>Ctrl / ⌘ + roda</dt><dd>Ampliar ou reduzir</dd><dt>Arrastar o mapa</dt><dd>Mover a visualização</dd></dl><p class="dialog-note">Limites: 16.000 caracteres, 160 linhas e 180 conexões; 100 mapas por biblioteca. Fontes locais do sistema. JSON v1 validado; importe apenas o formato Mermeid-flex.</p></div>`,
  );
}

const actions: Record<string, () => void | Promise<void>> = {
  templates: templatesDialog,
  export: exportDialog,
  library: libraryDialog,
  cloud: cloudDialog,
  ai: aiDialog,
  help: helpDialog,
  "external-prompt": externalPromptDialog,
  "central-node": centralNodeDialog,
  "reset-central-style": () => {
    for (const key of ["rootFill", "rootText", "rootBorder", "rootRadius"] as const) delete current.document.style.overrides[key];
    closeDialog();
    changed();
    renderStyles();
    toast("O nó central voltou a acompanhar o estilo do mapa.");
  },
  "close-dialog": closeDialog,
  "load-cloud": loadCloud,
  "save-cloud": saveCloud,
  import: () => {
    $<HTMLInputElement>("#import-file").click();
  },
  presets: () => {
    styleTab = "presets";
    renderStyles();
  },
  custom: () => {
    styleTab = "custom";
    renderStyles();
  },
  "reset-style": () => {
    current.document.style.overrides = {};
    changed();
    renderStyles();
  },
  "toggle-composition": () => {
    const options = resolveComposition(current.document);
    current.document.composition = { ...options, enabled: !options.enabled };
    viewTouched = false;
    changed();
    renderCompositionControls();
  },
  disconnect: () => {
    setToken("");
    $("#connection-label").textContent = "Conectar nuvem";
    closeDialog();
    persist();
    toast("Chave removida da memória desta aba.");
  },
  editor: () => {
    app.classList.toggle("editor-hidden");
    setTimeout(fit, 250);
  },
  copy: async () => {
    await navigator.clipboard.writeText(current.document.source);
    toast("Código Mermaid copiado.");
  },
  fullscreen: async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $(".canvas-panel").requestFullscreen();
  },
  fit,
  "zoom-in": () => zoomBy(1.2),
  "zoom-out": () => zoomBy(1 / 1.2),
  undo: () => {
    if (!history.length) return;
    future.push(current.document.source);
    current.document.source = history.pop()!;
    $<HTMLTextAreaElement>("#source").value = current.document.source;
    updateLines();
    changed();
  },
  redo: () => {
    if (!future.length) return;
    history.push(current.document.source);
    current.document.source = future.pop()!;
    $<HTMLTextAreaElement>("#source").value = current.document.source;
    updateLines();
    changed();
  },
};
app.addEventListener("click", async (event) => {
  const button = (event.target as Element).closest<HTMLElement>("button");
  if (!button || (button as HTMLButtonElement).disabled) return;
  const d = button.dataset;
  try {
    if (d.action) await actions[d.action]?.();
    if (d.category) {
      category = d.category;
      renderStyles();
    }
    if (d.preset) {
      current.document.style = { presetId: d.preset, overrides: {} };
      changed();
      renderStyles();
    }
    if (d.compositionLayout && ["studio", "poster", "glass"].includes(d.compositionLayout)) {
      current.document.composition = { ...resolveComposition(current.document), layout: d.compositionLayout as "studio" | "poster" | "glass" };
      viewTouched = false;
      changed();
      renderCompositionControls();
    }
    if (d.template) {
      const t = TEMPLATES.find((t) => t.id === d.template);
      newMap(
        t
          ? createDocument(t.name, t.source)
          : createDocument(
              "Minha nova ideia",
              "mindmap\n  root((Minha ideia))\n    Primeiro ramo\n    Segundo ramo",
            ),
      );
    }
    if (d.localId) {
      current = library.find((m) => m.document.id === d.localId)!;
      history = [];
      future = [];
      closeDialog();
      syncEditor();
    }
    if (d.duplicateId) {
      const source = library.find(
        (m) => m.document.id === d.duplicateId,
      )!.document;
      const copy = structuredClone(source);
      copy.id = crypto.randomUUID();
      copy.title = (copy.title + " · cópia").slice(0, 100);
      copy.createdAt = copy.updatedAt = new Date().toISOString();
      newMap(copy);
    }
    if (
      d.deleteLocal &&
      confirm(
        "Excluir este rascunho do navegador? Exporte um JSON antes se quiser preservá-lo. A cópia na nuvem permanece.",
      )
    ) {
      library = library.filter((m) => m.document.id !== d.deleteLocal);
      if (!library.length)
        library = [{ document: createDocument(), revision: 0, dirty: true }];
      if (current.document.id === d.deleteLocal) {
        current = library[0];
        syncEditor();
      }
      persist();
      libraryDialog();
    }
    if (d.cloudId) await openCloud(d.cloudId);
    if (
      d.deleteCloud &&
      confirm(
        "Excluir o mapa do D1 e seu snapshot R2? Esta ação não pode ser desfeita pela aplicação.",
      )
    ) {
      const result = await api<{ deleted: boolean; snapshotDeleted: boolean }>(
        `/maps/${d.deleteCloud}`,
        { method: "DELETE", headers: { "If-Match": d.revision! } },
      );
      const local = library.find((m) => m.document.id === d.deleteCloud);
      if (local) {
        local.revision = 0;
        local.dirty = true;
        persist();
      }
      toast(
        result.snapshotDeleted
          ? "Mapa excluído da nuvem."
          : "Mapa excluído do D1. O snapshot residual precisa ser removido pelo administrador.",
      );
      await loadCloud();
    }
    if (d.snapshot) {
      button.setAttribute("disabled", "");
      try {
        await api(`/maps/${d.snapshot}/snapshot`, { method: "POST" });
        toast(
          "Snapshot da versão salva no D1 criado no R2. O snapshot anterior foi substituído.",
        );
      } finally {
        button.removeAttribute("disabled");
      }
    }
    if (d.restore) {
      const data = await api<{ document: MapDocument }>(
        `/maps/${d.restore}/snapshot`,
      );
      const copy = parseDocument(data.document);
      copy.id = crypto.randomUUID();
      copy.title = (copy.title + " · recuperado").slice(0, 100);
      copy.createdAt = copy.updatedAt = new Date().toISOString();
      newMap(copy);
      toast("Snapshot recuperado como novo mapa local.");
    }
    if (d.prompt) $<HTMLTextAreaElement>("#ai-prompt").value = d.prompt;
    if (d.download) {
      const name =
        current.document.title
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9_-]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 70) || "mermeid-flex";
      if (d.download === "json") {
        if (!renderValid) throw new Error("Corrija o Mermaid e aguarde a prévia antes de exportar um JSON compatível. Para guardar um rascunho, exporte .mmd.");
        download(
          new Blob([JSON.stringify(parseDocument(current.document), null, 2)], {
            type: "application/json",
          }),
          `${name}.json`,
        );
      }
      if (d.download === "mmd")
        download(
          new Blob([current.document.source], {
            type: "text/plain;charset=utf-8",
          }),
          `${name}.mmd`,
        );
      if (d.download === "svg" || d.download === "png" || d.download === "html") {
        if (!currentSVG || !renderValid)
          throw new Error(
            "Corrija o código e aguarde a prévia antes de exportar a imagem.",
          );
        button.setAttribute("disabled", "");
        button.setAttribute("aria-busy", "true");
        try {
        if (d.download === "html") {
          if (!currentComposition) throw new Error("Ative a composição HTML no painel de estilos.");
          download(new Blob([serializeCompositionHTML(currentComposition, current.document.title)], { type: "text/html;charset=utf-8" }), `${name}.html`);
        } else if (d.download === "svg")
          download(
            new Blob([serializeSVG(currentSVG)], { type: "image/svg+xml" }),
            `${name}.svg`,
          );
        else if (currentComposition) await exportCompositionPNG(currentComposition, `${name}.png`);
        else await exportPNG(currentSVG, `${name}.png`);
        } finally {
          button.removeAttribute("disabled");
          button.removeAttribute("aria-busy");
        }
      }
      toast("Exportação preparada.");
    }
  } catch (error) {
    toast(errorMessage(error));
  }
});
$<HTMLTextAreaElement>("#source").addEventListener("input", (event) => {
  history.push(current.document.source);
  if (history.length > 80) history.shift();
  future = [];
  current.document.source = (event.target as HTMLTextAreaElement).value;
  updateLines();
  changed();
});
$<HTMLTextAreaElement>("#source").addEventListener("scroll", (event) => {
  $("#line-numbers").scrollTop = (
    event.target as HTMLTextAreaElement
  ).scrollTop;
});
$<HTMLTextAreaElement>("#source").addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    const input = event.target as HTMLTextAreaElement;
    input.setRangeText("  ", input.selectionStart, input.selectionEnd, "end");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
$("#title").addEventListener("input", (event) => {
  current.document.title =
    (event.target as HTMLInputElement).value.trim() || "Sem título";
  $("#canvas-title").textContent = current.document.title;
  changed(resolveComposition(current.document).enabled);
});
$("#import-file").addEventListener("change", async (event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > MAX_DOCUMENT_BYTES)
      throw new Error("O JSON deve ter no máximo 96 KiB.");
    const doc = validateImport(await file.text());
    await renderDiagram(
      doc.source,
      resolveStyle(doc.style.presetId, doc.style.overrides),
    );
    doc.id = crypto.randomUUID();
    doc.createdAt = doc.updatedAt = new Date().toISOString();
    newMap(doc);
    toast("JSON importado como novo mapa.");
  } catch (error) {
    toast("Importação recusada: " + errorMessage(error));
  } finally {
    input.value = "";
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (connected()) void saveCloud();
    else {
      persist();
      toast("Rascunho salvo localmente. Exporte JSON para uma cópia portátil.");
    }
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    scheduleRender();
  }
});
$<HTMLDialogElement>("#dialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeDialog();
});
const canvas = $("#canvas");
let drag: { x: number; y: number; px: number; py: number } | null = null;
canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  drag = { x: event.clientX, y: event.clientY, px: panX, py: panY };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add("dragging");
});
canvas.addEventListener("pointermove", (event) => {
  if (!drag) return;
  panX = drag.px + event.clientX - drag.x;
  panY = drag.py + event.clientY - drag.y;
  viewTouched = true;
  transform();
});
for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(name, () => {
    drag = null;
    canvas.classList.remove("dragging");
  });
canvas.addEventListener(
  "wheel",
  (event) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1.08 : 1 / 1.08);
    }
  },
  { passive: false },
);
new ResizeObserver(() => {
  if (!viewTouched) fit();
}).observe(canvas);
window.addEventListener("beforeunload", () => {
  try {
    if (!storageBlocked) writeLibrary(library);
  } catch {
    /* Already surfaced by autosave. */
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    try {
      if (!storageBlocked) writeLibrary(library);
    } catch {
      /* Export remains available. */
    }
  }
});
syncEditor();
if (startupError) toast(startupError);
