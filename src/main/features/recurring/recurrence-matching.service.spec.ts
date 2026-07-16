import path from 'node:path';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { DatabaseSync } from 'node:sqlite';
import { v7 as uuidV7 } from 'uuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransactionCategory, TransactionType } from '@shared/enums';
import type { RecurringPattern, TransactionTemplate } from '@shared/types';
import { setDbForTests, schema, type DB } from '../../database/database.module';
import { RecurrenceMatchingService } from './recurrence-matching.service';

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
let service: RecurrenceMatchingService;
let userId: string;
let otherUserId: string;
let accountId: string;

beforeEach(() => {
  db = createTestDb();
  setDbForTests(db);
  service = new RecurrenceMatchingService();

  userId = uuidV7();
  otherUserId = uuidV7();
  db.insert(schema.users)
    .values([
      { id: userId, email: 'user@test.com', name: 'User', passwordHash: 'x' },
      { id: otherUserId, email: 'other@test.com', name: 'Other', passwordHash: 'x' },
    ])
    .run();

  accountId = insertAccount();
});

function insertAccount(balance = '0', owner = userId): string {
  const id = uuidV7();
  db.insert(schema.accounts)
    .values({ id, userId: owner, name: 'Conta', type: 'checking', balance, currency: 'BRL' })
    .run();
  return id;
}

function insertTransaction(overrides: {
  accountId?: string;
  type?: TransactionType;
  category?: TransactionCategory;
  amount?: string;
  description?: string;
  date?: Date;
  recurringId?: string | null;
  owner?: string;
}): string {
  const id = uuidV7();
  db.insert(schema.transactions)
    .values({
      id,
      userId: overrides.owner ?? userId,
      accountId: overrides.accountId ?? accountId,
      type: overrides.type ?? 'expense',
      category: overrides.category ?? 'food',
      amount: overrides.amount ?? '100.00',
      description: overrides.description ?? 'PAGTO SALARIO',
      date: overrides.date ?? new Date(2026, 6, 6),
      recurringId: overrides.recurringId ?? null,
    })
    .run();
  return id;
}

function insertRule(overrides: {
  template?: Partial<TransactionTemplate>;
  pattern?: RecurringPattern;
  startDate?: Date;
  endDate?: Date | null;
  nextDate?: Date | null;
  status?: 'active' | 'paused' | 'completed';
  executionCount?: number;
  name?: string;
  owner?: string;
}): string {
  const id = uuidV7();
  const template: TransactionTemplate = {
    accountId,
    type: 'expense',
    category: 'food',
    amount: '100.00',
    description: 'PAGTO SALARIO',
    ...overrides.template,
  };
  db.insert(schema.recurring)
    .values({
      id,
      userId: overrides.owner ?? userId,
      type: 'transaction',
      name: overrides.name ?? 'Salário',
      template,
      recurringPattern: overrides.pattern ?? monthlyPattern,
      startDate: overrides.startDate ?? new Date(2026, 0, 6),
      endDate: overrides.endDate ?? null,
      nextDate: overrides.nextDate ?? new Date(2026, 6, 6),
      status: overrides.status ?? 'active',
      executionCount: overrides.executionCount ?? 0,
    })
    .run();
  return id;
}

function getTransaction(id: string) {
  return db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).get();
}

function getRule(id: string) {
  return db.select().from(schema.recurring).where(eq(schema.recurring.id, id)).get();
}

function getAccount(id: string) {
  return db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).get();
}

