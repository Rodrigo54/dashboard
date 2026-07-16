import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { TransactionsService } from '@/features/transactions/shared/transactions.service';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Account, RecurrenceMatchCandidate } from '@shared/types';
import { describe, expect, it, vi } from 'vitest';
import { RecurringService } from '../../shared/recurring.service';
import RecurringMatches from './recurring-matches';

function candidateFixture(
  overrides: Partial<RecurrenceMatchCandidate> = {},
): RecurrenceMatchCandidate {
  return {
    transactionId: 'tx-1',
    transactionDate: new Date('2026-07-06'),
    transactionDescription: 'PAGTO SALARIO',
    transactionAmount: '3000.00',
    transactionAccountId: 'acc-1',
    recurringId: 'rule-1',
    recurringName: 'Salário',
    score: 0.92,
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
  readonly transactions = { reload: vi.fn() };
}

class FakeRecurringService {
  readonly rules = { reload: vi.fn() };
  readonly matchCandidates = {
    value: signal<RecurrenceMatchCandidate[] | undefined>([candidateFixture()]),
    isLoading: signal(false),
    error: signal<unknown>(undefined),
    reload: vi.fn(),
  };
  readonly year = signal(2026);
  readonly month = signal(7);
  readonly monthLabel = signal('julho de 2026');
  readonly isCurrentMonth = signal(true);
  previousMonth = vi.fn();
  nextMonth = vi.fn();
  goToToday = vi.fn();
  linkTransaction = vi.fn().mockResolvedValue({ transactionId: 'tx-1' });
}

function setup(candidates: RecurrenceMatchCandidate[] = [candidateFixture()]) {
  const fakeAccounts = new FakeAccountsService();
  const fakeTransactions = new FakeTransactionsService();
  const fakeRecurring = new FakeRecurringService();
  fakeRecurring.matchCandidates.value.set(candidates);
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: AccountsService, useValue: fakeAccounts },
      { provide: TransactionsService, useValue: fakeTransactions },
      { provide: RecurringService, useValue: fakeRecurring },
    ],
  });
  const fixture = TestBed.createComponent(RecurringMatches);
  fixture.detectChanges();
  return { fixture, fakeAccounts, fakeTransactions, fakeRecurring };
}

describe('RecurringMatches — apresentação', () => {
  it('lista o candidato com conta, valor e % de confiança', () => {
    const { fixture } = setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('PAGTO SALARIO');
    expect(el.textContent).toContain('Conta Itaú');
    expect(el.textContent).toContain('Salário');
    expect(el.textContent).toContain('92%');
  });

  it('mostra o estado vazio quando não há candidatos', () => {
    const { fixture } = setup([]);
    expect(fixture.nativeElement.textContent).toContain('Nenhum candidato neste mês');
  });
});

describe('RecurringMatches — ações', () => {
  it('confirmar chama linkTransaction e recarrega os candidatos', async () => {
    const { fixture, fakeRecurring } = setup();
    const button = fixture.nativeElement.querySelector<HTMLButtonElement>(
      '[aria-label="Confirmar vínculo"]',
    );
    button?.click();
    await fixture.whenStable();

    expect(fakeRecurring.linkTransaction).toHaveBeenCalledWith('tx-1', 'rule-1');
    expect(fakeRecurring.matchCandidates.reload).toHaveBeenCalled();
  });

  it('rejeitar remove o candidato da lista sem chamar nenhum serviço', async () => {
    const { fixture, fakeRecurring } = setup();
    const button = fixture.nativeElement.querySelector<HTMLButtonElement>(
      '[aria-label="Rejeitar sugestão"]',
    );
    button?.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Nenhum candidato neste mês');
    expect(fakeRecurring.linkTransaction).not.toHaveBeenCalled();
  });
});
