import { Injectable, resource } from '@angular/core';
import type { EnumOption } from '@shared/enums';
import type {
  Account,
  AccountPurgeOptions,
  CreateAccount,
  UpdateAccount,
  UUID,
} from '@shared/types';

import { invoke } from '@/core/ipc/invoke';

/** Contagens de impacto exibidas no modal de limpeza antes de confirmar. */
export interface AccountPurgePreview {
  transactionsCount: number;
  recurringCount: number;
}

/** Eco do backend com o que foi de fato executado (deleteAccount força o resto). */
export interface AccountPurgeResult {
  id: UUID;
  deletedTransactions: number;
  deletedRecurring: number;
  zeroedBalance: boolean;
  deletedAccount: boolean;
}

@Injectable({ providedIn: 'root' })
export class AccountsService {
  /** Lista de contas; recarregue com `accounts.reload()` após mutações. */
  readonly accounts = resource<Account[], unknown>({
    loader: () => invoke<Account[]>('accounts:list'),
  });

  readonly accountTypes = resource<EnumOption[], unknown>({
    loader: () => invoke<EnumOption[]>('accounts:types'),
  });

  readonly providers = resource<EnumOption[], unknown>({
    loader: () => invoke<EnumOption[]>('accounts:providers'),
  });

  readonly currencies = resource<EnumOption[], unknown>({
    loader: () => invoke<EnumOption[]>('accounts:currencies'),
  });

  findOne(id: UUID): Promise<Account> {
    return invoke<Account>('accounts:read', id);
  }

  /** Upsert: cria quando `id` é omitido, atualiza quando informado. */
  save(data: CreateAccount | UpdateAccount, id?: UUID): Promise<Account> {
    return invoke<Account>('accounts:save', { id, data });
  }

  /** Contagens de transações/recorrências vinculadas — carregadas ao abrir o modal de limpeza. */
  purgePreview(id: UUID): Promise<AccountPurgePreview> {
    return invoke<AccountPurgePreview>('accounts:purge-preview', id);
  }

  /** Limpeza/exclusão de conta conforme as opções (ver accountPurgeOptionsSchema). */
  purge(id: UUID, options: AccountPurgeOptions): Promise<AccountPurgeResult> {
    return invoke<AccountPurgeResult>('accounts:remove', { id, options });
  }
}
