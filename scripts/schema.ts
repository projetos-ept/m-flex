import { z } from "zod";
import { writeFileSync, mkdirSync } from "node:fs";
import { DocumentSchema, createDocument } from "../shared/document";
mkdirSync("schemas", { recursive: true });
mkdirSync("examples", { recursive: true });
const schema = z.toJSONSchema(DocumentSchema);
writeFileSync(
  "schemas/mermeid-flex.v1.schema.json",
  JSON.stringify(
    {
      ...schema,
      title: "Mermeid-flex document v1",
      description:
        "Estrutura do projeto. Validações adicionais de conteúdo Mermaid e tamanho UTF-8 são aplicadas por parseDocument.",
    },
    null,
    2,
  ) + "\n",
);
const sample = createDocument();
sample.id = "3bd6ace8-c861-4c53-9cf2-4e733af0c9cd";
sample.createdAt = sample.updatedAt = "2026-10-07T00:00:00.000Z";
writeFileSync(
  "examples/universo-criativo.json",
  JSON.stringify(sample, null, 2) + "\n",
);
console.log("JSON Schema e exemplo atualizados.");
