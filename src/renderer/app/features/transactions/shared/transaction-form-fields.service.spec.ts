import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FieldState } from '@angular/forms/signals';
import type { EnumOption } from '@shared/enums';
import type { Account } from '@shared/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { type CategoryOptions, TransactionsService } from './transactions.service';
import {
  fieldErrorOf,
  TransactionFormFieldsService,
  type TransactionCoreFields,
} from './transaction-form-fields.service';

function fakeAccount(overrides: Partial<Account> = {}): Account {
  return { id: 'acc-1', name: 'Conta Corrente', currency: 'BRL', ...overrides } as Account;
}

function fieldState(touched: boolean, message?: string): FieldState<string> {
  return {
    touched: () => touched,
    errors: () => (message ? [{ message }] : []),
  } as unknown as FieldState<string>;
}

class FakeAccountsService {
  readonly accounts = { value: signal<Account[] | undefined>(undefined) };
}

class FakeTransactionsService {
  readonly categories = { value: signal<CategoryOptions | undefined>(undefined) };
}

const categories: CategoryOptions = {
  income: [{ value: 'salary', label: 'Salário' }] as EnumOption[],
  expense: [{ value: 'rent', label: 'Aluguel' }] as EnumOption[],
};

/** Instancia o service com fakes de AccountsService/TransactionsService via TestBed. */
function setup(): {
  service: TransactionFormFieldsService;
  fakeAccounts: FakeAccountsService;
  fakeTransactions: FakeTransactionsService;
} {
  const fakeAccounts = new FakeAccountsService();
  const fakeTransactions = new FakeTransactionsService();
  TestBed.configureTestingModule({
    providers: [
      { provide: AccountsService, useValue: fakeAccounts },
      { provide: TransactionsService, useValue: fakeTransactions },
    ],
  });
  return { service: TestBed.inject(TransactionFormFieldsService), fakeAccounts, fakeTransactions };
}

describe('TransactionFormFieldsService.currencySymbol', () => {
  it('usa R$ quando nenhuma conta está selecionada', () => {
    const { service } = setup();
    const model = signal<TransactionCoreFields>({ accountId: '', type: 'expense', category: '' });
    expect(service.currencySymbol(model)()).toBe('R$');
  });

  it('resolve pela moeda da conta selecionada', () => {
    const { service, fakeAccounts } = setup();
    fakeAccounts.accounts.value.set([fakeAccount({ id: 'acc-usd', currency: 'USD' })]);
    const model = signal<TransactionCoreFields>({
      accountId: 'acc-usd',
      type: 'expense',
      category: '',
    });
    expect(service.currencySymbol(model)()).toBe('$');
  });

  it('cai em R$ quando a moeda da conta não é reconhecida', () => {
    const { service, fakeAccounts } = setup();
    fakeAccounts.accounts.value.set([fakeAccount({ id: 'acc-1', currency: 'XXX' })]);
    const model = signal<TransactionCoreFields>({
      accountId: 'acc-1',
      type: 'expense',
      category: '',
    });
    expect(service.currencySymbol(model)()).toBe('R$');
  });
});

describe('TransactionFormFieldsService.categoryOptions', () => {
  it('retorna o grupo income quando o tipo é income', () => {
    const { service, fakeTransactions } = setup();
    fakeTransactions.categories.value.set(categories);
    const model = signal<TransactionCoreFields>({ accountId: '', type: 'income', category: '' });
    expect(service.categoryOptions(model)()).toEqual(categories.income);
  });

  it('retorna o grupo expense quando o tipo é expense', () => {
    const { service, fakeTransactions } = setup();
    fakeTransactions.categories.value.set(categories);
    const model = signal<TransactionCoreFields>({ accountId: '', type: 'expense', category: '' });
    expect(service.categoryOptions(model)()).toEqual(categories.expense);
  });

  it('retorna vazio enquanto as categorias não carregaram', () => {
    const { service } = setup();
    const model = signal<TransactionCoreFields>({ accountId: '', type: 'expense', category: '' });
    expect(service.categoryOptions(model)()).toEqual([]);
  });
});

describe('TransactionFormFieldsService.accountItems', () => {
  it('mapeia contas para { value, label }', () => {
    const { service, fakeAccounts } = setup();
    fakeAccounts.accounts.value.set([fakeAccount({ id: 'acc-1', name: 'Conta Corrente' })]);
    expect(service.accountItems()()).toEqual([{ value: 'acc-1', label: 'Conta Corrente' }]);
  });

  it('retorna vazio sem contas carregadas', () => {
    const { service } = setup();
    expect(service.accountItems()()).toEqual([]);
  });
});

describe('TransactionFormFieldsService.wireCategoryReset', () => {
  let service: TransactionFormFieldsService;
  let fakeTransactions: FakeTransactionsService;

  beforeEach(() => {
    ({ service, fakeTransactions } = setup());
    fakeTransactions.categories.value.set(categories);
  });

  it('limpa a categoria quando ela não pertence às opções do novo tipo', () => {
    const model = signal<TransactionCoreFields>({
      accountId: '',
      type: 'income',
      category: 'rent',
    });
    TestBed.runInInjectionContext(() => service.wireCategoryReset(model));
    TestBed.tick();
    expect(model().category).toBe('');
  });

  it('preserva a categoria quando ela é válida para o tipo atual', () => {
    const model = signal<TransactionCoreFields>({
      accountId: '',
      type: 'expense',
      category: 'rent',
    });
    TestBed.runInInjectionContext(() => service.wireCategoryReset(model));
    TestBed.tick();
    expect(model().category).toBe('rent');
  });

  it('não mexe quando a categoria já está vazia', () => {
    const model = signal<TransactionCoreFields>({ accountId: '', type: 'income', category: '' });
    TestBed.runInInjectionContext(() => service.wireCategoryReset(model));
    TestBed.tick();
    expect(model().category).toBe('');
  });
});

describe('fieldErrorOf', () => {
  it('retorna vazio quando o campo não foi tocado', () => {
    expect(fieldErrorOf(fieldState(false, 'obrigatório'))).toBe('');
  });

  it('retorna a primeira mensagem de erro quando tocado', () => {
    expect(fieldErrorOf(fieldState(true, 'obrigatório'))).toBe('obrigatório');
  });

  it('retorna vazio quando tocado e sem erros', () => {
    expect(fieldErrorOf(fieldState(true))).toBe('');
  });
});
