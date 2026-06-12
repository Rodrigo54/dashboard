---
name: database
description: Lógica do banco de dados do Dashboard (Drizzle ORM + node:sqlite). Use ao criar/alterar tabelas, escrever queries, adicionar entidades, gerar migrações, ou trabalhar com schema, relations, enums e validação Zod das entidades (users, accounts, transactions, budgets, goals, projects, tasks, tags, recurring, notes).
---

# Banco de Dados do Dashboard

Camada de dados com **Drizzle ORM** sobre **`node:sqlite`** (driver síncrono nativo,
exige `drizzle-orm`/`drizzle-kit` na linha `1.0.0-beta` — nunca fazer downgrade).
**Não é PostgreSQL**: sem `pgEnum`, sem `jsonb`, sem `decimal` — os equivalentes
estão na seção "Convenções de coluna".

O catálogo completo de entidades, colunas e enums está em [entities.md](entities.md).

## Mapa de arquivos

| Caminho                                   | Papel                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/main/database/schema/*.ts`           | Um arquivo por tabela + `columns.ts` (builders) + `relations.ts` + barrel `index.ts` |
| `src/main/database/database.providers.ts` | `initDb()` (abre o banco, WAL, FK, migra) e `getDb()`                                |
| `src/main/database/database.module.ts`    | Barrel público — consumidores importam `getDb` e `schema` daqui                      |
| `src/shared/enums/index.ts`               | Enums `{ value: label }` + helpers `enumValues`/`enumOptions`                        |
| `src/shared/schemas/index.ts`             | Schemas Zod (`xSchema`, `createXSchema`, `updateXSchema`)                            |
| `src/shared/types/index.ts`               | Tipos inferidos via `z.infer`                                                        |
| `drizzle/`                                | Migrações geradas (commitadas; aplicadas em runtime pelo `initDb`)                   |

## Regras invioláveis da árvore de schema

1. **Imports relativos apenas** em `src/main/database/schema/` — o drizzle-kit a
   importa direto e ignora os paths do tsconfig (`@shared/*` quebra a geração).
2. **Zero imports de runtime Electron/Node** nessa árvore (nada de `electron`,
   `node:fs`, etc.) — só `drizzle-orm`, `uuid` e tipos/enums de `../../../shared`.
3. Builders compartilhados (`id`, `createdAt`, `updatedAt`, `tagIds`) vêm de
   `columns.ts` — não redeclarar inline.
4. Toda tabela nova entra no barrel `schema/index.ts` **e** no `defineRelations`
   de `relations.ts` (Relational Queries v2 — um único `defineRelations`; a API
   antiga `relations()` não existe no beta).

## Convenções de coluna (SQLite)

| Conceito                                                           | Como é feito                                                                                                                                                                                                            |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PK                                                                 | `text('id')` + `$defaultFn(() => uuidV7())` — UUIDv7 ordenável por tempo (builder `id()`)                                                                                                                               |
| Timestamps                                                         | `integer(..., { mode: 'timestamp' })` — `Date` no TS, unixepoch no banco. `createdAt()`/`updatedAt()` de `columns.ts` (o `updatedAt` tem `$onUpdate`)                                                                   |
| Boolean                                                            | `integer(..., { mode: 'boolean' })`                                                                                                                                                                                     |
| Enum                                                               | `text(..., { enum: enumValues(X) })` com o mapa de `@shared/enums` — é constraint de tipo, não enum nativo                                                                                                              |
| Valores decimais (dinheiro, horas)                                 | **Sempre `text`** com string decimal canônica (`"1234.56"`, ponto decimal, sem milhar, até 2 casas) — nunca `real`. No Zod: `decimalSchema` / `positiveDecimalSchema` / `nonNegativeDecimalSchema` de `@shared/schemas` |
| Arrays/objetos                                                     | `text(..., { mode: 'json' })` + `.$type<T>()` — ex.: `tagIds()` (array de UUIDs), `recurring.template`/`recurringPattern`                                                                                               |
| Nome reservado                                                     | Renomear a coluna física: `order: integer('sort_order')` em tasks                                                                                                                                                       |
| FK dona (user→filho)                                               | `onDelete: 'cascade'`                                                                                                                                                                                                   |
| FK de vínculo opcional (→ project/budget/goal/recurring/toAccount) | `onDelete: 'set null'`                                                                                                                                                                                                  |

## Padrão de acesso (controllers)

Toda query roda no processo main, dentro de um controller. O driver é **síncrono**:
finalize com `.all()` (lista), `.get()` (um ou undefined) — sem `await` no driver,
mas os métodos dos controllers são `async` pela envelope de IPC.

```ts
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '../database/database.module';
import { requireCurrentUser } from './session';

@list
async findAll(): Promise<schema.Account[]> {
  const user = requireCurrentUser();
  const db = getDb();
  return db.select().from(schema.accounts).where(eq(schema.accounts.userId, user.id)).all();
}
```

Regras:

- **Todo dado é isolado por usuário**: sempre `requireCurrentUser()` e filtro
  `eq(x.userId, user.id)` em select/update/delete (em update/delete, combine com
  `and(eq(x.id, id), eq(x.userId, user.id))` — nunca só pelo id).
- **Valide todo payload de entrada** com o schema Zod de `@shared/schemas`
  (`createXSchema.parse(rawData)`, `uuidSchema.parse(rawId)`); o controller recebe
  `unknown`, nunca confie no tipo.
- Mutações usam `.returning().get()` e lançam erro se nada voltou ("X não encontrado").
- API relacional disponível: `db.query.<tabela>.findMany({ with: { ... } })` —
  em transactions, os aliases são `account` (origem) e `toAccount` (destino).
- **Consulta por tag** (array JSON): não existe `@>` no SQLite — use
  `sql`EXISTS (SELECT 1 FROM json_each(${transactions.tags}) WHERE json_each.value = ${tagId})``.
- **Agregação de valores decimais** (`amount`, `spent`, etc.): como as colunas são
  `text`, um `sum(amount)` direto faz o SQLite converter para float — reintroduzindo
  exatamente o erro de precisão que a estratégia de string evita. Para somas exatas,
  agregue em **centavos como inteiro**:
  `sql<number>`sum(CAST(round(${transactions.amount} _ 100) AS INTEGER))``e divida
por 100 só na borda (formatação) —`round`antes do`CAST`evita truncamento de
float (ex.:`45.90 _ 100 = 4589.999…`). Alternativa: somar no app com aritmética
decimal sobre as strings. Nunca exponha o resultado de `sum()` float direto na UI.

## Checklist: adicionar uma entidade nova

1. `src/shared/enums/index.ts` — se houver enum novo, mapa `{ value: label } as const` + tipo `keyof typeof`.
2. `src/shared/schemas/index.ts` — `xSchema` (com `...timestamps`), `createXSchema`, `updateXSchema` (`.partial()`).
3. `src/shared/types/index.ts` — tipos `z.infer` correspondentes.
4. `src/main/database/schema/<entidade>.ts` — tabela + `export type X / NewX` (`$inferSelect`/`$inferInsert`).
5. `schema/index.ts` — exportar; `schema/relations.ts` — registrar no `defineRelations`.
6. `bun run db:generate` — gera a migração em `drizzle/` (commitar junto).
7. Controller em `src/main/controllers/` (ver skill/CLAUDE.md para o fluxo de IPC:
   `@Controller` + decorators CRUD, registrar em `controllers.providers.ts`,
   declarar canal em `shared/ipc-channels.d.ts`).
8. `bun run typecheck` antes de considerar pronto.

## Migrações e CLI

```bash
bun run db:generate   # gera migração a partir do schema -> ./drizzle
bun run db:migrate    # aplica migrações (mesmo arquivo do runtime)
bun run db:push       # schema direto no banco, sem migração (apenas dev)
bun run db:studio     # Drizzle Studio sobre o mesmo banco
```

- O `drizzle.config.ts` parseia o mesmo `environments/<env>.yml` do runtime:
  `DASHBOARD_ENV` escolhe o environment (default `development` →
  `.data/dashboard.dev.db`); `DASHBOARD_DB` sobrescreve o caminho do arquivo.
- Migrações também rodam automaticamente no boot do app (`initDb`), lendo a pasta
  `./drizzle` empacotada — **nunca editar uma migração já commitada**; gere outra.
- `initDb` ativa `PRAGMA journal_mode = WAL` e `PRAGMA foreign_keys = ON`
  (FKs **não** valem sem o pragma — não confie em cascade fora do app/CLI).
