import { describe, expect, it } from 'vitest';

import {
  decimalStringToDigits,
  digitsToDecimalString,
  digitsToMasked,
  sanitizeDigits,
} from './currency.utils';

describe('sanitizeDigits', () => {
  it('remove tudo que não é dígito', () => {
    expect(sanitizeDigits('1.234,56')).toBe('123456');
    expect(sanitizeDigits('R$ 0,05')).toBe('5');
  });

  it('remove zeros à esquerda', () => {
    expect(sanitizeDigits('0,001')).toBe('1');
    expect(sanitizeDigits('0,00')).toBe('');
  });

  it('limita a quantidade máxima de dígitos', () => {
    expect(sanitizeDigits('9'.repeat(30))).toHaveLength(15);
  });

  it('retorna vazio para entradas sem dígitos', () => {
    expect(sanitizeDigits('')).toBe('');
    expect(sanitizeDigits('abc')).toBe('');
  });
});

describe('digitsToDecimalString', () => {
  it('preenche da direita para a esquerda com 2 casas', () => {
    expect(digitsToDecimalString('')).toBe('0.00');
    expect(digitsToDecimalString('5')).toBe('0.05');
    expect(digitsToDecimalString('12')).toBe('0.12');
    expect(digitsToDecimalString('123')).toBe('1.23');
    expect(digitsToDecimalString('123456')).toBe('1234.56');
  });

  it('respeita o número de casas decimais informado', () => {
    expect(digitsToDecimalString('123', 0)).toBe('123');
    expect(digitsToDecimalString('', 0)).toBe('0');
    expect(digitsToDecimalString('1234', 3)).toBe('1.234');
  });

  it('ignora zeros à esquerda', () => {
    expect(digitsToDecimalString('000123')).toBe('1.23');
  });
});

describe('digitsToMasked', () => {
  it('formata no padrão pt-BR preenchendo pela direita', () => {
    expect(digitsToMasked('')).toBe('0,00');
    expect(digitsToMasked('5')).toBe('0,05');
    expect(digitsToMasked('123')).toBe('1,23');
    expect(digitsToMasked('123456')).toBe('1.234,56');
    expect(digitsToMasked('123456789')).toBe('1.234.567,89');
  });

  it('respeita o número de casas decimais informado', () => {
    expect(digitsToMasked('1234', 0)).toBe('1.234');
    expect(digitsToMasked('1234', 3)).toBe('1,234');
  });
});

describe('decimalStringToDigits', () => {
  it('converte a string decimal canônica em dígitos (centavos)', () => {
    expect(decimalStringToDigits('1234.56')).toBe('123456');
    expect(decimalStringToDigits('0.05')).toBe('5');
  });

  it('completa casas decimais ausentes', () => {
    expect(decimalStringToDigits('10.5')).toBe('1050');
    expect(decimalStringToDigits('10')).toBe('1000');
  });

  it('trunca casas decimais excedentes', () => {
    expect(decimalStringToDigits('1.999')).toBe('199');
  });

  it('retorna vazio para valores vazios, zerados ou inválidos', () => {
    expect(decimalStringToDigits('')).toBe('');
    expect(decimalStringToDigits('abc')).toBe('');
    expect(decimalStringToDigits('0')).toBe('');
    expect(decimalStringToDigits('0.00')).toBe('');
  });

  it('faz round-trip com digitsToDecimalString', () => {
    expect(digitsToDecimalString(decimalStringToDigits('1234.56'))).toBe('1234.56');
    expect(decimalStringToDigits(digitsToDecimalString('123456'))).toBe('123456');
  });
});
