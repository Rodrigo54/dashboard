import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '../../database/database.module';
import { inject } from '../../core/services.providers';
import { RecurringMaterializerService } from '../recurring/recurring-materializer.service';
import { action, Controller } from '../../core/controller.decorator';
import {
  clearCurrentUser,
  getCurrentUser,
  setCurrentUser,
  toPublicUser,
  type PublicUser,
} from '../../core/session';
import { hashPassword, verifyPassword } from './password.utils';

@Controller('auth')
export class AuthController {
  private readonly materializer = inject(RecurringMaterializerService);

  @action('check')
  async check(): Promise<{ hasUsers: boolean }> {
    const db = getDb();
    const user = db.select({ id: schema.users.id }).from(schema.users).limit(1).get();
    return { hasUsers: user !== undefined };
  }

  @action('listUsers')
  async listUsers(): Promise<PublicUser[]> {
    const db = getDb();
    const rows = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.isActive, true))
      .orderBy(asc(schema.users.name))
      .all();
    return rows.map(toPublicUser);
  }

  @action('login')
  async login(payload: { email: string; password: string }): Promise<PublicUser> {
    const db = getDb();
    const user = db.select().from(schema.users).where(eq(schema.users.email, payload.email)).get();

    if (!user) throw new Error('Credenciais inválidas');
    if (!user.isActive) throw new Error('Usuário inativo');
    if (!verifyPassword(payload.password, user.passwordHash)) {
      throw new Error('Credenciais inválidas');
    }

    const publicUser = toPublicUser(user);
    setCurrentUser(publicUser);

    // Catch-up das recorrências vencidas; uma falha aqui não pode impedir o login.
    try {
      this.materializer.materializeRecurringTransactions(publicUser.id);
    } catch (error) {
      console.error('[recurring] Falha no catch-up pós-login:', error);
    }

    return publicUser;
  }

  @action('register')
  async register(payload: { name: string; email: string; password: string }): Promise<PublicUser> {
    const db = getDb();
    const existing = db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, payload.email))
      .get();

    if (existing) throw new Error('E-mail já cadastrado');

    const newUser = db
      .insert(schema.users)
      .values({
        name: payload.name,
        email: payload.email,
        passwordHash: hashPassword(payload.password),
      })
      .returning()
      .get();

    const publicUser = toPublicUser(newUser);
    setCurrentUser(publicUser);
    return publicUser;
  }

  @action('logout')
  async logout(): Promise<void> {
    clearCurrentUser();
  }

  @action('me')
  async me(): Promise<PublicUser | null> {
    return getCurrentUser();
  }
}
