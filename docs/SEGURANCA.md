# Segurança e privacidade

## Modelo de confiança

Cada deployment é um único espaço. Quem conhece `APP_ACCESS_TOKEN` pode ler, criar, atualizar e excluir qualquer mapa desse espaço e consumir suas cotas. Não existem identidades individuais, permissões por documento ou auditoria por pessoa. Não distribua essa chave para usuários não confiáveis. Um serviço público com usuários independentes requer autenticação e autorização diferentes.

O frontend é público e a API é privada. A chave do aplicativo não é um token de administração Cloudflare: ela só deve autorizar esta API. A Cloudflare protege seus bindings no runtime; não é necessário entregar credenciais D1, R2 ou Workers AI ao navegador.

## Defesas implementadas

- Autenticação antes de acessar D1/R2/IA. Segredo ausente fecha a API; não existe bypass de produção.
- Bearer token somente em cabeçalho, guardado apenas em memória no cliente. Nunca em query string, cookie, JSON exportado ou localStorage.
- Validação de `Origin` quando presente, nenhuma permissão CORS externa e nenhum uso de cookies de sessão.
- Consultas SQL parametrizadas. IDs aceitos como UUID, sem caminho arbitrário de objeto R2.
- JSON estrito, tamanho limitado também durante a leitura do stream, lista fechada de tokens e modelos.
- Mermaid em `securityLevel: strict`, rótulos SVG de texto, bloqueio de HTML, URLs, diretivas e estilos no código.
- Sanitização adicional por DOMPurify, proibindo links, imagens externas e `foreignObject` no SVG recebido do Mermaid.
- Cartões e textos da composição criados com APIs DOM e texto literal, sem interpretar o conteúdo do mapa como HTML. Layouts enumerados e tokens validados controlam o CSS.
- CSP em produção: scripts e conexões da própria origem; nenhum frame, objeto incorporado ou base URL externa. CSS inline é necessário para SVG/tokens e permitido explicitamente.
- Reserva atômica de cotas antes de operações caras, sem repetição automática da IA.
- Controle de revisão nas escritas D1 para impedir sobrescrita silenciosa.
- Bucket R2 privado por padrão e respostas API não armazenáveis em cache.
- Sem telemetria própria, analytics, pixels externos ou logs de documentos/prompts/tokens no Worker.

CSP `_headers` só vale nos assets servidos pelo runtime Cloudflare/preview Worker. O Vite de desenvolvimento injeta seu cliente HMR e não representa a política de produção. Não exponha Vite, Wrangler local ou seu explorer de desenvolvimento publicamente.

## Composição e arquivos exportados

Composição HTML não libera HTML ou CSS arbitrários na fonte Mermaid ou no JSON. Título, subtítulo e rótulos são inseridos como texto. Os cartões são gerados pelo aplicativo a partir de dados validados e geometria do SVG sanitizado. Não aceite posteriormente HTML fornecido pelo usuário no lugar desses elementos sem redesenhar a política de segurança.

A captura PNG utiliza [html-to-image](https://github.com/bubkoo/html-to-image), que gera internamente um SVG com `foreignObject` a partir da árvore DOM. Esse wrapper de exportação é produzido a partir da composição controlada pelo aplicativo; não autoriza `foreignObject` na entrada Mermaid. A rasterização acontece no navegador, sem enviar o mapa a um serviço de captura.

O HTML independente exportado contém a composição, seu CSS e o SVG necessário, sem scripts ou dependências de rede. Ele não inclui a chave de acesso nem o restante da biblioteca. Continua contendo informação do mapa e pode ser lido por qualquer pessoa com acesso ao arquivo, assim como PNG, SVG e JSON. JSON é o formato de recuperação editável; HTML é uma apresentação estática.

## Prompt copiado para outra IA

Copiar prompt IA gera texto localmente e não chama nenhum provedor. O texto contém o tema, os ajustes de estilo e a composição atual, inclusive seu subtítulo. O tema começa com o título do projeto; revise-o antes de copiar. A fonte Mermaid atual, o ID atual e a chave do espaço não são incluídos. Um novo UUID e novas datas identificam o modelo JSON do pedido.

O tema é codificado como string JSON e tratado como dado não confiável separado das instruções. Isso reduz ambiguidades, mas não prova que um modelo externo resistirá a instruções no tema ou seguirá o contrato. Respostas continuam sendo entrada não confiável: importação aplica schema estrito, filtro de conteúdo e parser Mermaid. Nenhum HTML, script ou novo campo é executado para corrigir uma resposta.

Ao colar o prompt em outro serviço, você compartilha esses dados com o provedor escolhido, conforme suas próprias regras de retenção e uso. O aplicativo não envia o texto automaticamente e não controla a área de transferência depois da cópia. A alternativa manual permanece disponível quando o navegador recusa a Clipboard API.

## Limites dessas defesas

Não há WAF de aplicação, Turnstile ou bloqueio por IP no projeto. Uma chave vazada permite abuso até as cotas internas; tráfego sem chave ainda consome invocações Worker. Use segredo aleatório, monitore uso e rotacione após suspeita de exposição. Controle por rede/Cloudflare Access pode ser adicionado pelo operador, mas não faz parte do requisito mínimo entregue.

O validador de código é uma barreira de conteúdo permitido, não um parser de gramática ou uma prova formal de segurança. Mermaid e DOMPurify devem ser mantidos atualizados, com testes de exportação e de entrada hostil. Conteúdo da IA é tratado como não confiável.

Rascunhos no localStorage e mapas D1/R2 não têm criptografia de ponta a ponta controlada pelo usuário. Quem tem acesso ao perfil do navegador, à chave do espaço ou à conta Cloudflare pode acessar os dados correspondentes. Não use este modelo como cofre de segredos. O conteúdo de um tema enviado pela geração integrada deixa o dispositivo e é processado pela Cloudflare.

O aplicativo não implementa sincronização multiaba de localStorage. Um rascunho corrompido impede a leitura e bloqueia sua substituição automática pela aplicação; os bytes existentes são preservados. Exporte seu trabalho e faça uma cópia dos dados do site antes de intervenção manual.

## Política de segredos e operação

Arquivos `.dev.vars`, `.env*`, `.wrangler`, logs e dependências não entram no pacote de distribuição. `.dev.vars.example` contém um token público **somente de desenvolvimento**. Configure um segredo aleatório distinto em cada deployment.

Não guarde o token do espaço em captures de tela, tickets ou exemplos de produção. Não publique objetos R2 com mapas privados. Ativar logs/observabilidade na conta exige revisar quais caminhos, cabeçalhos e informações serão retidos pelo operador.

As exclusões têm confirmação na interface e controle de revisão no servidor. Não existe lixeira remota. O JSON exportado é o mecanismo mais simples de portabilidade e recuperação independente; mantenha cópias em local confiável.
