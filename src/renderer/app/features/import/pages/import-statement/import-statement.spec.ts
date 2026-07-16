import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { LedgerInvalidationService } from '@/features/transactions/shared/ledger-invalidation.service';
import { TransactionsService } from '@/features/transactions/shared/transactions.service';
import { provideZonelessChangeDetection, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Account, ImportPreview, StagedTransaction } from '@shared/types';
import { describe, expect, it, vi } from 'vitest';
import { ImportService } from '../../shared/import.service';
import { toStagingRow, type StagingRow } from '../../shared/staging-row';
import ImportStatement from './import-statement';

function accountFixture(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-credit',
    userId: 'user-1',
    name: 'Cartão Itaú',
    type: 'credit',
    accountProvider: 'itau',
    balance: '-100.00',
    currency: 'BRL',
    isActive: true,
    description: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as Account;
}

const CREDIT = accountFixture();
const CHECKING = accountFixture({
  id: 'acc-checking',
  name: 'Conta Corrente Itaú',
  type: 'checking',
  balance: '500.00',
});

function invoicePreview(): ImportPreview {
  const row: StagedTransaction = {
    key: 'fp-1',
    date: new Date('2026-06-02'),
    description: 'EC *TICKETMAST',
    amount: '487.50',
    type: 'expense',
    suggestedAccountId: CREDIT.id,
    suggestedCategory: 'shopping',
    fingerprint: 'fp-1',
    duplicate: false,
    include: true,
    reversal: false,
  };
  return {
    bank: 'itau',
    kind: 'invoice',
    fileName: 'Fatura_Itau.pdf',
    rows: [row],
    reconciliation: { balanced: true },
  };
}

class FakeAccountsService {
  accounts = { value: () => [CREDIT, CHECKING] };
}
class FakeTransactionsService {
  categories = { value: () => [] };
}
class FakeImportService {
  preview = vi.fn();
  commit = vi.fn().mockResolvedValue({ inserted: 1, reconciled: 0, skipped: 0 });
}
class FakeLedgerInvalidationService {
  reloadRules = vi.fn();
  reloadBalanceAffectingData = vi.fn();
}

/** Acessa os signals internos do componente para montar o estado de preview. */
interface Internals {
  preview: WritableSignal<ImportPreview | null>;
  rows: WritableSignal<StagingRow[]>;
  accountId: WritableSignal<string>;
}

async function setup() {
  const fakeImport = new FakeImportService();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: AccountsService, useValue: new FakeAccountsService() },
      { provide: TransactionsService, useValue: new FakeTransactionsService() },
      { provide: ImportService, useValue: fakeImport },
      { provide: LedgerInvalidationService, useValue: new FakeLedgerInvalidationService() },
    ],
  });
  const fixture = TestBed.createComponent(ImportStatement);
  const internals = fixture.componentInstance as unknown as Internals;
  const preview = invoicePreview();
  internals.preview.set(preview);
  internals.rows.set(preview.rows.map(toStagingRow));
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, internals, fakeImport };
}

function confirmButton(fixture: ComponentFixture<ImportStatement>): HTMLButtonElement {
  const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
    '[data-testid="import-confirm"]',
  );
  if (!button) throw new Error('Botão de importar não encontrado');
  return button;
}

describe('ImportStatement — fatura exige conta de crédito', () => {
  it('bloqueia o botão e mostra o aviso quando a conta escolhida não é crédito', async () => {
    const { fixture, internals } = await setup();
    internals.accountId.set(CHECKING.id);
    fixture.detectChanges();

    expect(confirmButton(fixture).disabled).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('só pode ser importada para uma conta de crédito');
  });

  it('libera o botão quando a conta escolhida é de crédito', async () => {
    const { fixture, internals } = await setup();
    internals.accountId.set(CREDIT.id);
    fixture.detectChanges();

    expect(confirmButton(fixture).disabled).toBe(false);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('só pode ser importada para uma conta de crédito');
  });

  it('confirm() não grava nada enquanto a conta não é crédito', async () => {
    const { fixture, internals, fakeImport } = await setup();
    internals.accountId.set(CHECKING.id);
    fixture.detectChanges();

    confirmButton(fixture).click();
    await fixture.whenStable();
    expect(fakeImport.commit).not.toHaveBeenCalled();
  });
});
