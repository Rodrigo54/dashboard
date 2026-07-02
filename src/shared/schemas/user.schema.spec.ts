import { describe, expect, it } from 'vitest';
import {
  AVATAR_MAX_BYTES,
  changePasswordSchema,
  updateAvatarSchema,
  updateProfileSchema,
} from './user.schema';

describe('updateProfileSchema', () => {
  it('aceita um nome válido', () => {
    expect(updateProfileSchema.parse({ name: 'Rodrigo Alves' })).toEqual({
      name: 'Rodrigo Alves',
    });
  });

  it('rejeita nome vazio e nome acima de 255 caracteres', () => {
    expect(updateProfileSchema.safeParse({ name: '' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ name: 'a'.repeat(256) }).success).toBe(false);
  });

  it('ignora campos extras (role/isActive não passam por aqui)', () => {
    const parsed = updateProfileSchema.parse({ name: 'Rodrigo', role: 'admin', isActive: false });
    expect(parsed).toEqual({ name: 'Rodrigo' });
  });
});

describe('changePasswordSchema', () => {
  it('aceita senha atual preenchida e nova senha com 8+ caracteres', () => {
    const parsed = changePasswordSchema.parse({
      currentPassword: 'antiga',
      newPassword: '12345678',
    });
    expect(parsed.newPassword).toBe('12345678');
  });

  it('rejeita senha atual vazia', () => {
    const result = changePasswordSchema.safeParse({ currentPassword: '', newPassword: '12345678' });
    expect(result.success).toBe(false);
  });

  it('rejeita nova senha com menos de 8 caracteres', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'antiga',
      newPassword: '1234567',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateAvatarSchema', () => {
  const bytes = new Uint8Array([1, 2, 3]);

  it('aceita PNG, JPG, JPEG e WebP em qualquer caixa', () => {
    for (const name of ['foto.png', 'foto.JPG', 'foto.jpeg', 'FOTO.WEBP']) {
      expect(updateAvatarSchema.safeParse({ fileName: name, data: bytes }).success).toBe(true);
    }
  });

  it('rejeita extensões não suportadas', () => {
    for (const name of ['foto.gif', 'foto.svg', 'foto.exe', 'foto']) {
      expect(updateAvatarSchema.safeParse({ fileName: name, data: bytes }).success).toBe(false);
    }
  });

  it('rejeita arquivo vazio', () => {
    const result = updateAvatarSchema.safeParse({ fileName: 'foto.png', data: new Uint8Array(0) });
    expect(result.success).toBe(false);
  });

  it('rejeita arquivo acima do limite e aceita exatamente no limite', () => {
    const overLimit = { fileName: 'foto.png', data: new Uint8Array(AVATAR_MAX_BYTES + 1) };
    const atLimit = { fileName: 'foto.png', data: new Uint8Array(AVATAR_MAX_BYTES) };
    expect(updateAvatarSchema.safeParse(overLimit).success).toBe(false);
    expect(updateAvatarSchema.safeParse(atLimit).success).toBe(true);
  });
});
