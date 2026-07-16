# Contexto de Negócio

> Leia este documento ao mexer em qualquer regra de domínio: transações,
> saldos, recorrências, importação de extratos, ou ao construir a UI de uma
> entidade que hoje só existe no schema. Ele explica **o que as coisas
> significam** e **por que as decisões foram tomadas** — o "como" técnico está
> em [`architecture.md`](./architecture.md).

## Decisões técnicas com motivação de negócio

### Valores monetários são `string` no banco (nunca `number`)

Toda coluna de dinheiro (`balance`, `amount`, `spent`, `targetAmount`,
`currentAmount`, e também `estimatedHours`/`actualHours`) é `text` no SQLite,
espelhando `decimalSchema` no Zod. Motivo: `number` (float IEEE 754) não
representa decimais com exatidão — `0.1 + 0.2 !== 0.3` — e erro de centavo em
app financeiro é inaceitável. A aritmética é feita **sempre em string** pelo
módulo `@shared/decimal` (`addDecimal`, `negateDecimal`, ...). Nunca converta
para `number` para calcular; nunca use float em coluna de dinheiro.

### Saldo é derivado, mas mantido transacionalmente

`accounts.balance` é atualizado junto com **cada** escrita de transação, sempre
dentro da mesma transação SQL (`db.transaction`), via
`AccountBalanceService.applyBalanceDelta`. Receita soma, despesa subtrai,
`transfer` é neutro (fora de escopo hoje). Nenhuma escrita de `transactions`
pode atualizar saldo fora do mesmo commit — se a conta não existir, o serviço
lança e a transação SQL inteira é desfeita.

### Transferências ainda não são suportadas

`transfer` existe nos enums e no schema (`toAccountId`), mas
`TransactionRulesService.assertSupported` rejeita o tipo hoje. É escopo futuro
deliberado: a coluna já existe para não exigir migração depois, mas a regra de
negócio (débito numa conta + crédito na outra, atomicamente) ainda não foi
construída.

### Categoria é coerente com o tipo

Categorias são particionadas por tipo (`INCOME_CATEGORIES` ×
`EXPENSE_CATEGORIES`); `TransactionRulesService` valida a coerência
categoria ↔ tipo em todo CRUD e em todo template de recorrência. Não existe
categoria "neutra".

### Single-user por design, multi-user por schema

Toda tabela tem `userId` com cascade delete — o schema suporta múltiplos
usuários — mas o app roda com **uma sessão por vez** (`core/session.ts` no
main). Não construa UI ou lógica de multi-tenancy; o `userId` serve para
integridade e para um eventual futuro multi-perfil.

## Recorrência vs. transação materializada

O conceito mais importante do domínio financeiro:

- **`recurring` é uma REGRA, não um lançamento.** Guarda um `template` (JSON: o
  molde da transação — conta, tipo, categoria, valor, descrição) + um
  `recurringPattern` (frequência: daily/weekly/monthly/yearly), `startDate`,
  `endDate` opcional, `nextDate` (próxima ocorrência pendente) e
  `executionCount`.
- **Materializar = converter ocorrências vencidas da regra em linhas reais de
  `transactions`** (com `recurringId` apontando de volta). Quem faz é o
  `RecurringMaterializerService`: roda em **catch-up** — não há timer nem job
  agendado; ele é disparado **no login** e após mutações de recorrência, e
  recupera de uma vez todas as ocorrências vencidas desde o último disparo.
  Cada materialização grava a transação **e** o delta de saldo no mesmo commit
  SQL, e avança `nextDate`/`executionCount` de forma consistente.
- **No extrato (UI), o futuro é previsão**: a lista de transações mistura
  linhas reais (materializadas ou manuais) com **previsões** calculadas das
  regras ativas — previsão não existe no banco, é derivada em leitura.
- **Regras com `autoMaterialize: false` nunca materializam sozinhas.** Elas só
  geram previsão; as ocorrências reais chegam pela **importação de extrato**
  (auto-link) ou pelo vínculo manual na tela de detecção.
- Uma regra quebrada (ex.: conta excluída) não trava as demais: o
  materializador loga e segue.
- `recurring.type` também aceita `task` (template de tarefa) — previsto para a
  futura feature de tasks; hoje só `transaction` é materializado.