describe('findMatchCandidates', () => {
  it('retorna a transação sem vínculo com o melhor candidato do mês', () => {
    const ruleId = insertRule({});
    const transactionId = insertTransaction({ date: new Date(2026, 6, 6) });

    const candidates = service.findMatchCandidates(userId, 2026, 7);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ transactionId, recurringId: ruleId });
    expect(candidates[0].score).toBeGreaterThanOrEqual(0.85);
  });

  it('ignora transações que já têm recurringId', () => {
    const ruleId = insertRule({});
    insertTransaction({ date: new Date(2026, 6, 6), recurringId: ruleId });

    expect(service.findMatchCandidates(userId, 2026, 7)).toEqual([]);
  });

  it('ignora transações fora do mês pedido', () => {
    insertRule({});
    insertTransaction({ date: new Date(2026, 5, 6) }); // junho

    expect(service.findMatchCandidates(userId, 2026, 7)).toEqual([]);
  });

  it('ignora transações do tipo transfer', () => {
    insertRule({ template: { type: 'income' } });
    insertTransaction({ type: 'transfer', category: 'food', date: new Date(2026, 6, 6) });

    expect(service.findMatchCandidates(userId, 2026, 7)).toEqual([]);
  });

  it('não mistura dados de outro usuário', () => {
    const otherAccountId = insertAccount('0', otherUserId);
    insertRule({ owner: otherUserId, template: { accountId: otherAccountId } });
    insertTransaction({
      owner: otherUserId,
      accountId: otherAccountId,
      date: new Date(2026, 6, 6),
    });

    expect(service.findMatchCandidates(userId, 2026, 7)).toEqual([]);
  });

  it('escolhe o melhor entre múltiplas regras candidatas (caso salário x 13º)', () => {
    const salaryRuleId = insertRule({
      name: 'Salário 1ª parcela',
      startDate: new Date(2026, 0, 6),
      nextDate: new Date(2026, 6, 6),
      pattern: { ...monthlyPattern, dayOfMonth: 6 },
    });
    const thirteenthRuleId = insertRule({
      name: '13º salário 1ª parcela',
      startDate: new Date(2025, 5, 30),
      nextDate: new Date(2026, 5, 30),
      pattern: {
        frequency: 'yearly',
        interval: 1,
        dayOfMonth: 30,
        businessDaysOnly: false,
        timezone: 'America/Sao_Paulo',
      },
    });
    // Pagamento cai exatamente no dia do 13º (30/jun).
    const transactionId = insertTransaction({ date: new Date(2026, 5, 30) });

    const candidates = service.findMatchCandidates(userId, 2026, 6);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].transactionId).toBe(transactionId);
    expect(candidates[0].recurringId).toBe(thirteenthRuleId);
    expect(candidates[0].recurringId).not.toBe(salaryRuleId);
  });
});

describe('findCandidatesForTransaction', () => {
  it('retorna todos os candidatos acima do threshold, ordenados desc', () => {
    const closeRuleId = insertRule({ name: 'Regra próxima' });
    insertRule({
      name: 'Regra distante',
      startDate: new Date(2026, 0, 20),
      nextDate: new Date(2026, 6, 20),
    });
    const transactionId = insertTransaction({ date: new Date(2026, 6, 6) });

    const candidates = service.findCandidatesForTransaction(userId, transactionId);

    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates[0].recurringId).toBe(closeRuleId);
    expect(candidates).toEqual([...candidates].sort((a, b) => b.score - a.score));
  });

  it('lança erro quando a transação já está vinculada', () => {
    const ruleId = insertRule({});
    const transactionId = insertTransaction({ recurringId: ruleId });

    expect(() => service.findCandidatesForTransaction(userId, transactionId)).toThrow(
      'já está vinculada',
    );
  });

  it('lança erro quando a transação não existe ou não pertence ao usuário', () => {
    const otherAccountId = insertAccount('0', otherUserId);
    const transactionId = insertTransaction({
      owner: otherUserId,
      accountId: otherAccountId,
    });

    expect(() => service.findCandidatesForTransaction(userId, transactionId)).toThrow(
      'não encontrada',
    );
  });
});

