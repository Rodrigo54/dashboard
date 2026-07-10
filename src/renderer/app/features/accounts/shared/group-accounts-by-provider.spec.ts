import { describe, expect, it } from 'vitest';

import type { EnumOption } from '@shared/enums';
import type { Account } from '@shared/types';

import { groupAccountsByProvider, NO_PROVIDER_LABEL } from './group-accounts-by-provider';

const PROVIDERS: EnumOption[] = [
  { value: 'bb', label: 'Banco do Brasil' },
  { value: 'itau', label: 'Itaú' },
  { value: 'nubank', label: 'Nubank' },
];

function account(overrides: Partial<Account>): Account {
  return {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    name: 'Conta',
    type: 'checking',
    accountProvider: null,
    balance: '0.00',
    currency: 'BRL',
    isActive: true,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('groupAccountsByProvider', () => {
  it('agrupa contas pelo accountProvider', () => {
    const accounts = [
      account({ name: 'Conta Corrente', accountProvider: 'bb', balance: '200.00' }),
      account({ name: 'Cartão de Crédito', accountProvider: 'bb', balance: '-1400.00' }),
      account({ name: 'Conta Corrente', accountProvider: 'itau', balance: '4000.00' }),
    ];

    const groups = groupAccountsByProvider(accounts, PROVIDERS);

    expect(groups.map((g) => g.label)).toEqual(['Banco do Brasil', 'Itaú']);
    expect(groups[0].accounts).toHaveLength(2);
    expect(groups[1].accounts).toHaveLength(1);
  });

  it('ordena os grupos alfabeticamente pelo label do provider', () => {
    const accounts = [
      account({ accountProvider: 'nubank' }),
      account({ accountProvider: 'bb' }),
      account({ accountProvider: 'itau' }),
    ];

    const groups = groupAccountsByProvider(accounts, PROVIDERS);

    expect(groups.map((g) => g.label)).toEqual(['Banco do Brasil', 'Itaú', 'Nubank']);
  });

  it('ordena as contas dentro do grupo alfabeticamente pelo nome', () => {
    const accounts = [
      account({ name: 'Poupança', accountProvider: 'bb' }),
      account({ name: 'Cartão de Crédito', accountProvider: 'bb' }),
      account({ name: 'Conta Corrente', accountProvider: 'bb' }),
    ];

    const groups = groupAccountsByProvider(accounts, PROVIDERS);

    expect(groups[0].accounts.map((a) => a.name)).toEqual([
      'Cartão de Crédito',
      'Conta Corrente',
      'Poupança',
    ]);
  });

  it('coloca contas sem provider num grupo "Sem provedor" sempre por último', () => {
    const accounts = [
      account({ name: 'Dinheiro', accountProvider: null }),
      account({ name: 'Conta Corrente', accountProvider: 'nubank' }),
      account({ name: 'Carteira', accountProvider: undefined }),
    ];

    const groups = groupAccountsByProvider(accounts, PROVIDERS);

    expect(groups.map((g) => g.label)).toEqual(['Nubank', NO_PROVIDER_LABEL]);
    expect(groups[1].accounts.map((a) => a.name)).toEqual(['Carteira', 'Dinheiro']);
  });

  it('calcula um único subtotal quando todas as contas do grupo têm a mesma moeda', () => {
    const accounts = [
      account({ accountProvider: 'bb', balance: '200.00', currency: 'BRL' }),
      account({ accountProvider: 'bb', balance: '-1400.00', currency: 'BRL' }),
    ];

    const groups = groupAccountsByProvider(accounts, PROVIDERS);

    expect(groups[0].subtotals).toEqual([{ currency: 'BRL', amount: '-1200.00' }]);
  });

  it('calcula subtotais separados por moeda quando o grupo tem moedas diferentes', () => {
    const accounts = [
      account({ accountProvider: 'itau', balance: '4000.00', currency: 'BRL' }),
      account({ accountProvider: 'itau', balance: '10.00', currency: 'USD' }),
    ];

    const groups = groupAccountsByProvider(accounts, PROVIDERS);

    expect(groups[0].subtotals).toEqual(
      expect.arrayContaining([
        { currency: 'BRL', amount: '4000.00' },
        { currency: 'USD', amount: '10.00' },
      ]),
    );
    expect(groups[0].subtotals).toHaveLength(2);
  });

  it('usa a chave crua como label quando o provider não existe na lista de opções', () => {
    const accounts = [account({ accountProvider: 'desconhecido' })];

    const groups = groupAccountsByProvider(accounts, PROVIDERS);

    expect(groups[0].label).toBe('desconhecido');
  });

  it('retorna lista vazia quando não há contas', () => {
    expect(groupAccountsByProvider([], PROVIDERS)).toEqual([]);
  });
});
