import { describe, expect, it } from 'vitest';
import { normalizeText, similarityText } from './normalize';

describe('normalizeText', () => {
  it('remove acentos, pontuação e caixa', () => {
    expect(normalizeText('São Paulo, Ltda.')).toBe('SAO PAULO LTDA');
  });

  it('colapsa espaços', () => {
    expect(normalizeText('  PAGTO   SALARIO  ')).toBe('PAGTO SALARIO');
  });
});

describe('similarityText', () => {
  it('trata descrição contida como casamento total', () => {
    expect(similarityText('PAGTO SALARIO ITAU', 'salario')).toBe(1);
  });

  it('descrições distintas têm baixa similaridade', () => {
    expect(similarityText('NETFLIX', 'SPOTIFY')).toBeLessThan(0.5);
  });

  it('devolve 0 quando uma das entradas é vazia', () => {
    expect(similarityText('', 'X')).toBe(0);
  });
});