- **Toda regra é criada manualmente pelo usuário.** A coluna `source` ainda
  existe no schema (`manual`/`imported`) mas hoje só `'manual'` é gravado — a
  detecção automática de padrões no histórico (que propunha regras novas com
  `source: 'imported'`) foi removida. `imported` fica reservado por
  compatibilidade de schema, sem gravador ativo.

## Vínculo de transação com recorrência (matching)

Como uma transação (importada ou já existente no histórico) descobre a que
regra pertence — sem depender de detecção automática de novas regras, que foi
removida. A função pura `computeRecurrenceProbability`
(`src/shared/recurrence/matching.ts`) é a fonte única de verdade; main
(auto-link do import, tela de detecção) e a lógica de UI dependem só dela.

- **Pesos**: 0,5 similaridade de texto (Levenshtein normalizado entre a
  descrição da transação e o nome/descrição do template da regra — o maior
  dos dois), 0,3 proximidade de data (decai linearmente até 0 a partir de 10
  dias de distância da ocorrência prevista mais próxima do padrão) e 0,2
  proximidade de valor (decai linearmente até 0 numa diferença de 15% sobre o
  valor do template).
- **Tipo divergente é filtro duro** — `income` nunca casa com regra de
  `expense`, pontuação zero, nem entra na lista de candidatos.
- **Conta divergente é penalidade, não filtro** (`×0,8` sobre o total) — uma
  mesma conta de luz pode ser paga ora de um banco, ora de outro; descartar o
  candidato só por conta diferente perderia esse caso real.
- **Thresholds**: `CANDIDATE_MIN_THRESHOLD = 0,4` (piso pra aparecer como
  sugestão na tela de detecção) e `AUTO_LINK_THRESHOLD = 0,85` (piso pra
  vincular sozinho, sem confirmação, no commit da importação).
- **Margem contra regras "irmãs"** (`AUTO_LINK_MARGIN = 0,10`): o auto-link só
  prossegue se o melhor candidato bater o threshold **e** abrir pelo menos
  essa vantagem sobre o segundo colocado. Motivo real: duas parcelas de
  salário no mesmo mês (parcela + 13º) com a mesma descrição
  "PAGTO SALARIO" geram duas regras com nome idêntico — sem a margem, o
  commit podia vincular a transação errada quando as pontuações empatavam
  acima do threshold. Sem vantagem suficiente, a linha cai para confirmação
  manual em vez de arriscar o vínculo errado.
- **Import exige conta idêntica** para o auto-link (mais estrito que o
  matching geral, que só penaliza) — cruzar contas automaticamente sem
  confirmação humana é considerado arriscado demais mesmo dentro do
  threshold. `bestSameAccountRule`
  (`src/main/features/import/recurrence-auto-link.utils.ts`) filtra as regras
  candidatas pela conta da linha antes de pontuar.
- **Vincular via `linkTransaction` faz merge, nunca duplica**: se a ocorrência
  já tinha sido materializada (existe uma transação prevista/lançada para
  aquela data), o vínculo apaga a materializada (revertendo o saldo) em favor
  da transação real sendo linkada e avança `nextDate`/`executionCount`; se a
  ocorrência ainda é só previsão (`nextDate` pendente), o vínculo simplesmente
  avança a regra. `unlinkTransaction` só limpa `recurringId` — não desfaz
  avanço de `nextDate`.
- **Duas superfícies de detecção**, mesma função de pontuação:
  - **Tela geral** (`/recurring/matches`, `RecurrenceMatchingService.findMatchCandidates`)
    varre transações sem `recurringId` de um mês contra todas as regras
    ativas do usuário, filtra por `CANDIDATE_MIN_THRESHOLD` e sempre pede
    confirmação manual — nunca vincula sozinha, mesmo acima do threshold de
    auto-link.
  - **Transação individual** (`transactions/view/:id`,
    `findCandidatesForTransaction`) faz a mesma varredura restrita a uma
    transação — é o caminho para corrigir um vínculo errado: como uma
    transação já vinculada some da lista de candidatos gerais, desvincular
    (`unlinkTransaction`) e revincular pela própria tela da transação é a
    única forma de correção depois do fato.

## Importação de extratos (feature `import`)

Fluxo: **PDF → parse → preview → commit**, tudo no processo main.

