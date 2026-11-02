import { describe, expect, it, vi } from "vitest";
import worker from "../worker/index.ts";
import { MODEL } from "../shared/document.ts";

const token = "test-only-ai-token-with-at-least-32-characters";
function env(
  result = { response: "mindmap\n  root((Aprender))\n    Praticar" },
) {
  return {
    APP_ACCESS_TOKEN: token,
    AI_ENABLED: "true",
    AI: { run: vi.fn().mockResolvedValue(result) },
    DB: {
      prepare: vi.fn(() => ({
        bind: () => ({ first: async () => ({ used: 1 }) }),
      })),
    },
  };
}
function request(
  body = { prompt: "Organize um plano de aprendizagem criativa" },
  auth = true,
) {
  return new Request("https://mermeid.example/api/ai/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
describe("Contrato da chamada Workers AI com binding simulado", () => {
  it("usa o modelo fixo e limites do servidor", async () => {
    const bindings = env();
    const response = await worker.fetch(request(), bindings);
    expect(response.status).toBe(200);
    expect((await response.json()).model).toBe(MODEL);
    expect(bindings.AI.run).toHaveBeenCalledWith(
      MODEL,
      expect.objectContaining({
        max_tokens: 1200,
        temperature: 0.35,
        stream: false,
      }),
    );
  });
  it("não chama IA sem autenticação", async () => {
    const b = env();
    expect((await worker.fetch(request(undefined, false), b)).status).toBe(401);
    expect(b.AI.run).not.toHaveBeenCalled();
    expect(b.DB.prepare).not.toHaveBeenCalled();
  });
  it("não chama IA quando desativada", async () => {
    const b = env();
    b.AI_ENABLED = "false";
    expect((await worker.fetch(request(), b)).status).toBe(503);
    expect(b.AI.run).not.toHaveBeenCalled();
  });
  it("não deixa o cliente escolher modelo ou custo", async () => {
    const b = env();
    const r = await worker.fetch(
      request({
        prompt: "Aprendizagem criativa",
        model: "arbitrary",
        max_tokens: 999999,
      }),
      b,
    );
    expect(r.status).toBe(400);
    expect(b.AI.run).not.toHaveBeenCalled();
  });
  it("reserva a cota antes da inferência e bloqueia quando zero", async () => {
    const b = env();
    b.AI_DAILY_LIMIT = "0";
    expect((await worker.fetch(request(), b)).status).toBe(429);
    expect(b.AI.run).not.toHaveBeenCalled();
  });
  it("transforma falha do provedor em erro sem conteúdo sensível", async () => {
    const b = env();
    b.AI.run.mockRejectedValue(new Error("private provider debug"));
    const r = await worker.fetch(request(), b);
    expect(r.status).toBe(502);
    expect(JSON.stringify(await r.json())).not.toContain(
      "private provider debug",
    );
    expect(b.AI.run).toHaveBeenCalledTimes(1);
  });
  it("rejeita saída ativa do modelo", async () => {
    const b = env({ response: "mindmap\n  <script>alert(1)</script>" });
    const r = await worker.fetch(request(), b);
    expect(r.status).toBe(502);
    expect((await r.json()).error.code).toBe("AI_INVALID_OUTPUT");
  });
});
