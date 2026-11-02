import { readFileSync } from "node:fs";
import { parse } from "jsonc-parser";

export function readConfig(path) {
  const errors = [];
  const config = parse(readFileSync(path, "utf8"), errors, { allowTrailingComma: true });
  if (errors.length) throw new Error(`Configuração JSONC inválida: ${String(path)}`);
  return config;
}
