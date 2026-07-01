import { describe, expect, it } from 'vitest';
import {
  brMoneyToCanonical,
  moneyTokens,
  parseStatementDate,
  stripMoney,
} from './statement-parse.utils';

describe('brMoneyToCanonical', () => {
  it('converte formato brasileiro em decimal canônico', () => {
    expect(brMoneyToCanonical('1.234,56')).toBe('1234.56');
    expect(brMoneyToCanonical('45,90')).toBe('45.90');
    expect(brMoneyToCanonical('1.000.000,00')).toBe('1000000.00');
  });

  it('preserva o sinal negativo', () => {
    expect(brMoneyToCanonical('-200,00')).toBe('-200.00');
  });
});

describe('moneyTokens', () => {
  it('extrai todos os valores de uma linha, em ordem', () => {
    expect(moneyTokens('PAGTO 3.500,00 C 4.500,00 C')).toEqual(['3500.00', '4500.00']);
  });

  it('devolve vazio quando não há valores', () => {
    expect(moneyTokens('SALDO ANTERIOR')).toEqual([]);
  });
});

describe('parseStatementDate', () => {
  it('interpreta dd/mm/aaaa', () => {
    expect(parseStatementDate('05/07/2024 SALARIO', 2000)).toEqual(new Date(2024, 6, 5, 12));
  });

  it('usa o ano de fallback quando a data é dd/mm', () => {
    expect(parseStatementDate('05/07 SALARIO', 2026)).toEqual(new Date(2026, 6, 5, 12));
  });

  it('normaliza ano de dois dígitos', () => {
    expect(parseStatementDate('05/07/24 SALARIO', 2000)).toEqual(new Date(2024, 6, 5, 12));
  });

  it('devolve null quando a linha não começa com data', () => {
    expect(parseStatementDate('SALDO ANTERIOR 100,00', 2026)).toBeNull();
  });

  it('rejeita mês inválido', () => {
    expect(parseStatementDate('05/13/2024 X', 2000)).toBeNull();
  });
});

describe('stripMoney', () => {
  it('remove valores mantendo o restante', () => {
    expect(stripMoney('PAY 1247 150,00 D')).toBe('PAY 1247 D');
  });
});
