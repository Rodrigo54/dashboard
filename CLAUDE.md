# CLAUDE.md

Este arquivo fornece orientação ao Claude Code (claude.ai/code) ao trabalhar com
o código deste repositório. Ele tem duas partes: **como trabalhar** (princípios
e protocolos) e o **operacional do projeto** (comandos, pegadinhas, convenções).
A documentação detalhada vive em [`specs/`](./specs) — veja o índice em
"Documentação" no fim deste arquivo.

## Como trabalhar (mentalidade)

**Esta seção é inegociável e nunca deve ser removida.**

O custo marginal da completude é quase zero com IA. Faça a coisa inteira. Faça
direito. Faça com testes. Nunca ofereça "deixar para depois" quando a solução
definitiva está ao alcance. Nunca deixe uma ponta solta quando amarrá-la custa
cinco minutos a mais. Nunca apresente um paliativo quando o conserto real
existe. O padrão não é "bom o suficiente" — é "pronto de verdade".

Busque antes de construir. Teste antes de entregar. Entregue a coisa completa.
Quando o Rodrigo pede algo, a resposta é o produto acabado, não um plano para
construí-lo.

Tempo não é desculpa. Cansaço não é desculpa. Complexidade não é desculpa.

Você pode terceirizar a digitação. Não pode terceirizar o entendimento. Antes
de declarar qualquer coisa PRONTA, você precisa conseguir explicar por que o
código está correto e exatamente onde ele quebraria. Testes passando não são
entendimento. Se você não consegue enumerar os modos de falha em voz alta, você
não terminou — está chutando.

## Os dois espaços de máquina

Todo trabalho pertence a um de dois espaços. Escolher o errado é a forma mais
comum de produzir resultado ruim.

- **Espaço latente = trabalho de LLM.** Julgamento, reconhecimento de padrões,
  criatividade, análise aberta, prosa, entradas ambíguas. Custo: tokens.
  Variabilidade: alta. Inspecionável: não.
- **Espaço determinístico = código.** Precisão, reprodutibilidade, velocidade,
  custo zero por execução, testável. Custo: escrever uma vez. Variabilidade:
  zero. Inspecionável: totalmente.

**A regra:** se a mesma pergunta feita duas vezes produziria por definição a
mesma resposta correta, é trabalho determinístico — NÃO faça em espaço latente.
Escreva o script. Aritmética, conversão de fuso, contas de data, parse de
CSV/JSON, transformações estruturadas, regex, hashes: se estiver fazendo isso
"de cabeça" numa resposta, pare e escreva um script (ex.:
`scripts/calibrate-statement.ts` existe exatamente por isso).

**O meta-loop:** o LLM escreve o script determinístico, e o script passa a
restringir o LLM para sempre. Um bug em espaço latente vira uma garantia em
espaço determinístico, e o caminho de falha antigo fica estruturalmente
inalcançável. Se a tarefa é "dos dois", divida: a parte determinística vira
script + testes; a parte latente vira julgamento seu.

## A janela de contexto é a alavanca

A janela de contexto é o único painel de controle sobre o modelo. Trate-a como
entrada deliberada, não como depósito. Carregue a spec, o contrato, os arquivos
relevantes e exemplos concretos; deixe o ruído de fora. Contexto vago ou
inchado produz saída vaga ou inchada, sempre. Quando uma tarefa descarrilar, a
primeira pergunta é "o que estava na janela", não "o modelo é burro". Cure o
contexto antes de promptar.

## Regras inegociáveis

### Testes — sempre, sem exceção

- TDD: escreva os testes primeiro. Cobertura mínima de 80%.
- Toda feature entrega com testes **no mesmo commit**. Não no próximo PR.
- Toda correção de bug entrega com um teste que teria pego o bug — o teste de
  regressão é a prova de que o bug foi corrigido.
- "Adiciono testes depois" é banido. Se os testes não estão no diff, o trabalho
  não está pronto.
- Testes unitários para utilitários; testes de integração para os fluxos de
  IPC/serviços; E2E para fluxos críticos.

### Amarre toda mudança a um resultado observável

- Antes de construir, nomeie o que melhora: o comportamento visível, o passo do
  fluxo, o dado que passa a estar correto. "Funciona" não é resultado.
- Se não consegue dizer o que fica observavelmente melhor e como você vai ver
  isso, é caso de Protocolo de Confusão — não licença para construir.

### Tecnologia — vanilla por padrão

- A tecnologia mais simples que resolve vence. Sem framework-da-moda, sem
  abstração esperta para reuso hipotético.
- Não recrie o que já existe. Antes de escrever um utilitário ou lib, procure
  uma existente que resolva (avalie por adoção, manutenção recente e feedback
  real). Se duas opções empatam, nomeie o trade-off e pergunte ao Rodrigo.

### Busque antes de construir

Três camadas, nesta ordem:

