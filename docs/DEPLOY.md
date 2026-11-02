# Instalação e implantação

## 1. Preparar o ambiente

Instale Node 22.12 ou posterior e use um terminal na pasta do projeto. Windows/PowerShell, macOS e Linux são suportados pelos comandos npm/Wrangler usados aqui.

```bash
npm ci
npm run setup:local
npm run dev:api
```

O `setup:local` não substitui `.dev.vars` existente. As migrações locais são idempotentes pelo histórico de migrações do Wrangler. Os dados de desenvolvimento ficam em `.wrangler/state` e não são enviados automaticamente à Cloudflare. `wrangler.local.jsonc` omite o binding de IA para permitir desenvolvimento sem autenticação remota.

Em outro terminal, `npm run dev` abre a versão com HMR. O Worker serve `dist/`: ao alterar somente o frontend e usar 8787, rode `npm run build` e recarregue a página. Em 5173, o Vite atualiza o frontend automaticamente.

Em ambientes Windows com certificados corporativos, use o certificado raiz aprovado pela sua organização ou `NODE_USE_SYSTEM_CA=1` em uma versão de Node que ofereça essa opção. Não desative a verificação TLS. Se a política local impedir ferramentas nativas de build, execute em um terminal com acesso autorizado à pasta.

## 2. Conferir conta e plano

1. Tenha uma conta Cloudflare com Workers **Free**.
2. Leia [COTAS.md](COTAS.md). R2 Standard tem franquia gratuita, mas exige assinatura R2 e cobra excedentes; o checkout pode solicitar meio de pagamento.
3. Não habilite recursos pagos, AI Gateway com cobrança unificada ou R2 Infrequent Access para este projeto.
4. Use o subdomínio `workers.dev`; um domínio próprio é opcional.

Autentique o CLI no seu terminal:

```bash
npx wrangler login
npx wrangler whoami
```

Em CI, use um API Token Cloudflare de escopo mínimo para Workers, D1 e R2 na conta desejada. Guarde-o no cofre do seu CI. Não é o mesmo segredo que o aplicativo recebe no botão Conectar nuvem.

## 3. Criar os recursos

```bash
npx wrangler d1 create mermeid-flex
npx wrangler r2 bucket create mermeid-flex-snapshots
```

Copie o `database_id` retornado para o binding `DB` em `wrangler.jsonc`, substituindo `00000000-0000-0000-0000-000000000000`. Se o nome do bucket não estiver disponível na sua conta, escolha outro e atualize `bucket_name`. Não substitua o placeholder de `wrangler.local.jsonc`: ele identifica o banco simulado local.

Os bindings devem permanecer com estes nomes:

| Binding | Recurso |
| --- | --- |
| `ASSETS` | `dist/`, gerenciado pelo deploy do Worker |
| `DB` | D1 `mermeid-flex` |
| `SNAPSHOTS` | Bucket R2 privado em classe Standard |
| `AI` | Workers AI nativo |

Não ative URL pública R2, domínio público do bucket ou CORS no bucket. O navegador se comunica apenas com o Worker.

## 4. Migrar e configurar o segredo

```bash
npm run db:remote
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put APP_ACCESS_TOKEN
```

Guarde o token de 64 caracteres em seu gerenciador de senhas e cole-o no prompt de `secret put`. O segredo não deve aparecer em `wrangler.jsonc`, commits, URLs ou variáveis `VITE_*`. A chave padrão de `.dev.vars.example` nunca deve ser usada remotamente.

O Wrangler pode criar o Worker ao registrar o primeiro segredo. Um Worker publicado sem o segredo válido permanece com a API fechada (`503 NOT_CONFIGURED`), mas o editor público continua disponível.

## 5. Configurar a IA e os limites

Edite `vars` em `wrangler.jsonc`:

```json
{
  "AI_ENABLED": "true",
  "AI_DAILY_LIMIT": "20",
  "WRITE_DAILY_LIMIT": "100",
  "R2_DAILY_LIMIT": "100",
  "READ_DAILY_LIMIT": "1000"
}
```

`AI_ENABLED` deve ser exatamente a string `"true"`. Deixe `"false"` para manter a IA desativada. O modelo é fixado em `shared/document.ts`: `@cf/meta/llama-3.2-3b-instruct`. Confirme disponibilidade no catálogo da Cloudflare antes de habilitar; não substitua por um modelo pago sem rever o orçamento.

Limites podem ser reduzidos até zero. O backend impõe tetos de 20/100/100/1000; valores maiores nas variáveis não elevam esses tetos. Valores negativos, fracionários ou não numéricos usam o padrão. Uma operação malsucedida pode consumir a reserva de cota.

Para experimentar IA real no desenvolvimento, autentique o Wrangler, use a configuração de produção com `npx wrangler dev --config wrangler.jsonc`, defina `AI_ENABLED=true` em `.dev.vars` e considere que o binding Workers AI **consome a conta real**, mesmo com D1 e R2 locais. O comando padrão `dev:api` não oferece IA.

## 6. Verificar e publicar

```bash
npm test
npm run test:api
npm run deploy
```

O deploy compila, verifica o placeholder de D1 e publica. Use a URL efetivamente retornada pelo Wrangler. Este repositório não contém uma URL de produção pré-configurada nem credenciais de uma conta.

Após publicar:

