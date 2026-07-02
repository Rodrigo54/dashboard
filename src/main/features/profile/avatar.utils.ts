import * as path from 'node:path';
import { AVATAR_EXTENSIONS } from '@shared/schemas';

const AVATAR_MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/** Extensão (minúscula) do arquivo, ou `null` se não for um formato de avatar aceito. */
export function avatarExtension(fileName: string): string | null {
  const ext = path.extname(fileName).toLowerCase();
  return (AVATAR_EXTENSIONS as readonly string[]).includes(ext) ? ext : null;
}

/** MIME type do arquivo de avatar, ou `null` para extensões desconhecidas. */
export function avatarMime(filePath: string): string | null {
  return AVATAR_MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? null;
}

/** Nome canônico do arquivo de avatar de um usuário (um arquivo por usuário). */
export function avatarFileName(userId: string, ext: string): string {
  return `${userId}${ext}`;
}

/** `true` se `filePath` resolve para dentro de `dir` (bloqueia path traversal). */
export function isInsideDir(dir: string, filePath: string): boolean {
  const relative = path.relative(path.resolve(dir), path.resolve(filePath));
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}
