import { Injectable, resource } from '@angular/core';
import type { Account, CreateAccount, UpdateAccount, UUID } from '@shared/types';

import { invoke } from '@/shared/ipc/invoke';

/** Opção `{ value, label }` para selects, espelhando `enumOptions` do main. */
export interface EnumOption {
  value: string;
  label: string;
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

  delete(id: UUID): Promise<{ id: UUID }> {
    return invoke<{ id: UUID }>('accounts:remove', id);
  }
}
