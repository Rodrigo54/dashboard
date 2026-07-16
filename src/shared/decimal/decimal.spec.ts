import { describe, expect, it } from 'vitest';

import { addDecimal, negateDecimal, subtractDecimal, toCents } from './index';

describe('addDecimal', () => {
  it('soma decimais canônicos com 2 casas', () => {
    expect(addDecimal('10.50', '0.25')).toBe('10.75');
  });

  it('normaliza entradas sem casas decimais', () => {
    expect(addDecimal('10', '5.5')).toBe('15.50');
  });

  it('soma valores negativos', () => {
    expect(addDecimal('-10.00', '-2.50')).toBe('-12.50');
  });

  it('cruza o zero sem erro de sinal', () => {
    expect(addDecimal('-10.00', '12.34')).toBe('2.34');
    expect(addDecimal('10.00', '-12.34')).toBe('-2.34');
  });

  it('não perde precisão em valores que estouram float', () => {
    // 0.1 + 0.2 === 0.30000000000000004 em float
    expect(addDecimal('0.1', '0.2')).toBe('0.30');
    expect(addDecimal('99999999999.99', '0.01')).toBe('100000000000.00');
  });

  it('rejeita entradas fora do formato canônico', () => {
    expect(() => addDecimal('1,50', '1.00')).toThrow();
    expect(() => addDecimal('1.234', '1.00')).toThrow();
    expect(() => addDecimal('abc', '1.00')).toThrow();
    expect(() => addDecimal('', '1.00')).toThrow();
  });
});

describe('subtractDecimal', () => {
  it('subtrai decimais canônicos', () => {
    expect(subtractDecimal('10.00', '2.50')).toBe('7.50');
  });

  it('produz negativo quando o subtraendo é maior', () => {
    expect(subtractDecimal('2.50', '10.00')).toBe('-7.50');
  });

  it('zero é emitido sem sinal', () => {
    expect(subtractDecimal('5.00', '5.00')).toBe('0.00');
  });
});

describe('negateDecimal', () => {
  it('inverte o sinal', () => {
    expect(negateDecimal('10.50')).toBe('-10.50');
    expect(negateDecimal('-10.50')).toBe('10.50');
  });

  it('zero permanece sem sinal', () => {
    expect(negateDecimal('0')).toBe('0.00');
    expect(negateDecimal('0.00')).toBe('0.00');
  });
});

describe('toCents', () => {
  it('converte decimal com 2 casas em centavos', () => {
    expect(toCents('10.50')).toBe(1050n);
  });

  it('normaliza entradas com uma casa ou sem casas decimais', () => {
    expect(toCents('10.5')).toBe(1050n);
    expect(toCents('10')).toBe(1000n);
  });

  it('preserva o sinal negativo', () => {
    expect(toCents('-10.50')).toBe(-1050n);
  });

  it('rejeita entradas fora do formato canônico', () => {
    expect(() => toCents('1,50')).toThrow();
    expect(() => toCents('1.234')).toThrow();
  });
});
