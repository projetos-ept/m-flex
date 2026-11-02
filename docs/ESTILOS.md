# Estilos e personalização

Os 36 presets vivem em `shared/styles.ts`. Cada um reúne tokens de paleta, fundo, texto, tipografia, conexão, textura e tratamento dos nós. Nenhum preset exige download externo, fonte web, imagem de terceiros ou IA.

## Catálogo

| Família | Presets (nome → ID) |
| --- | --- |
| Orgânicos | Botânica → `botanica`; Floresta → `floresta`; Terracota → `terracota`; Oceano → `oceano`; Deserto → `deserto`; Sálvia → `salvia` |
| Pastéis | Lavanda → `lavanda`; Algodão → `algodao`; Sorvete → `sorvete`; Matcha latte → `matcha`; Aurora → `aurora`; Pêssego → `pessego` |
| Editoriais | Jornal → `jornal`; Bauhaus → `bauhaus`; Swiss → `swiss`; Caderno → `caderno`; Galeria → `galeria`; Cobalto → `cobalto` |
| Escuros | Meia-noite → `meia-noite`; Drácula → `dracula`; Nord → `nord`; Carbono → `carbono`; Cosmos → `cosmos`; Esmeralda → `esmeralda` |
| Vibrantes | Carnaval → `carnaval`; Pop art → `pop`; Sunset → `sunset`; Tropical → `tropical`; Memphis → `memphis`; Citrus → `citrus` |
| Técnicos | Blueprint → `blueprint`; Terminal → `terminal`; Circuito → `circuito`; Wireframe → `wireframe`; Isométrico → `isometrico`; Laboratório → `laboratorio` |

## Tokens

| Token | Valores / limites | Aplicação |
| --- | --- | --- |
| `background` | `#RRGGBB` | Fundo do mapa e arquivo exportado |
| `ink` | `#RRGGBB` | Texto e preenchimento do nó central |
| `palette` | Exatamente 6 cores `#RRGGBB` | Ramos e nós; paleta cíclica |
| `font` | `sans`, `serif`, `mono` | Arial, Georgia ou Consolas, com fallback do sistema |
| `fontSize` | 12–26 | Tamanho-base do texto no diagrama e nos cartões HTML |
| `radius` | 0–32 | Cantos dos cartões HTML e de nós retangulares SVG; no SVG, formas explícitas como círculos permanecem |
| `lineWidth` | 1–5 | Espessura das conexões |
| `lineStyle` | `solid`, `dashed`, `dotted` | Contínua, tracejada ou pontilhada |
| `pattern` | `dots`, `grid`, `none` | Textura do fundo, incluída nos formatos visuais exportados |
| `shadow` | `none`, `soft`, `offset` | Sem sombra, sombra difusa ou deslocada |
| `nodeStyle` | `soft`, `outline`, `solid` | Mistura suave com fundo, contorno ou cor sólida |
| `spacing` | 20–80 | Espaçamento entre nós/ranks de fluxogramas |
| `rootFill` | Opcional, `#RRGGBB` | Fundo do nó central; sem override, herda `ink` |
| `rootText` | Opcional, `#RRGGBB` | Texto central; ausente, usa contraste automático sobre o fundo central |
| `rootBorder` | Opcional, `#RRGGBB` | Borda central; ausente, acompanha o fundo central |
| `rootRadius` | Opcional, 0–80 | Arredondamento do cartão HTML ou retângulo SVG central; ausente, herda `radius` |

O motor resolve `{...preset.tokens, ...overrides}`. Trocar preset apaga ajustes anteriores; Restaurar estilo limpa `overrides`. A posição dos nós não é armazenada como estilo. Zoom e arrasto não alteram exportações.

Em mindmaps, cores de ramos seguem a seção que o Mermaid identifica. Fluxogramas usam cores cíclicas por nó e conexão. O texto em preenchimentos sólidos recebe branco ou escuro conforme luminância. Isso não é garantia universal de contraste para paletas personalizadas; confira a legibilidade após escolher cores próprias. Direção e hierarquia pertencem ao código Mermaid, não aos presets. No modo SVG, suas formas explícitas são preservadas; a camada HTML apresenta os nós convertidos como cartões.

