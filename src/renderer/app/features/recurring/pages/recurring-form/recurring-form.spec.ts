import { GoBackService } from '@/core/navigation/go-back.service';
import { AccountsService } from '@/features/accounts/shared/accounts.service';
import {
  TransactionsService,
  type CategoryOptions,
} from '@/features/transactions/shared/transactions.service';
import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { Account, EnumOption, Recurring } from '@shared/types';
import { describe, expect, it, vi } from 'vitest';
import { RecurringService } from '../../shared/recurring.service';
import { RecurringForm, type RecurringFormModel } from './recurring-form';

/** Superfície `protected` acessada diretamente pelo teste (TS-only, sem efeito em runtime). */
interface TestableRecurringForm {
  model: WritableSignal<RecurringFormModel>;
  isEdit: () => boolean;
  onSubmit(): void;
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
  readonly transactions = { reload: vi.fn() };
}

class FakeRecurringService {
  readonly frequencies = {
    value: signal<EnumOption[] | undefined>([{ value: 'monthly', label: 'Mensal' }]),
  };
  readonly rules = { reload: vi.fn() };
  findOne = vi.fn().mockResolvedValue(recurringFixture());
  create = vi.fn().mockResolvedValue(recurringFixture());
  update = vi.fn().mockResolvedValue(recurringFixture());
}

class FakeGoBackService {
  goBackOr = vi.fn();
}

function activatedRouteStub(
  params: Record<string, string> = {},
  queryParams: Record<string, string> = {},
) {
  return {
    snapshot: {
      paramMap: convertToParamMap(params),
      queryParamMap: convertToParamMap(queryParams),
    },
  };
}

function setup(route: ReturnType<typeof activatedRouteStub>) {
  const fakeAccounts = new FakeAccountsService();
  const fakeTransactions = new FakeTransactionsService();
  const fakeRecurring = new FakeRecurringService();
  const fakeGoBack = new FakeGoBackService();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: route },
      { provide: AccountsService, useValue: fakeAccounts },
      { provide: TransactionsService, useValue: fakeTransactions },
      { provide: RecurringService, useValue: fakeRecurring },
      { provide: GoBackService, useValue: fakeGoBack },
    ],
  });
  const fixture = TestBed.createComponent(RecurringForm);
  fixture.detectChanges();
  const component = fixture.componentInstance as unknown as TestableRecurringForm;
  return { fixture, component, fakeRecurring, fakeGoBack };
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('RecurringForm — modo criação', () => {
  it('inicia vazio, sem prefill, quando não há query params', () => {
    const { component } = setup(activatedRouteStub());
    expect(component.isEdit()).toBe(false);
    expect(component.model()).toMatchObject({
      name: '',
      accountId: '',
      amount: '',
      description: '',
    });
  });

  it('prefila nome/descrição/conta/tipo/categoria/valor via query params', () => {
    const { component } = setup(
      activatedRouteStub(
        {},
        {
          accountId: 'acc-1',
          type: 'income',
          category: 'salary',
          amount: '500.00',
          description: 'Freela X',
        },
      ),
    );
    expect(component.model()).toMatchObject({
      name: 'Freela X',
      description: 'Freela X',
      accountId: 'acc-1',
      type: 'income',
      category: 'salary',
      amount: '500.00',
    });
  });

  it('submeter chama recurringService.create, recarrega regras e volta (goBackOr) para /transactions', async () => {
    const { component, fakeRecurring, fakeGoBack } = setup(activatedRouteStub());
    component.model.set({
      name: 'Nova regra',
      accountId: 'acc-1',
      type: 'expense',
      category: 'housing',
      amount: '100.00',
      description: 'Aluguel',
      frequency: 'monthly',
      startDate: '2026-07-06',
      endDate: '',
    });

    component.onSubmit();
    await flush();

    expect(fakeRecurring.create).toHaveBeenCalled();
    expect(fakeRecurring.rules.reload).toHaveBeenCalled();
    expect(fakeGoBack.goBackOr).toHaveBeenCalledWith('/transactions');
  });
});

describe('RecurringForm — modo edição', () => {
  it('carrega a regra existente e preenche o modelo', async () => {
    const { component, fakeRecurring } = setup(activatedRouteStub({ recurringId: 'rule-1' }));
    await flush();

    expect(fakeRecurring.findOne).toHaveBeenCalledWith('rule-1');
    expect(component.isEdit()).toBe(true);
    expect(component.model()).toMatchObject({
      name: 'Aluguel',
      accountId: 'acc-1',
      amount: '1500.00',
    });
  });

  it('submeter chama recurringService.update com o id da rota', async () => {
    const { component, fakeRecurring } = setup(activatedRouteStub({ recurringId: 'rule-1' }));
    await flush();

    component.onSubmit();
    await flush();

    expect(fakeRecurring.update).toHaveBeenCalledWith('rule-1', expect.any(Object));
  });
});

describe('RecurringForm — cancelar', () => {
  it('delega ao GoBackService com /transactions como fallback', () => {
    const { fixture, fakeGoBack } = setup(activatedRouteStub());
    const button = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button'),
    ).find((b) => b.textContent?.trim() === 'Cancelar');

    button?.click();

    expect(fakeGoBack.goBackOr).toHaveBeenCalledWith('/transactions');
  });
});