1. Abra o site e valide a renderização de um modelo.
2. Conecte com `APP_ACCESS_TOKEN` e salve um mapa no D1.
3. Abra a biblioteca, atualize a lista da nuvem e reabra o mapa.
4. Crie um snapshot R2 e recupere-o como cópia local.
5. Se a IA foi habilitada, faça uma geração curta e examine as métricas reais no painel.
6. Exporte JSON e importe em outra aba/navegador.
7. Confira CPU por requisição, operações D1/R2 e Neurons. O dry run local não comprova os limites de produção.
8. Ative Composição HTML e confira PNG completo e HTML independente sob os cabeçalhos de produção; compare também SVG do diagrama.

## 7. Manter o ambiente

### Atualizar

Preserve `database_id`, `bucket_name` e o segredo. Rode `npm ci`, testes, `npm run db:remote` caso existam novas migrações e `npm run deploy`. Migrações já aplicadas não são repetidas. Não edite uma migração antiga após implantá-la; crie uma nova.

As versões 1.1.0 e 1.2.0 não exigem migração SQL nem novos bindings. Publique frontend e Worker juntos: o validador 1.0.0 não aceita `composition`, e os validadores 1.0.0/1.1.0 não aceitam os quatro novos tokens `root*`. Antes de voltar a uma versão antiga, preserve os mapas em JSON e avalie essa incompatibilidade; desativar a composição não remove seu campo. Veja [a orientação de portabilidade](FORMATO-JSON.md#compatibilidade-da-composição). Copiar prompt IA não requer conta, segredo ou configuração adicional de um provedor.

### Backups e recuperação

Exporte JSON periodicamente. Um snapshot R2 é uma **cópia substituível do mapa salvo no D1**, não histórico de versões e não backup automático. Ele não contém mudanças ainda locais. Recuperar na interface cria um novo ID, sem sobrescrever D1. Excluir o mapa remoto também tenta excluir seu snapshot.

Para backup integral de D1 em uma máquina confiável:

```bash
npx wrangler d1 export mermeid-flex --remote --output=backup-mermeid-flex.sql
```

Esse arquivo contém os documentos privados. Proteja-o e não faça commit. Consulte a documentação de importação/restauração D1 antes de reexecutar SQL em produção. Não restaure uma exportação sobre dados ativos sem planejar a substituição.

D1 e R2 não compartilham transação. Uma falha na exclusão R2 após remover o registro D1 retorna `snapshotDeleted:false`. Consulte a chave `snapshots/<id>.json` no bucket e remova o resíduo após confirmar que não há referência. Operações concorrentes de snapshot/exclusão também podem deixar resíduos. Para instalações sujeitas a uso prolongado ou concorrente, configure uma regra de ciclo de vida com prazo adequado ao seu backup, **consciente de que ela apagará snapshots**, ou revise os objetos órfãos periodicamente. Não há expiração automática na configuração entregue.

### Rotacionar chave

Execute `npx wrangler secret put APP_ACCESS_TOKEN` com uma nova chave aleatória. Quem usa o espaço deve desconectar e inserir a nova chave. Não há sessões a revogar no servidor; a chave é verificada a cada requisição.

### Diagnóstico

| Sintoma | Verificação |
| --- | --- |
| `401 UNAUTHORIZED` | Chave do espaço incorreta, esquecida após recarregar, ou token de conta usado por engano |
| `503 NOT_CONFIGURED` | Segredo ausente ou com menos de 32 caracteres |
| `503 SERVICE_ERROR` | Migração não aplicada, binding incorreto, D1 indisponível ou cota Cloudflare esgotada |
| `503 AI_DISABLED` | `AI_ENABLED` diferente de `true` ou binding AI ausente |
| `502 AI_UNAVAILABLE` | Falha do provedor, falta de capacidade ou franquia da conta esgotada |
| `502 AI_INVALID_OUTPUT` | Saída da IA não está no subconjunto aceito; não há repetição automática |
| `409 CONFLICT` | Outra revisão já foi salva, registro removido ou limite de mapas atingido |
| `429 DAILY_LIMIT` | Limite interno atingido; retoma às 00:00 UTC |
| `404 SNAPSHOT_NOT_FOUND` | Nenhum snapshot criado, objeto excluído ou expirado por regra do operador |
| API retorna HTML em dev | Worker local desligado, URL errada ou roteamento de `/api/*` alterado |
| Estilos sem atualização em 8787 | Recompile o frontend e recarregue; HMR é em 5173 |
| PNG da composição falha | Confira suporte do navegador, tente um mapa menor e use HTML ou JSON como alternativa |
| JSON novo recusado em uma instalação antiga | Atualize frontend e Worker; leitores antigos recusam `composition` ou os tokens `root*` que não conhecem |
| Exportar JSON informa que a prévia não está válida | Corrija a fonte e aguarde a renderização; `.mmd` permite guardar o rascunho incompleto |
| Navegador recusa copiar o prompt | Use a prévia selecionada para copiar manualmente; nenhuma chamada de IA é necessária |
| Browser sem espaço | Exporte JSON, faça cópia dos mapas e remova apenas rascunhos dispensáveis |

Não cole prompts, documentos ou cabeçalhos Authorization em relatórios públicos. Logs de requisição do Wrangler podem exibir caminhos; não usam tokens em query string.
