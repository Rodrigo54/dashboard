import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AVATAR_EXTENSIONS } from '@shared/schemas';
import { avatarExtension, avatarFileName, isInsideDir } from './avatar.utils';

/** Diretório onde os avatares vivem, dentro do userData do app. */
export function avatarsDir(): string {
  return path.join(app.getPath('userData'), 'avatars');
}

/**
 * Grava o avatar do usuário (um arquivo por usuário, nome = userId + extensão)
 * e remove versões antigas com outra extensão. Retorna o caminho gravado.
 */
export function saveAvatarFile(userId: string, fileName: string, data: Uint8Array): string {
  const ext = avatarExtension(fileName);
  if (!ext) throw new Error('Formato não suportado (use PNG, JPG ou WebP)');

  const dir = avatarsDir();
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, avatarFileName(userId, ext));
  fs.writeFileSync(filePath, data);

  for (const other of AVATAR_EXTENSIONS) {
    if (other === ext) continue;
    fs.rmSync(path.join(dir, avatarFileName(userId, other)), { force: true });
  }
  return filePath;
}

/**
 * Valida o caminho vindo do banco antes de servi-lo: precisa estar dentro do
 * diretório de avatares e existir no disco. Retorna `null` caso contrário.
 */
export function resolveAvatarFile(storedPath: string): string | null {
  if (!isInsideDir(avatarsDir(), storedPath)) return null;
  return fs.existsSync(storedPath) ? storedPath : null;
}
