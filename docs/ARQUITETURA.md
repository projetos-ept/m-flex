# Arquitetura

## Componentes

```text
Navegador
  ├─ Vite/TypeScript compilados, Mermaid, DOMPurify, html-to-image e ícones locais
  ├─ localStorage: biblioteca e rascunhos
  └─ HTTPS, mesma origem
       ├─ Static Assets: HTML, JS, CSS e ícone
       └─ /api/* → Worker TypeScript
                     ├─ DB → Cloudflare D1
                     ├─ SNAPSHOTS → Cloudflare R2 privado
                     └─ AI → Cloudflare Workers AI
```

O frontend não usa SSR. Estilos, diagramação, sanitização do SVG e conversão PNG acontecem no cliente. O Worker processa autenticação, JSON e pequenas consultas: não importa Mermaid, não rasteriza imagens e não precisa de Node em produção. Essa separação evita executar tarefas gráficas no orçamento de CPU do Workers Free.

## Camada de composição e exportação

O renderizador mantém o SVG Mermaid sanitizado como fonte da geometria e da exportação vetorial. Quando `composition.enabled` está ativo, cria uma árvore HTML para título, subtítulo, acabamento e cartões posicionados nos nós do diagrama. As conexões continuam em SVG. Em fluxogramas, a conversão se restringe a nós retangulares: círculos, losangos e outras formas com significado próprio permanecem em SVG. Dados não convertíveis com segurança também preservam seus nós SVG. Estúdio, Pôster e Glass usam a mesma fonte Mermaid e os mesmos tokens dos 36 presets.

A composição não é um segundo parser Mermaid e não aceita HTML de entrada. O documento armazena apenas a configuração validada: ativação, layout enumerado, subtítulo e rodapé. Documentos antigos sem esse objeto permanecem no modo SVG. As posições dos cartões são recalculadas e não são persistidas.

