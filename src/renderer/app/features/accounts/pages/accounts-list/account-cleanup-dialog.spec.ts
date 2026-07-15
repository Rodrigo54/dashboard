import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { LedgerInvalidationService } from '@/features/transactions/shared/ledger-invalidation.service';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import type { Account } from '@shared/types';
import { describe, expect, it, vi } from 'vitest';
import { AccountCleanupDialog } from './account-cleanup-dialog';

function accountFixture(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Conta Corrente',
    type: 'checking',
    accountProvider: null,
    balance: '150.00',
    currency: 'BRL',
    isActive: true,
    description: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as Account;
}

class FakeAccountsService {
  purgePreview = vi.fn().mockResolvedValue({ transactionsCount: 3, recurringCount: 2 });
  purge = vi.fn().mockResolvedValue({
    id: 'acc-1',
    deletedTransactions: 3,
    deletedRecurring: 2,
    zeroedBalance: true,
    deletedAccount: true,
  });
}

class FakeLedgerInvalidationService {
  reloadRules = vi.fn();
  reloadBalanceAffectingData = vi.fn();
}

class FakeDialogRef {
  close = vi.fn();
}

function checkbox(fixture: ComponentFixture<AccountCleanupDialog>, id: string): HTMLInputElement {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error(`Checkbox #${id} não encontrado`);
  return input;
}

function confirmButton(fixture: ComponentFixture<AccountCleanupDialog>): HTMLButtonElement {
  const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
    '[data-testid="confirm"]',
  );
  if (!button) throw new Error('Botão de confirmar não encontrado');
  return button;
}

function toggle(fixture: ComponentFixture<AccountCleanupDialog>, id: string): void {
  const input = checkbox(fixture, id);
  input.click();
  fixture.detectChanges();
}

async function setup() {
  const fakeAccounts = new FakeAccountsService();
  const fakeInvalidation = new FakeLedgerInvalidationService();
  const fakeDialogRef = new FakeDialogRef();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: AccountsService, useValue: fakeAccounts },
      { provide: LedgerInvalidationService, useValue: fakeInvalidation },
      { provide: BrnDialogRef, useValue: fakeDialogRef },
      { provide: DIALOG_DATA, useValue: { account: accountFixture() } },
    ],
  });
  const fixture = TestBed.createComponent(AccountCleanupDialog);
  fixture.detectChanges();
  // Aguarda o resource do preview resolver e reflete na view.
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, fakeAccounts, fakeInvalidation, fakeDialogRef };
}

describe('AccountCleanupDialog — estado inicial', () => {
  it('abre com tudo desmarcado, confirmar desabilitado e contagens do preview', async () => {
    const { fixture, fakeAccounts } = await setup();
    expect(fakeAccounts.purgePreview).toHaveBeenCalledWith('acc-1');
    for (const id of ['deleteTransactions', 'deleteRecurring', 'zeroBalance', 'deleteAccount']) {
      expect(checkbox(fixture, id).checked).toBe(false);
      expect(checkbox(fixture, id).disabled).toBe(false);
    }
    expect(confirmButton(fixture).disabled).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('3');
    expect(text).toContain('2');
    expect(text).toContain('Conta Corrente');
  });
});

describe('AccountCleanupDialog — regra do "apagar conta"', () => {
  it('marcar "apagar conta" força as outras opções em true e as trava', async () => {
    const { fixture } = await setup();
    toggle(fixture, 'deleteAccount');
    for (const id of ['deleteTransactions', 'deleteRecurring', 'zeroBalance']) {
      expect(checkbox(fixture, id).checked).toBe(true);
      expect(checkbox(fixture, id).disabled).toBe(true);
    }
    expect(confirmButton(fixture).disabled).toBe(false);
  });

  it('desmarcar "apagar conta" libera as outras opções e as volta para false', async () => {
    const { fixture } = await setup();
    toggle(fixture, 'deleteAccount');
    toggle(fixture, 'deleteAccount');
    for (const id of ['deleteTransactions', 'deleteRecurring', 'zeroBalance']) {
      expect(checkbox(fixture, id).checked).toBe(false);
      expect(checkbox(fixture, id).disabled).toBe(false);
    }
    expect(confirmButton(fixture).disabled).toBe(true);
  });
});

describe('AccountCleanupDialog — confirmação', () => {
  it('confirma o purge completo, recarrega saldo+regras e fecha com o resultado', async () => {
    const { fixture, fakeAccounts, fakeInvalidation, fakeDialogRef } = await setup();
    toggle(fixture, 'deleteAccount');
    confirmButton(fixture).click();
    await fixture.whenStable();

    expect(fakeAccounts.purge).toHaveBeenCalledWith('acc-1', {
      deleteTransactions: true,
      deleteRecurring: true,
      zeroBalance: true,
      deleteAccount: true,
    });
    expect(fakeInvalidation.reloadBalanceAffectingData).toHaveBeenCalled();
    expect(fakeInvalidation.reloadRules).toHaveBeenCalled();
    expect(fakeDialogRef.close).toHaveBeenCalledWith(
      expect.objectContaining({ deletedAccount: true }),
    );
  });

  it('só recorrências marcadas: recarrega apenas as regras', async () => {
    const { fixture, fakeAccounts, fakeInvalidation } = await setup();
    toggle(fixture, 'deleteRecurring');
    confirmButton(fixture).click();
    await fixture.whenStable();

    expect(fakeAccounts.purge).toHaveBeenCalledWith('acc-1', {
      deleteTransactions: false,
      deleteRecurring: true,
      zeroBalance: false,
      deleteAccount: false,
    });
    expect(fakeInvalidation.reloadRules).toHaveBeenCalled();
    expect(fakeInvalidation.reloadBalanceAffectingData).not.toHaveBeenCalled();
  });

  it('exibe o erro e mantém o modal aberto quando o purge falha', async () => {
    const { fixture, fakeAccounts, fakeDialogRef } = await setup();
    fakeAccounts.purge.mockRejectedValueOnce(new Error('falhou'));
    toggle(fixture, 'zeroBalance');
    confirmButton(fixture).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fakeDialogRef.close).not.toHaveBeenCalled();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Não foi possível concluir a operação');
  });
});