- **Parsers por banco** (`itau.parser.ts`, `bb.parser.ts`) sobre uma engine
  genérica (`statement-engine.ts`). Foram **calibrados contra PDFs reais** e a
  reconciliação de saldo do extrato fecha. Peculiaridade do BB: o sinal da
  linha vem dos sufixos `(-)`/`(+)`, não do valor. A ferramenta
  `scripts/calibrate-statement.ts` ajuda a calibrar novos parsers.
- **Fatura de cartão de crédito** (`itau-invoice.parser.ts`,
  `bb-invoice.parser.ts` sobre `invoice-engine.ts`). O `BankParser` carrega um
  `kind: 'statement' | 'invoice'`; o roteamento (`detectParser`) testa fatura
  **por conteúdo** (marcadores estruturais) **antes** do extrato, porque o nome
  do arquivo não separa os dois no mesmo banco. Diferenças de domínio da fatura:
  - **Sinais invertidos**: na fatura, gasto é positivo e pagamento é negativo,
    mas conta de crédito tem saldo **negativo ou zero**. Então compra vira
    `expense` e pagamento vira `income`. A inversão acontece no parse (o staging
    já mostra a semântica certa), não no commit.
  - **Documento seccionado**: só as linhas dentro dos blocos de movimento
    (Lançamentos/Pagamentos) viram lançamentos; resumos, limites, encargos e a
    projeção de próximas faturas ficam de fora. No Itaú, a página de encargos
    fica na mesma linha visual do movimento — o engine usa o **primeiro** valor
    (coluna esquerda) e ignora o resto.
  - **Reconciliação própria**: `total anterior + compras − pagamentos = total
desta fatura` (não há saldo corrido).
  - **Conta destino**: o preview sugere a conta `credit` do provider e a UI
    **bloqueia** o commit enquanto a conta escolhida não for de crédito.
- **Deduplicação por fingerprint**: cada linha importada recebe uma impressão
  digital determinística (inclui índice de ocorrência para tolerar linhas
  legitimamente repetidas no mesmo dia), gravada em
  `transactions.importFingerprint`. Reimportar o mesmo extrato não duplica
  nada (`skipped`). Transações manuais têm fingerprint `null`.
- **Categorização automática por dicionário-semente** (`categorization.service.ts`):
  regexes sobre a descrição crua (primeira que casa vence). Regras aprendidas
  do usuário (padrão → categoria) são evolução futura, aplicadas **antes** da
  semente.
