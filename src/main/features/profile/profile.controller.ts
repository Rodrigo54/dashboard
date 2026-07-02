import { eq } from 'drizzle-orm';
import { changePasswordSchema, updateAvatarSchema, updateProfileSchema } from '@shared/schemas';
import { action, Controller } from '../../core/controller.decorator';
import {
  requireCurrentUser,
  setCurrentUser,
  toPublicUser,
  type PublicUser,
} from '../../core/session';
import { getDb, schema } from '../../database/database.module';
import { hashPassword, verifyPassword } from '../auth/password.utils';
import { saveAvatarFile } from './avatar.storage';

/**
 * Edição do próprio usuário logado: nome, avatar e senha. E-mail, role e
 * isActive ficam de fora por decisão de escopo (e-mail é a credencial de login).
 */
@Controller('profile')
export class ProfileController {
  @action('update')
  async update(rawData: unknown): Promise<PublicUser> {
    const { name } = updateProfileSchema.parse(rawData);
    const user = requireCurrentUser();
    return this.#applyUpdate(user.id, { name });
  }

  @action('changePassword')
  async changePassword(rawData: unknown): Promise<void> {
    const { currentPassword, newPassword } = changePasswordSchema.parse(rawData);
    const user = requireCurrentUser();
    const db = getDb();

    const row = db.select().from(schema.users).where(eq(schema.users.id, user.id)).get();
    if (!row) throw new Error('Usuário não encontrado');
    if (!verifyPassword(currentPassword, row.passwordHash)) {
      throw new Error('Senha atual incorreta');
    }

    db.update(schema.users)
      .set({ passwordHash: hashPassword(newPassword) })
      .where(eq(schema.users.id, user.id))
      .run();
  }

  @action('updateAvatar')
  async updateAvatar(rawData: unknown): Promise<PublicUser> {
    const { fileName, data } = updateAvatarSchema.parse(rawData);
    const user = requireCurrentUser();
    const avatar = saveAvatarFile(user.id, fileName, data);
    return this.#applyUpdate(user.id, { avatar });
  }

  /** Aplica o patch em `users`, sincroniza a sessão e devolve o usuário público. */
  #applyUpdate(userId: string, patch: Partial<schema.NewUser>): PublicUser {
    const db = getDb();
    const updated = db
      .update(schema.users)
      .set(patch)
      .where(eq(schema.users.id, userId))
      .returning()
      .get();
    if (!updated) throw new Error('Usuário não encontrado');

    const publicUser = toPublicUser(updated);
    setCurrentUser(publicUser);
    return publicUser;
  }
}
