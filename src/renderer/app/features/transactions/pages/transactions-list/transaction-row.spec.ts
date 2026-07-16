import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { RecurringService } from '@/features/recurring/shared/recurring.service';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Account, Recurring, Transaction } from '@shared/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type CategoryOptions, TransactionsService } from '../../shared/transactions.service';
import type { LedgerRow } from './ledger-row';
import { TransactionRow } from './transaction-row';

function recurringFixture(overrides: Partial<Recurring> = {}): Recurring {
  return {
    id: 'rule-1',
    userId: 'user-1',
    type: 'transaction',
    name: 'Aluguel',
    description: null,
    template: {
      accountId: 'acc-1',
      type: 'expense',
      category: 'housing',
      amount: '1500.00',
      description: 'Aluguel mensal',
    },
    recurringPattern: {
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 5,
      businessDaysOnly: false,
      timezone: 'America/Sao_Paulo',
    },
    startDate: new Date('2026-01-05'),
    endDate: null,
    nextDate: null,
    status: 'active',
    source: 'manual',
    autoMaterialize: true,
    executionCount: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as Recurring;
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
    date: new Date('2026-07-05'),
    projectId: null,
    budgetId: null,
    goalId: null,
    recurringId: null,
    importFingerprint: null,
    tags: [],
    createdAt: new Date('2026-07-05'),
    updatedAt: new Date('2026-07-05'),
    ...overrides,
  } as Transaction;
}

function forecastRowFixture(overrides: Partial<LedgerRow> = {}): LedgerRow {
  const rule = recurringFixture();
  return {
    kind: 'forecast',
    key: `f:${rule.id}`,
    date: new Date('2026-07-05'),
    description: rule.name,
    accountId: 'acc-1',
    type: 'expense',
    category: 'housing',
    amount: '1500.00',
    recurring: true,
    rule,
    ruleStatus: 'active',
    ...overrides,
  };
}

function transactionRowFixture(overrides: Partial<LedgerRow> = {}): LedgerRow {
  const transaction = transactionFixture();
  return {
    kind: 'transaction',
    key: `t:${transaction.id}`,
    date: new Date('2026-07-05'),
    description: transaction.description,
    accountId: 'acc-1',
    type: 'expense',
    category: 'housing',
    amount: '1500.00',
    recurring: false,
    transaction,
    ...overrides,
  };
}

class FakeAccountsService {
  readonly accounts = {
    value: signal<Account[] | undefined>([
      { id: 'acc-1', name: 'Conta Corrente', currency: 'BRL' } as Account,
    ]),
    reload: vi.fn(),
  };
}

class FakeTransactionsService {
  readonly categories = {
    value: signal<CategoryOptions | undefined>({
      income: [{ value: 'salary', label: 'Salário' }],
      expense: [{ value: 'housing', label: 'Moradia' }],
    } as CategoryOptions),
  };
  readonly transactions = { reload: vi.fn() };
  delete = vi.fn().mockResolvedValue({ id: 't-1' });
}

class FakeRecurringService {
  readonly rules = { reload: vi.fn() };
  pause = vi.fn().mockResolvedValue(recurringFixture({ status: 'paused' }));
  resume = vi.fn().mockResolvedValue(recurringFixture({ status: 'active' }));
  materialize = vi.fn().mockResolvedValue({ id: 'rule-1', created: 1 });
}

function setup(row: LedgerRow) {
  const fakeAccounts = new FakeAccountsService();
  const fakeTransactions = new FakeTransactionsService();
  const fakeRecurring = new FakeRecurringService();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: AccountsService, useValue: fakeAccounts },
      { provide: TransactionsService, useValue: fakeTransactions },
      { provide: RecurringService, useValue: fakeRecurring },
    ],
  });
  const fixture = TestBed.createComponent(TransactionRow);
  fixture.componentRef.setInput('row', row);
  fixture.detectChanges();
  return { fixture, fakeAccounts, fakeTransactions, fakeRecurring };
}

