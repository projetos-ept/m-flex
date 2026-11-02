# Formato portátil JSON v1

O contrato é definido por `shared/document.ts`. O arquivo `schemas/mermeid-flex.v1.schema.json` é gerado desse contrato por `npm run schema`; não o edite isoladamente. O exemplo pronto está em `examples/universo-criativo.json`.

## Estrutura

```json
{
  "format": "mermeid-flex",
  "version": 1,
  "id": "3bd6ace8-c861-4c53-9cf2-4e733af0c9cd",
  "title": "Minha ideia",
  "source": "mindmap\n  root((Minha ideia))\n    Criar\n    Aprender",
  "style": {
    "presetId": "botanica",
    "overrides": {
      "fontSize": 18,
      "lineStyle": "dashed",
      "rootFill": "#263b32",
      "rootText": "#ffffff",
      "rootBorder": "#699c73",
      "rootRadius": 28
    }
  },
  "composition": {
    "enabled": true,
    "layout": "studio",
    "subtitle": "Conexões para transformar ideias em ação",
    "showFooter": true
  },
  "createdAt": "2026-10-07T00:00:00.000Z",
  "updatedAt": "2026-10-07T00:00:00.000Z"
}
```

Todos os campos de primeiro nível são obrigatórios, exceto `composition`, acrescentado na versão 1.1.0 do aplicativo. `overrides` pode ser vazio. Campos desconhecidos são recusados no documento, no estilo, nos ajustes e na composição; não são silenciosamente ignorados.

| Campo | Restrição |
| --- | --- |
| `format` | Literal `mermeid-flex` |
| `version` | Inteiro literal `1` |
| `id` | UUID válido |
| `title` | 1 a 100 caracteres após trim |
| `source` | 1 a 16.000 caracteres, subconjunto permitido de Mermaid |
| `style.presetId` | Um dos 36 IDs em [ESTILOS](ESTILOS.md) |
| `style.overrides` | Apenas tokens conhecidos, nos limites documentados |
| `style.overrides.rootFill`, `rootText`, `rootBorder` | Opcionais, cores `#RRGGBB` do centro; adicionados no aplicativo 1.2.0 |
| `style.overrides.rootRadius` | Opcional, número de 0 a 80 para o arredondamento central |
| `composition` | Objeto opcional; quando presente, os quatro campos abaixo são obrigatórios |
| `composition.enabled` | Booleano: usa a camada HTML quando `true` |
| `composition.layout` | `studio`, `poster` ou `glass` |
| `composition.subtitle` | Texto de 0 a 180 caracteres |
| `composition.showFooter` | Booleano: exibe ou oculta o rodapé da composição |
| `createdAt`, `updatedAt` | Data/hora ISO 8601 UTC terminada em `Z` |

## Validação em camadas

1. O importador recusa arquivos maiores que 96 KiB antes de ler.
2. JSON inválido não altera o mapa aberto.
3. Zod valida a estrutura, enumerações, tipos e limites dos tokens.
4. `parseDocument` verifica conteúdo Mermaid permitido e tamanho UTF-8 do documento serializado.
5. O navegador renderiza com o parser Mermaid real; só então adiciona o mapa à biblioteca.

JSON Schema cobre o passo 3, mas não substitui os passos 4 e 5. O backend aplica 3 e 4, sem importar o motor gráfico Mermaid para manter o Worker pequeno. Portanto a API pode armazenar um texto dentro do subconjunto permitido mas com sintaxe Mermaid incorreta; a interface sinalizará esse erro ao renderizar. Clientes externos devem validar gramática.

A partir do aplicativo 1.2.0, a exportação JSON pela interface também exige uma prévia válida do código atual. Não é suficiente passar apenas pelo schema e pelo filtro de conteúdo. Use `.mmd` para guardar um rascunho sintaticamente incompleto.

## Identidade e portabilidade

O exportador preserva o ID do documento. A interface de **importação cria um novo UUID e novas datas**, mantendo título, código, preset, overrides e composição quando presente. Isso evita sobrescrever mapas locais/remotos e não implica perda das opções visuais. Duas importações do mesmo arquivo criam duas cópias.

Revisão do D1, chave de acesso, informações de faturamento, zoom e posição do viewport não fazem parte do formato. O estilo resolvido resulta de preset + overrides. A fidelidade exata exige a mesma versão dos presets e de Mermaid; o `package-lock.json` fixa as dependências deste release. Se futuramente alterar a aparência de um preset existente, trate como mudança de compatibilidade visual ou gere outro ID.

## Compatibilidade da composição

O número do formato permanece `1`: a versão 1.1.0 amplia o contrato com uma propriedade opcional. O leitor novo aceita arquivos v1 antigos sem migração e trata a ausência de `composition` como modo SVG, preservando a apresentação anterior. Mapas recém-criados recebem a composição habilitada por padrão. D1 e R2 persistem o mesmo JSON; não precisam de uma nova migração SQL para esse campo.

Essa ampliação **não torna o leitor antigo compatível com arquivos novos**. A validação estrita da versão 1.0.0 rejeita `composition`, mesmo quando `enabled` é `false`. Para abrir nela um documento novo, remova a propriedade inteira de uma cópia do JSON. Isso remove as opções da composição e conserva fonte Mermaid, título e estilo; mantenha o original para preservar o projeto completo. Atualize frontend e Worker juntos: um Worker 1.0.0 também recusa o campo.

O HTML exportado é uma apresentação pronta; não é um formato de importação nem substitui o contrato JSON. Rótulos e subtítulo são texto. Não use `composition` para enviar HTML, seletores CSS, JavaScript ou URLs.

## Compatibilidade dos ajustes centrais

O aplicativo 1.2.0 acrescenta quatro campos opcionais em `style.overrides`: `rootFill`, `rootText`, `rootBorder` e `rootRadius`. Sem eles, o centro conserva os valores herdados do estilo e o contraste automático. Não são inseridos ao ler um JSON antigo. O rótulo central permanece em `source`; não existe uma nova propriedade JSON para esse texto.

Leitores e Workers 1.0.0/1.1.0 recusam esses campos por validação estrita. Para usar uma cópia do documento em uma versão antiga, remova os quatro campos de `style.overrides`; para 1.0.0, remova também `composition`. Isso perde apenas essas personalizações na cópia. Preserve o original e atualize frontend e Worker juntos para mantê-las. O formato continua `version: 1`; a persistência em D1/R2 não exige migração SQL.

## JSON solicitado a uma IA externa

Copiar prompt IA usa o schema real, um modelo validado com UUID/datas novos e os ajustes visuais atuais. A instrução pede que apenas `title` e `source` sejam alterados, sem novos campos; `source` deve conter um mindmap. O tema é uma string JSON escapada, separada do contrato. O modelo do pedido é válido, mas isso não prova que a resposta de outro modelo será válida: importe o arquivo para executar todas as camadas de validação e revise seu conteúdo.

## Evolução

Versões diferentes de 1 são recusadas com mensagem de validação. Não há migração automática de versões futuras, mapas de outros produtos ou JSON arbitrário. Para adicionar v2, crie schema e conversor explícitos e teste a importação de arquivos antigos. Nunca interprete campos de JSON como JavaScript, CSS ou URL de API.
