import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { DatabaseSync } from 'node:sqlite';
import { v7 as uuidV7 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCurrentUser, setCurrentUser } from '../../core/session';
import { schema, setDbForTests, type DB } from '../../database/database.module';
import { TransactionsController } from './transactions.controller';

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

let db: DB;
let controller: TransactionsController;
let userId: string;
let otherUserId: string;
let accountId: string;

beforeEach(() => {
  db = createTestDb();
  setDbForTests(db);
  controller = new TransactionsController();

  userId = uuidV7();
  otherUserId = uuidV7();
  db.insert(schema.users)
    .values([
      { id: userId, email: 'user@test.com', name: 'User', passwordHash: 'x' },
      { id: otherUserId, email: 'other@test.com', name: 'Other', passwordHash: 'x' },
    ])
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
    })
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
});

afterEach(() => {
  clearCurrentUser();
});

function insertTransaction(
  date: Date,
  recurringId: string | null,
  owner = userId,
  ownerAccountId = accountId,
): string {
  const id = uuidV7();
  db.insert(schema.transactions)
    .values({
      id,
      userId: owner,
      accountId: ownerAccountId,
      type: 'expense',
      category: 'food',
      amount: '10.00',
      description: 'x',
      date,
      recurringId,
    })
    .run();
  return id;
}

function insertRule(owner = userId, ownerAccountId = accountId): string {
  const id = uuidV7();
  db.insert(schema.recurring)
    .values({
      id,
      userId: owner,
      type: 'transaction',
      name: 'Regra',
      template: {
        accountId: ownerAccountId,
        type: 'expense',
        category: 'food',
        amount: '10',
        description: 'x',
      },
      recurringPattern: {
        frequency: 'monthly',
        interval: 1,
        businessDaysOnly: false,
        timezone: 'America/Sao_Paulo',
      },
      startDate: new Date(),
    })
    .run();
  return id;
}

describe('byRecurring', () => {
  it('devolve só as transações da recorrência, mais recentes primeiro', async () => {
    const recurringId = insertRule();
    const older = insertTransaction(new Date(2026, 0, 5), recurringId);
    const newer = insertTransaction(new Date(2026, 5, 5), recurringId);
    insertTransaction(new Date(2026, 5, 5), null); // sem recorrência, não deve aparecer

    const result = await controller.byRecurring({ recurringId });

    expect(result.map((t) => t.id)).toEqual([newer, older]);
  });

  it('respeita o limite informado', async () => {
    const recurringId = insertRule();
    for (let i = 0; i < 5; i += 1) insertTransaction(new Date(2026, i, 5), recurringId);

    const result = await controller.byRecurring({ recurringId, limit: 2 });

    expect(result).toHaveLength(2);
  });

  it('não mistura transações de outro usuário', async () => {
    const otherAccountId = uuidV7();
    db.insert(schema.accounts)
      .values({
        id: otherAccountId,
        userId: otherUserId,
        name: 'Conta',
        type: 'checking',
        balance: '0',
        currency: 'BRL',
      })
      .run();
    const recurringId = insertRule(otherUserId, otherAccountId);
    insertTransaction(new Date(2026, 0, 5), recurringId, otherUserId, otherAccountId);

    expect(await controller.byRecurring({ recurringId })).toEqual([]);
  });
});
