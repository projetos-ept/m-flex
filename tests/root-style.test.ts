import { describe, expect, it } from "vitest";
import { createDocument, parseDocument, StyleOverridesSchema } from "../shared/document";
import { contrast, PRESETS, resolveRootStyle, resolveStyle } from "../shared/styles";

describe("Estilo independente do nó raiz", () => {
  it("preserva os quatro ajustes na importação e exportação JSON", () => {
    const map = createDocument("Raiz personalizada");
    map.style.overrides = {
      rootFill: "#EDCBA9",
      rootText: "#123456",
      rootBorder: "#aBcDeF",
      rootRadius: 42,
      radius: 8,
      fontSize: 19,
    };
    expect(parseDocument(JSON.parse(JSON.stringify(map)))).toEqual(map);
  });

  it.each([
    { rootFill: "red" },
    { rootFill: "#fff" },
    { rootFill: "url(https://example.com)" },
    { rootText: "#12345678" },
    { rootText: null },
    { rootBorder: "#GGGGGG" },
    { rootBorder: "#123456;opacity:0" },
    { rootRadius: -1 },
    { rootRadius: 81 },
    { rootRadius: Infinity },
    { rootRadius: NaN },
    { rootRadius: "20" },
    { rootRadius: null },
    { rootFontSize: 44 },
  ])("rejeita atributos inválidos ou não suportados: %j", (overrides) => {
    expect(() => parseDocument({
      ...createDocument(),
      style: { presetId: "botanica", overrides },
    })).toThrow();
  });

  it.each([0, 0.5, 80])("aceita o raio dentro do intervalo: %s", (rootRadius) => {
    expect(StyleOverridesSchema.parse({ rootRadius })).toEqual({ rootRadius });
  });

  it("mantém todos os presets e documentos antigos sem novos campos", () => {
    const originalPresets = JSON.stringify(PRESETS);
    for (const preset of PRESETS) {
      const tokens = resolveStyle(preset.id);
      expect(resolveRootStyle(tokens)).toEqual({
        fill: tokens.ink,
        text: contrast(tokens.ink),
        border: tokens.ink,
        radius: tokens.radius,
      });
      for (const key of ["rootFill", "rootText", "rootBorder", "rootRadius"]) {
        expect(Object.hasOwn(tokens, key)).toBe(false);
      }
      const map = createDocument();
      map.style.presetId = preset.id;
      expect(parseDocument(JSON.parse(JSON.stringify(map))).style.overrides).toEqual({});
    }
    expect(JSON.stringify(PRESETS)).toBe(originalPresets);
  });

  it("segue o novo preenchimento no contraste e na borda quando não há ajustes explícitos", () => {
    const tokens = resolveStyle("botanica", { rootFill: "#ffffff" });
    expect(resolveRootStyle(tokens)).toEqual({
      fill: "#ffffff",
      text: contrast("#ffffff"),
      border: "#ffffff",
      radius: tokens.radius,
    });
  });

  it("permite ajustar cada propriedade sem alterar paleta, fonte ou demais nós", () => {
    const original = resolveStyle("cosmos");
    const overrides = {
      rootFill: "#efece4", rootText: "#112233", rootBorder: "#ff9900", rootRadius: 0,
    };
    const customized = resolveStyle("cosmos", overrides);
    expect(customized).toEqual({ ...original, ...overrides });
    expect(resolveRootStyle(customized)).toEqual({
      fill: overrides.rootFill, text: overrides.rootText,
      border: overrides.rootBorder, radius: 0,
    });
    expect(resolveStyle("cosmos")).toEqual(original);
    expect(resolveRootStyle(resolveStyle("cosmos", { rootText: "#ffffff" }))).toEqual({
      ...resolveRootStyle(original), text: "#ffffff",
    });
    expect(resolveRootStyle(resolveStyle("cosmos", { rootBorder: "#ffffff" }))).toEqual({
      ...resolveRootStyle(original), border: "#ffffff",
    });
    expect(resolveRootStyle(resolveStyle("cosmos", { rootRadius: 80 }))).toEqual({
      ...resolveRootStyle(original), radius: 80,
    });
  });
});
