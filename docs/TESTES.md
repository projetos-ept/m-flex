# Verificação e testes

## Testes automatizados

```bash
npm ci
npm run build
npm test
npm run test:api
npm run deploy:check
```

`npm test` cobre o contrato JSON, composição opcional e compatibilidade com documentos antigos, entrada insegura, limites, presets, ajustes centrais, edição segura do rótulo central, prompt externo, extração da resposta IA e o endpoint de geração com um binding simulado. O mock existe somente no teste; a aplicação não apresenta respostas simuladas ao usuário. Essa suíte não precisa de conta Cloudflare.

`npm run test:api` cria D1 e R2 **locais e isolados** em `artifacts/api-tests/<uuid>`, aplica a migração e inicia um Worker temporário em `127.0.0.1:8790`. Valida autenticação, origem, CRUD, controle de revisão, limites de corpo, snapshots, falhas e 20 gravações concorrentes. Confere também a composição persistida no D1, sua preservação no snapshot R2 e documentos antigos sem esse campo. Encerra exclusivamente a árvore de processos que iniciou. Não altera o D1/R2 de desenvolvimento ou produção. A porta pode ser alterada com `TEST_PORT`.

Cada execução mantém seu diretório de evidência, ignorado por Git. Não há limpeza recursiva automática do workspace. Após encerrar os processos de teste, o operador pode remover os diretórios de teste que não precisa mais.

O `deploy:check` cria um bundle em `.worker-build`, sem publicar. Não substitui a configuração de recursos reais nem comprova acesso aos bindings remotos.

## Verificação da versão 1.2.0

Validação local em 2026-11-02: **123 testes unitários e 35 verificações de API passaram**, além do typecheck e build Vite. Os testes de API confirmam que D1 e snapshot R2 preservam o estilo completo, inclusive os quatro ajustes centrais. O build emitiu os avisos de comentários `@__PURE__` da dependência Zod já descritos na versão anterior.

Na prévia de desenvolvimento, o prompt copiado foi comparado com o texto exibido: conteúdo idêntico, 10.052 caracteres no cenário testado, tema e schema presentes e sem a chave local de teste. O modelo JSON do prompt foi renderizado como mindmap de 13 nós. Não foi chamada nenhuma IA externa; a obediência de um modelo externo não foi avaliada.

O nó central foi alterado para “Minha ideia principal”, fundo `#473373`, borda `#d1a95c` e raio 30, mantendo os 17 nós e o título do projeto. Cores e texto foram conferidos em HTML e SVG. O botão direto exportou um arquivo JSON, que foi baixado e reimportado pela interface com os ajustes preservados. Código de tipo não suportado bloqueou a exportação JSON com orientação para corrigir a fonte ou guardar `.mmd`.

A interface foi conferida no desktop (1280 × 800) e o diálogo central no viewport móvel (390 × 844), sem transbordamento horizontal. A alternativa de cópia manual está implementada, mas a recusa da Clipboard API não foi simulada. As verificações visuais desta versão ocorreram no servidor de desenvolvimento; permanece pendente o teste sob a CSP do Worker. Não houve publicação remota nem alteração de recursos Cloudflare. As evidências 1.0.0/1.1.0 abaixo são históricas.

Roteiro para regressões futuras (não representa uma lista integralmente executada):

1. Use Importar JSON e Exportar JSON diretamente no editor. A exportação deve exigir a prévia válida do código atual; um rascunho inválido continua exportável como `.mmd`.
2. Abra Copiar prompt IA e confira tema inicial igual ao título atual, limite de 2.000 caracteres, prévia somente leitura, cópia pela Clipboard API e seleção manual quando a cópia for recusada.
3. Confira o modelo JSON do prompt com `parseDocument`: UUID/datas novos, estilos/composição preservados, incluindo subtítulo e quatro tokens centrais; fonte e ID atuais e chave do espaço não devem aparecer. Tema com delimitadores adversariais deve continuar uma string JSON.
4. Importe um JSON válido gerado a partir do modelo e confira aparência/rótulos. JSON desconhecido, campos extras ou Mermaid inválido devem ser recusados sem substituir o mapa atual. Esse teste não prova obediência de um serviço externo de IA.
5. Personalize rótulo, fundo, texto, borda e arredondamento central. Confira preservação dos ramos/formas, independência do título, contraste automático, limites dos tokens e restauração somente dos ajustes centrais.
6. Confira mindmap em HTML e SVG e um fluxograma: cores no primeiro nó, formas especiais preservadas e edição do rótulo pelo código. Exporte/reimporte JSON e compare os tokens; abra também um documento legado sem eles.
7. Reexecute build, testes, auditoria e dry run conforme necessário. Verifique downloads e Clipboard API no build servido pelo Worker; testes de desenvolvimento não comprovam comportamento sob sua CSP.

