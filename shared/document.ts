import { z } from "zod";
import { PRESETS } from "./styles";

export const MAX_SOURCE = 16000;
export const MAX_DOCUMENT_BYTES = 98304;
export const MODEL = "@cf/meta/llama-3.2-3b-instruct" as const;
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const StyleOverridesSchema = z
  .object({
    background: hex,
    ink: hex,
    palette: z.array(hex).length(6),
    font: z.enum(["sans", "serif", "mono"]),
    fontSize: z.number().min(12).max(26),
    radius: z.number().min(0).max(32),
    lineWidth: z.number().min(1).max(5),
    lineStyle: z.enum(["solid", "dashed", "dotted"]),
    pattern: z.enum(["dots", "grid", "none"]),
    shadow: z.enum(["none", "soft", "offset"]),
    nodeStyle: z.enum(["soft", "outline", "solid"]),
    spacing: z.number().min(20).max(80),
    rootFill: hex,
    rootText: hex,
    rootBorder: hex,
    rootRadius: z.number().min(0).max(80),
  })
  .partial()
  .strict();

/** The application creates the HTML; imported documents can supply only text and these options. */
export const CompositionSchema = z
  .object({
    enabled: z.boolean(),
    layout: z.enum(["studio", "poster", "glass"]),
    subtitle: z.string().max(180),
    showFooter: z.boolean(),
  })
  .strict();
export type CompositionOptions = z.infer<typeof CompositionSchema>;
export const DEFAULT_COMPOSITION: Readonly<CompositionOptions> = Object.freeze({
  enabled: false,
  layout: "studio",
  subtitle: "Ideias que merecem ganhar forma.",
  showFooter: true,
});

/** Safe supported subset; Mermaid performs grammar validation in the browser. */
export function validateSource(source: string): string | null {
  if (source.length > MAX_SOURCE) return "O código excede 16.000 caracteres.";
  const lines = source.replace(/\r/g, "").split("\n");
  const meaningful = lines.filter(
    (l) => l.trim() && !l.trim().startsWith("%%"),
  );
  if (
    !/^(mindmap\b|flowchart\s+(LR|RL|TB|TD|BT)\b|graph\s+(LR|RL|TB|TD|BT)\b)/.test(
      meaningful[0]?.trim() ?? "",
    )
  )
    return "Comece com mindmap ou flowchart LR (também TB, TD, BT ou RL).";
  if (lines.length > 160) return "Use no máximo 160 linhas por mapa.";
  if (
    /%%\s*\{|^\s*---\s*$|(?:^|;)\s*(click|style|classDef|linkStyle)\b|::icon\s*\(|<\s*[a-z/!]|javascript:|data:|https?:\/\/|url\s*\(/im.test(
      source,
    )
  )
    return "HTML, links, ícones externos, diretivas e CSS no código não são permitidos. Use o painel de estilos.";
  return null;
}
export const DocumentSchema = z
  .object({
    format: z.literal("mermeid-flex"),
    version: z.literal(1),
    id: z.uuid(),
    title: z.string().trim().min(1).max(100),
    source: z.string().min(1).max(MAX_SOURCE),
    style: z
      .object({
        presetId: z.enum(PRESETS.map((p) => p.id) as [string, ...string[]]),
        overrides: StyleOverridesSchema,
      })
      .strict(),
    composition: CompositionSchema.optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();
export type MapDocument = z.infer<typeof DocumentSchema>;
/** Keep legacy JSON byte-stable: defaults are resolved for display, never inserted while parsing. */
export function resolveComposition(
  document: Pick<MapDocument, "composition">,
): CompositionOptions {
  return { ...DEFAULT_COMPOSITION, ...document.composition };
}
export function parseDocument(value: unknown): MapDocument {
  const document = DocumentSchema.parse(value);
  const error = validateSource(document.source);
  if (error) throw new Error(error);
  if (
    new TextEncoder().encode(JSON.stringify(document)).byteLength >
    MAX_DOCUMENT_BYTES
  )
    throw new Error("O documento excede 96 KiB.");
  return document;
}
export const DEMO_SOURCE = `mindmap
  root((Universo criativo))
    Explorar
      Repertório visual
      Novas perspectivas
      Fazer perguntas
    Conectar
      Pessoas e ideias
      Encontrar padrões
      Criar relações
    Experimentar
      Pequenos protótipos
      Testar caminhos
      Aprender fazendo
    Compartilhar
      Contar histórias
      Colher feedback
      Evoluir juntos`;
export const TEMPLATES = [
  {
    id: "criativo",
    name: "Universo criativo",
    label: "Criatividade",
    source: DEMO_SOURCE,
  },
  {
    id: "estudos",
    name: "Plano de estudos",
    label: "Aprendizado",
    source: `mindmap
  root((Aprender melhor))
    Organizar
      Definir objetivos
      Reservar tempo
    Compreender
      Leitura ativa
      Mapas mentais
      Explicar conceitos
    Praticar
      Exercícios
      Projetos reais
    Revisar
      Repetição espaçada
      Autoavaliação`,
  },
  {
    id: "projeto",
    name: "Do conceito ao lançamento",
    label: "Projetos",
    source: `flowchart LR
  A[Uma boa ideia] --> B[Pesquisa]
  B --> C[Protótipo]
  C --> D{Funciona?}
  D -->|Sim| E[Lançamento]
  D -->|Ajustar| C
  E --> F[Aprendizados]`,
  },
  {
    id: "produto",
    name: "Estratégia de produto",
    label: "Planejamento",
    source: `mindmap
  root((Próximo produto))
    Pessoas
      Necessidades
      Contexto de uso
    Proposta
      Problema central
      Diferenciais
    Construção
      Escopo inicial
      Recursos
      Cronograma
    Resultados
      Métricas
      Feedback
      Iterações`,
  },
];
export function createDocument(
  title = "Universo criativo",
  source = DEMO_SOURCE,
): MapDocument {
  const now = new Date().toISOString();
  return {
    format: "mermeid-flex",
    version: 1,
    id: crypto.randomUUID(),
    title,
    source,
    style: { presetId: "botanica", overrides: {} },
    composition: { ...DEFAULT_COMPOSITION, enabled: true },
    createdAt: now,
    updatedAt: now,
  };
}
export function extractAIText(value: unknown): string {
  if (
    !value ||
    typeof value !== "object" ||
    !("response" in value) ||
    typeof value.response !== "string"
  )
    throw new Error("A IA retornou uma resposta vazia.");
  let text = value.response.trim();
  const fenced = text.match(/^```(?:mermaid)?\s*\n([\s\S]*?)\n```$/i);
  if (fenced) text = fenced[1].trim();
  const error = validateSource(text);
  if (error) throw new Error(error);
  return text;
}
