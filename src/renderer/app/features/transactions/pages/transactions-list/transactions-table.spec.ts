import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { RecurringService } from '@/features/recurring/shared/recurring.service';
import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { EnumOption } from '@shared/enums';
import type { Account, Recurring, Transaction } from '@shared/types';
import { describe, expect, it, vi } from 'vitest';
import { type CategoryOptions, TransactionsService } from '../../shared/transactions.service';
import type { LedgerRow } from './ledger-row';
import { TransactionsTable } from './transactions-table';

/** Superfície `protected` acessada diretamente pelo teste (TS-only, sem efeito em runtime). */
interface TestableTransactionsTable {
  rows: () => LedgerRow[];
  summary: () => { income: string; expense: string; balance: string };
  searchText: WritableSignal<string>;
}

function transactionFixture(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't-1',
    userId: 'user-1',
    accountId: 'acc-1',
    toAccountId: null,
    type: 'expense',
    category: 'housing',
    amount: '1500.00',
    description: 'Aluguel',
    date: new Date(2026, 6, 5),
    projectId: null,
    budgetId: null,
    goalId: null,
    recurringId: null,
    importFingerprint: null,
    tags: [],
    createdAt: new Date(2026, 6, 5),
    updatedAt: new Date(2026, 6, 5),
    ...overrides,
  } as Transaction;
}

function recurringFixture(overrides: Partial<Recurring> = {}): Recurring {
  return {
    id: 'rule-1',
    userId: 'user-1',
    type: 'transaction',
    name: '1º Parcela do Salário',
    description: null,
    template: {
      accountId: 'acc-1',
      type: 'income',
      category: 'salary',
      amount: '3844.08',
      description: 'PAGTO SALARIO',
    },
    recurringPattern: {
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 6,
      businessDaysOnly: false,
      timezone: 'America/Sao_Paulo',
    },
    startDate: new Date(2026, 5, 6),
    endDate: null,
    nextDate: new Date(2026, 8, 6),
    status: 'active',
    source: 'manual',
    autoMaterialize: true,
    executionCount: 2,
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  } as Recurring;
}

class FakeTransactionsService {
  readonly year = signal(2026);
  readonly month = signal(7);
  readonly accountFilter = signal<string | undefined>(undefined);
  readonly typeFilter = signal<string | undefined>(undefined);
  readonly transactions = {
    value: signal<Transaction[] | undefined>([]),
    isLoading: signal(false),
    error: signal<unknown>(undefined),
    reload: vi.fn(),
  };
  readonly types = {
    value: signal<EnumOption[] | undefined>([
      { value: 'income', label: 'Receita' },
      { value: 'expense', label: 'Despesa' },
    ]),
  };
  readonly categories = {
    value: signal<CategoryOptions | undefined>({
      income: [{ value: 'salary', label: 'Salário' }],
      expense: [{ value: 'housing', label: 'Moradia' }],
    }),
  };
  readonly monthLabel = signal('julho de 2026');
  readonly isCurrentMonth = signal(false);
  goToToday = vi.fn();
  previousMonth = vi.fn();
  nextMonth = vi.fn();
}

class FakeRecurringService {
  readonly rules = {
    value: signal<Recurring[] | undefined>([]),
    isLoading: signal(false),
    error: signal<unknown>(undefined),
  };
}

class FakeAccountsService {
  readonly accounts = {
    value: signal<Account[] | undefined>([
      { id: 'acc-1', name: 'Conta Corrente', currency: 'BRL' } as Account,
    ]),
  };
}

function setup() {
  const fakeTransactions = new FakeTransactionsService();
  const fakeRecurring = new FakeRecurringService();
  const fakeAccounts = new FakeAccountsService();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: TransactionsService, useValue: fakeTransactions },
      { provide: RecurringService, useValue: fakeRecurring },
      { provide: AccountsService, useValue: fakeAccounts },
    ],
  });
  const fixture = TestBed.createComponent(TransactionsTable);
  fixture.detectChanges();
  const component = fixture.componentInstance as unknown as TestableTransactionsTable;
  return { fixture, component, fakeTransactions, fakeRecurring };
}

describe('TransactionsTable — extrato combinado', () => {
  it('mostra transações reais e previsões juntas, sem alternância de escopo', () => {
    const { component, fakeTransactions, fakeRecurring } = setup();
    fakeTransactions.transactions.value.set([transactionFixture()]);
    fakeRecurring.rules.value.set([
      recurringFixture({
        id: 'rule-2',
        name: 'Aluguel',
        nextDate: null,
        startDate: new Date(2026, 6, 20),
      }),
    ]);

    const kinds = component.rows().map((r) => r.kind);
    expect(kinds).toContain('transaction');
    expect(kinds).toContain('forecast');
  });

  it('transação vinculada a uma regra mostra o nome da regra na descrição', () => {
    const { component, fakeTransactions, fakeRecurring } = setup();
    fakeTransactions.transactions.value.set([
      transactionFixture({ description: 'PAGTO SALARIO', recurringId: 'rule-1', type: 'income' }),
    ]);
    fakeRecurring.rules.value.set([recurringFixture()]);

    const row = component.rows().find((r) => r.kind === 'transaction');
    expect(row?.description).toBe('1º Parcela do Salário');
  });
});

describe('TransactionsTable — busca por texto', () => {
  it('filtra pela descrição exibida (já com o nome da regra, quando vinculada)', () => {
    const { component, fakeTransactions } = setup();
    fakeTransactions.transactions.value.set([
      transactionFixture({ id: 't-1', description: 'Mercado' }),
      transactionFixture({ id: 't-2', description: 'Aluguel' }),
    ]);

    component.searchText.set('merc');

    expect(component.rows().map((r) => r.description)).toEqual(['Mercado']);
  });

  it('busca vazia não filtra nada', () => {
    const { component, fakeTransactions } = setup();
    fakeTransactions.transactions.value.set([
      transactionFixture({ id: 't-1', description: 'Mercado' }),
      transactionFixture({ id: 't-2', description: 'Aluguel' }),
    ]);

    expect(component.rows()).toHaveLength(2);
  });
});

describe('TransactionsTable — resumo do mês', () => {
  it('soma receitas e despesas só de transações reais, ignorando previsões', () => {
    const { component, fakeTransactions, fakeRecurring } = setup();
    fakeTransactions.transactions.value.set([
      transactionFixture({ id: 't-1', type: 'income', amount: '1000.00' }),
      transactionFixture({ id: 't-2', type: 'expense', amount: '400.00' }),
    ]);
    fakeRecurring.rules.value.set([
      recurringFixture({ id: 'rule-2', nextDate: null, startDate: new Date(2026, 6, 20) }),
    ]);

    expect(component.summary()).toEqual({
      income: '1000.00',
      expense: '400.00',
      balance: '600.00',
    });
  });
});
