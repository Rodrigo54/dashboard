import { describe, expect, it } from 'vitest';

import { decimalStringToMasked, maskedToDecimalString } from './currency.utils';

describe('maskedToDecimalString', () => {
  it('converte texto mascarado em string decimal canônica', () => {
    expect(maskedToDecimalString('1.234,56')).toBe('1234.56');
  });

  it('ignora prefixo e símbolos de moeda', () => {
    expect(maskedToDecimalString('R$ 1.234,56')).toBe('1234.56');
  });

  it('preserva os dígitos informados sem round-trip de float', () => {
    expect(maskedToDecimalString('10,50')).toBe('10.50');
  });

  it('lida com valores sem separador de milhar', () => {
    expect(maskedToDecimalString('99,90')).toBe('99.90');
  });

  it('converte valores negativos', () => {
    expect(maskedToDecimalString('-5,00')).toBe('-5.00');
  });

  it('retorna string vazia para entradas vazias ou inválidas', () => {
    expect(maskedToDecimalString('')).toBe('');
    expect(maskedToDecimalString('abc')).toBe('');
    expect(maskedToDecimalString('-')).toBe('');
  });
});

describe('decimalStringToMasked', () => {
  it('formata string decimal canônica no padrão pt-BR', () => {
    expect(decimalStringToMasked('1234.56')).toBe('1.234,56');
    expect(decimalStringToMasked('1234.5')).toBe('1.234,50');
  });

  it('respeita o número de casas decimais informado', () => {
    expect(decimalStringToMasked('10', 0)).toBe('10');
    expect(decimalStringToMasked('10.123', 3)).toBe('10,123');
  });

  it('formata valores negativos', () => {
    expect(decimalStringToMasked('-99.9')).toBe('-99,90');
  });

  it('retorna string vazia para valores vazios ou inválidos', () => {
    expect(decimalStringToMasked('')).toBe('');
    expect(decimalStringToMasked('abc')).toBe('');
  });

  it('faz round-trip com maskedToDecimalString para valores com 2 casas', () => {
    expect(maskedToDecimalString(decimalStringToMasked('1234.56'))).toBe('1234.56');
  });
});
