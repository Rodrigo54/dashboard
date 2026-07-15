import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LedgerInvalidationService } from './ledger-invalidation.service';
import { RecurringService } from './recurring.service';
import { TransactionsService } from './transactions.service';

class FakeTransactionsService {
  readonly transactions = { reload: vi.fn() };
}

class FakeAccountsService {
  readonly accounts = { reload: vi.fn() };
}

class FakeRecurringService {
  readonly rules = { reload: vi.fn() };
}

function setup() {
  const fakeTransactions = new FakeTransactionsService();
  const fakeAccounts = new FakeAccountsService();
  const fakeRecurring = new FakeRecurringService();
  TestBed.configureTestingModule({
    providers: [
      { provide: TransactionsService, useValue: fakeTransactions },
      { provide: AccountsService, useValue: fakeAccounts },
      { provide: RecurringService, useValue: fakeRecurring },
    ],
  });
  return {
    service: TestBed.inject(LedgerInvalidationService),
    fakeTransactions,
    fakeAccounts,
    fakeRecurring,
  };
}

describe('LedgerInvalidationService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  it('reloadRules recarrega só as regras', () => {
    ctx.service.reloadRules();
    expect(ctx.fakeRecurring.rules.reload).toHaveBeenCalledTimes(1);
    expect(ctx.fakeTransactions.transactions.reload).not.toHaveBeenCalled();
    expect(ctx.fakeAccounts.accounts.reload).not.toHaveBeenCalled();
  });

  it('reloadBalanceAffectingData recarrega transações e contas, não as regras', () => {
    ctx.service.reloadBalanceAffectingData();
    expect(ctx.fakeTransactions.transactions.reload).toHaveBeenCalledTimes(1);
    expect(ctx.fakeAccounts.accounts.reload).toHaveBeenCalledTimes(1);
    expect(ctx.fakeRecurring.rules.reload).not.toHaveBeenCalled();
  });
});
