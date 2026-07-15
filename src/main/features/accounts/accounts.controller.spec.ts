import path from 'node:path';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { DatabaseSync } from 'node:sqlite';
import { v7 as uuidV7 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCurrentUser, setCurrentUser } from '../../core/session';
import { schema, setDbForTests, type DB } from '../../database/database.module';
import { AccountsController } from './accounts.controller';

// Substitui o registry real (cujo `import.meta.glob` eager avalia todos os
// services do main e não roda sob Vitest). Os services usados aqui não têm
// dependências, então `inject` pode simplesmente instanciar o token na hora.
vi.mock('../../core/services.providers', () => ({
  inject: (token: new () => object) => new token(),
  initServices: vi.fn(),
}));

/** DB sqlite em memória, migrada com o schema real — sem depender do Electron `app`. */
function createTestDb(): DB {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  const db = drizzle({ client: sqlite, schema, relations: schema.relations });
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  return db;
}

let db: DB;
let controller: AccountsController;
let userId: string;
let otherUserId: string;

beforeEach(() => {
  db = createTestDb();
  setDbForTests(db);
  controller = new AccountsController();

  userId = uuidV7();
  otherUserId = uuidV7();
  db.insert(schema.users)
    .values([
      { id: userId, email: 'user@test.com', name: 'User', passwordHash: 'x' },
      { id: otherUserId, email: 'other@test.com', name: 'Other', passwordHash: 'x' },
    ])
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

function insertAccount(balance = '0', owner = userId): string {
  const id = uuidV7();
  db.insert(schema.accounts)
    .values({ id, userId: owner, name: 'Conta', type: 'checking', balance, currency: 'BRL' })
    .run();
  return id;
}

function insertTransaction(
  accountId: string,
  type: 'income' | 'expense',
  category: 'salary' | 'food',
  amount: string,
): string {
  const id = uuidV7();
  db.insert(schema.transactions)
    .values({ id, userId, accountId, type, category, amount, description: 'x', date: new Date() })
    .run();
  return id;
}

function insertRecurring(accountId: string): string {
  const id = uuidV7();
  db.insert(schema.recurring)
    .values({
      id,
      userId,
      type: 'transaction',
      name: 'Regra',
      template: { accountId, type: 'expense', category: 'food', amount: '10', description: 'x' },
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

function getAccount(id: string) {
  return db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).get();
}

function getRule(id: string) {
  return db.select().from(schema.recurring).where(eq(schema.recurring.id, id)).get();
}

function countTransactions(accountId: string): number {
  return db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.accountId, accountId))
    .all().length;
}

describe('delete — apagar transações', () => {
  it('apaga só as transações e reverte o saldo, mantendo conta e recorrências', async () => {
    const accountId = insertAccount('70.00');
    insertTransaction(accountId, 'income', 'salary', '100.00');
    insertTransaction(accountId, 'expense', 'food', '30.00');
    const recurringId = insertRecurring(accountId);

    const result = await controller.delete({
      id: accountId,
      options: {
        deleteTransactions: true,
        deleteRecurring: false,
        zeroBalance: false,
        deleteAccount: false,
      },
    });

    expect(result).toEqual({
      id: accountId,
      deletedTransactions: 2,
      deletedRecurring: 0,
      zeroedBalance: false,
      deletedAccount: false,
    });
    expect(countTransactions(accountId)).toBe(0);
    expect(getAccount(accountId)?.balance).toBe('0.00');
    expect(getRule(recurringId)).toBeDefined();
  });
});

describe('delete — zerar saldo', () => {
  it('zera o saldo direto quando zeroBalance=true, sem tocar nas transações', async () => {
    const accountId = insertAccount('250.00');
    insertTransaction(accountId, 'income', 'salary', '100.00');

    const result = await controller.delete({
      id: accountId,
      options: {
        deleteTransactions: false,
        deleteRecurring: false,
        zeroBalance: true,
        deleteAccount: false,
      },
    });

    expect(result.zeroedBalance).toBe(true);
    expect(result.deletedTransactions).toBe(0);
    expect(getAccount(accountId)?.balance).toBe('0.00');
    expect(countTransactions(accountId)).toBe(1);
  });
});

describe('delete — apagar recorrências', () => {
  it('apaga só as recorrências vinculadas à conta (via json_extract), preservando as demais', async () => {
    const accountId = insertAccount();
    const otherAccountId = insertAccount();
    const matchingRuleId = insertRecurring(accountId);
    const otherRuleId = insertRecurring(otherAccountId);

    const result = await controller.delete({
      id: accountId,
      options: {
        deleteTransactions: false,
        deleteRecurring: true,
        zeroBalance: false,
        deleteAccount: false,
      },
    });

    expect(result.deletedRecurring).toBe(1);
    expect(getRule(matchingRuleId)).toBeUndefined();
    expect(getRule(otherRuleId)).toBeDefined();
  });
});

describe('delete — apagar conta', () => {
  it('força transações/recorrências/saldo mesmo se o client mandar false', async () => {
    const accountId = insertAccount('999.00');
    insertTransaction(accountId, 'income', 'salary', '50.00');
    const recurringId = insertRecurring(accountId);

    const result = await controller.delete({
      id: accountId,
      options: {
        deleteTransactions: false,
        deleteRecurring: false,
        zeroBalance: false,
        deleteAccount: true,
      },
    });

    expect(result).toEqual({
      id: accountId,
      deletedTransactions: 1,
      deletedRecurring: 1,
      zeroedBalance: true,
      deletedAccount: true,
    });
    expect(getAccount(accountId)).toBeUndefined();
    expect(getRule(recurringId)).toBeUndefined();
  });
});

describe('delete — validação', () => {
  it('rejeita quando nenhuma opção está marcada, sem alterar nada', async () => {
    const accountId = insertAccount('10.00');

    await expect(
      controller.delete({
        id: accountId,
        options: {
          deleteTransactions: false,
          deleteRecurring: false,
          zeroBalance: false,
          deleteAccount: false,
        },
      }),
    ).rejects.toThrow();

    expect(getAccount(accountId)?.balance).toBe('10.00');
  });

  it('lança erro se a conta não pertencer ao usuário atual', async () => {
    const accountId = insertAccount('10.00', otherUserId);

    await expect(
      controller.delete({
        id: accountId,
        options: {
          deleteTransactions: false,
          deleteRecurring: false,
          zeroBalance: true,
          deleteAccount: false,
        },
      }),
    ).rejects.toThrow('Conta não encontrada');

    expect(getAccount(accountId)?.balance).toBe('10.00');
  });
});

describe('purgePreview', () => {
  it('retorna a contagem de transações e recorrências vinculadas', async () => {
    const accountId = insertAccount();
    const otherAccountId = insertAccount();
    insertTransaction(accountId, 'income', 'salary', '10.00');
    insertTransaction(accountId, 'expense', 'food', '5.00');
    insertRecurring(accountId);
    insertRecurring(otherAccountId);

    const preview = await controller.purgePreview(accountId);

    expect(preview).toEqual({ transactionsCount: 2, recurringCount: 1 });
  });
});