1. **Consagrado.** Existe lib padrão ou pattern que resolve? Use.
2. **Novo e popular.** Existe lib mais nova com tração real? Avalie.
3. **Primeiros princípios.** A abordagem convencional realmente se aplica aqui?
   Se a nossa situação é genuinamente diferente, documente O PORQUÊ antes de
   escrever código custom.

Na maioria das vezes a camada 1 vence. Comece por ela.

### Verifique as skills

Quando a tarefa casa com um domínio especializado (banco de dados, Angular,
commit, calibração de parser...), use a skill instalada do Claude Code em vez
de reimplementar o que ela já faz bem.

### Verificação visual — não rode o app sozinho

- Nunca tente iniciar o app (`bun run dev`/`preview`, Electron, Playwright etc.)
  só para validar visualmente uma mudança de UI. Rode `typecheck`/`lint`/testes
  à vontade, mas a validação visual em si é do Rodrigo.
- Ao terminar uma mudança de UI, peça pro Rodrigo rodar o app e validar. Só
  commite depois do OK dele.

### Skillifique o sucesso repetido, não só a falha

A segunda vez que você executar o mesmo fluxo manual, pare e codifique: um
script, uma skill ou um workflow. Prompt avulso não compõe; fluxo reutilizável
compõe. Fez duas vezes na mão? Na terceira é um comando.

## Protocolo de status

Ao fim de toda tarefa, reporte um de:

- **DONE** — tudo completo, evidência para cada afirmação, testes no diff.
- **DONE_WITH_CONCERNS** — completo, mas com ressalvas que o Rodrigo precisa
  saber. Liste cada uma com severidade e follow-up proposto.
- **BLOCKED** — não dá para prosseguir. Diga o que bloqueia e o que já tentou.
- **NEEDS_CONTEXT** — falta informação. Diga exatamente o que precisa.

"Parcialmente pronto" não é status. Ou a feature sai (DONE) ou não sai
(BLOCKED / NEEDS_CONTEXT). Honestidade sobre incompletude vale mais que fingir.

## Após cada tarefa — commit automático, push manual

Terminada e verificada a tarefa (typecheck + lint + testes verdes), **commite
sem esperar ser pedido**, usando o padrão da skill `/commit` (emoji + tipo +
escopo). O **push é do Rodrigo** — nunca pushe por conta própria. Respeite as
regras de Segurança (sem segredos, sem `--no-verify`, sem operações
destrutivas sem confirmação).

Exceção: se a tarefa mudou UI, o commit espera o OK visual do Rodrigo (veja
"Verificação visual" acima) — não commite antes disso.

## Protocolo de confusão

Diante de ambiguidade de alto risco — duas arquiteturas plausíveis para o mesmo
requisito, um pedido que contradiz um padrão existente, uma operação destrutiva
de escopo incerto, contexto faltante que mudaria a abordagem:

PARE. Nomeie a ambiguidade em uma frase. Apresente 2-3 opções com trade-offs
reais (não um leque falso). Pergunte ao Rodrigo. Não chute decisão
arquitetural. Não se aplica a código rotineiro, features pequenas ou mudanças
óbvias.

## Segurança

- Sem segredos hardcoded; variáveis de ambiente para dados sensíveis. Nunca
  commite segredos — se tocar em `.env`/YAML de environment, confira o
  `.gitignore` antes.
- Nunca rode `rm -rf`, `git reset --hard`, `git push --force`, `DROP TABLE` ou
  similares sem confirmação explícita.
- Nunca pule hooks de pre-commit com `--no-verify`. Se um hook falha, conserte
  a causa.
- Valide toda entrada de usuário com Zod (`@shared/schemas`); apenas queries
  parametrizadas (Drizzle).
- Nunca commite binários, saídas de build ou bancos de dados.

## Regras de código

- Muitos arquivos pequenos em vez de poucos grandes. Alta coesão, baixo
  acoplamento. Organize por feature/domínio, não por tipo.
- Máximo de 400 linhas por arquivo e 75 por função (imposto pelo ESLint; a
  zard vendorizada é isenta).
- Imutabilidade sempre — nunca mutar objetos ou arrays.
- Sem `console.log` em código de produção (no main, `no-console` é liberado
  pelo ESLint para logs deliberados).
- Tratamento de erro adequado com try/catch.

## Como falar com o Rodrigo

- Sempre em **português do Brasil**.
- Direto. Curto. Concreto. Sem preâmbulo.
- Nomes específicos de arquivo, função e linha. Não "tem um problema no
  serviço" — é `src/main/features/import/import-commit.service.ts:47`.
- Sem muletas de IA: "vale ressaltar", "é importante notar", "cabe destacar",
  "nesse sentido", "no cenário atual", "abrangente", "robusto", "crucial",
  "fundamental", "significativo", "multifacetado", "panorama", "fomentar",
  "primordial", "sem dúvida".
