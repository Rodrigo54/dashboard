import { protocol } from 'electron';
import { eq } from 'drizzle-orm';
import * as fs from 'node:fs';
import { uuidSchema } from '@shared/schemas';
import { getDb, schema } from '../../database/database.module';
import { resolveAvatarFile } from './avatar.storage';
import { avatarMime } from './avatar.utils';

/** Scheme servido pelo main: `avatar://user/<userId>` -> arquivo em userData/avatars. */
export const AVATAR_SCHEME = 'avatar';

/** Precisa rodar antes do `app.whenReady` (exigência do Electron). */
export function registerAvatarScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: AVATAR_SCHEME, privileges: { standard: true, secure: true } },
  ]);
}

/** Registra o handler que serve os avatares. Rodar após `initDb()` no `whenReady`. */
export function registerAvatarProtocol(): void {
  protocol.handle(AVATAR_SCHEME, async (request) => {
    try {
      const { hostname, pathname } = new URL(request.url);
      const userId = uuidSchema.safeParse(decodeURIComponent(pathname.replace(/^\//, '')));
      if (hostname !== 'user' || !userId.success) return new Response(null, { status: 400 });

      const row = getDb()
        .select({ avatar: schema.users.avatar })
        .from(schema.users)
        .where(eq(schema.users.id, userId.data))
        .get();

      const filePath = row?.avatar ? resolveAvatarFile(row.avatar) : null;
      const mime = filePath ? avatarMime(filePath) : null;
      if (!filePath || !mime) return new Response(null, { status: 404 });

      return new Response(fs.readFileSync(filePath), {
        headers: { 'Content-Type': mime, 'Cache-Control': 'no-cache' },
      });
    } catch (error) {
      console.error('[avatar] Falha ao servir avatar:', error);
      return new Response(null, { status: 500 });
    }
  });
}
