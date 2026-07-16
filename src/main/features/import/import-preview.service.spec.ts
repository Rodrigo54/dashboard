import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { DatabaseSync } from 'node:sqlite';
import { v7 as uuidV7 } from 'uuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecurringPattern, TransactionTemplate } from '@shared/types';
import { setDbForTests, schema, type DB } from '../../database/database.module';
import type { StatementParseOutput } from './bank-parser.service';
import { ImportPreviewService } from './import-preview.service';

vi.mock('../../core/services.providers', () => ({
  inject: (token: new () => object) => new token(),
  initServices: vi.fn(),
}));

function createTestDb(): DB {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  const db = drizzle({ client: sqlite, schema, relations: schema.relations });
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  return db;
}

const monthlyPattern: RecurringPattern = {
  frequency: 'monthly',
  interval: 1,
  dayOfMonth: 6,
  businessDaysOnly: false,
  timezone: 'America/Sao_Paulo',
};

let db: DB;
let service: ImportPreviewService;
let userId: string;
let accountId: string;

beforeEach(() => {
  db = createTestDb();
  setDbForTests(db);
  service = new ImportPreviewService();

  userId = uuidV7();
  db.insert(schema.users)
    .values({ id: userId, email: 'user@test.com', name: 'User', passwordHash: 'x' })
    .run();

  accountId = uuidV7();
  db.insert(schema.accounts)
    .values({
      id: accountId,
      userId,
      name: 'Conta',
      type: 'checking',
      balance: '0',
      currency: 'BRL',
      accountProvider: 'itau',
    })
    .run();
});

function insertRule(overrides: {
  name?: string;
  startDate?: Date;
  nextDate?: Date | null;
}): string {
  const id = uuidV7();
  const template: TransactionTemplate = {
    accountId,
    type: 'expense',
    category: 'food',
    amount: '100.00',
    description: 'PAGTO SALARIO',
  };
  db.insert(schema.recurring)
    .values({
      id,
      userId,
      type: 'transaction',
      name: overrides.name ?? 'Salário',
      template,
      recurringPattern: monthlyPattern,
      startDate: overrides.startDate ?? new Date(2026, 0, 6),
      nextDate: overrides.nextDate === undefined ? new Date(2026, 6, 6) : overrides.nextDate,
      status: 'active',
    })
    .run();
  return id;
}

function parsed(overrides: Partial<StatementParseOutput> = {}): StatementParseOutput {
  return {
    bank: 'itau',
    kind: 'statement',
    lines: [],
    reconciliation: { balanced: true },
    ...overrides,
  };
}

/** Preview de uma única linha, com defaults de "pagamento de salário casável". */
function buildOneLine(overrides: Partial<StatementParseOutput['lines'][number]> = {}) {
  return service.build(userId, {
    ...parsed(),
    lines: [
      {
        date: new Date(2026, 6, 6),
        description: 'PAGTO SALARIO',
        amount: '100.00',
        type: 'expense',
        ...overrides,
      },
    ],
  });
}

describe('build — resolução de conta e categoria', () => {
  it('sugere a conta pelo provedor do banco e categoriza pela descrição', () => {
    const preview = service.build(userId, {
      ...parsed(),
      lines: [
        {
          date: new Date(2026, 6, 6),
          description: 'IFOOD LANCHONETE',
          amount: '35.00',
          type: 'expense',
        },
      ],
    });

    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0].suggestedAccountId).toBe(accountId);
    expect(preview.rows[0].suggestedCategory).toBe('food');
    expect(preview.rows[0].include).toBe(true);
  });
});

describe('build — match com recorrência (auto-link previsto)', () => {
  it('anexa o match quando a linha bate o threshold de auto-link', () => {
    const ruleId = insertRule({});

    const preview = buildOneLine();

    expect(preview.rows[0].match).toMatchObject({ recurringId: ruleId, recurringName: 'Salário' });
    expect(preview.rows[0].match?.occurrenceDate).toEqual(new Date(2026, 6, 6));
  });

  it('não anexa match quando duas regras da mesma conta empatam', () => {
    insertRule({ name: 'Regra A' });
    insertRule({ name: 'Regra B' });

    expect(buildOneLine().rows[0].match).toBeUndefined();
  });
});

describe('build — match com merge de materializada existente', () => {
  it('indica materializedTransactionId quando já existe uma transação na data da ocorrência', () => {
    const ruleId = insertRule({ nextDate: new Date(2026, 7, 6) }); // já avançou
    const materializedId = uuidV7();
    db.insert(schema.transactions)
      .values({
        id: materializedId,
        userId,
        accountId,
        type: 'expense',
        category: 'food',
        amount: '100.00',
        description: 'PAGTO SALARIO',
        date: new Date(2026, 6, 6),
        recurringId: ruleId,
      })
      .run();

    const preview = buildOneLine({ date: new Date(2026, 6, 7) });

    expect(preview.rows[0].match?.materializedTransactionId).toBe(materializedId);
  });

  it('não anexa match quando a linha já é duplicada (fingerprint existente)', () => {
    insertRule({});
    const first = buildOneLine();
    // Grava a transação com o mesmo fingerprint calculado pela primeira preview.
    db.insert(schema.transactions)
      .values({
        id: uuidV7(),
        userId,
        accountId,
        type: 'expense',
        category: 'food',
        amount: '100.00',
        description: 'PAGTO SALARIO',
        date: new Date(2026, 6, 6),
        importFingerprint: first.rows[0].fingerprint,
      })
      .run();

    const second = buildOneLine();
    expect(second.rows[0].duplicate).toBe(true);
    expect(second.rows[0].match).toBeUndefined();
  });
});