`spacing` não modifica o layout radial dos mindmaps: o algoritmo Mermaid calcula essas posições. O título do card Isométrico descreve o tratamento gráfico de blocos/sombras; não é um layout matematicamente isométrico em três dimensões.

## Nó central

**Personalizar nó central** controla os quatro tokens `root*` sem alterar as cores dos outros nós. A resolução é: fundo = `rootFill` ou `ink`; texto = `rootText` ou contraste calculado do fundo; borda = `rootBorder` ou fundo; raio = `rootRadius` ou `radius`. O raio é expresso em pixels e seu efeito visual depende das dimensões e da forma do nó. Círculos e losangos SVG conservam sua geometria.

Usar cores e cantos do estilo remove somente os quatro overrides centrais. Restaurar todos os ajustes ou trocar preset também os remove. Esses campos são opcionais no JSON: sua ausência preserva a aparência anterior. Aplicam-se à raiz do mindmap e ao primeiro nó renderizado de um fluxograma, além das exportações correspondentes.

O texto central pertence à fonte Mermaid. O formulário altera somente o trecho de rótulo de uma raiz simples reconhecida, mantendo forma e filhos; em fluxogramas ou sintaxe de raiz não reconhecida, a edição do texto continua no código. Os tokens visuais não renomeiam o projeto nem acrescentam campos de conteúdo ao JSON.

## Composição HTML

`composition` é uma configuração separada dos tokens. Seus layouts Estúdio (`studio`), Pôster (`poster`) e Glass (`glass`) definem o acabamento da página composta. O título do documento, o subtítulo opcional e o rodapé formam a moldura ao redor do mapa. Os 36 presets continuam definindo a identidade de cor e tipografia; não são substituídos por três novos presets.

A composição usa a geometria SVG calculada pelo Mermaid para posicionar cartões HTML. As conexões continuam em SVG. A conversão não recalcula o mapa como uma grade HTML e não habilita HTML dentro dos rótulos. Em fluxogramas, apenas nós retangulares recebem cartões; losangos, círculos e outras formas especiais permanecem em SVG. Nos dois tipos de diagrama, nós cuja geometria ou texto não pode ser convertido com segurança também permanecem em SVG.

Para manter as conexões alinhadas, o cartão conserva o espaço do nó original. O texto parte de `fontSize` e pode ser reduzido até 8 px para caber; se ainda não couber, o nó preserva sua representação SVG. Glass usa gradientes e cantos mais arredondados, não depende de filtros de desfoque externos. Confira legibilidade ao usar rótulos longos.

O PNG captura a composição completa e o HTML contém a página com estilos incorporados. O SVG exportado é somente o diagrama Mermaid com seus próprios estilos. Confira ambos quando precisar entregar uma versão vetorial e outra com o acabamento HTML.

## Adicionar um preset

1. Adicione uma entrada `p(id, nome, família, descrição, seisCores, overrides)` a `PRESETS`.
2. Use ID estável e único. Evite renomear IDs já exportados.
3. Execute testes e regenere o schema: `npm test` e `npm run schema`.
4. Atualize contadores da UI, este catálogo e o teste de quantidade esperada.
5. Valide mindmap, fluxograma, fundo escuro, os três layouts HTML, exportação SVG/PNG/HTML e fontes em diferentes sistemas.

Para criar um token novo, atualize também `StyleTokens`, `StyleOverridesSchema`, controles no frontend e sua aplicação em `src/renderer.ts`. Nunca aceite CSS livre no JSON para implementar novos estilos.

Para criar um layout de composição, amplie a enumeração validada de `composition.layout`, o controle da interface e o construtor seguro de HTML/CSS. Verifique a captura da `div` inteira e a independência do HTML exportado; atualize schema e documentação de compatibilidade antes de distribuir.
