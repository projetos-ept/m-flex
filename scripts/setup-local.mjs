import { existsSync, readFileSync, writeFileSync } from "node:fs";
const root = new URL("../", import.meta.url);
if (!existsSync(new URL(".dev.vars", root))) {
  writeFileSync(
    new URL(".dev.vars", root),
    readFileSync(new URL(".dev.vars.example", root)),
  );
  console.log(
    ".dev.vars criado com chave EXCLUSIVA de desenvolvimento. Nunca use essa chave em produção.",
  );
}
