# Plano gratuito, cotas e custo

Referência verificada em **7 de outubro de 2026**, usando documentação oficial. Os serviços podem mudar. Confirme preços e disponibilidade na sua conta antes de publicar.

## Franquias da plataforma

| Serviço | Franquia relevante | Quando esgota / condição |
| --- | --- | --- |
| Workers Static Assets | Requisições a assets gratuitas e ilimitadas; armazenamento dos assets sem custo adicional | Requisições que invocam o Worker seguem as cotas Workers |
| Workers Free | 100.000 requisições/dia e 10 ms de CPU por requisição HTTP | Requisições dinâmicas podem falhar após atingir cotas; o Free não é computação ilimitada |
| D1 no Workers Free | 5 milhões de linhas lidas/dia, 100 mil escritas/dia, 5 GB totais | Operações falham ao esgotar franquia; armazenamento e índices contam |
| Workers AI | 10.000 Neurons/dia, renovação às 00:00 UTC | Exceder a franquia exige Workers Paid; alguns modelos têm restrição adicional de plano |
| R2 Standard | 10 GB-mês, 1 milhão de operações classe A/mês e 10 milhões classe B/mês | Excedentes são faturados; não há bloqueio automático de gasto zero no aplicativo para a conta inteira |

Fontes: [Static Assets](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [limites Workers](https://developers.cloudflare.com/workers/platform/limits/), [preços D1](https://developers.cloudflare.com/d1/platform/pricing/), [preços Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/), [preços R2](https://developers.cloudflare.com/r2/pricing/).

R2 requer uma assinatura ativada pelo fluxo de checkout da conta, mesmo com franquia gratuita. A gratuidade é de uso incluído, não ausência de assinatura ou garantia de cartão dispensado. A classe Infrequent Access não tem a mesma franquia. Veja [ativação do R2](https://developers.cloudflare.com/r2/get-started/).

## Limites internos entregues

| Operação/dado | Teto por deployment |
| --- | --- |
| Tentativas de geração IA | 20/dia UTC |
| Operações de escrita D1 pela API | 100/dia UTC |
| Operações de snapshot R2 (ler ou gravar) | 100/dia UTC |
| Consultas API autenticadas (`status`, listar, abrir) | 1.000/dia UTC |
| Mapas D1 | 100 simultâneos |
| Biblioteca local | 100 documentos |
| Documento serializado | 96 KiB |
| Corpo HTTP JSON | 100 KiB |
| Código Mermaid | 16.000 caracteres, 160 linhas, 180 conexões no renderizador |
| Tema enviado ao Workers AI | 3.000 caracteres |
| Tema do prompt para IA externa | 2.000 caracteres; geração/cópia local, sem inferência |
| Saída máxima da IA | 1.200 tokens por tentativa |
| R2 | Uma chave substituível por mapa, sem uploads arbitrários |

São cotas da aplicação, não os números exibidos no faturamento da Cloudflare. `read` também escreve uma linha de contador D1; `write` pode consumir mais de uma linha física devido a índices. Falhas depois de reservar a cota consomem uma tentativa. Operações inválidas bloqueadas antes da reserva não consomem aquele contador.

Personalizar o nó central, exportar/importar JSON e gerar/copiar um prompt não invocam Workers AI nem criam serviços Cloudflare adicionais. Salvar depois no D1 ou criar um snapshot continua consumindo as cotas dessas operações. Se você colar o prompt em outro serviço de IA, o uso desse serviço segue os limites e preços dele, fora desta aplicação.

## Ordem de grandeza

Com 100 mapas de 96 KiB, o JSON total do D1 é de até **9,375 MiB**, além do overhead SQL e índices. Cem snapshots ocupam até mais 9,375 MiB em R2 enquanto não houver resíduos de falhas. Substituir snapshot usa a mesma chave; não multiplica versões. Leituras e gravações R2 compartilham o limite interno, portanto até 3.100 operações de snapshot em um mês de 31 dias, antes de usos externos e operações administrativas.

A API usa no máximo 1.000 consultas autenticadas/dia. Mesmo uma listagem de 100 mapas consome poucas linhas em relação à franquia; os contadores e índices também devem ser considerados. A proteção não elimina a necessidade de acompanhar métricas reais. Requests maliciosos com token inválido ainda consomem Workers, embora sejam barrados antes de D1/R2/IA.

O modelo padrão é [Llama 3.2 3B Instruct](https://developers.cloudflare.com/workers-ai/models/llama-3.2-3b-instruct/), via binding nativo. A aplicação **não estima saldo em Neurons por número de chamadas**: entrada, saída, modelo e outros aplicativos da mesma conta afetam o consumo. Vinte tentativas é uma barreira operacional conservadora, não uma promessa de que toda conta terá franquia disponível.

## Condições para permanecer em custo zero

1. Manter Workers Free; não habilitar upgrade automático ou cobrança de Workers Paid para contornar limites.
2. Usar R2 Standard e ficar dentro das franquias de armazenamento/operações considerando **todos os buckets da conta**.
3. Não trocar o modelo padrão por um modelo pago sem rever a arquitetura.
4. Proteger a chave do espaço e não publicar o bucket.
5. Usar edição local e exportação para trabalho contínuo; salvar na nuvem quando necessário.
6. Observar cotas de todos os projetos na mesma conta e inspecionar objetos órfãos R2 após falhas de exclusão.
7. Conferir CPU em produção. O projeto evita renderização no Worker, mas validação de documentos e runtime têm custo; testes locais não garantem o consumo real abaixo de 10 ms em todos os casos.

Alertas de faturamento ajudam no acompanhamento, mas **não são necessariamente um bloqueio de gasto**. D1, IA e R2 são serviços diferentes e não possuem um orçamento único imposto por este projeto. Para operar sem ativar R2, remova seu binding de produção: editor e D1 continuam disponíveis, e snapshots retornam indisponibilidade. Essa variante deixa de oferecer o fluxo completo R2 solicitado.