## Evidência de interface da versão 1.0.0

Realizadas na prévia local com navegador na preparação da versão 1.0.0. Este registro é histórico e não comprova a nova camada HTML:

- Renderização Mermaid de exemplo com 17 nós.
- Seleção dos **36 presets**, conferindo nome ativo e presença dos nós após cada renderização.
- Ajustes de tipografia e conexões; correção do alinhamento do nó central.
- Conexão com Worker local por chave de teste e confirmação de salvamento no D1 pela interface.
- Importação do exemplo JSON com criação de nova cópia local.
- Geração do PNG pelo canvas e disponibilização de link de download.
- PNG decodificado como imagem de 2265 × 1059 e SVG independente de 1132 × 529 no build com CSP servido pelo Worker local.
- Fluxograma renderizado com 6 nós; código inválido preserva a prévia anterior e bloqueia exportação de imagem.
- Layout responsivo em viewport de 390 × 844, com editor abaixo do mapa.

Naquela etapa, o navegador de inspeção não confirmou o evento de gravação do arquivo PNG no sistema operacional. A interface mantém um link explícito para download por gesto do usuário. O resultado da rasterização é mostrado também como prévia. Não confunda “imagem gerada” com confirmação de arquivo recebido pelo usuário. Os downloads da versão 1.1.0 foram verificados separadamente, conforme o registro abaixo.

## Verificação da composição na versão 1.1.0

Resultados obtidos em 2026-11-01:

| Verificação | Resultado |
| --- | --- |
| Testes unitários | **34 passaram**, incluindo contrato de composição e compatibilidade |
| TypeScript | Verificação de tipos aprovada |
| Build Vite | Aprovado; emitiu avisos sobre comentários `@__PURE__` do Zod, sem impedir a compilação |
| Integração local da API | **33 verificações passaram**, incluindo persistência D1, snapshot R2, documento legado e cotas concorrentes |
| Auditoria npm | **Zero vulnerabilidades conhecidas** na consulta de todas as dependências, incluindo desenvolvimento |

Na interface servida pelo ambiente de desenvolvimento, foram verificados os três layouts — Estúdio, Pôster e Glass — com 17 cartões no mapa de exemplo, além do tema Meia-noite. Um fluxograma de quatro nós preservou losango e círculo em SVG; somente seus nós retangulares receberam cartões HTML.

O PNG Estúdio foi baixado e aberto como arquivo de **2418 × 1612 px**. O PNG Pôster foi gerado e decodificado na prévia do navegador, com **2458 × 1676 px**, após deixar o editor em zoom de 73%. Essas dimensões correspondem a 2× a composição natural de 1229 × 838, confirmando que a exportação usa o conteúdo completo, não o recorte do viewport.

O HTML independente foi baixado e aberto por um servidor estático, sem o editor. A inspeção do DOM confirmou **17 cartões, nenhum script e nenhuma referência a recurso externo**; a composição tinha 806 px de altura. Esse teste confirma a estrutura e a apresentação do arquivo nesse navegador, não uma certificação de todos os navegadores ou políticas corporativas.

Também foram conferidos título e subtítulo com `&` e sinais `< >` tratados como texto, ocultação do rodapé, persistência após recarregar, alternância HTML/SVG e bloqueio de PNG/HTML/SVG quando o código é inválido. No viewport móvel de 390 × 844, a página não apresentou transbordamento horizontal. O dry run do Worker passou (795,61 KiB; 128,72 KiB comprimidos), sem publicação.

Essas verificações de interface foram feitas em desenvolvimento. A automação do navegador recusou a abertura de `http://127.0.0.1:8787/` por política de URL; por isso, o teste visual com CSP do Worker permanece pendente. O build e a API local foram verificados separadamente, mas isso não comprova a captura HTML sob os cabeçalhos de produção.

### Roteiro de regressão da composição

Os itens abaixo são critérios para novas verificações, inclusive no build servido pelo Worker; não representam uma lista integralmente executada:

