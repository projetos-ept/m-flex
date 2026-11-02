import { describe, expect, it } from "vitest";
import {
  createDocument,
  extractAIText,
  parseDocument,
  validateSource,
  TEMPLATES,
} from "../shared/document";
import { PRESETS, resolveStyle, contrast } from "../shared/styles";

describe("Formato portátil e entrada não confiável", () => {
  it("preserva os ajustes em uma ida e volta JSON", () => {
    const map = createDocument("Conhecimento");
    map.style = {
      presetId: "cosmos",
      overrides: { fontSize: 22, lineStyle: "dashed", background: "#234567" },
    };
    expect(parseDocument(JSON.parse(JSON.stringify(map)))).toEqual(map);
  });
  it("rejeita versões futuras, propriedades extras e IDs arbitrários", () => {
    expect(() => parseDocument({ ...createDocument(), version: 2 })).toThrow();
    expect(() =>
      parseDocument({ ...createDocument(), id: "../../arquivo" }),
    ).toThrow();
    expect(() =>
      parseDocument({ ...createDocument(), token: "secret" }),
    ).toThrow();
  });
  it.each([
    '%%{init: {securityLevel: "loose"}}%%\nmindmap\n  A',
    "mindmap\n  <img src=x onerror=alert(1)>",
    'flowchart LR\n A-->B\n click A "https://example.com"',
    "---\nconfig:\n---\nmindmap\n A",
    "mindmap\n A\n ::icon(fa fa-home)",
    "flowchart LR\n A-->B\n classDef x fill:url(https://example.com)",
  ])("rejeita conteúdo ativo: %s", (source) =>
    expect(validateSource(source)).not.toBeNull(),
  );
  it("rejeita valores de CSS, paletas incompletas e números fora dos limites", () => {
    for (const overrides of [
      { background: "url(evil)" },
      { palette: ["#aaaaaa"] },
      { fontSize: 100 },
      { font: "evil-font" },
      { shadow: "evil" },
      { spacing: Infinity },
    ])
      expect(() =>
        parseDocument({
          ...createDocument(),
          style: { presetId: "botanica", overrides },
        }),
      ).toThrow();
  });
  it("rejeita código exagerado e diagrama não suportado", () => {
    expect(
      validateSource("mindmap\n" + Array(161).fill("  A").join("\n")),
    ).toBeTruthy();
    expect(validateSource("sequenceDiagram\n A->>B: oi")).toBeTruthy();
    expect(validateSource("mindmap\n  " + "a".repeat(16000))).toBeTruthy();
  });
  it("aceita cada modelo inicial", () => {
    for (const t of TEMPLATES)
      expect(() =>
        parseDocument(createDocument(t.name, t.source)),
      ).not.toThrow();
  });
  it("extrai resposta cercada por markdown e rejeita saídas inválidas", () => {
    expect(
      extractAIText({ response: "```mermaid\nmindmap\n  Mundo\n```" }),
    ).toBe("mindmap\n  Mundo");
    expect(() =>
      extractAIText({ response: "Aqui está sua resposta: ..." }),
    ).toThrow();
    expect(() => extractAIText({ response: "" })).toThrow();
  });
});
describe("Sistema dinâmico de estilos", () => {
  it("possui 36 presets únicos, seis famílias e tokens válidos", () => {
    expect(PRESETS).toHaveLength(36);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(36);
    expect(new Set(PRESETS.map((p) => p.category)).size).toBe(6);
    for (const p of PRESETS)
      expect(() =>
        parseDocument({
          ...createDocument(),
          style: { presetId: p.id, overrides: p.tokens },
        }),
      ).not.toThrow();
  });
  it("aplica ajustes sem modificar os presets", () => {
    const s = resolveStyle("botanica", { fontSize: 24 });
    expect(s.fontSize).toBe(24);
    expect(PRESETS[0].tokens.fontSize).toBe(16);
  });
  it("escolhe texto legível para preenchimentos sólidos", () => {
    expect(contrast("#000000")).toBe("#ffffff");
    expect(contrast("#ffffff")).toBe("#17222b");
  });
});
