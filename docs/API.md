# Contrato HTTP da API v1

Base: a mesma origem do frontend, prefixo `/api`. Solicitações e respostas usam UTF-8 e JSON. Não há CORS público. Respostas incluem `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` e CSP restritiva.

## Autenticação

Todas as rotas, exceto `GET /api/health`, exigem:

```http
Authorization: Bearer <APP_ACCESS_TOKEN>
```

Chave de 32 a 256 caracteres, idealmente 32 bytes aleatórios em hexadecimal. A API compara hashes SHA-256, sem persistir o token no D1. Um cabeçalho `Origin`, quando presente, deve corresponder à origem da URL da requisição. Não envie cookies; o cliente usa `credentials: omit`. Pré-flight externo não recebe autorização CORS.

O limite do corpo JSON é 100 KiB (102.400 bytes), verificado por Content-Length quando informado e durante leitura do stream. O documento em si não pode ultrapassar 96 KiB serializado. Corpos recebidos pelo parser devem ter `Content-Type: application/json`; callbacks de snapshot POST e DELETE não usam corpo.

## Rotas

| Método | Caminho | Cota | Resultado |
| --- | --- | --- | --- |
| GET | `/health` | Nenhuma interna | Status, versão, presença de configuração e flag IA |
| GET | `/status` | `read` | Flags, modelo, dia, limites e contadores |
| GET | `/maps` | `read` | Até 100 metadados, atualização mais recente primeiro |
| GET | `/maps/:uuid` | `read` | Documento e revisão |
| PUT | `/maps/:uuid` | `write` | Cria/atualiza com revisão condicional |
| DELETE | `/maps/:uuid` | `write` | Exclui mapa por revisão e tenta remover snapshot |
| POST | `/maps/:uuid/snapshot` | `r2` | Substitui snapshot pela versão atual do D1 |
| GET | `/maps/:uuid/snapshot` | `r2` | Documento e revisão do snapshot R2 |
| POST | `/ai/generate` | `ai` | Código Mermaid sugerido pelo Workers AI |

Não há paginação: o espaço tem máximo de 100 registros e a lista retorna apenas metadados. Não há rota de upload arbitrário ou listagem pública R2.

## Documentos e revisões

O objeto `document` segue [FORMATO-JSON](FORMATO-JSON.md), incluindo o campo opcional `composition` a partir do aplicativo 1.1.0 e os ajustes opcionais `rootFill`, `rootText`, `rootBorder` e `rootRadius` em `style.overrides` a partir de 1.2.0. A API guarda e devolve essas configurações, sem renderizar HTML ou aceitar um corpo HTML. Exportações PNG/SVG/HTML e Copiar prompt IA são locais ao navegador e não têm endpoint próprio. O campo `source` continua contendo o rótulo central; não há propriedade separada para esse texto.

Para criar um mapa:

```http
PUT /api/maps/3bd6ace8-c861-4c53-9cf2-4e733af0c9cd
Content-Type: application/json
Authorization: Bearer <chave>
```

```json
{
  "document": {
    "format": "mermeid-flex",
    "version": 1,
    "id": "3bd6ace8-c861-4c53-9cf2-4e733af0c9cd",
    "title": "Minha ideia",
    "source": "mindmap\n  root((Minha ideia))\n    Primeiro ramo",
    "style": { "presetId": "botanica", "overrides": {} },
    "createdAt": "2026-10-07T00:00:00.000Z",
    "updatedAt": "2026-10-07T00:00:00.000Z"
  },
  "baseRevision": 0
}
```

Sucesso `201`: `{ "document": <documento com updatedAt do servidor>, "revision": 1 }`.

Para atualizar, envie o mesmo ID e a última revisão recebida em `baseRevision`. Sucesso `200`, revisão incrementada. Criação duplicada, revisão antiga, atualização de mapa inexistente ou limite de 100 mapas retornam `409 CONFLICT`; a API não tenta mesclar documentos. O cliente deve reler ou salvar como novo UUID.

`GET /maps/:uuid` retorna `{document, revision}`. `GET /maps` retorna:

```json
{
  "maps": [{ "id": "…", "title": "Minha ideia", "revision": 2, "updated_at": "2026-10-07T12:00:00.000Z" }],
  "maxMaps": 100
}
```

Para excluir, use `If-Match: 2` (o número inteiro, não uma ETag entre aspas). Sem revisão, retorna 428. A revisão condicional é exigida também no DELETE. Sucesso: `{deleted:true,snapshotDeleted:true}`. Se a remoção D1 funcionou mas R2 falhou: `{deleted:true,snapshotDeleted:false}`; o operador deve remover o objeto residual. Não repita a exclusão D1 esperando recuperar esse registro.

## Snapshots

POST não aceita um documento do cliente: lê o D1. Retorna `{saved:true,revision:2}`. GET retorna `{document,revision}`. A revisão pode ser antiga em relação ao D1; cabe ao cliente decidir como recuperar. O frontend sempre cria uma cópia local com novo UUID.

## Geração IA

```json
{ "prompt": "Crie um mapa mental sobre criatividade na educação, com práticas e formas de avaliação." }
```

`prompt` exige 10 a 3.000 caracteres após trim. Campos adicionais são recusados. Sucesso:

```json
{
  "source": "mindmap\n  root((Criatividade))\n    Práticas\n      Experimentação",
  "model": "@cf/meta/llama-3.2-3b-instruct"
}
```

A validação do servidor é de conteúdo permitido e tamanho, não uma execução de Mermaid. O consumidor externo deve executar um parser Mermaid antes de renderizar. A interface faz essa segunda validação. A geração não cria documento D1 nem snapshot.

## Status e cotas

`/status` retorna `aiEnabled`, `r2Enabled`, `model`, `day` (`YYYY-MM-DD` UTC), `limits` e `usage` (`[{category,used}]`). Categorias ainda não usadas podem não aparecer em `usage`; isso equivale a zero. O status consome uma leitura interna e aparece nesse contador. Não são métricas de faturamento da conta.

## Erros

```json
{ "error": { "code": "CONFLICT", "message": "A versão na nuvem mudou. …" } }
```

Erros de estrutura podem incluir `details: [{path,message}]`, sem o valor recebido. A interface mostra `message`. Não dependa de texto localizado para tratar erros; use `code` e status HTTP.

| Status | Códigos principais |
| --- | --- |
| 400 | `INVALID_JSON`, `VALIDATION`, `ID_MISMATCH` |
| 401 | `UNAUTHORIZED` |
| 403 | `ORIGIN` |
| 404 | `NOT_FOUND`, `SNAPSHOT_NOT_FOUND` |
| 405 | `METHOD` |
| 409 | `CONFLICT` |
| 413 | `BODY_LIMIT`, `SNAPSHOT_LIMIT` |
| 415 | `CONTENT_TYPE` |
| 428 | `REVISION_REQUIRED` |
| 429 | `DAILY_LIMIT`, com `Retry-After` até a próxima meia-noite UTC |
| 502 | `AI_UNAVAILABLE`, `AI_INVALID_OUTPUT` |
| 503 | `NOT_CONFIGURED`, `D1_UNAVAILABLE`, `R2_UNAVAILABLE`, `AI_DISABLED`, `SERVICE_ERROR` |

Uma rota desconhecida exige autenticação antes do 404, exceto `/health`. Cotas reservadas antes de uma operação não são reembolsadas em falhas posteriores. Após timeout de escrita, releia o mapa: a operação pode ter sido concluída no servidor mesmo que a resposta não tenha chegado.