1. Abra um mapa antigo sem `composition` e confirme o modo SVG; crie outro e confirme que Composição HTML começa ligada.
2. Selecione Estúdio, Pôster e Glass em mindmap e flowchart. Confira posições dos cartões, conexões, título, subtítulo e rodapé, inclusive com preset escuro e fonte alternativa.
3. Altere o título, use subtítulo de 180 caracteres e oculte o rodapé. Confira atualização da prévia e persistência após recarregar.
4. Exporte e importe JSON e compare todos os campos de composição; confirme rejeição de layout desconhecido, subtítulo acima do limite, tipos incorretos e campos adicionais.
5. Exporte PNG após ampliar e arrastar a prévia. Abra a imagem fora do editor e confirme a composição completa, sem controles da interface, em até 2× e lado máximo de 4096 px.
6. Exporte HTML e abra-o como arquivo independente. Confira título, cartões, conexões, fundo e rodapé; verifique ausência de scripts, requisições externas e chave do espaço.
7. Exporte SVG do mesmo mapa e confirme que contém o diagrama vetorial, sem prometer a camada de cartões e moldura HTML.
8. Introduza erro Mermaid e confira que exportações visuais não usam silenciosamente uma prévia antiga. Restaure o código e confirme recuperação.
9. Teste rótulos com caracteres especiais, formas Mermaid suportadas e nós que mantenham fallback SVG. Em fluxogramas, losangos, círculos e demais formas especiais devem continuar em SVG. Texto deve permanecer texto, sem executar HTML.
10. Salve no D1, crie e recupere snapshot R2; compare a configuração de composição. Confira também controles por teclado e viewport móvel.

## Regressão manual recomendada

1. Edite um mindmap válido e depois introduza erro de sintaxe: a última prévia deve permanecer com aviso e exportações de imagem/JSON bloqueadas.
2. Restaure o código e confira a liberação de exportação.
3. Teste modelos mindmap e flowchart, 36 estilos e ajustes personalizados.
4. Exporte JSON, importe em outro navegador e compare fonte/preset/overrides/composição; o ID importado deve ser novo.
5. Exporte SVG, PNG e HTML e abra-os fora da aplicação, conferindo texto, fundo, conexões e sombras conforme o escopo de cada formato.
6. Recarregue a página e confirme o rascunho local; a chave de acesso deve ser esquecida.
7. Abra a mesma revisão D1 em duas sessões e salve nas duas: a segunda escrita com revisão antiga deve receber 409.
8. Crie snapshot, altere o D1 e recupere snapshot: a cópia recuperada deve refletir o instante do snapshot.
9. Inspecione navegação por teclado, zoom, arrasto e layout em desktop e celular.
10. Em uma implantação real, faça uma geração IA curta e confira métricas/CPU/cotas no painel Cloudflare.

## O que testes locais não comprovam

Não houve implantação em uma conta Cloudflare nem inferência remota real durante a criação do projeto. Portanto não foram medidos latência global, consumo efetivo de Neurons, CPU do Workers Free, faturamento, disponibilidade do modelo, provisão de recursos ou permissões da conta do operador. Esses pontos precisam da validação pós-deploy em [DEPLOY.md](DEPLOY.md).

Não há promessa de equivalência pixel a pixel entre sistemas, porque fontes e rasterização dependem do navegador/sistema. A captura HTML também depende de SVG `foreignObject` e dos limites de memória/data URI do navegador; consulte a [documentação de html-to-image](https://github.com/bubkoo/html-to-image). O lockfile fixa as versões JavaScript. Refaça a verificação visual após atualizar Mermaid, DOMPurify ou html-to-image.

## Dependências e manutenção

Resultado histórico da versão 1.0.0: **22 testes unitários e 29 verificações de integração passaram**, além do build TypeScript/Vite e dry run do Worker. Naquela preparação, a auditoria das dependências de produção retornou zero alertas conhecidos após a correção transitiva. Os resultados históricos da versão 1.1.0 também estão registrados acima; repita os comandos após qualquer atualização.

Use `npm audit` para consultar todas as dependências ou `npm audit --omit=dev` para restringir a produção. Um override fixa KaTeX 0.18.2 para corrigir o alerta transitivo GHSA-238p-pmpm-9mq7 encontrado na dependência de Mermaid durante a preparação. Reavalie esse override quando Mermaid atualizar sua própria faixa compatível. Ausência de alertas conhecidos não substitui revisão de segurança.
