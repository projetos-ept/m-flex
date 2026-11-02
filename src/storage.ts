import {
  DocumentSchema,
  MAX_SOURCE,
  parseDocument,
  type MapDocument,
} from "../shared/document";
import { z } from "zod";
const KEY = "mermeid-flex-library-v1";
export interface LocalMap {
  document: MapDocument;
  revision: number;
  dirty: boolean;
}
export function readLibrary(): LocalMap[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const values: unknown = JSON.parse(raw);
  if (!Array.isArray(values) || values.length > 100)
    throw new Error(
      "Biblioteca local inválida. Exporte o armazenamento antes de restaurar.",
    );
  return values.map((v) => {
    const document = DocumentSchema.extend({
      source: z.string().max(MAX_SOURCE),
    }).parse(v.document); // Preserve temporarily invalid or empty Mermaid drafts.
    return {
      document,
      revision:
        Number.isInteger(v.revision) && v.revision >= 0 ? v.revision : 0,
      dirty: v.dirty !== false,
    };
  });
}
export function writeLibrary(items: LocalMap[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
export function validateImport(text: string): MapDocument {
  return parseDocument(JSON.parse(text));
}
let accessToken = "";
export function setToken(value: string) {
  accessToken = value;
}
export function connected() {
  return Boolean(accessToken);
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (options.body) headers.set("Content-Type", "application/json");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers,
      signal: controller.signal,
      credentials: "omit",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        data?.error?.message ?? `Serviço indisponível (${response.status}).`,
      );
    if (!data) throw new Error("Resposta inesperada do servidor.");
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw new Error(
        "A operação demorou demais. Confira a biblioteca antes de tentar salvar novamente.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
