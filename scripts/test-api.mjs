import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { readConfig } from "./config.mjs";

// Each run has its own local D1/R2 state; no production credentials or resources.
const dir = resolve("artifacts", "api-tests", crypto.randomUUID());
mkdirSync(dir, { recursive: true });
const cli = resolve("node_modules/wrangler/bin/wrangler.js");
const token = "mermeid-flex-local-development-token-2026";
const config = readConfig("wrangler.local.jsonc");
config.main = resolve(config.main);
config.assets.directory = resolve(config.assets.directory);
config.d1_databases[0].migrations_dir = resolve(config.d1_databases[0].migrations_dir);
delete config.$schema;
writeFileSync(resolve(dir, "wrangler.test.json"), JSON.stringify(config));
writeFileSync(resolve(dir, ".dev.vars"), `APP_ACCESS_TOKEN=${token}\nAI_ENABLED=false\n`);
const env = {
  ...process.env,
  WRANGLER_LOG_PATH: resolve(dir, "wrangler.log"),
  WRANGLER_SEND_METRICS: "false",
};
const baseArgs = [
  "--config",
  resolve(dir, "wrangler.test.json"),
  "--persist-to",
  resolve(dir, "state"),
];
const migration = spawnSync(
  process.execPath,
  [cli, "d1", "migrations", "apply", "mermeid-flex", "--local", ...baseArgs],
  { env, encoding: "utf8", windowsHide: true },
);
if (migration.status !== 0) {
  console.error(migration.stdout, migration.stderr);
  process.exit(1);
}
const port = Number(process.env.TEST_PORT || 8790);
const server = spawn(
  process.execPath,
  [
    cli,
    "dev",
    ...baseArgs,
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--var",
    "WRITE_DAILY_LIMIT:12",
    "--var",
    "R2_DAILY_LIMIT:3",
  ],
  { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
);
let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk;
});
server.stderr.on("data", (chunk) => {
  output += chunk;
});
let count = 0;
async function request(path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers,
  };
}
function check(name, condition) {
  assert.ok(condition, name);
  count++;
  console.log(`OK ${name}`);
}
function checkEqual(name, actual, expected) {
  assert.deepEqual(actual, expected, name);
  count++;
  console.log(`OK ${name}`);
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null)
      throw new Error("Worker encerrou antes de iniciar.");
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(300);
  }
  if (!ready) throw new Error("Worker local não iniciou.");
  const fixture = JSON.parse(
    readFileSync("examples/universo-criativo.json", "utf8"),
  );
  assert.ok(
    fixture.composition,
    "O exemplo deve conter composition; execute npm run schema antes da suíte.",
  );
  fixture.id = crypto.randomUUID();
  Object.assign(fixture.style.overrides, {
    rootFill: "#473373",
    rootText: "#ffffff",
    rootBorder: "#d1a95c",
    rootRadius: 24,
  });
  const path = `/maps/${fixture.id}`;
  check("health público", (await request("/health")).status === 200);
  check(
    "sem token retorna 401",
    (await request("/maps", { headers: { Authorization: "" } })).status === 401,
  );
  check(
    "token incorreto retorna 401",
    (
      await request("/maps", {
        headers: { Authorization: "Bearer " + "x".repeat(64) },
      })
    ).status === 401,
  );
  check(
    "origem externa retorna 403",
    (await request("/maps", { headers: { Origin: "https://example.invalid" } }))
      .status === 403,
  );
  check(
    "erro nunca é armazenado em cache",
    (await request("/maps", { headers: { Authorization: "" } })).headers.get(
      "cache-control",
    ) === "no-store",
  );
  let result = await request(path, {
    method: "PUT",
    body: JSON.stringify({ document: fixture, baseRevision: 0 }),
  });
  check(
    "cria mapa com revisão 1",
    result.status === 201 && result.body.revision === 1,
  );
  check(
    "lista mapa criado",
    (await request("/maps")).body.maps.some((m) => m.id === fixture.id),
  );
  result = await request(path);
  check("lê documento exato", result.body.document.source === fixture.source);
  checkEqual(
    "D1 preserva a composição da fixture",
    result.body.document.composition,
    fixture.composition,
  );
  checkEqual(
    "D1 preserva o estilo e os ajustes independentes do nó central",
    result.body.document.style,
    fixture.style,
  );
  fixture.title = "Revisão dois";
  fixture.composition = {
    enabled: true,
    layout: "glass",
    subtitle: "R2 preserva cores, texto & opções <literais>.",
    showFooter: false,
  };
  result = await request(path, {
    method: "PUT",
    body: JSON.stringify({ document: fixture, baseRevision: 1 }),
  });
  check(
    "atualiza com compare-and-swap",
    result.status === 200 && result.body.revision === 2,
  );
  checkEqual(
    "atualização conserva as opções de composição",
    result.body.document.composition,
    fixture.composition,
  );
  check(
    "rejeita sobrescrita concorrente",
    (
      await request(path, {
        method: "PUT",
        body: JSON.stringify({ document: fixture, baseRevision: 1 }),
      })
    ).status === 409,
  );
  check(
    "rejeita ID divergente",
    (
      await request(path, {
        method: "PUT",
        body: JSON.stringify({
          document: { ...fixture, id: crypto.randomUUID() },
          baseRevision: 2,
        }),
      })
    ).status === 400,
  );
  check(
    "rejeita versão JSON desconhecida",
    (
      await request(path, {
        method: "PUT",
        body: JSON.stringify({
          document: { ...fixture, version: 2 },
          baseRevision: 2,
        }),
      })
    ).status === 400,
  );
  check(
    "rejeita HTML no código",
    (
      await request(path, {
        method: "PUT",
        body: JSON.stringify({
          document: {
            ...fixture,
            source: "mindmap\n  <script>alert(1)</script>",
          },
          baseRevision: 2,
        }),
      })
    ).status === 400,
  );
  check(
    "rejeita Content-Type incorreto",
    (
      await request(path, {
        method: "PUT",
        headers: { "Content-Type": "text/plain" },
        body: "{}",
      })
    ).status === 415,
  );
  check(
    "rejeita corpo excessivo",
    (await request(path, { method: "PUT", body: "x".repeat(110000) }))
      .status === 413,
  );
  check(
    "rejeita JSON inválido",
    (await request(path, { method: "PUT", body: "{broken" })).status === 400,
  );
  check(
    "grava snapshot R2",
    (await request(path + "/snapshot", { method: "POST" })).status === 200,
  );
  const snapshotComposition = structuredClone(fixture.composition);
  const snapshotStyle = structuredClone(fixture.style);
  fixture.title = "Revisão três";
  // Reuse the existing third write to cover legacy JSON without adding quota usage.
  delete fixture.composition;
  check(
    "nova revisão independente do snapshot",
    (
      await request(path, {
        method: "PUT",
        body: JSON.stringify({ document: fixture, baseRevision: 2 }),
      })
    ).body.revision === 3,
  );
  result = await request(path);
  check(
    "D1 aceita documento legado sem inserir composição",
    result.status === 200 &&
      result.body.revision === 3 &&
      !Object.hasOwn(result.body.document, "composition"),
  );
  result = await request(path + "/snapshot");
  check(
    "snapshot mantém a revisão anterior",
    result.body.document.title === "Revisão dois" && result.body.revision === 2,
  );
  checkEqual(
    "snapshot R2 recupera a composição da revisão salva",
    result.body.document.composition,
    snapshotComposition,
  );
  checkEqual(
    "snapshot R2 recupera o estilo e os ajustes do nó central",
    result.body.document.style,
    snapshotStyle,
  );
  check(
    "snapshot exige mapa existente",
    (await request(`/maps/${crypto.randomUUID()}/snapshot`)).status === 404,
  );
  check(
    "cota R2 bloqueia leituras e escritas",
    (await request(path + "/snapshot")).status === 429,
  );
  check(
    "exclusão exige revisão",
    (await request(path, { method: "DELETE" })).status === 428,
  );
  check(
    "exclusão rejeita revisão antiga",
    (await request(path, { method: "DELETE", headers: { "If-Match": "1" } }))
      .status === 409,
  );
  result = await request(path, {
    method: "DELETE",
    headers: { "If-Match": "3" },
  });
  check(
    "exclui D1 e snapshot R2",
    result.status === 200 && result.body.snapshotDeleted === true,
  );
  check(
    "mapa excluído não pode ser lido",
    (await request(path)).status === 404,
  );
  check(
    "IA desativada não produz resposta fictícia",
    (
      await request("/ai/generate", {
        method: "POST",
        body: JSON.stringify({ prompt: "Tema para testar IA localmente" }),
      })
    ).body.error.code === "AI_DISABLED",
  );
  check(
    "rota API desconhecida retorna JSON 404",
    (await request("/desconhecido")).status === 404,
  );
  const concurrent = await Promise.all(
    Array.from({ length: 20 }, () => {
      const doc = { ...fixture, id: crypto.randomUUID() };
      return request(`/maps/${doc.id}`, {
        method: "PUT",
        body: JSON.stringify({ document: doc, baseRevision: 0 }),
      });
    }),
  );
  check(
    "cota D1 atômica sob 20 escritas concorrentes",
    concurrent.filter((r) => r.status === 201).length === 6 &&
      concurrent.filter((r) => r.status === 429).length === 14,
  );
  result = await request("/status");
  check(
    "contadores nunca excedem limites",
    result.body.usage.find((q) => q.category === "write").used === 12 &&
      result.body.usage.find((q) => q.category === "r2").used === 3,
  );
  console.log(
    `\n${count} verificações da API passaram. D1/R2 locais e isolados. IA real não foi invocada.`,
  );
} catch (error) {
  console.error(error);
  console.error(output.slice(-4000));
  process.exitCode = 1;
} finally {
  // Kill only the process tree created by this script; no arbitrary process matching.
  if (process.platform === "win32")
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  else server.kill("SIGTERM");
}