PNG captura o elemento completo da composição por [html-to-image](https://github.com/bubkoo/html-to-image), em escala independente do viewport, até 2× e com lado máximo de 4096 px. O processo ocorre inteiramente no cliente. HTML exporta uma página independente com a composição, CSS e SVG incorporados, sem scripts ou chamadas de rede. SVG exporta o diagrama original estilizado, sem a camada HTML. JSON permanece o contrato para edição e persistência.

Essa camada não cria endpoints, objetos de imagem R2, serviços de captura ou novas operações de IA. D1 e snapshots R2 continuam guardando JSON. O consumo Cloudflare só muda conforme o volume normal de salvamentos/leitura; nenhum serviço adicional é necessário.

`assets.run_worker_first` restringe a execução prioritária a `/api` e `/api/*`. As demais rotas usam Static Assets e fallback SPA. Respostas API desconhecidas são JSON 404, nunca o HTML do frontend. `_headers` protege assets; a API define cabeçalhos diretamente, porque regras de assets não se aplicam automaticamente à resposta de código Worker.

## Estado e fluxo de edição

1. A página recupera a biblioteca `mermeid-flex-library-v1` do `localStorage`.
2. Na primeira visita, cria um exemplo com UUID.
3. Mudanças recebem `updatedAt` local e salvamento após 350 ms; Mermaid atualiza após 360 ms sem novas edições.
4. A fila serializa renderizações porque a configuração Mermaid é global. Um contador impede uma resposta antiga de substituir uma prévia mais recente.
5. Se a sintaxe falhar, o rascunho permanece e a última prévia válida é mantida com aviso. Exportações visuais ficam bloqueadas até nova renderização válida.
6. Exportar JSON exige que a prévia do código atual esteja válida e executa validação do contrato e do subconjunto seguro; `.mmd` preserva texto, inclusive enquanto está inválido.

A biblioteca local comporta 100 mapas. Código inválido ou vazio pode existir como rascunho, mas não é um documento portátil válido. Não há salvamento automático no D1. A chave de acesso só existe em memória e é perdida ao recarregar.

Os ajustes centrais são quatro tokens opcionais em `style.overrides`, resolvidos por `resolveRootStyle`. A edição do rótulo usa `shared/central-node.ts` para substituir somente seu trecho na fonte de um mindmap reconhecido, preservando os demais bytes. O frontend valida a nova fonte com Mermaid antes de aplicá-la. Fluxogramas mantêm a edição textual pelo código.

## Persistência D1 e revisões

Tabela `maps`: UUID, título, documento JSON, revisão inteira e data de atualização. O título é duplicado como coluna para listar sem carregar todos os documentos. O índice `maps_updated` atende a ordenação da biblioteca, e buscas por ID usam chave primária.

- Criar: `baseRevision:0`, `INSERT … SELECT` com limite de 100 registros e conflito ignorado na chave. A contagem e a criação pertencem à mesma instrução SQL.
- Atualizar: `UPDATE … WHERE id=? AND revision=? RETURNING revision`. Se nenhum registro corresponde, retorna 409. Não há leitura seguida de gravação sem condição.
- Excluir: exige revisão em `If-Match`, com `DELETE … WHERE id=? AND revision=? RETURNING id`.
- `updatedAt` é definido no servidor ao salvar; não é mecanismo de concorrência.

Uma resposta atrasada de salvamento só marca o documento local como sincronizado se seu conteúdo ainda coincidir com o enviado. Se o usuário continuou digitando, a revisão é atualizada e o novo rascunho permanece pendente.

O cliente conserva a revisão em armazenamento local. JSON portátil deliberadamente não inclui revisão do D1. Importações e recuperações R2 recebem novo ID para não sobrescrever um documento remoto.

## Snapshots R2

`POST /api/maps/:id/snapshot` lê o JSON já salvo no D1 e escreve `snapshots/<uuid>.json`. Metadados guardam a revisão. Há uma chave substituível por mapa, sem histórico ilimitado. `GET` verifica a existência do mapa no D1 antes de ler o objeto. O bucket nunca é servido publicamente.

Não existe transação distribuída entre D1 e R2. Um snapshot representa a revisão lida no início da operação, não necessariamente a mais recente ao concluir. Duas criações concorrentes de snapshot seguem a ordem de conclusão das gravações R2. Exclusões removem primeiro o registro D1 e depois o objeto; falha parcial é reportada. O frontend recupera como nova cópia local para evitar aplicar automaticamente um snapshot antigo.

## IA e contenção de consumo

O servidor recebe somente o tema de até 3.000 caracteres, reserva uma tentativa diária no D1 e chama `env.AI.run` com o modelo fixado, instrução de sistema, saída limitada a 1.200 tokens e temperatura 0,35. Não há ferramentas de agente, busca web ou chamadas a outros provedores. O browser não escolhe modelo, URL de API, limite de tokens ou instrução de sistema.

O resultado é extraído de `response`, com remoção apenas de uma cerca Markdown externa completa. O backend valida limites e subconjunto seguro. O navegador executa a gramática real do Mermaid antes de adicionar o novo mapa. A IA não grava automaticamente em D1 ou R2. Falhas não são repetidas automaticamente e a reserva não é devolvida, para evitar consumo ilimitado por repetição de falhas.

## Prompt para uma IA externa

`shared/external-prompt.ts` prepara texto localmente, sem endpoint ou SDK de outro provedor. O tema tem de 1 a 2.000 caracteres após trim; a interface o inicia com o título atual. O gerador codifica o tema como string JSON e cria um modelo com UUID/datas novos, título/fonte genéricos e os estilos/composição atuais, incluindo subtítulo e ajustes centrais. Valida esse modelo por `parseDocument` e incorpora o JSON Schema produzido de `DocumentSchema`, junto aos IDs de `PRESETS`.

A cópia usa a Clipboard API; quando indisponível ou recusada, a interface seleciona a prévia para cópia manual. Cabe ao usuário colar o texto em outro serviço e importar a resposta como arquivo JSON. Nenhuma chave ou fonte do mapa atual entra no prompt, e o aplicativo não faz inferência nesse fluxo. A validação normal de importação permanece obrigatória; o schema e as instruções não garantem obediência de modelos externos.

Os recursos da versão 1.2.0 não acrescentam bindings, tabelas, migrações ou serviços Cloudflare. O Worker apenas passa a validar os novos tokens opcionais do mesmo documento JSON.

## Cotas atômicas

`quotas` mantém no máximo quatro linhas: `read`, `write`, `r2` e `ai`. Cada linha tem dia UTC e uso. `INSERT … ON CONFLICT … DO UPDATE … WHERE … RETURNING` incrementa apenas abaixo do limite; se o dia muda, substitui o valor por 1. As requisições concorrentes disputam a mesma instrução atômica, sem ler e depois incrementar separadamente.

Consultas autenticadas também reservam cota para reduzir leituras repetitivas. A autenticação é feita antes de acessar D1/R2/IA; um token inválido não consome essas operações. Ainda consome uma invocação Worker. `/health` é público e não consulta bindings para testar conectividade: é apenas um diagnóstico de configuração.

## Decisões e evolução

Não foram adicionados autenticação multiusuário, edição colaborativa, compartilhamento público, uploads arbitrários ou armazenamento de PNG em R2. Esses recursos precisam de novos modelos de autorização, cotas e retenção. O token único é adequado a um espaço pessoal ou pequeno grupo de confiança; não é isolamento multi-tenant.

Para incluir novos diagramas, amplie o validador, os estilos SVG, a conversão de cartões e os testes juntos. Para atualizar Mermaid, mantenha o lockfile e verifique especialmente seletores SVG, geometria dos cartões, alinhamento de texto, sanitização e exportação PNG/HTML.
