# Catálogo de Entidades

Referência das tabelas reais em `src/main/database/schema/`. Dois domínios:
**Financeiro** (accounts, transactions, budgets, goals) e **Produtividade**
(projects, tasks, task-comments, tags, recurring, notes), todos pendurados em
`users` (isolamento por `userId`, cascade no delete do usuário).

```
users ─┬─ accounts ──── transactions (accountId / toAccountId)
       ├─ budgets ◄──── transactions.budgetId
       ├─ goals ◄────── transactions.goalId   (goals ◄─ budgets.goalId)
       ├─ projects ◄─── transactions / tasks / budgets / goals (.projectId)
       ├─ tasks ──────── taskComments
       ├─ tags          (referenciadas por arrays JSON, sem tabela de junção)
       ├─ recurring ◄── transactions.recurringId / tasks.recurringId
       └─ notes
```

Colunas comuns a todas as tabelas: `id` (UUIDv7 text), `createdAt`, `updatedAt`.
Omitidas abaixo.

## users

| Coluna       | Tipo                   | Notas                                                   |
| ------------ | ---------------------- | ------------------------------------------------------- |
| email        | text                   | `.unique()`                                             |
| name         | text                   | notNull                                                 |
| passwordHash | text (`password_hash`) | **nunca** atravessa o IPC — ausente do `userSchema` Zod |
| avatar       | text                   | nullable                                                |
| role         | enum `USER_ROLES`      | `admin` \| `user`, default `user`                       |
| isActive     | boolean                | default true                                            |

## accounts

| Coluna          | Tipo                 | Notas                                                                    |
| --------------- | -------------------- | ------------------------------------------------------------------------ |
| userId          | FK users             | cascade                                                                  |
| name            | text                 | notNull                                                                  |
| type            | enum `ACCOUNT_TYPES` | checking/savings/credit/investment/cash                                  |
| accountProvider | text                 | nullable; valores sugeridos em `ACCOUNT_PROVIDERS`                       |
| balance         | **text**             | string decimal, default `'0'` — não é número!                            |
| currency        | text                 | default `'BRL'`; valores em `CURRENCIES`, símbolos em `CURRENCY_SYMBOLS` |
| isActive        | boolean              | default true                                                             |
| description     | text                 | nullable                                                                 |

## transactions

| Coluna                                      | Tipo                          | Notas                                             |
| ------------------------------------------- | ----------------------------- | ------------------------------------------------- |
| userId                                      | FK users                      | cascade                                           |
| accountId                                   | FK accounts                   | cascade — conta de origem                         |
| toAccountId                                 | FK accounts                   | set null — destino, só em `transfer`              |
| type                                        | enum `TRANSACTION_TYPES`      | income/expense/transfer                           |
| category                                    | enum `TRANSACTION_CATEGORIES` | 5 de receita + 11 de despesa                      |
| amount                                      | **text** decimal              | string decimal positiva (`positiveDecimalSchema`) |
| description                                 | text                          | notNull                                           |
| date                                        | timestamp                     | notNull                                           |
| projectId / budgetId / goalId / recurringId | FKs opcionais                 | set null                                          |
| tags                                        | json `string[]`               | builder `tagIds()`, default `[]`                  |

Relations: aliases `account` (origem) e `toAccount` (destino);
no lado de accounts: `transactions` e `incomingTransactions`.

## budgets

| Coluna              | Tipo                          | Notas                                      |
| ------------------- | ----------------------------- | ------------------------------------------ |
| userId              | FK users                      | cascade                                    |
| projectId / goalId  | FKs opcionais                 | set null                                   |
| name                | text                          | notNull                                    |
| category            | enum `TRANSACTION_CATEGORIES` |                                            |
| amount              | **text** decimal              | limite (`positiveDecimalSchema`)           |
| spent               | **text** decimal              | default `'0'` (`nonNegativeDecimalSchema`) |
| period              | enum `BUDGET_PERIODS`         | weekly/monthly/quarterly/yearly            |
| startDate / endDate | timestamp                     | ambos notNull                              |

## goals

| Coluna        | Tipo             | Notas                                      |
| ------------- | ---------------- | ------------------------------------------ |
| userId        | FK users         | cascade                                    |
| projectId     | FK opcional      | set null                                   |
| name          | text             | notNull                                    |
| description   | text             | nullable                                   |
| targetAmount  | **text** decimal | `positiveDecimalSchema`                    |
| currentAmount | **text** decimal | default `'0'` (`nonNegativeDecimalSchema`) |
| targetDate    | timestamp        | nullable                                   |
| isCompleted   | boolean          | default false                              |

## projects

