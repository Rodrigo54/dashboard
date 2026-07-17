import { GoBackService } from '@/core/navigation/go-back.service';
import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { EnumOption } from '@shared/enums';
import type { CreateAccount } from '@shared/types';
import { describe, expect, it, vi } from 'vitest';
import { AccountsService } from '../../shared/accounts.service';
import { AccountsForm } from './accounts-form';

/** Superfície `protected` acessada diretamente pelo teste (TS-only, sem efeito em runtime). */
interface TestableAccountsForm {
  accountModel: WritableSignal<CreateAccount>;
  onSubmit(): void;
}

class FakeAccountsService {
  readonly accountTypes = {
    value: signal<EnumOption[] | undefined>([{ value: 'cash', label: 'Dinheiro' }]),
  };
  readonly providers = { value: signal<EnumOption[] | undefined>([]) };
  readonly currencies = {
    value: signal<EnumOption[] | undefined>([{ value: 'BRL', label: 'Real' }]),
  };
  readonly accounts = { reload: vi.fn() };
  findOne = vi.fn();
  save = vi.fn().mockResolvedValue(undefined);
}

class FakeGoBackService {
  goBackOr = vi.fn();
}

function activatedRouteStub(params: Record<string, string> = {}) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

function setup(route: ReturnType<typeof activatedRouteStub> = activatedRouteStub()) {
  const fakeAccounts = new FakeAccountsService();
  const fakeGoBack = new FakeGoBackService();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: route },
      { provide: AccountsService, useValue: fakeAccounts },
      { provide: GoBackService, useValue: fakeGoBack },
    ],
  });
  const fixture = TestBed.createComponent(AccountsForm);
  fixture.detectChanges();
  const component = fixture.componentInstance as unknown as TestableAccountsForm;
  return { fixture, component, fakeAccounts, fakeGoBack };
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('AccountsForm — cancelar', () => {
  it('delega ao GoBackService com /accounts como fallback', () => {
    const { fixture, fakeGoBack } = setup();
    const button = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('button'),
    ).find((b) => b.textContent?.trim() === 'Cancelar');

    button?.click();

    expect(fakeGoBack.goBackOr).toHaveBeenCalledWith('/accounts');
  });
});

describe('AccountsForm — salvar', () => {
  it('salva a conta, recarrega a lista e volta (goBackOr) para /accounts', async () => {
    const { component, fakeAccounts, fakeGoBack } = setup();
    component.accountModel.set({
      name: 'Conta Corrente',
      type: 'cash',
      accountProvider: '',
      balance: '100.00',
      currency: 'BRL',
      description: '',
    });

    component.onSubmit();
    await flush();

    expect(fakeAccounts.save).toHaveBeenCalled();
    expect(fakeAccounts.accounts.reload).toHaveBeenCalled();
    expect(fakeGoBack.goBackOr).toHaveBeenCalledWith('/accounts');
  });
});