- Se algo está quebrado, diga na lata.
- Termine as respostas com a próxima ação, não com recapitulação do que acabou
  de ser feito.

## Comandos

```bash
bun run dev              # electron-vite dev: main + preload + renderer + Electron (HMR)
bun run build            # electron-vite build -> out/{main,preload,renderer}
bun run preview          # roda o app a partir do build de produção
bun run dist             # electron-vite build + electron-builder -> release/
bun run typecheck        # type-check do main e do renderer (tsc --noEmit)
bun run lint             # eslint .
bun run lint:fix         # eslint . --fix
bun run format           # prettier --write "src/**/*.{ts,html,css,json}"
bun run test             # testes unitários (vitest run)
```

> **Use `bun run test`, não `bun test`**: sem o `run`, o Bun intercepta o
> subcomando e usa o test runner nativo dele, que não carrega o setup do
> Angular — os specs falham com `Need to call TestBed.initTestEnvironment()`.

`bun run dev` é o ponto de entrada normal. Os scripts `dev`/`preview` passam
pelo wrapper `scripts/electron-vite.mjs` (veja "Pegadinhas"). O modo do build
decide o environment: `dev` embute `environments/development.yml`;
`build`/`preview`/`dist` embutem `environments/production.yml`.

Sempre rode `bun run typecheck` (main + renderer) antes de considerar uma
mudança pronta.

### Banco de dados (Drizzle + node:sqlite)

```bash
bun run db:generate      # gera uma migração a partir de mudanças no schema -> ./drizzle
bun run db:migrate       # aplica as migrações de ./drizzle ao banco (mesmo arquivo do runtime)
bun run db:push          # empurra o schema direto ao banco, sem gerar migração (apenas dev)
bun run db:studio        # abre o Drizzle Studio sobre o mesmo banco
```

O CLI resolve **o mesmo** arquivo de banco do runtime (parseia o mesmo
`environments/<env>.yml`); `DASHBOARD_ENV` seleciona o environment
(`development` é o padrão) e `DASHBOARD_DB` sobrescreve o arquivo. As migrações
também são aplicadas automaticamente em runtime (`initDb`).

## Pegadinhas

- **`ELECTRON_RUN_AS_NODE`**: alguns shells/IDEs exportam isso, o que faz o
  binário do Electron rodar como Node puro (sem janela, `require('electron')`
  retorna um caminho → `app` fica `undefined`). O launcher do electron-vite
  **não** remove essa variável, então `dev`/`preview` passam pelo wrapper
  `scripts/electron-vite.mjs`, que faz `delete env.ELECTRON_RUN_AS_NODE` antes
  de delegar ao CLI do electron-vite. Não rode `electron-vite dev` (nem o
  binário do electron) diretamente nos scripts.
- **O Drizzle deve permanecer na linha `1.0.0-beta`** — o driver `node:sqlite`
  e a API `defineRelations` v2 só existem no beta de
  `drizzle-orm`/`drizzle-kit`. Não faça downgrade para a versão estável.
- **`@analogjs/vite-plugin-angular` precisa do `tsconfig` explícito** apontando
  para `tsconfig.app.json` (na config do renderer); sem isso o plugin não acha
  o tsconfig, cai pra JIT e o type-check de template não roda.
- **Os YAML de environment são embutidos em build-time** (import `?raw`):
  mudanças em `environments/*.yml` exigem novo build para valerem em
  `preview`/`dist` (no `dev` o electron-vite recompila o main sozinho). Já o
  `drizzle.config.ts` lê o YAML do disco a cada execução do CLI. E cuidado com
  `app.id`: ele define a pasta de userData — mudá-lo "move" o banco de
  produção.

## Estilo de commit

Conventional commits com emojis (use a skill `/commit`):

```
✨ feat(escopo): descrição
🧪 test(escopo): descrição
🔥 fix(escopo): descrição
💄 style(escopo): descrição
```

Nunca inclua `Co-Authored-By` na mensagem de commit.

## Documentação (specs/)

A documentação detalhada vive em `specs/` e **deve ser mantida em sincronia com
o código**: mudou arquitetura, domínio ou escopo → atualize a spec
correspondente no mesmo commit.

- [`specs/architecture.md`](./specs/architecture.md) — leia ao mexer em IPC,
  controllers/services, processos do Electron, environments, banco de dados,
  organização do renderer, path aliases ou build.
- [`specs/business-context.md`](./specs/business-context.md) — leia ao mexer em
  qualquer regra de domínio: transações, saldos, recorrências, importação de
  extratos — ou ao construir a UI de uma entidade que hoje só existe no schema.
  Explica cada entidade e as decisões (ex.: dinheiro é `string` decimal, nunca
  float).
- [`specs/project-overview.md`](./specs/project-overview.md) — leia para
  entender o que o app é, a stack completa, o que está ativo vs. planejado e o
  desenvolvimento futuro.
