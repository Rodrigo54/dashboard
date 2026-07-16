import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { RecurringService } from '@/features/recurring/shared/recurring.service';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import type { Account, EnumOption, Recurring, Transaction } from '@shared/types';
import { describe, expect, it, vi } from 'vitest';
import { type CategoryOptions, TransactionsService } from '../../shared/transactions.service';
import { TransactionsForm } from './transactions-form';

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
    name: 'Aluguel mensal',
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
    startDate: new Date(2026, 0, 5),
    endDate: null,
    nextDate: new Date(2026, 7, 5),
    status: 'active',
    source: 'manual',
    autoMaterialize: true,
    executionCount: 0,
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  } as Recurring;
}

class FakeAccountsService {
  readonly accounts = {
    value: signal<Account[] | undefined>([
      { id: 'acc-1', name: 'Conta', currency: 'BRL' } as Account,
    ]),
    reload: vi.fn(),
  };
}

class FakeTransactionsService {
  readonly types = {
    value: signal<EnumOption[] | undefined>([{ value: 'expense', label: 'Despesa' }]),
  };
  readonly categories = {
    value: signal<CategoryOptions | undefined>({
      income: [{ value: 'salary', label: 'Salário' }],
      expense: [{ value: 'housing', label: 'Moradia' }],
    }),
  };
  readonly transactions = { reload: vi.fn() };
  findOne = vi.fn().mockResolvedValue(transactionFixture());
  save = vi.fn().mockResolvedValue(transactionFixture());
}

class FakeRecurringService {
  readonly frequencies = {
    value: signal<EnumOption[] | undefined>([{ value: 'monthly', label: 'Mensal' }]),
  };
  readonly rules = { reload: vi.fn() };
  findOne = vi.fn().mockResolvedValue(recurringFixture());
  create = vi.fn().mockResolvedValue(recurringFixture());
}

function activatedRouteStub(params: Record<string, string> = {}) {
  return {
    snapshot: { paramMap: convertToParamMap(params), queryParamMap: convertToParamMap({}) },
  };
}

function setup(route: ReturnType<typeof activatedRouteStub>, transaction?: Partial<Transaction>) {
  const fakeAccounts = new FakeAccountsService();
  const fakeTransactions = new FakeTransactionsService();
  const fakeRecurring = new FakeRecurringService();
  if (transaction) fakeTransactions.findOne.mockResolvedValue(transactionFixture(transaction));

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: route },
      { provide: AccountsService, useValue: fakeAccounts },
      { provide: TransactionsService, useValue: fakeTransactions },
      { provide: RecurringService, useValue: fakeRecurring },
    ],
  });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(TransactionsForm);
  fixture.detectChanges();
  return { fixture, fakeRecurring, router };
}

async function flush(fixture: {
  whenStable(): Promise<unknown>;
  detectChanges(): void;
}): Promise<void> {
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('TransactionsForm — vínculo com recorrência (edição)', () => {
  it('mostra o resumo da regra quando a transação está vinculada', async () => {
    const { fixture } = setup(activatedRouteStub({ transactionId: 't-1' }), {
      recurringId: 'rule-1',
    });
    await flush(fixture);

    expect(fixture.nativeElement.textContent).toContain('Recorrência vinculada');
    expect(fixture.nativeElement.textContent).toContain('Aluguel mensal');
  });

  it('sem vínculo, mostra o botão de criar recorrência que navega com prefill', async () => {
    const { fixture, router } = setup(activatedRouteStub({ transactionId: 't-1' }));
    await flush(fixture);

    expect(fixture.nativeElement.textContent).not.toContain('Recorrência vinculada');
    const button = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button'),
    ).find((b) => b.textContent?.includes('Criar recorrência'));
    button?.click();
    await flush(fixture);

    expect(router.navigate).toHaveBeenCalledWith(['/recurring/new'], {
      queryParams: {
        accountId: 'acc-1',
        type: 'expense',
        category: 'housing',
        amount: '1500.00',
        description: 'Aluguel',
      },
    });
  });

  it('no modo criação (sem transactionId), não mostra nenhum dos dois blocos', () => {
    const { fixture } = setup(activatedRouteStub());
    expect(fixture.nativeElement.textContent).not.toContain('Recorrência vinculada');
    expect(fixture.nativeElement.textContent).not.toContain('Criar recorrência a partir');
  });
});
