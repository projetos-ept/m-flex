import { describe, expect, it } from "vitest";
import { readCentralLabel, updateCentralLabel } from "../shared/central-node";
import { DEMO_SOURCE } from "../shared/document";

describe("safe central mindmap label editing", () => {
  it("changes only the demo root and leaves every branch intact", () => {
    expect(readCentralLabel(DEMO_SOURCE)).toBe("Universo criativo");
    expect(updateCentralLabel(DEMO_SOURCE, "Novas conexões")).toBe(
      DEMO_SOURCE.replace("root((Universo criativo))", "root((Novas conexões))"),
    );
  });

  it.each([
    ["central_01((Texto))", "central_01((Novo texto))"],
    ["central-01[Texto]", "central-01[Novo texto]"],
    ["central(Texto)", "central(Novo texto)"],
    ["((Texto))", "((Novo texto))"],
    ["raiz{{Texto}}", "raiz{{Novo texto}}"],
    ["raiz)Texto(", "raiz)Novo texto("],
    ["raiz))Texto((", "raiz))Novo texto(("],
    ["Texto", "Novo texto"],
    ['raiz(("Texto"))', 'raiz(("Novo texto"))'],
    ['raiz["Texto"]', 'raiz["Novo texto"]'],
    ['raiz("Texto")', 'raiz("Novo texto")'],
    ['"Texto"', '"Novo texto"'],
    ["raiz(( Texto ))", "raiz(( Novo texto ))"],
  ])("preserves root ID and shape in %s", (before, after) => {
    const source = `mindmap\n  ${before}\n    Filho`;
    expect(readCentralLabel(source)).toBe("Texto");
    const updated = updateCentralLabel(source, "Novo texto");
    expect(updated).toBe(`mindmap\n  ${after}\n    Filho`);
    expect(readCentralLabel(updated)).toBe("Novo texto");
  });

  it("preserves CRLF, comments, blank lines, tabs and trailing whitespace exactly", () => {
    const source = '\r\n%% comentário inicial\r\n mindmap \r\n\r\n  %% sobre a raiz\r\n\troot(("Ideia"))  \r\n\t\tFilho\r\n\t\t%% comentário final\r\n';
    expect(readCentralLabel(source)).toBe("Ideia");
    expect(updateCentralLabel(source, "  Futuro  ")).toBe(
      source.replace('root(("Ideia"))', 'root(("Futuro"))'),
    );
  });

  it("handles a quoted root containing shape punctuation without destroying its wrapper", () => {
    const source = 'mindmap\n  root["Projeto (fase 1)"]\n    Ramo';
    expect(readCentralLabel(source)).toBe("Projeto (fase 1)");
    expect(updateCentralLabel(source, "Fase dois")).toBe(
      'mindmap\n  root["Fase dois"]\n    Ramo',
    );
  });

  it("does not rename a second occurrence of the central text in a child or comment", () => {
    const source = "mindmap\n  root((Ideia))\n    Ideia\n    %% Ideia";
    expect(updateCentralLabel(source, "Plano")).toBe(
      "mindmap\n  root((Plano))\n    Ideia\n    %% Ideia",
    );
  });

  it("preserves inline comments after the header and a shaped root", () => {
    const source = "mindmap %% título\n  root((Ideia))  %% Ideia permanece aqui\n    Filho";
    expect(readCentralLabel(source)).toBe("Ideia");
    expect(updateCentralLabel(source, "Plano")).toBe(
      "mindmap %% título\n  root((Plano))  %% Ideia permanece aqui\n    Filho",
    );
  });

  it.each([
    "",
    "%% somente comentário",
    "mindmap\n\n  %% sem raiz",
    "flowchart LR\n  root[Ideia] --> B[Filho]",
    "mindmap\n  root((Texto)\n    Filho",
    "mindmap\n  root[Texto))\n    Filho",
    "mindmap\n  root((Texto)) extra\n    Filho",
    "mindmap\n  root((Texto))\n  Outra raiz",
    'mindmap\n  root["Texto sem fim]\n    Filho',
    'mindmap\n  root["`Texto markdown`"]\n    Filho',
    "mindmap\n  root((Texto)):::classe\n    Filho",
    "mindmap\n  root((Texto))\n Menos recuado",
    "mindmap\n  \u00a0root((Texto))\n    Filho",
    'mindmap\n  "Texto (incerto)"\n    Filho',
    "mindmap\n  Texto %% comentário ambíguo\n    Filho",
  ])("refuses missing, malformed or ambiguous roots: %j", (source) => {
    expect(readCentralLabel(source)).toBeNull();
    expect(() => updateCentralLabel(source, "Novo texto")).toThrow(
      "Não foi possível identificar",
    );
  });

  it.each([
    "", "   ", "x".repeat(101), "Uma\nsegunda linha", "Uma\rsegunda linha",
    "Tab\tseparado", "Nulo\u0000", "Separador\u2028", '<script>alert(1)</script>',
    "https://example.com", "www.example.com", "javascript:alert", "data:text/plain",
    "Outro))", "Raiz[filho]", 'Uma "ideia"', "C:\\pasta", "`Markdown`",
    "%% comentário", ":::classe", "Novo; style X fill:red", "A --> B",
  ])("rejects unsafe or unsupported new labels: %j", (label) => {
    expect(() => updateCentralLabel(DEMO_SOURCE, label)).toThrow();
  });

  it("accepts the length boundary, accents, emojis and ordinary punctuation", () => {
    const label = "x".repeat(100);
    expect(readCentralLabel(updateCentralLabel(DEMO_SOURCE, label))).toBe(label);
    const readable = "Conexões: ação, pesquisa & futuro! ✨";
    expect(readCentralLabel(updateCentralLabel(DEMO_SOURCE, readable))).toBe(readable);
  });

  it("rejects a reserved header token only for a root without a shape", () => {
    expect(() => updateCentralLabel("mindmap\n  Ideia\n    Filho", "mindmap novo")).toThrow("palavra");
    expect(readCentralLabel(updateCentralLabel(DEMO_SOURCE, "mindmap novo"))).toBe("mindmap novo");
  });
});
