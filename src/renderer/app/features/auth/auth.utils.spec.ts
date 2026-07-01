import { describe, expect, it } from 'vitest';
import { getInitials } from './auth.utils';

describe('getInitials', () => {
  it('retorna iniciais de duas palavras', () => {
    expect(getInitials('Rodrigo Alves')).toBe('RA');
  });

  it('retorna inicial única para nome de uma palavra', () => {
    expect(getInitials('Rodrigo')).toBe('R');
  });

  it('usa só as duas primeiras palavras em nomes com três ou mais', () => {
    expect(getInitials('María José Santos')).toBe('MJ');
  });

  it('ignora espaços extras nas bordas e no meio', () => {
    expect(getInitials('  John  Doe  ')).toBe('JD');
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(getInitials('')).toBe('');
  });

  it('converte para maiúsculas', () => {
    expect(getInitials('alice bob')).toBe('AB');
  });
});
