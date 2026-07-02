import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { avatarExtension, avatarFileName, avatarMime, isInsideDir } from './avatar.utils';

describe('avatar.utils', () => {
  describe('avatarExtension', () => {
    it('aceita as extensões suportadas, normalizando para minúsculas', () => {
      expect(avatarExtension('foto.png')).toBe('.png');
      expect(avatarExtension('foto.JPG')).toBe('.jpg');
      expect(avatarExtension('foto.JPEG')).toBe('.jpeg');
      expect(avatarExtension('foto.webp')).toBe('.webp');
    });

    it('rejeita extensões não suportadas ou ausentes', () => {
      expect(avatarExtension('foto.gif')).toBeNull();
      expect(avatarExtension('foto.svg')).toBeNull();
      expect(avatarExtension('script.png.exe')).toBeNull();
      expect(avatarExtension('sem-extensao')).toBeNull();
    });
  });

  describe('avatarMime', () => {
    it('mapeia cada extensão suportada para o MIME correto', () => {
      expect(avatarMime('C:\\avatars\\a.png')).toBe('image/png');
      expect(avatarMime('/avatars/a.jpg')).toBe('image/jpeg');
      expect(avatarMime('/avatars/a.jpeg')).toBe('image/jpeg');
      expect(avatarMime('/avatars/a.WEBP')).toBe('image/webp');
    });

    it('retorna null para extensão desconhecida', () => {
      expect(avatarMime('/avatars/a.bmp')).toBeNull();
    });
  });

  describe('avatarFileName', () => {
    it('gera o nome canônico userId + extensão', () => {
      expect(avatarFileName('abc-123', '.png')).toBe('abc-123.png');
    });
  });

  describe('isInsideDir', () => {
    const dir = path.resolve('avatars');

    it('aceita arquivos dentro do diretório', () => {
      expect(isInsideDir(dir, path.join(dir, 'user.png'))).toBe(true);
      expect(isInsideDir(dir, path.join(dir, 'sub', 'user.png'))).toBe(true);
    });

    it('rejeita o próprio diretório, irmãos e path traversal', () => {
      expect(isInsideDir(dir, dir)).toBe(false);
      expect(isInsideDir(dir, path.resolve('outra-pasta', 'user.png'))).toBe(false);
      expect(isInsideDir(dir, path.join(dir, '..', 'fora.png'))).toBe(false);
    });
  });
});