| Coluna                            | Tipo                    | Notas                                                         |
| --------------------------------- | ----------------------- | ------------------------------------------------------------- |
| userId                            | FK users                | cascade                                                       |
| name                              | text                    | notNull                                                       |
| description                       | text                    | nullable                                                      |
| status                            | enum `PROJECT_STATUSES` | planning/active/paused/completed/archived, default `planning` |
| priority                          | enum `TASK_PRIORITIES`  | default `medium`                                              |
| startDate / endDate / completedAt | timestamp               | nullable                                                      |
| progress                          | integer                 | 0–100, default 0                                              |
| color                             | text                    | hex, nullable                                                 |
| tags                              | json `string[]`         | `tagIds()`                                                    |

## tasks

| Coluna                       | Tipo                   | Notas                                                                        |
| ---------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| userId                       | FK users               | cascade                                                                      |
| projectId / recurringId      | FKs opcionais          | set null                                                                     |
| title                        | text                   | notNull                                                                      |
| description                  | text                   | nullable                                                                     |
| status                       | enum `TASK_STATUSES`   | new_request/pending/in_progress/paused/completed/archived, default `pending` |
| priority                     | enum `TASK_PRIORITIES` | low/medium/high/urgent, default `medium`                                     |
| dueDate / completedAt        | timestamp              | nullable                                                                     |
| estimatedHours / actualHours | **text** decimal       | nullable (`positiveDecimalSchema`)                                           |
| tags                         | json `string[]`        | `tagIds()`                                                                   |
| order                        | integer (`sort_order`) | coluna física renomeada (palavra reservada), default 0                       |

## task_comments

| Coluna | Tipo     | Notas   |
| ------ | -------- | ------- |
| taskId | FK tasks | cascade |
| userId | FK users | cascade |
| body   | text     | notNull |

## tags

| Coluna       | Tipo             | Notas                    |
| ------------ | ---------------- | ------------------------ |
| userId       | FK users         | cascade                  |
| name         | text             | notNull                  |
| type         | enum `TAG_TYPES` | transaction/task/project |
| color / icon | text             | nullable                 |

Sem tabela de junção: transactions/tasks/projects guardam `tags` como array
JSON de UUIDs. Busca por tag via `json_each` (ver SKILL.md).

## recurring

| Coluna             | Tipo                      | Notas                                                                  |
| ------------------ | ------------------------- | ---------------------------------------------------------------------- |
| userId             | FK users                  | cascade                                                                |
| type               | enum `RECURRING_TYPES`    | transaction \| task                                                    |
| name               | text                      | notNull                                                                |
| description        | text                      | nullable                                                               |
| template           | json                      | `TransactionTemplate \| TaskTemplate` (união discriminada pelo `type`) |
| recurringPattern   | json                      | `RecurringPattern`                                                     |
| startDate          | timestamp                 | notNull                                                                |
| endDate / nextDate | timestamp                 | nullable                                                               |
| status             | enum `RECURRING_STATUSES` | active/paused/completed, default `active`                              |
| executionCount     | integer                   | default 0                                                              |

Shapes JSON (Zod em `src/shared/schemas/index.ts`):

```ts
// recurringPatternSchema
{ frequency: 'daily'|'weekly'|'monthly'|'yearly', interval: number /* default 1 */,
  dayOfMonth?: 1–31, dayOfWeek?: 0–6, businessDaysOnly: boolean /* default false */,
  timezone: string /* default 'America/Sao_Paulo' */ }

// transactionTemplateSchema
{ accountId: uuid, type, category, amount: string /* decimal */, description: string }

// taskTemplateSchema
{ title: string, description?, priority /* default 'medium' */,
  projectId?: uuid, estimatedHours?: string /* decimal */ }
```

## notes

| Coluna | Tipo     | Notas        |
| ------ | -------- | ------------ |
| userId | FK users | cascade      |
| title  | text     | notNull      |
| body   | text     | default `''` |

## Enums (`src/shared/enums/index.ts`)

Mapas `{ value: 'Label PT-BR' } as const`. No Drizzle: `enumValues(MAP)`;
em selects do renderer: `enumOptions(MAP)` → `{ value, label }[]`.

`USER_ROLES`, `ACCOUNT_TYPES`, `ACCOUNT_PROVIDERS`, `CURRENCIES` (+
`CURRENCY_SYMBOLS`), `TRANSACTION_TYPES`, `TRANSACTION_CATEGORIES`,
`TASK_STATUSES`, `TASK_PRIORITIES`, `PROJECT_STATUSES`, `RECURRING_TYPES`,
`RECURRING_FREQUENCIES`, `RECURRING_STATUSES`, `TAG_TYPES`, `BUDGET_PERIODS`.
