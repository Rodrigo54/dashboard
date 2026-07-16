import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Account, Recurring } from '@shared/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecurringService } from '../../shared/recurring.service';
import RecurringList from './recurring-list';

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
    // Data local (não ISO): DatePipe renderiza em fuso local e ISO-UTC desloca
    // de dia em fusos negativos como America/Sao_Paulo.
    nextDate: new Date(2026, 7, 5),
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
      { id: 'acc-1', name: 'Conta Itaú', currency: 'BRL' } as Account,
    ]),
  };
}

class FakeRecurringService {
  readonly rules = {
    value: signal<Recurring[] | undefined>([recurringFixture()]),
    isLoading: signal(false),
    error: signal<unknown>(undefined),
    reload: vi.fn(),
  };
  pause = vi.fn().mockResolvedValue(recurringFixture({ status: 'paused' }));
  resume = vi.fn().mockResolvedValue(recurringFixture({ status: 'active' }));
  delete = vi.fn().mockResolvedValue({ id: 'rule-1' });
}

function setup(rules: Recurring[] = [recurringFixture()]) {
  const fakeAccounts = new FakeAccountsService();
  const fakeRecurring = new FakeRecurringService();
  fakeRecurring.rules.value.set(rules);
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: AccountsService, useValue: fakeAccounts },
      { provide: RecurringService, useValue: fakeRecurring },
    ],
  });
  const fixture = TestBed.createComponent(RecurringList);
  fixture.detectChanges();
  return { fixture, fakeAccounts, fakeRecurring };
}

describe('RecurringList — apresentação', () => {
  it('lista a regra com conta, frequência, próxima ocorrência, valor e status', () => {
    const { fixture } = setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Aluguel');
    expect(el.textContent).toContain('Conta Itaú');
    expect(el.textContent).toContain('Mensal');
    expect(el.textContent).toContain('05/08/2026');
    expect(el.textContent).toContain('Ativo');
  });

  it('mostra o estado vazio quando não há regras', () => {
    const { fixture } = setup([]);
    expect(fixture.nativeElement.textContent).toContain('Nenhuma recorrência cadastrada');
  });

  it('regra ativa mostra ação de pausar, sem retomar', () => {
    const { fixture } = setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[aria-label="Pausar recorrência"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="Retomar recorrência"]')).toBeFalsy();
  });

  it('regra pausada mostra ação de retomar, sem pausar', () => {
    const { fixture } = setup([recurringFixture({ status: 'paused' })]);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[aria-label="Retomar recorrência"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="Pausar recorrência"]')).toBeFalsy();
  });
});

describe('RecurringList — ações', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm');
  });

  it('pausar chama recurringService.pause e recarrega a lista', async () => {
    const { fixture, fakeRecurring } = setup();
    fixture.nativeElement
      .querySelector<HTMLButtonElement>('[aria-label="Pausar recorrência"]')
      ?.click();
    await fixture.whenStable();

    expect(fakeRecurring.pause).toHaveBeenCalledWith('rule-1');
    expect(fakeRecurring.rules.reload).toHaveBeenCalled();
  });

  it('retomar chama recurringService.resume e recarrega a lista', async () => {
    const { fixture, fakeRecurring } = setup([recurringFixture({ status: 'paused' })]);
    fixture.nativeElement
      .querySelector<HTMLButtonElement>('[aria-label="Retomar recorrência"]')
      ?.click();
    await fixture.whenStable();

    expect(fakeRecurring.resume).toHaveBeenCalledWith('rule-1');
    expect(fakeRecurring.rules.reload).toHaveBeenCalled();
  });

  it('apagar confirmado chama recurringService.delete e recarrega a lista', async () => {
    confirmSpy.mockReturnValue(true);
    const { fixture, fakeRecurring } = setup();
    fixture.nativeElement
      .querySelector<HTMLButtonElement>('[aria-label="Apagar recorrência"]')
      ?.click();
    await fixture.whenStable();

    expect(fakeRecurring.delete).toHaveBeenCalledWith('rule-1');
    expect(fakeRecurring.rules.reload).toHaveBeenCalled();
  });

  it('apagar cancelado não chama delete', async () => {
    confirmSpy.mockReturnValue(false);
    const { fixture, fakeRecurring } = setup();
    fixture.nativeElement
      .querySelector<HTMLButtonElement>('[aria-label="Apagar recorrência"]')
      ?.click();
    await fixture.whenStable();

    expect(fakeRecurring.delete).not.toHaveBeenCalled();
  });
});
