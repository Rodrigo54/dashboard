import path from 'node:path';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { DatabaseSync } from 'node:sqlite';
import { v7 as uuidV7 } from 'uuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportCommitItem, RecurringPattern, TransactionTemplate } from '@shared/types';
import { setDbForTests, schema, type DB } from '../../database/database.module';
import { ImportCommitService } from './import-commit.service';

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
let service: ImportCommitService;
let userId: string;
let accountId: string;
let otherAccountId: string;

beforeEach(() => {
  db = createTestDb();
  setDbForTests(db);
  service = new ImportCommitService();

  userId = uuidV7();
  db.insert(schema.users)
    .values({ id: userId, email: 'user@test.com', name: 'User', passwordHash: 'x' })
    .run();

  accountId = insertAccount();
  otherAccountId = insertAccount();
});

function insertAccount(balance = '0'): string {
  const id = uuidV7();
  db.insert(schema.accounts)
    .values({ id, userId, name: 'Conta', type: 'checking', balance, currency: 'BRL' })
    .run();
  return id;
}

function insertRule(overrides: {
  id?: string;
  name?: string;
  accountId?: string;
  pattern?: RecurringPattern;
  startDate?: Date;
  nextDate?: Date | null;
  amount?: string;
  description?: string;
}): string {
  const id = overrides.id ?? uuidV7();
  const template: TransactionTemplate = {
    accountId: overrides.accountId ?? accountId,
    type: 'expense',
    category: 'food',
    amount: overrides.amount ?? '100.00',
    description: overrides.description ?? 'PAGTO SALARIO',
  };
  db.insert(schema.recurring)
    .values({
      id,
      userId,
      type: 'transaction',
      name: overrides.name ?? 'Salário',
      template,
      recurringPattern: overrides.pattern ?? monthlyPattern,
      startDate: overrides.startDate ?? new Date(2026, 0, 6),
      nextDate: overrides.nextDate === undefined ? new Date(2026, 6, 6) : overrides.nextDate,
      status: 'active',
    })
    .run();
  return id;
}

function insertMaterialized(recurringId: string, date: Date, amount = '100.00'): string {
  const id = uuidV7();
  db.insert(schema.transactions)
    .values({
      id,
      userId,
      accountId,
      type: 'expense',
      category: 'food',
      amount,
      description: 'PAGTO SALARIO',
      date,
      recurringId,
    })
    .run();
  return id;
}

function item(overrides: Partial<ImportCommitItem> = {}): ImportCommitItem {
  return {
    accountId,
    type: 'expense',
    category: 'food',
    amount: '100.00',
    description: 'PAGTO SALARIO',
    date: new Date(2026, 6, 6),
    fingerprint: `fp-${uuidV7()}`,
    ...overrides,
  };
}

function getAccount(id: string) {
  return db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).get();
}

function getRule(id: string) {
  return db.select().from(schema.recurring).where(eq(schema.recurring.id, id)).get();
}

function transactionsOf(accId: string) {
  return db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.accountId, accId))
    .all();
}

describe('commit — inserção simples', () => {
  it('insere a linha e aplica o delta de saldo, sem regras ativas', () => {
    const result = service.commit(userId, [item({ amount: '50.00' })]);

    expect(result).toEqual({ inserted: 1, reconciled: 0, skipped: 0 });
    expect(getAccount(accountId)?.balance).toBe('-50.00');
  });

  it('pula linha com fingerprint já existente na conta', () => {
    const fingerprint = 'dup-1';
    service.commit(userId, [item({ fingerprint, amount: '10.00' })]);
    const result = service.commit(userId, [item({ fingerprint, amount: '10.00' })]);

    expect(result).toEqual({ inserted: 0, reconciled: 0, skipped: 1 });
    expect(transactionsOf(accountId)).toHaveLength(1);
  });
});

describe('commit — auto-link sem duplicata materializada', () => {
  it('vincula a linha à regra e avança o nextDate quando a ocorrência é a pendente', () => {
    const ruleId = insertRule({});

    const result = service.commit(userId, [item({ date: new Date(2026, 6, 6) })]);

    expect(result).toEqual({ inserted: 1, reconciled: 0, skipped: 0 });
    const [transaction] = transactionsOf(accountId);
    expect(transaction.recurringId).toBe(ruleId);
    expect(getRule(ruleId)?.nextDate).toEqual(new Date(2026, 7, 6));
  });
});

describe('commit — auto-link com merge de materializada existente', () => {
  it('remove a materializada duplicada, reverte o saldo dela e conta como reconciliado', () => {
    const ruleId = insertRule({ nextDate: new Date(2026, 7, 6) }); // já avançou
    const materializedId = insertMaterialized(ruleId, new Date(2026, 6, 6));
    db.update(schema.accounts)
      .set({ balance: '-100.00' })
      .where(eq(schema.accounts.id, accountId))
      .run();

    const result = service.commit(userId, [item({ date: new Date(2026, 6, 7), amount: '100.00' })]);

    expect(result).toEqual({ inserted: 0, reconciled: 1, skipped: 0 });
    const remaining = transactionsOf(accountId);
    expect(remaining.find((t) => t.id === materializedId)).toBeUndefined();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].recurringId).toBe(ruleId);
    // Saldo: -100 (materializada) revertido +100, -100 (linha real) = -100.
    expect(getAccount(accountId)?.balance).toBe('-100.00');
  });
});

describe('commit — auto-link bloqueado', () => {
  it('não vincula quando duas regras da mesma conta empatam (margem insuficiente)', () => {
    insertRule({ id: uuidV7(), name: 'Regra A' });
    insertRule({ id: uuidV7(), name: 'Regra B' });

    const result = service.commit(userId, [item({ date: new Date(2026, 6, 6) })]);

    expect(result).toEqual({ inserted: 1, reconciled: 0, skipped: 0 });
    expect(transactionsOf(accountId)[0].recurringId).toBeNull();
  });

  it('não vincula com regra de outra conta, mesmo com score alto', () => {
    insertRule({ accountId: otherAccountId });

    const result = service.commit(userId, [item({ accountId, date: new Date(2026, 6, 6) })]);

    expect(result).toEqual({ inserted: 1, reconciled: 0, skipped: 0 });
    expect(transactionsOf(accountId)[0].recurringId).toBeNull();
  });
});