describe('TransactionRow — apresentação', () => {
  it('linha de previsão ativa mostra badge "Previsto" e ações materialize/pause', () => {
    const { fixture } = setup(forecastRowFixture());
    const el: HTMLElement = fixture.nativeElement;
    const badge = el.querySelector('[hlmBadge]');
    expect(badge?.textContent?.trim()).toBe('Previsto');
    expect(el.querySelector('[aria-label="Lançar agora"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="Pausar recorrência"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="Retomar recorrência"]')).toBeFalsy();
  });

  it('linha de previsão pausada mostra badge "Pausada" e ação resume', () => {
    const { fixture } = setup(
      forecastRowFixture({ ruleStatus: 'paused', rule: recurringFixture({ status: 'paused' }) }),
    );
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[hlmBadge]')?.textContent?.trim()).toBe('Pausada');
    expect(el.querySelector('[aria-label="Retomar recorrência"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="Lançar agora"]')).toBeFalsy();
  });

  it('linha real recorrente mostra o ícone de recorrência, sem badge', () => {
    const { fixture } = setup(transactionRowFixture({ recurring: true }));
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[hlmBadge]')).toBeFalsy();
    expect(el.querySelector('[aria-label="Recorrente"]')).toBeTruthy();
  });

  it('linha real simples não mostra badge nem ícone de recorrência', () => {
    const { fixture } = setup(transactionRowFixture({ recurring: false }));
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[hlmBadge]')).toBeFalsy();
    expect(el.querySelector('[aria-label="Recorrente"]')).toBeFalsy();
  });

  it('linha real mostra ações de editar/apagar transação', () => {
    const { fixture } = setup(transactionRowFixture());
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[aria-label="Editar transação"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="Apagar transação"]')).toBeTruthy();
  });
});

describe('TransactionRow — ações', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm');
  });

  it('materialize chama recurringService.materialize e recarrega regras, transações e contas', async () => {
    const { fixture, fakeRecurring, fakeTransactions, fakeAccounts } = setup(forecastRowFixture());
    const button = fixture.nativeElement.querySelector<HTMLButtonElement>(
      '[aria-label="Lançar agora"]',
    );
    button?.click();
    await fixture.whenStable();

    expect(fakeRecurring.materialize).toHaveBeenCalledWith('rule-1', new Date('2026-07-05'));
    expect(fakeRecurring.rules.reload).toHaveBeenCalled();
    expect(fakeTransactions.transactions.reload).toHaveBeenCalled();
    expect(fakeAccounts.accounts.reload).toHaveBeenCalled();
  });

  it('pause chama recurringService.pause e recarrega só as regras', async () => {
    const { fixture, fakeRecurring, fakeTransactions, fakeAccounts } = setup(forecastRowFixture());
    const button = fixture.nativeElement.querySelector<HTMLButtonElement>(
      '[aria-label="Pausar recorrência"]',
    );
    button?.click();
    await fixture.whenStable();

    expect(fakeRecurring.pause).toHaveBeenCalledWith('rule-1');
    expect(fakeRecurring.rules.reload).toHaveBeenCalled();
    expect(fakeTransactions.transactions.reload).not.toHaveBeenCalled();
    expect(fakeAccounts.accounts.reload).not.toHaveBeenCalled();
  });

  it('resume chama recurringService.resume e recarrega regras, transações e contas', async () => {
    const { fixture, fakeRecurring, fakeTransactions, fakeAccounts } = setup(
      forecastRowFixture({ ruleStatus: 'paused', rule: recurringFixture({ status: 'paused' }) }),
    );
    const button = fixture.nativeElement.querySelector<HTMLButtonElement>(
      '[aria-label="Retomar recorrência"]',
    );
    button?.click();
    await fixture.whenStable();

    expect(fakeRecurring.resume).toHaveBeenCalledWith('rule-1');
    expect(fakeRecurring.rules.reload).toHaveBeenCalled();
    expect(fakeTransactions.transactions.reload).toHaveBeenCalled();
    expect(fakeAccounts.accounts.reload).toHaveBeenCalled();
  });

  it('apagar confirma, chama transactionsService.delete e recarrega transações e contas', async () => {
    confirmSpy.mockReturnValue(true);
    const { fixture, fakeTransactions, fakeAccounts } = setup(transactionRowFixture());
    const button = fixture.nativeElement.querySelector<HTMLButtonElement>(
      '[aria-label="Apagar transação"]',
    );
    button?.click();
    await fixture.whenStable();

    expect(fakeTransactions.delete).toHaveBeenCalledWith('t-1');
    expect(fakeTransactions.transactions.reload).toHaveBeenCalled();
    expect(fakeAccounts.accounts.reload).toHaveBeenCalled();
  });

  it('apagar cancelado não chama delete', async () => {
    confirmSpy.mockReturnValue(false);
    const { fixture, fakeTransactions } = setup(transactionRowFixture());
    const button = fixture.nativeElement.querySelector<HTMLButtonElement>(
      '[aria-label="Apagar transação"]',
    );
    button?.click();
    await fixture.whenStable();

    expect(fakeTransactions.delete).not.toHaveBeenCalled();
  });
});
