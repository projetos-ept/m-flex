import { describe, expect, it } from "vitest";
import {
  createDocument,
  DEFAULT_COMPOSITION,
  parseDocument,
  resolveComposition,
} from "../shared/document";

describe("HTML composition document contract", () => {
  it("preserves every composition option in a JSON roundtrip", () => {
    const document = createDocument();
    document.composition = {
      enabled: true,
      layout: "glass",
      subtitle: "Uma perspectiva sobre o futuro ✨",
      showFooter: false,
    };
    expect(parseDocument(JSON.parse(JSON.stringify(document)))).toEqual(document);
  });

  it("opens older v1 documents without rewriting their persisted contents", () => {
    const document = createDocument();
    delete document.composition;
    const encoded = JSON.stringify(document);
    const parsed = parseDocument(JSON.parse(encoded));
    expect(JSON.stringify(parsed)).toBe(encoded);
    expect(parsed).not.toHaveProperty("composition");
    expect(resolveComposition(parsed)).toEqual(DEFAULT_COMPOSITION);
    expect(resolveComposition(parsed).enabled).toBe(false);
  });

  it("starts new documents in HTML mode without mutating the legacy default", () => {
    const first = createDocument();
    const second = createDocument();
    expect(first.composition).toEqual({ ...DEFAULT_COMPOSITION, enabled: true });
    first.composition!.layout = "poster";
    expect(second.composition!.layout).toBe("studio");
    expect(DEFAULT_COMPOSITION.enabled).toBe(false);
  });

  it("returns an independent resolved configuration", () => {
    const document = createDocument();
    const resolved = resolveComposition(document);
    resolved.subtitle = "Changed only for display";
    expect(document.composition!.subtitle).toBe(DEFAULT_COMPOSITION.subtitle);
  });

  it.each([
    { layout: "raw-html" },
    { subtitle: "x".repeat(181) },
    { enabled: "true" },
    { showFooter: 1 },
    { html: "<script>alert(1)</script>" },
    { css: "body { display: none }" },
  ])("rejects invalid or executable configuration %j", (patch) => {
    const document = createDocument();
    expect(() =>
      parseDocument({
        ...document,
        composition: { ...document.composition, ...patch },
      }),
    ).toThrow();
  });

  it("requires all options if a composition is present", () => {
    expect(() =>
      parseDocument({ ...createDocument(), composition: { enabled: true } }),
    ).toThrow();
  });

  it("accepts the subtitle length boundary and all documented layouts", () => {
    for (const layout of ["studio", "poster", "glass"] as const) {
      const document = createDocument();
      document.composition!.layout = layout;
      document.composition!.subtitle = "x".repeat(180);
      expect(parseDocument(document).composition!.layout).toBe(layout);
    }
  });
});
