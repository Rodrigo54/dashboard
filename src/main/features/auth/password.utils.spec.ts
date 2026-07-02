import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.utils';

describe('password.utils', () => {
  it('gera hash no formato salt:hash com salt de 16 bytes em hex', () => {
    const stored = hashPassword('minha-senha');
    const [salt, hash] = stored.split(':');
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });

  it('gera salts diferentes para a mesma senha', () => {
    expect(hashPassword('repetida')).not.toBe(hashPassword('repetida'));
  });

  it('verifica a senha correta contra o hash gerado', () => {
    const stored = hashPassword('correta123');
    expect(verifyPassword('correta123', stored)).toBe(true);
  });

  it('rejeita senha incorreta', () => {
    const stored = hashPassword('correta123');
    expect(verifyPassword('errada123', stored)).toBe(false);
  });

  it('rejeita hash malformado sem lançar', () => {
    expect(verifyPassword('qualquer', 'sem-separador')).toBe(false);
    expect(verifyPassword('qualquer', ':')).toBe(false);
    expect(verifyPassword('qualquer', '')).toBe(false);
  });

  it('rejeita hash com tamanho de digest diferente', () => {
    expect(verifyPassword('qualquer', 'aabbccdd:deadbeef')).toBe(false);
  });

  it('aceita hashes gerados no formato legado do register (mesmos parâmetros)', () => {
    // Formato produzido pelo AuthController original: scryptSync(password, saltHex, 64).
    const stored = hashPassword('legado');
    expect(verifyPassword('legado', stored)).toBe(true);
  });
});