describe('linkTransaction — sem ocorrência materializada nem pendente', () => {
  it('apenas vincula quando não há ocorrência da regra perto da data', () => {
    const ruleId = insertRule({ nextDate: new Date(2026, 11, 6) }); // dez/2026, longe
    const transactionId = insertTransaction({ date: new Date(2026, 6, 6) });

    service.linkTransaction(userId, transactionId, ruleId);

    expect(getTransaction(transactionId)?.recurringId).toBe(ruleId);
    // nextDate não muda: a ocorrência vinculada não é a pendente da regra.
    expect(getRule(ruleId)?.nextDate).toEqual(new Date(2026, 11, 6));
  });
});

describe('linkTransaction — ocorrência é o nextDate pendente', () => {
  it('avança nextDate e incrementa executionCount', () => {
    const ruleId = insertRule({ nextDate: new Date(2026, 6, 6), executionCount: 3 });
    const transactionId = insertTransaction({ date: new Date(2026, 6, 6) });

    service.linkTransaction(userId, transactionId, ruleId);

    expect(getTransaction(transactionId)?.recurringId).toBe(ruleId);
    const rule = getRule(ruleId);
    expect(rule?.nextDate).toEqual(new Date(2026, 7, 6));
    expect(rule?.executionCount).toBe(4);
  });

  it('marca a regra como completed quando a próxima ocorrência passa do endDate', () => {
    const ruleId = insertRule({
      nextDate: new Date(2026, 6, 6),
      endDate: new Date(2026, 6, 31),
    });
    const transactionId = insertTransaction({ date: new Date(2026, 6, 6) });

    service.linkTransaction(userId, transactionId, ruleId);

    const rule = getRule(ruleId);
    expect(rule?.status).toBe('completed');
    expect(rule?.nextDate).toBeNull();
  });
});

describe('linkTransaction — merge com ocorrência já materializada', () => {
  it('apaga a transação materializada duplicada e reverte o saldo dela', () => {
    const ruleId = insertRule({ nextDate: new Date(2026, 7, 6) }); // já avançou
    // A materializada da ocorrência de julho (criada pelo materializador).
    const materializedId = insertTransaction({
      date: new Date(2026, 6, 6),
      recurringId: ruleId,
      amount: '100.00',
      type: 'expense',
    });
    db.update(schema.accounts)
      .set({ balance: '-100.00' })
      .where(eq(schema.accounts.id, accountId))
      .run();

    // A transação real (ex.: importada), ainda sem vínculo, mesma ocorrência.
    const realId = insertTransaction({ date: new Date(2026, 6, 7), amount: '100.00' });
    db.update(schema.accounts)
      .set({ balance: '-200.00' })
      .where(eq(schema.accounts.id, accountId))
      .run();

    service.linkTransaction(userId, realId, ruleId);

    expect(getTransaction(materializedId)).toBeUndefined();
    expect(getTransaction(realId)?.recurringId).toBe(ruleId);
    // Saldo da materializada revertido: só sobra o efeito da transação real.
    expect(getAccount(accountId)?.balance).toBe('-100.00');
  });
});

describe('unlinkTransaction', () => {
  it('limpa o recurringId sem tocar em saldo ou nextDate', () => {
    const ruleId = insertRule({ nextDate: new Date(2026, 7, 6) });
    const transactionId = insertTransaction({ recurringId: ruleId });

    service.unlinkTransaction(userId, transactionId);

    expect(getTransaction(transactionId)?.recurringId).toBeNull();
    expect(getRule(ruleId)?.nextDate).toEqual(new Date(2026, 7, 6));
  });

  it('lança erro quando a transação não está vinculada', () => {
    const transactionId = insertTransaction({});

    expect(() => service.unlinkTransaction(userId, transactionId)).toThrow('não está vinculada');
  });

  it('lança erro quando a transação não pertence ao usuário', () => {
    const otherAccountId = insertAccount('0', otherUserId);
    const transactionId = insertTransaction({ owner: otherUserId, accountId: otherAccountId });

    expect(() => service.unlinkTransaction(userId, transactionId)).toThrow('não encontrada');
  });
});
