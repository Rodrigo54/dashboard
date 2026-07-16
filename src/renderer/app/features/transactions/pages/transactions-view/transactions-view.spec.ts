import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { RecurringService } from '@/features/recurring/shared/recurring.service';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import type { Account, Recurring, RecurrenceMatchCandidate, Transaction } from '@shared/types';
import { describe, expect, it, vi } from 'vitest';
import { TransactionsService, type CategoryOptions } from '../../shared/transactions.service';
import TransactionsView from './transactions-view';

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

function candidateFixture(
  overrides: Partial<RecurrenceMatchCandidate> = {},
): RecurrenceMatchCandidate {
  return {
    transactionId: 't-1',
    transactionDate: new Date(2026, 6, 5),
    transactionDescription: 'Aluguel',
    transactionAmount: '1500.00',
    transactionAccountId: 'acc-1',
    recurringId: 'rule-1',
    recurringName: 'Aluguel',
    score: 0.75,
    ...overrides,
  };
}

class FakeAccountsService {
  readonly accounts = {
    value: signal<Account[] | undefined>([
      { id: 'acc-1', name: 'Conta Itaú', currency: 'BRL' } as Account,
    ]),
    reload: vi.fn(),
  };
}

class FakeTransactionsService {
  readonly categories = {
    value: signal<CategoryOptions | undefined>({
      income: [{ value: 'salary', label: 'Salário' }],
      expense: [{ value: 'housing', label: 'Moradia' }],
    }),
  };
  readonly transactions = { reload: vi.fn() };
  findOne = vi.fn().mockResolvedValue(transactionFixture());
  byRecurring = vi.fn().mockResolvedValue([]);
}

class FakeRecurringService {
  readonly rules = { reload: vi.fn() };
  findOne = vi.fn().mockResolvedValue(recurringFixture());
  matchCandidatesForTransaction = vi.fn().mockResolvedValue([]);
  linkTransaction = vi.fn().mockResolvedValue({ transactionId: 't-1' });
  unlinkTransaction = vi.fn().mockResolvedValue({ transactionId: 't-1' });
}

/** Espera o `#load()` assíncrono do componente terminar (microtasks + CD). */
async function flush(fixture: {
  whenStable(): Promise<unknown>;
  detectChanges(): void;
}): Promise<void> {
  await fixture.whenStable();
  // #load() encadeia vários await (findOne -> Promise.all) — um único
  // microtask não é suficiente; um macrotask garante que tudo já resolveu.
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function setup(
  options: {
    transaction?: Partial<Transaction>;
    candidates?: RecurrenceMatchCandidate[];
  } = {},
) {
  const fakeAccounts = new FakeAccountsService();
  const fakeTransactions = new FakeTransactionsService();
  const fakeRecurring = new FakeRecurringService();
  fakeTransactions.findOne.mockResolvedValue(transactionFixture(options.transaction));
  if (options.candidates) {
    fakeRecurring.matchCandidatesForTransaction.mockResolvedValue(options.candidates);
  }

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ transactionId: 't-1' }) } },
      },
      { provide: AccountsService, useValue: fakeAccounts },
      { provide: TransactionsService, useValue: fakeTransactions },
      { provide: RecurringService, useValue: fakeRecurring },
    ],
  });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(TransactionsView);
  fixture.detectChanges();
  return { fixture, fakeAccounts, fakeTransactions, fakeRecurring, router };
}

describe('TransactionsView — transação vinculada', () => {
  it('mostra o resumo da regra e permite desvincular', async () => {
    const { fixture, fakeRecurring } = setup({ transaction: { recurringId: 'rule-1' } });
    await flush(fixture);

    expect(fixture.nativeElement.textContent).toContain('Recorrência vinculada');
    expect(fixture.nativeElement.textContent).toContain('Aluguel');

    const button = fixture.nativeElement.querySelector<HTMLButtonElement>(
      'button:has(ng-icon[name="lucideUnlink"])',
    );
    button?.click();
    await flush(fixture);

    expect(fakeRecurring.unlinkTransaction).toHaveBeenCalledWith('t-1');
    expect(fakeRecurring.rules.reload).toHaveBeenCalled();
  });
});

describe('TransactionsView — transação sem vínculo', () => {
  it('lista candidatos e vincular chama linkTransaction', async () => {
    const { fixture, fakeRecurring } = setup({ candidates: [candidateFixture()] });
    await flush(fixture);

    expect(fixture.nativeElement.textContent).toContain('75%');
    const linkButton = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button'),
    ).find((b) => b.textContent?.trim() === 'Vincular');
    linkButton?.click();
    await flush(fixture);

    expect(fakeRecurring.linkTransaction).toHaveBeenCalledWith('t-1', 'rule-1');
  });

  it('sem candidatos, não mostra a tabela de sugestões', async () => {
    const { fixture } = setup();
    await flush(fixture);
    expect(fixture.nativeElement.textContent).not.toContain('pode pertencer');
  });

  it('criar recorrência navega para /recurring/new com os dados da transação', async () => {
    const { fixture, router } = setup();
    await flush(fixture);

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
});
