import { addDecimal } from '@shared/decimal';
import type { EnumOption } from '@shared/enums';
import type { Account } from '@shared/types';

/** Label do grupo para contas sem `accountProvider` definido; sempre ordenado por último. */
export const NO_PROVIDER_LABEL = 'Sem provedor';

export interface AccountGroupSubtotal {
  currency: string;
  amount: string;
}

export interface AccountGroup {
  provider: string | null;
  label: string;
  accounts: Account[];
  /** Um item por moeda distinta presente no grupo — evita somar valores de moedas diferentes. */
  subtotals: AccountGroupSubtotal[];
}

/**
 * Agrupa contas por `accountProvider`, ordenando os grupos alfabeticamente pelo
 * label (com "Sem provedor" sempre por último) e as contas de cada grupo por nome.
 */
export function groupAccountsByProvider(
  accounts: readonly Account[],
  providers: readonly EnumOption[],
): AccountGroup[] {
  const labelByProvider = new Map(providers.map((option) => [option.value, option.label]));

  const buckets = new Map<string | null, Account[]>();
  for (const account of accounts) {
    const key = account.accountProvider ?? null;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(account);
    else buckets.set(key, [account]);
  }

  const groups: AccountGroup[] = Array.from(buckets.entries()).map(([provider, groupAccounts]) => ({
    provider,
    label: provider ? (labelByProvider.get(provider) ?? provider) : NO_PROVIDER_LABEL,
    accounts: [...groupAccounts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    subtotals: subtotalsByCurrency(groupAccounts),
  }));

  return groups.sort((a, b) => {
    if (a.provider === null) return 1;
    if (b.provider === null) return -1;
    return a.label.localeCompare(b.label, 'pt-BR');
  });
}

/** Soma os saldos por moeda — se o grupo tiver moedas diferentes, cada uma vira um subtotal separado. */
function subtotalsByCurrency(accounts: readonly Account[]): AccountGroupSubtotal[] {
  const sumsByCurrency = new Map<string, string>();
  for (const account of accounts) {
    const previous = sumsByCurrency.get(account.currency) ?? '0.00';
    sumsByCurrency.set(account.currency, addDecimal(previous, account.balance));
  }
  return Array.from(sumsByCurrency.entries()).map(([currency, amount]) => ({ currency, amount }));
}