- **Auto-link com recorrências** no commit: cada linha inserida é pontuada
  contra as regras ativas **da mesma conta** (`bestSameAccountRule`) pela
  mesma função de probabilidade da tela de detecção (ver "Vínculo de
  transação com recorrência" acima); passando no threshold + margem, o
  vínculo (`RecurrenceMatchingService.applyLink`) roda dentro da própria
  transação SQL do commit. Não há mais proposta automática de regra nova a
  partir do extrato — regra é sempre criada manualmente pelo usuário.
- O commit do lote roda numa única transação SQL, com os deltas de saldo e o
  auto-link no mesmo commit (`import-commit.service.ts`).

## As entidades

Status: **[ativa]** = controller + UI; **[schema]** = só tabela/schema Zod,
feature futura.

### `users` [ativa]

Quem usa o app. `email` único + `passwordHash` (nunca exposto — o `userSchema`
público do Zod omite a credencial), `role` (`admin`/`user`) e `isActive`. O
login grava a sessão no processo main; todas as outras entidades pendem de um
`userId` com cascade delete.

### `accounts` [ativa]

Uma conta financeira do usuário: corrente, poupança, crédito, investimento ou
dinheiro (`ACCOUNT_TYPES`), com `accountProvider` opcional (bb, itau, nubank,
...), `currency` (default BRL) e `balance` como string decimal. `isActive`
permite arquivar sem excluir (excluir cascateia transações).

#### Limpeza/exclusão de conta (purge)

A remoção de conta é um **purge com opções** (`accounts:remove` recebe
`{ id, options }`; modal `account-cleanup-dialog` na UI, aberto pelo ícone de
vassoura na lista). Quatro ações independentes, cada uma um checkbox:

- **Apagar transações** — apaga todas as transações da conta revertendo o
  saldo linha a linha (`AccountBalanceService`), no mesmo commit SQL.
- **Apagar recorrências** — apaga as regras de `recurring` (type
  `transaction`, qualquer status) cujo `template.accountId` (JSON, sem FK)
  aponta para a conta, via `json_extract`.
- **Zerar saldo** — `balance = '0.00'` direto, sem tocar nas transações
  (corrige drift sem apagar histórico).
- **Apagar conta** — remove a linha; o FK cascade cobre qualquer transação
  remanescente.

Regra central: **apagar a conta força as outras três** (a UI trava os
checkboxes e o backend recalcula sem confiar no client). Isso fecha o bug de
recorrência órfã: sem o purge, uma regra apontando para conta apagada ficava
travada para sempre (o materializador falha em `applyBalanceDelta` e nunca
avança o `nextDate`). Tudo roda numa única transação SQL; o modal mostra
contagens reais de impacto antes de confirmar (`accounts:purge-preview`).

### `transactions` [ativa]

Um lançamento financeiro concreto numa conta: `income`, `expense` ou `transfer`
(este último ainda rejeitado), com categoria coerente com o tipo, `amount`
positivo em string decimal (o sinal vem do tipo), `date` do fato. Chaves
opcionais ligam a transação ao seu contexto: `recurringId` (veio de uma regra),
`importFingerprint` (veio de importação), e `projectId`/`budgetId`/`goalId`
(vínculos com as features futuras — já no schema para evitar migração). `tags`
é um array JSON de ids.

### `recurring` [ativa]

A regra de recorrência (ver seção acima). Vale para transações hoje e tarefas
no futuro (`RECURRING_TYPES`). `status`: `active`/`paused`/`completed`;
`source`: `manual`/`imported`; `autoMaterialize` controla se o materializador
lança as ocorrências ou se elas chegam pela importação.

### `notes` [ativa]

Nota de texto livre (`title` + `body`). Intenção: anotações rápidas pessoais,
sem vínculo com as outras entidades. UI mínima hoje.

### `budgets` [schema]

Orçamento por categoria de despesa e período (`weekly`/`monthly`/`quarterly`/
`yearly`): "quanto posso gastar de `food` por mês". `amount` é o teto, `spent`
o acumulado (ambos string decimal), com janela `startDate`–`endDate`. Pode
vincular-se a um projeto ou meta. `transactions.budgetId` já existe para a
apuração futura.

### `goals` [schema]

Meta de poupança com alvo (`targetAmount`) e progresso (`currentAmount`):
"juntar R$ X até tal data". `targetDate` opcional, flag `isCompleted`, vínculo
opcional a um projeto. Intenção: acompanhar objetivos financeiros de longo
prazo, alimentados por transações (`transactions.goalId`).

### `projects` [schema]

Empreitada pessoal que agrupa tarefas, orçamentos, metas e transações (ex.:
"reforma da casa", "viagem"). Tem `status` (planning → active → completed /
paused / archived), `priority`, datas, `progress` (0-100) e cor. É o eixo de
agregação entre o lado financeiro e o lado de produtividade.

### `tasks` [schema]

Tarefa avulsa ou de projeto, estilo kanban: `status`
(`new_request`/`pending`/`in_progress`/`paused`/`completed`/`archived`),
`priority`, `dueDate`, horas estimadas/reais (string decimal) e `order`
(posição manual na coluna — a coluna SQL chama `sort_order` por palavra
reservada). `recurringId` permite tarefas recorrentes (template `task` de
`recurring`).

### `task-comments` [schema]

Comentário de texto pertencente a exatamente uma task. Intenção: histórico de
andamento/decisões dentro da tarefa.

### `tags` [schema]

Etiqueta tipada por domínio (`TAG_TYPES`: `transaction`/`task`/`project`), com
cor e ícone. As entidades taggeáveis guardam um array JSON de ids
(`columns.ts#tagIds`) em vez de tabela de junção — trade-off deliberado de
simplicidade (single-user, SQLite local) sobre integridade referencial de tags.

## Deferido / fora de escopo

- **Transferências entre contas** — enum e coluna existem; regra de negócio não.
- **Regras de categorização aprendidas do usuário** na importação.
- **Cards de resumo financeiro (receitas/despesas/saldo do mês)** — irão na
  **home**, não nas páginas de feature.
- **Multi-usuário simultâneo / sync em nuvem** — fora de escopo por design.
- **UI de budgets, goals, projects, tasks e tags** — futuras; o schema já está
  pronto.
