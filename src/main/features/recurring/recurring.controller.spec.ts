import path from 'node:path';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { DatabaseSync } from 'node:sqlite';
import { v7 as uuidV7 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecurringPattern, TransactionTemplate } from '@shared/types';
import { clearCurrentUser, setCurrentUser } from '../../core/session';
import { setDbForTests, schema, type DB } from '../../database/database.module';
import { RecurringController } from './recurring.controller';

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
let controller: RecurringController;
let userId: string;
let accountId: string;

beforeEach(() => {
  db = createTestDb();
  setDbForTests(db);
  controller = new RecurringController();

  userId = uuidV7();
  db.insert(schema.users)
    .values({ id: userId, email: 'user@test.com', name: 'User', passwordHash: 'x' })
    .run();
  setCurrentUser({
    id: userId,
    email: 'user@test.com',
    name: 'User',
    avatar: null,
    role: 'user',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  accountId = uuidV7();
  db.insert(schema.accounts)
    .values({
      id: accountId,
      userId,
      name: 'Conta',
      type: 'checking',
      balance: '0',
      currency: 'BRL',
    })
    .run();
});

afterEach(() => {
  clearCurrentUser();
});

function insertTransaction(date: Date, recurringId: string | null = null): string {
  const id = uuidV7();
  db.insert(schema.transactions)
    .values({
      id,
      userId,
      accountId,
      type: 'expense',
      category: 'food',
      amount: '100.00',
      description: 'PAGTO SALARIO',
      date,
      recurringId,
    })
    .run();
  return id;
}

function insertRule(nextDate: Date): string {
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
      name: 'Salário',
      template,
      recurringPattern: monthlyPattern,
      startDate: new Date(2026, 0, 6),
      nextDate,
      status: 'active',
    })
    .run();
  return id;
}

describe('matchCandidates', () => {
  it('devolve os candidatos do mês pedido, escopados ao usuário atual', async () => {
    const ruleId = insertRule(new Date(2026, 6, 6));
    const transactionId = insertTransaction(new Date(2026, 6, 6));

    const candidates = await controller.matchCandidates({ year: 2026, month: 7 });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ transactionId, recurringId: ruleId });
  });

  it('rejeita filtro inválido', async () => {
    await expect(controller.matchCandidates({ year: 2026, month: 13 })).rejects.toThrow();
  });
});

describe('matchCandidatesForTransaction', () => {
  it('devolve os candidatos de uma transação específica', async () => {
    const ruleId = insertRule(new Date(2026, 6, 6));
    const transactionId = insertTransaction(new Date(2026, 6, 6));

    const candidates = await controller.matchCandidatesForTransaction(transactionId);

    expect(candidates[0]).toMatchObject({ recurringId: ruleId });
  });
});

describe('linkTransaction', () => {
  it('vincula a transação à regra e devolve o id', async () => {
    const ruleId = insertRule(new Date(2026, 6, 6));
    const transactionId = insertTransaction(new Date(2026, 6, 6));

    const result = await controller.linkTransaction({ transactionId, recurringId: ruleId });

    expect(result).toEqual({ transactionId });
    const linked = db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, transactionId))
      .get();
    expect(linked?.recurringId).toBe(ruleId);
  });
});

describe('unlinkTransaction', () => {
  it('desvincula a transação e devolve o id', async () => {
    const ruleId = insertRule(new Date(2026, 6, 6));
    const transactionId = insertTransaction(new Date(2026, 6, 6), ruleId);

    const result = await controller.unlinkTransaction(transactionId);

    expect(result).toEqual({ transactionId });
    const unlinked = db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, transactionId))
      .get();
    expect(unlinked?.recurringId).toBeNull();
  });
});
