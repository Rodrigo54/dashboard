import { describe, expect, it } from 'vitest';
import { avatarUrl, getInitials } from './auth.utils';

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

describe('avatarUrl', () => {
  const updatedAt = new Date('2026-07-02T12:00:00Z');

  it('monta a URL do protocol handler com cache-busting por updatedAt', () => {
    const url = avatarUrl({
      id: 'abc-123',
      avatar: 'C:\\userData\\avatars\\abc-123.png',
      updatedAt,
    });
    expect(url).toBe(`avatar://user/abc-123?v=${updatedAt.getTime()}`);
  });

  it('retorna vazio sem usuário ou sem avatar', () => {
    expect(avatarUrl(null)).toBe('');
    expect(avatarUrl({ id: 'abc-123', avatar: null, updatedAt })).toBe('');
  });
});
